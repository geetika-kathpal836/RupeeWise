import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Category from '../models/Category.js'
import { validateEmail } from '../services/emailValidationService.js'

const DEFAULT_CATEGORIES = [
  // Expense
  { name: 'Food & Dining',     type: 'expense', icon: 'bi-basket',        color: '#f97316' },
  { name: 'Shopping',          type: 'expense', icon: 'bi-bag',            color: '#ec4899' },
  { name: 'Transportation',    type: 'expense', icon: 'bi-bus-front',      color: '#06b6d4' },
  { name: 'Education',         type: 'expense', icon: 'bi-mortarboard',    color: '#8b5cf6' },
  { name: 'Entertainment',     type: 'expense', icon: 'bi-film',           color: '#f59e0b' },
  { name: 'Health',            type: 'expense', icon: 'bi-heart-pulse',    color: '#ef4444' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'bi-lightbulb',      color: '#3b82f6' },
  { name: 'Travel',            type: 'expense', icon: 'bi-airplane',       color: '#14b8a6' },
  { name: 'Rent',              type: 'expense', icon: 'bi-house',          color: '#84cc16' },
  { name: 'Other Expenses',    type: 'expense', icon: 'bi-three-dots',     color: '#64748b' },
  // Income
  { name: 'Salary',            type: 'income',  icon: 'bi-briefcase',      color: '#10b981' },
  { name: 'Freelancing',       type: 'income',  icon: 'bi-laptop',         color: '#3b82f6' },
  { name: 'Business',          type: 'income',  icon: 'bi-building',       color: '#8b5cf6' },
  { name: 'Investments',       type: 'income',  icon: 'bi-graph-up',       color: '#f59e0b' },
  { name: 'Other Income',      type: 'income',  icon: 'bi-star',           color: '#64748b' },
]

function issueToken(res, userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
  const isSecure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true'
  res.cookie('token', token, {
    httpOnly: true,
    secure:   isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  })
  return token
}

export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ message: 'Name, email, and password are required.' })

    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' })

    // Validate email syntax and deliverability via emailvalidation.io
    const emailValidation = await validateEmail(email)
    if (!emailValidation.valid) {
      return res.status(400).json({ message: emailValidation.message })
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing)
      return res.status(409).json({ message: 'An account with this email already exists.' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    })

    // Seed default categories for the new user
    const cats = DEFAULT_CATEGORIES.map((c) => ({ ...c, user: user._id }))
    await Category.insertMany(cats, { ordered: false }).catch(() => {})

    const token = issueToken(res, user._id)
    res.status(201).json({ user: user.toSafeObject(), token })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email?.trim() || !password)
      return res.status(400).json({ message: 'Email and password are required.' })

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password.' })

    const valid = await user.comparePassword(password)
    if (!valid)
      return res.status(401).json({ message: 'Invalid email or password.' })

    const token = issueToken(res, user._id)
    res.json({ user: user.toSafeObject(), token })
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res) {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true'
  res.clearCookie('token', {
    httpOnly: true,
    secure:   isSecure,
    sameSite: isSecure ? 'none' : 'lax',
  })
  res.json({ message: 'Logged out.' })
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user })
}
