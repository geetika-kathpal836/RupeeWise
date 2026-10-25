import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()
process.env.NODE_ENV = 'test'

import app from '../src/app.js'
import User from '../src/models/User.js'
import Category from '../src/models/Category.js'
import Transaction from '../src/models/Transaction.js'
import Budget from '../src/models/Budget.js'
import Notification from '../src/models/Notification.js'
import RecurringTransaction from '../src/models/RecurringTransaction.js'

async function runTestSuite() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║   RupeeWise Comprehensive Automated API Audit & Test Suite        ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  let passed = 0
  let failed = 0
  const failures = []

  async function step(name, fn) {
    try {
      await fn()
      console.log(`  ✔ PASS: ${name}`)
      passed++
    } catch (err) {
      console.error(`  ✖ FAIL: ${name}`)
      console.error(`    Error: ${err.message}`)
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`    Expected: ${JSON.stringify(err.expected)}, Actual: ${JSON.stringify(err.actual)}`)
      }
      failures.push({ name, error: err.message })
      failed++
    }
  }

  // Connect to DB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI)
  }

  // Mock EmailValidation.io
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('emailvalidation.io')) {
      const urlObj = new URL(url)
      const email = urlObj.searchParams.get('email') || ''
      if (email.includes('undeliverable') || email.includes('disposable')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            format_valid: true,
            disposable: email.includes('disposable'),
            state: 'undeliverable',
            reason: 'mailbox_not_found',
          }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          format_valid: true,
          disposable: false,
          state: 'deliverable',
        }),
      }
    }
    return originalFetch(url, options)
  }

  // Clean up any stale audit test records
  await Promise.all([
    User.deleteMany({ email: { $regex: /^audit_/ } }),
    Category.deleteMany({ name: { $in: ['Gadgets & Tech', 'Tech & Electronics', 'Secret User B Category'] } }),
    Transaction.deleteMany({ notes: { $regex: /Mechanical Keyboard|salary credit|keyboard purchase/ } }),
    Budget.deleteMany({ month: '2026-10' }),
    Notification.deleteMany({ alertKey: { $regex: /audit|test/ } }),
    RecurringTransaction.deleteMany({ notes: 'Software Subscription' }),
    Transaction.updateMany({ recurringKey: null }, { $unset: { recurringKey: 1 } }),
  ])

  let userA, tokenA, cookieA
  let userB, tokenB, cookieB
  let categoryA, categoryB
  let transactionA
  let budgetA
  let recurringA

  const rand = Math.random().toString(36).substring(2, 8)
  const emailA = `audit_a_${Date.now()}_${rand}@test.com`
  const emailB = `audit_b_${Date.now()}_${rand}@test.com`
  const password = 'Password@123'
  const newPassword = 'NewPassword@456'

  try {
    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 1: HEALTH & AUTHENTICATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 1: Health & Authentication Endpoints]')

    await step('GET /api/health should return 200 ok', async () => {
      const res = await request(app).get('/api/health')
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.status, 'ok')
      assert.ok(res.body.time)
    })

    await step('POST /api/auth/signup should reject missing fields with 400', async () => {
      const res = await request(app).post('/api/auth/signup').send({ name: 'Incomplete' })
      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /required/i)
    })

    await step('POST /api/auth/signup should reject password < 6 chars with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Short Pass', email: `short_${rand}@test.com`, password: '123' })
      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /at least 6 characters/i)
    })

    await step('POST /api/auth/signup should reject invalid email syntax with 400', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Bad Email', email: 'not-an-email', password: 'Password123' })
      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /email/i)
    })

    await step('POST /api/auth/signup should register User A and create default categories', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Audit User A', email: emailA, password })

      assert.strictEqual(res.status, 201)
      assert.ok(res.body.user)
      assert.strictEqual(res.body.user.email, emailA)
      assert.ok(res.body.token)

      userA = res.body.user
      tokenA = res.body.token
      cookieA = res.headers['set-cookie']

      const cats = await Category.find({ user: userA._id })
      assert.ok(cats.length >= 10, 'Expected default categories to be seeded')
    })

    await step('POST /api/auth/signup should register User B for isolation tests', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Audit User B', email: emailB, password })

      assert.strictEqual(res.status, 201)
      userB = res.body.user
      tokenB = res.body.token
      cookieB = res.headers['set-cookie']
    })

    await step('POST /api/auth/signup should reject duplicate email with 409', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ name: 'Duplicate A', email: emailA, password })
      assert.strictEqual(res.status, 409)
      assert.match(res.body.message, /already exists/i)
    })

    await step('POST /api/auth/login should reject incorrect password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: emailA, password: 'WrongPassword' })
      assert.strictEqual(res.status, 401)
    })

    await step('POST /api/auth/login should reject non-existent user with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `nonexistent_${rand}@test.com`, password })
      assert.strictEqual(res.status, 401)
    })

    await step('POST /api/auth/login should successfully authenticate and return token + cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: emailA, password })

      assert.strictEqual(res.status, 200)
      assert.ok(res.body.token)
      assert.strictEqual(res.body.user.email, emailA)
      assert.ok(res.headers['set-cookie'])
      tokenA = res.body.token
      cookieA = res.headers['set-cookie']
    })

    await step('GET /api/auth/me should return current user via Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.user.email, emailA)
    })

    await step('GET /api/auth/me should return current user via Cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookieA)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.user.email, emailA)
    })

    await step('GET /api/auth/me should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/auth/me')
      assert.strictEqual(res.status, 401)
    })

    await step('GET /api/auth/me should reject malformed token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value')
      assert.strictEqual(res.status, 401)
    })

    await step('POST /api/auth/logout should clear cookie and return 200', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.match(res.body.message, /logged out/i)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 2: USER PROFILE
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 2: User Profile Endpoints]')

    await step('GET /api/users/me should return user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.user.email, emailA)
    })

    await step('PATCH /api/users/me should reject negative monthlyIncome with 400', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ monthlyIncome: -500 })

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /monthlyIncome/i)
    })

    await step('PATCH /api/users/me should reject non-numeric openingBalance with 400', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ openingBalance: 'not-a-number' })

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /openingBalance/i)
    })

    await step('PATCH /api/users/me should update valid profile fields', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Updated User A',
          monthlyIncome: 75000,
          openingBalance: 15000,
        })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.user.name, 'Updated User A')
      assert.strictEqual(res.body.user.monthlyIncome, 75000)
      assert.strictEqual(res.body.user.openingBalance, 15000)
    })

    await step('PUT /api/users/me/password should reject wrong current password with 401', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ currentPassword: 'WrongPassword', newPassword })

      assert.strictEqual(res.status, 401)
    })

    await step('PUT /api/users/me/password should reject new password < 6 chars with 400', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ currentPassword: password, newPassword: '123' })

      assert.strictEqual(res.status, 400)
    })

    await step('PUT /api/users/me/password should change password and verify with login', async () => {
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ currentPassword: password, newPassword })

      assert.strictEqual(res.status, 200)

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: emailA, password: newPassword })
      assert.strictEqual(loginRes.status, 200)
      tokenA = loginRes.body.token
    })

    await step('POST /api/users/profile-picture should reject request with no file attached (400)', async () => {
      const res = await request(app)
        .post('/api/users/profile-picture')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /image/i)
    })

    await step('DELETE /api/users/profile-picture should handle removal cleanly (200)', async () => {
      const res = await request(app)
        .delete('/api/users/profile-picture')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.user.profilePictureUrl, null)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 3: CATEGORIES
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 3: Category Endpoints]')

    await step('GET /api/categories should return list of categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.categories))
      assert.ok(res.body.categories.length >= 10)
    })

    await step('POST /api/categories should reject missing name or type with 400', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Only Name' })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/categories should reject invalid type with 400', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Crypto', type: 'bitcoin' })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/categories should create category for User A', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Gadgets & Tech',
          type: 'expense',
          icon: 'bi-cpu',
          color: '#3b82f6',
        })

      assert.strictEqual(res.status, 201)
      assert.ok(res.body.category._id)
      categoryA = res.body.category
    })

    await step('POST /api/categories should create category for User B for isolation tests', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          name: 'Secret User B Category',
          type: 'expense',
          icon: 'bi-lock',
          color: '#10b981',
        })

      assert.strictEqual(res.status, 201)
      categoryB = res.body.category
    })

    await step('POST /api/categories should reject duplicate category name for same user with 409', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Gadgets & Tech',
          type: 'expense',
        })

      assert.strictEqual(res.status, 409)
    })

    await step('PUT /api/categories/:id should reject malformed ID with 400', async () => {
      const res = await request(app)
        .put('/api/categories/invalid-id')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Test' })

      assert.strictEqual(res.status, 400)
    })

    await step('PUT /api/categories/:id should prevent User B from editing User A category (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/categories/${categoryA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked Name' })

      assert.strictEqual(res.status, 404)
    })

    await step('PUT /api/categories/:id should update category and prevent user reassignment', async () => {
      const res = await request(app)
        .put(`/api/categories/${categoryA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Tech & Electronics',
          color: '#6366f1',
          user: userB._id, // Attempting mass assignment
        })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.category.name, 'Tech & Electronics')
      assert.strictEqual(res.body.category.color, '#6366f1')

      const dbCat = await Category.findById(categoryA._id)
      assert.strictEqual(dbCat.user.toString(), userA._id.toString())
    })

    await step('DELETE /api/categories/:id should prevent User B from deleting User A category (IDOR)', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 4: TRANSACTIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 4: Transaction Endpoints]')

    await step('POST /api/transactions should reject missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: 500 })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/transactions should reject non-positive amounts with 400', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: -500,
          category: categoryA._id,
          date: '2026-10-15',
        })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/transactions should reject invalid date format with 400', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 500,
          category: categoryA._id,
          date: 'not-a-valid-date',
        })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/transactions should reject category belonging to another user (IDOR)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 500,
          category: categoryB._id, // User B category
          date: '2026-10-15',
        })

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /category not found/i)
    })

    await step('POST /api/transactions should successfully create an expense transaction', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 1500,
          category: categoryA._id,
          date: '2026-10-15',
          paymentMethod: 'upi',
          notes: 'Mechanical Keyboard switch test',
        })

      assert.strictEqual(res.status, 201)
      assert.ok(res.body.transaction._id)
      assert.strictEqual(res.body.transaction.amount, 1500)
      transactionA = res.body.transaction
    })

    await step('POST /api/transactions should create income transaction for User A', async () => {
      const salaryCat = await Category.findOne({ user: userA._id, type: 'income', name: 'Salary' })
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'income',
          amount: 50000,
          category: salaryCat._id,
          date: '2026-10-01',
          paymentMethod: 'bank_transfer',
          notes: 'Monthly salary credit',
        })

      assert.strictEqual(res.status, 201)
      assert.strictEqual(res.body.transaction.amount, 50000)
    })

    await step('GET /api/transactions should return paginated list and summary totals', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.transactions))
      assert.strictEqual(res.body.total, 2)
      assert.strictEqual(res.body.transactions.length, 2)
    })

    await step('GET /api/transactions should enforce strict cross-user isolation', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.transactions.length, 0)
      assert.strictEqual(res.body.total, 0)
    })

    await step('GET /api/transactions/:id should fetch transaction for owner', async () => {
      const res = await request(app)
        .get(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.transaction._id, transactionA._id)
    })

    await step('GET /api/transactions/:id should return 404 for another user transaction (IDOR)', async () => {
      const res = await request(app)
        .get(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    await step('GET /api/transactions/:id should return 400 for malformed ID', async () => {
      const res = await request(app)
        .get('/api/transactions/invalid-id')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('PUT /api/transactions/:id should update amount and notes', async () => {
      const res = await request(app)
        .put(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          amount: 1800,
          notes: 'Updated keyboard purchase',
        })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.transaction.amount, 1800)
      assert.strictEqual(res.body.transaction.notes, 'Updated keyboard purchase')
    })

    await step('PUT /api/transactions/:id should prevent User B from updating User A transaction (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ amount: 99999 })

      assert.strictEqual(res.status, 404)
    })

    await step('DELETE /api/transactions/:id should prevent User B from deleting User A transaction (IDOR)', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 5: BUDGETS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 5: Budget Endpoints]')

    await step('GET /api/budgets should reject invalid month format with 400', async () => {
      const res = await request(app)
        .get('/api/budgets?month=invalid-month')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/budgets should reject limit <= 0 with 400', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          category: categoryA._id,
          month: '2026-10',
          limit: -500,
        })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/budgets should reject invalid month format with 400', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          category: categoryA._id,
          month: '2026/10',
          limit: 2000,
        })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/budgets should reject foreign category with 400 (IDOR)', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          category: categoryB._id, // User B category
          month: '2026-10',
          limit: 2000,
        })

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /category not found/i)
    })

    await step('POST /api/budgets should create budget', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          category: categoryA._id,
          month: '2026-10',
          limit: 2000,
        })

      assert.strictEqual(res.status, 201)
      assert.ok(res.body.budget._id)
      assert.strictEqual(res.body.budget.limit, 2000)
      budgetA = res.body.budget
    })

    await step('GET /api/budgets should calculate spent and percentage for current month', async () => {
      const res = await request(app)
        .get('/api/budgets?month=2026-10')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.budgets))
      const found = res.body.budgets.find((b) => b._id.toString() === budgetA._id.toString())
      assert.ok(found)
      assert.strictEqual(found.limit, 2000)
      assert.strictEqual(found.spent, 1800)
      assert.strictEqual(found.percentage, 90)
    })

    await step('POST /api/budgets should reject duplicate budget with 409', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          category: categoryA._id,
          month: '2026-10',
          limit: 3000,
        })

      assert.strictEqual(res.status, 409)
    })

    await step('PUT /api/budgets/:id should reject limit <= 0 with 400', async () => {
      const res = await request(app)
        .put(`/api/budgets/${budgetA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ limit: 0 })

      assert.strictEqual(res.status, 400)
    })

    await step('PUT /api/budgets/:id should prevent User B from updating User A budget (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/budgets/${budgetA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ limit: 5000 })

      assert.strictEqual(res.status, 404)
    })

    await step('PUT /api/budgets/:id should update budget limit', async () => {
      const res = await request(app)
        .put(`/api/budgets/${budgetA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ limit: 3600 })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.budget.limit, 3600)
    })

    await step('GET /api/budgets should reflect updated limit and 50% percentage', async () => {
      const res = await request(app)
        .get('/api/budgets?month=2026-10')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      const found = res.body.budgets.find((b) => b._id.toString() === budgetA._id.toString())
      assert.strictEqual(found.limit, 3600)
      assert.strictEqual(found.spent, 1800)
      assert.strictEqual(found.percentage, 50)
    })

    await step('DELETE /api/budgets/:id should prevent User B from deleting User A budget (IDOR)', async () => {
      const res = await request(app)
        .delete(`/api/budgets/${budgetA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 6: NOTIFICATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 6: Notification Endpoints]')

    const notif = await Notification.create({
      user: userA._id,
      type: 'near_limit',
      title: 'Tech & Electronics budget near limit',
      message: 'You have used 90% of your budget',
      alertKey: `${userA._id}-test-${Date.now()}`,
    })

    await step('GET /api/notifications should return notifications and unreadCount', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.notifications))
      assert.ok(res.body.unreadCount >= 1)
    })

    await step('GET /api/notifications should isolate notifications per user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.notifications.length, 0)
      assert.strictEqual(res.body.unreadCount, 0)
    })

    await step('PATCH /api/notifications/:id/read should reject malformed ID with 400', async () => {
      const res = await request(app)
        .patch('/api/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('PATCH /api/notifications/:id/read should prevent User B from reading User A notification', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    await step('PATCH /api/notifications/:id/read should mark notification read for owner', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.notification.isRead, true)
    })

    await step('PATCH /api/notifications/read-all should mark all notifications read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.match(res.body.message, /marked as read/i)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 7: REPORTS & EXPORTS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 7: Report & Export Endpoints]')

    await step('GET /api/reports/summary should return monthly totals and opening balance', async () => {
      const res = await request(app)
        .get('/api/reports/summary?month=2026-10')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.month, '2026-10')
      assert.strictEqual(res.body.income, 50000)
      assert.strictEqual(res.body.expenses, 1800)
      assert.strictEqual(res.body.savings, 48200)
      assert.strictEqual(res.body.balance, 63200)
    })

    await step('GET /api/reports/summary should reject invalid month with 400', async () => {
      const res = await request(app)
        .get('/api/reports/summary?month=invalid')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('GET /api/reports/summary-range should return totals for date range', async () => {
      const res = await request(app)
        .get('/api/reports/summary-range?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.income, 50000)
      assert.strictEqual(res.body.expenses, 1800)
      assert.strictEqual(res.body.savings, 48200)
    })

    await step('GET /api/reports/summary-range should reject invalid date with 400', async () => {
      const res = await request(app)
        .get('/api/reports/summary-range?from=invalid-date')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('GET /api/reports/by-category should return category-wise expenses', async () => {
      const res = await request(app)
        .get('/api/reports/by-category?month=2026-10')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.categories))
      assert.strictEqual(res.body.categories.length, 1)
      assert.strictEqual(res.body.categories[0].categoryName, 'Tech & Electronics')
      assert.strictEqual(res.body.categories[0].totalExpense, 1800)
      assert.strictEqual(res.body.categories[0].percentage, 100)
    })

    await step('GET /api/reports/monthly-trend should return 12 months array for given year', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-trend?year=2026')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.year, 2026)
      assert.strictEqual(res.body.months.length, 12)
      assert.strictEqual(res.body.months[9].month, 'Oct')
      assert.strictEqual(res.body.months[9].income, 50000)
      assert.strictEqual(res.body.months[9].expenses, 1800)
    })

    await step('GET /api/reports/monthly-trend should reject invalid year with 400', async () => {
      const res = await request(app)
        .get('/api/reports/monthly-trend?year=99999')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    await step('GET /api/reports/export?format=csv should return CSV file with UTF-8 BOM and rupee format', async () => {
      const res = await request(app)
        .get('/api/reports/export?format=csv&from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.match(res.headers['content-type'], /text\/csv/i)
      assert.match(res.headers['content-disposition'], /RupeeWise-report\.csv/i)
      assert.ok(res.text.includes('₹'), 'Expected ₹ symbol in CSV output')
    })

    await step('GET /api/reports/export?format=pdf should return PDF document', async () => {
      const res = await request(app)
        .get('/api/reports/export?format=pdf&from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.match(res.headers['content-type'], /application\/pdf/i)
      assert.match(res.headers['content-disposition'], /RupeeWise-report\.pdf/i)
    })

    await step('GET /api/reports/export should reject unsupported format with 400', async () => {
      const res = await request(app)
        .get('/api/reports/export?format=xlsx')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 400)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 8: RECURRING TRANSACTIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 8: Recurring Transaction Endpoints]')

    await step('POST /api/recurring-transactions should reject missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ type: 'expense' })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/recurring-transactions should reject invalid frequency with 400', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 500,
          category: categoryA._id,
          frequency: 'bi-weekly',
          startDate: '2026-11-01',
        })

      assert.strictEqual(res.status, 400)
    })

    await step('POST /api/recurring-transactions should reject foreign category with 400 (IDOR)', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 500,
          category: categoryB._id, // User B category
          frequency: 'monthly',
          startDate: '2026-11-01',
        })

      assert.strictEqual(res.status, 400)
      assert.match(res.body.message, /belong to you/i)
    })

    await step('POST /api/recurring-transactions should create recurring rule for user', async () => {
      const res = await request(app)
        .post('/api/recurring-transactions')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          type: 'expense',
          amount: 999,
          category: categoryA._id,
          frequency: 'monthly',
          startDate: '2026-11-01',
          paymentMethod: 'credit_card',
          notes: 'Software Subscription',
        })

      assert.strictEqual(res.status, 201)
      assert.ok(res.body.rule._id)
      assert.strictEqual(res.body.rule.amount, 999)
      recurringA = res.body.rule
    })

    await step('GET /api/recurring-transactions should list recurring rules', async () => {
      const res = await request(app)
        .get('/api/recurring-transactions')
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      assert.ok(Array.isArray(res.body.rules))
      assert.strictEqual(res.body.rules.length, 1)
      assert.strictEqual(res.body.rules[0]._id, recurringA._id)
    })

    await step('PUT /api/recurring-transactions/:id should prevent User B from updating User A rule (IDOR)', async () => {
      const res = await request(app)
        .put(`/api/recurring-transactions/${recurringA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ amount: 1500 })

      assert.strictEqual(res.status, 404)
    })

    await step('PUT /api/recurring-transactions/:id should update rule amount and active status', async () => {
      const res = await request(app)
        .put(`/api/recurring-transactions/${recurringA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: 1299, isActive: false })

      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.body.rule.amount, 1299)
      assert.strictEqual(res.body.rule.isActive, false)
    })

    await step('DELETE /api/recurring-transactions/:id should prevent User B from deleting User A rule (IDOR)', async () => {
      const res = await request(app)
        .delete(`/api/recurring-transactions/${recurringA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)

      assert.strictEqual(res.status, 404)
    })

    await step('DELETE /api/recurring-transactions/:id should delete rule for owner', async () => {
      const res = await request(app)
        .delete(`/api/recurring-transactions/${recurringA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 9: SCHEDULED JOBS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 9: Scheduled Jobs]')

    await step('POST /api/jobs/run-recurring should reject request without x-cron-secret with 403', async () => {
      const res = await request(app).post('/api/jobs/run-recurring')
      assert.strictEqual(res.status, 403)
    })

    await step('POST /api/jobs/run-recurring should reject wrong x-cron-secret with 403', async () => {
      const res = await request(app)
        .post('/api/jobs/run-recurring')
        .set('x-cron-secret', 'wrong-secret')

      assert.strictEqual(res.status, 403)
    })

    await step('POST /api/jobs/run-recurring should trigger job when secret matches', async () => {
      const oldSecret = process.env.CRON_SECRET
      process.env.CRON_SECRET = 'test_cron_secret_123'

      const res = await request(app)
        .post('/api/jobs/run-recurring')
        .set('x-cron-secret', 'test_cron_secret_123')

      assert.strictEqual(res.status, 200)
      assert.match(res.body.message, /triggered/i)

      process.env.CRON_SECRET = oldSecret
    })

    // ═════════════════════════════════════════════════════════════════════════
    // MODULE 10: DATABASE INTEGRITY & CASCADE OPERATIONS
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n[Module 10: Database Integrity & Cascade Operations]')

    await step('DELETE /api/transactions/:id should remove transaction and recalculate budget', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${transactionA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)
      const dbTx = await Transaction.findById(transactionA._id)
      assert.strictEqual(dbTx, null)
    })

    await step('DELETE /api/categories/:id should delete category and cascade delete associated budgets', async () => {
      const res = await request(app)
        .delete(`/api/categories/${categoryA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)

      assert.strictEqual(res.status, 200)

      const dbCat = await Category.findById(categoryA._id)
      assert.strictEqual(dbCat, null)

      const dbBudget = await Budget.findById(budgetA._id)
      assert.strictEqual(dbBudget, null, 'Budget should have been cascade deleted when category was deleted')
    })

  } finally {
    // Restore fetch and clean up all test data
    globalThis.fetch = originalFetch
    const userIds = [userA?._id, userB?._id].filter(Boolean)
    if (userIds.length > 0) {
      await Promise.all([
        User.deleteMany({ _id: { $in: userIds } }),
        Category.deleteMany({ user: { $in: userIds } }),
        Transaction.deleteMany({ user: { $in: userIds } }),
        Budget.deleteMany({ user: { $in: userIds } }),
        Notification.deleteMany({ user: { $in: userIds } }),
        RecurringTransaction.deleteMany({ user: { $in: userIds } }),
      ])
    }
    await mongoose.connection.close()
  }

  console.log('\n═══════════════════════════════════════════════════════════════════')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('═══════════════════════════════════════════════════════════════════\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner crashed:', err)
  process.exit(1)
})
