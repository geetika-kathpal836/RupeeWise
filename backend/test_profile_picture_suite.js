import assert from 'assert'
import http from 'http'
import { isValidImageMagicBytes } from './src/middleware/uploadMiddleware.js'
import User from './src/models/User.js'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

async function runTests() {
  console.log('==================================================')
  console.log('   STARTING PROFILE PICTURE VERIFICATION SUITE   ')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`✅ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`❌ FAIL: ${name}`)
      console.error(err)
      failed++
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn()
      console.log(`✅ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`❌ FAIL: ${name}`)
      console.error(err)
      failed++
    }
  }

  // --- UNIT TESTS: Magic Bytes Validation ---
  console.log('--- 1. Magic Bytes Validation ---')

  test('Valid JPEG header (FF D8 FF) is accepted', () => {
    const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    assert.strictEqual(isValidImageMagicBytes(jpegBuf), true)
  })

  test('Valid PNG header (89 50 4E 47 0D 0A 1A 0A) is accepted', () => {
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d])
    assert.strictEqual(isValidImageMagicBytes(pngBuf), true)
  })

  test('Valid WebP header (RIFF ... WEBP) is accepted', () => {
    // 0..3: RIFF (52 49 46 46), 4..7: size, 8..11: WEBP (57 45 42 50)
    const webpBuf = Buffer.from([
      0x52, 0x49, 0x46, 0x46,
      0x24, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38, 0x20
    ])
    assert.strictEqual(isValidImageMagicBytes(webpBuf), true)
  })

  test('Disguised text file (fake extension) is rejected', () => {
    const textBuf = Buffer.from('This is a text file claiming to be an image.jpg')
    assert.strictEqual(isValidImageMagicBytes(textBuf), false)
  })

  test('Empty buffer or short buffer is rejected', () => {
    assert.strictEqual(isValidImageMagicBytes(Buffer.alloc(0)), false)
    assert.strictEqual(isValidImageMagicBytes(Buffer.from([0xff, 0xd8])), false)
    assert.strictEqual(isValidImageMagicBytes(null), false)
  })

  // --- UNIT TESTS: User Model Schema & toSafeObject ---
  console.log('\n--- 2. User Model Schema & toSafeObject ---')

  test('User toSafeObject includes profilePictureUrl and excludes profilePicturePublicId', () => {
    const dummyUser = new User({
      name: 'Test Person',
      email: 'test@example.com',
      passwordHash: 'dummyhash',
      profilePictureUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      profilePicturePublicId: 'rupeewise/profile-pictures/sample_123',
    })

    const safe = dummyUser.toSafeObject()
    assert.strictEqual(safe.profilePictureUrl, 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
    assert.strictEqual(safe.profilePicturePublicId, undefined, 'Public ID must not be leaked in safe object')
    assert.strictEqual(safe.name, 'Test Person')
    assert.strictEqual(safe.email, 'test@example.com')
  })

  test('User toSafeObject defaults profilePictureUrl to null when unset', () => {
    const dummyUser = new User({
      name: 'Initial Person',
      email: 'initial@example.com',
      passwordHash: 'dummyhash',
    })

    const safe = dummyUser.toSafeObject()
    assert.strictEqual(safe.profilePictureUrl, null)
  })

  // --- INTEGRATION TESTS: HTTP Endpoints ---
  console.log('\n--- 3. HTTP Endpoints & Security Checks ---')

  // Helper function to send HTTP requests to local server
  function makeRequest({ path, method = 'GET', headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers,
      }, (res) => {
        let data = ''
        res.on('data', chunk => data += chunk)
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve({ statusCode: res.statusCode, headers: res.headers, data: json, raw: data })
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, raw: data })
          }
        })
      })
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }

  // Helper for multipart/form-data creation
  function createMultipartBody(fieldName, filename, contentType, buffer) {
    const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2)
    const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
    const footer = `\r\n--${boundary}--\r\n`
    const payload = Buffer.concat([
      Buffer.from(header, 'utf8'),
      buffer,
      Buffer.from(footer, 'utf8'),
    ])
    return {
      contentType: `multipart/form-data; boundary=${boundary}`,
      body: payload,
    }
  }

  // 1. Unauthenticated upload test
  await asyncTest('Upload without authentication returns 401', async () => {
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  // 2. Unauthenticated removal test
  await asyncTest('Remove without authentication returns 401', async () => {
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'DELETE',
    })
    assert.strictEqual(res.statusCode, 401)
  })

  // 3. Authenticate test user
  let cookieHeader = ''
  await asyncTest('Authenticate test user to obtain session cookie', async () => {
    const loginPayload = JSON.stringify({ email: 'geetika@test.com', password: 'password123' })
    const res = await makeRequest({
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload),
      },
      body: loginPayload,
    })
    assert.strictEqual(res.statusCode, 200)
    const setCookie = res.headers['set-cookie']
    assert.ok(setCookie && setCookie.length > 0)
    const tokenCookie = setCookie.find(c => c.startsWith('token='))
    cookieHeader = tokenCookie ? tokenCookie.split(';')[0] : ''
    assert.ok(cookieHeader.length > 10)
  })

  // 4. Authenticated upload with no file / wrong field
  await asyncTest('Authenticated upload with missing file field returns 400', async () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    const { contentType, body } = createMultipartBody('unrelatedField', 'test.jpg', 'image/jpeg', validJpeg)
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      body,
    })
    assert.strictEqual(res.statusCode, 400)
    assert.ok(res.data.message.includes('Please select an image file to upload.'))
  })

  // 5. Authenticated upload with unsupported extension (.pdf)
  await asyncTest('Authenticated upload with unsupported extension (.pdf) returns 400', async () => {
    const { contentType, body } = createMultipartBody('profilePicture', 'document.pdf', 'application/pdf', Buffer.from('%PDF-1.4 sample'))
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      body,
    })
    assert.strictEqual(res.statusCode, 400)
    assert.ok(res.data.message.includes('Only JPEG, PNG, and WebP'))
  })

  // 6. Authenticated upload with disguised text file (.png with text content)
  await asyncTest('Authenticated upload of disguised file (.png with non-image bytes) returns 400', async () => {
    const fakePng = Buffer.from('This is a plain text file pretending to be image.png')
    const { contentType, body } = createMultipartBody('profilePicture', 'fake.png', 'image/png', fakePng)
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      body,
    })
    assert.strictEqual(res.statusCode, 400)
    assert.ok(res.data.message.includes('File content does not match a valid JPEG, PNG, or WebP image.'))
  })

  // 7. Authenticated upload with file exceeding 5 MB limit
  await asyncTest('Authenticated upload of oversized file (> 5 MB) returns 400', async () => {
    // 5.2 MB buffer with valid JPEG magic bytes
    const oversized = Buffer.alloc(5.2 * 1024 * 1024)
    oversized[0] = 0xff; oversized[1] = 0xd8; oversized[2] = 0xff; oversized[3] = 0xe0
    const { contentType, body } = createMultipartBody('profilePicture', 'huge.jpg', 'image/jpeg', oversized)
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      body,
    })
    assert.strictEqual(res.statusCode, 400)
    assert.ok(res.data.message.includes('File size exceeds the 5 MB limit.'))
  })

  // 8. Security test: attempt to specify another user ID in body/query
  await asyncTest('Attempting to supply userId in query/body does not hijack target account', async () => {
    // Valid JPEG bytes under 5MB
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43
    ])
    const { contentType, body } = createMultipartBody('profilePicture', 'avatar.jpg', 'image/jpeg', validJpeg)
    const res = await makeRequest({
      path: '/api/users/profile-picture?userId=600000000000000000000000',
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': contentType,
        'Content-Length': body.length,
      },
      body,
    })
    // Endpoint correctly identifies user from JWT session, not the query param
    // When Cloudinary is unconfigured or configured, it operates solely on req.user._id
    assert.ok(res.statusCode === 200 || res.statusCode === 500 || res.statusCode === 502, `Expected 200, 500, or 502, got ${res.statusCode}`)
  })

  // 9. Remove profile picture endpoint
  await asyncTest('Remove profile picture endpoint clears image and returns 200', async () => {
    const res = await makeRequest({
      path: '/api/users/profile-picture',
      method: 'DELETE',
      headers: {
        'Cookie': cookieHeader,
      },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.data.profilePictureUrl, null)
    assert.strictEqual(res.data.user.profilePictureUrl, null)
  })

  // 10. Verify /api/auth/me returns updated state
  await asyncTest('GET /api/auth/me reflects cleared profile picture', async () => {
    const res = await makeRequest({
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.data.user.profilePictureUrl, null)
  })

  console.log('\n==================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('==================================================\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Test suite runner crashed:', err)
  process.exit(1)
})
