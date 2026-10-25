import assert from 'node:assert'
import { validateEmail } from './src/services/emailValidationService.js'

console.log('==================================================')
console.log('   TESTING EMAILVALIDATION.IO INTEGRATION')
console.log('==================================================\n')

let passed = 0
let failed = 0

async function test(name, fn) {
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

async function runTests() {
  // 1. Basic format validation
  await test('Reject empty or non-string emails', async () => {
    const r1 = await validateEmail('')
    assert.strictEqual(r1.valid, false)
    assert.strictEqual(r1.message, 'Email address is required.')

    const r2 = await validateEmail(null)
    assert.strictEqual(r2.valid, false)
  })

  await test('Reject invalid email syntax formats without @ or domain', async () => {
    const invalidList = ['plainaddress', 'missingat.com', 'user@', '@domain.com', 'user@domain']
    for (const em of invalidList) {
      const res = await validateEmail(em)
      assert.strictEqual(res.valid, false, `Expected ${em} to be rejected`)
      assert.ok(res.message.includes('valid email address'))
    }
  })

  await test('Accept well-formatted email when API key is not configured (graceful skip)', async () => {
    const prevKey = process.env.EMAILVALIDATION_API_KEY
    delete process.env.EMAILVALIDATION_API_KEY

    const res = await validateEmail('test.developer@example.com')
    assert.strictEqual(res.valid, true)
    assert.strictEqual(res.skipped, true)

    if (prevKey) process.env.EMAILVALIDATION_API_KEY = prevKey
  })

  // 2. Simulated emailvalidation.io responses using globalThis.fetch mock
  await test('Mock API: reject when format_valid is false', async () => {
    const originalFetch = globalThis.fetch
    process.env.EMAILVALIDATION_API_KEY = 'test_mock_key'

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        format_valid: false,
        state: 'undeliverable',
      }),
    })

    try {
      const res = await validateEmail('badformat@test.com')
      assert.strictEqual(res.valid, false)
      assert.ok(res.message.includes('format is invalid'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await test('Mock API: reject disposable / temporary email addresses', async () => {
    const originalFetch = globalThis.fetch
    process.env.EMAILVALIDATION_API_KEY = 'test_mock_key'

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        format_valid: true,
        disposable: true,
        state: 'deliverable',
      }),
    })

    try {
      const res = await validateEmail('temporary@mailinator.com')
      assert.strictEqual(res.valid, false)
      assert.ok(res.message.includes('Disposable or temporary email'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await test('Mock API: reject undeliverable email and suggest correction if did_you_mean is present', async () => {
    const originalFetch = globalThis.fetch
    process.env.EMAILVALIDATION_API_KEY = 'test_mock_key'

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        format_valid: true,
        disposable: false,
        state: 'undeliverable',
        did_you_mean: 'user@gmail.com',
      }),
    })

    try {
      const res = await validateEmail('user@gmaill.com')
      assert.strictEqual(res.valid, false)
      assert.ok(res.message.includes('Did you mean "user@gmail.com"?'))
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await test('Mock API: accept deliverable email', async () => {
    const originalFetch = globalThis.fetch
    process.env.EMAILVALIDATION_API_KEY = 'test_mock_key'

    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        format_valid: true,
        disposable: false,
        state: 'deliverable',
        score: 0.95,
      }),
    })

    try {
      const res = await validateEmail('valid.user@gmail.com')
      assert.strictEqual(res.valid, true)
      assert.strictEqual(res.details.state, 'deliverable')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await test('Mock API: fail-open gracefully on API 401/429/network errors', async () => {
    const originalFetch = globalThis.fetch
    process.env.EMAILVALIDATION_API_KEY = 'test_mock_key'

    // Case A: 401 Unauthorized
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })
    const r1 = await validateEmail('user@gmail.com')
    assert.strictEqual(r1.valid, true)
    assert.strictEqual(r1.skipped, true)

    // Case B: Network rejection
    globalThis.fetch = async () => {
      throw new Error('Network timeout')
    }
    const r2 = await validateEmail('user@gmail.com')
    assert.strictEqual(r2.valid, true)
    assert.strictEqual(r2.skipped, true)

    globalThis.fetch = originalFetch
  })

  console.log('\n==================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log('==================================================\n')

  process.exit(failed > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
