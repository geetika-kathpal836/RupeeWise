import mongoose from 'mongoose'
import Transaction  from '../models/Transaction.js'
import Category     from '../models/Category.js'
import { checkBudgetAlerts } from '../services/alertService.js'
import { toMonthKey, toNumber }  from '../utils/dateUtils.js'

function serializeTxn(t) {
  return {
    _id:           t._id,
    type:          t.type,
    amount:        toNumber(t.amount),
    category:      t.category,
    date:          t.date,
    paymentMethod: t.paymentMethod,
    notes:         t.notes,
    recurringId:   t.recurringId,
    createdAt:     t.createdAt,
  }
}

export async function getTransactions(req, res, next) {
  try {
    const userId = req.user._id
    const {
      page  = 1, limit = 20,
      type, category, paymentMethod,
      from, to, q,
    } = req.query

    const parsedPage = parseInt(page)
    const parsedLimit = parseInt(limit)
    if (isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({ message: 'Invalid page number.' })
    }
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ message: 'Invalid limit number.' })
    }

    const match = { user: userId }
    if (type) match.type = type
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Invalid category ID.' })
      }
      match.category = new mongoose.Types.ObjectId(category)
    }
    if (paymentMethod) match.paymentMethod = paymentMethod
    if (from || to) {
      match.date = {}
      if (from) {
        if (isNaN(new Date(from).getTime())) return res.status(400).json({ message: 'Invalid from date.' })
        match.date.$gte = new Date(from)
      }
      if (to) {
        if (isNaN(new Date(to).getTime())) return res.status(400).json({ message: 'Invalid to date.' })
        match.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999))
      }
    }
    if (q) match.notes = { $regex: q.trim(), $options: 'i' }

    const skip     = (parsedPage - 1) * parsedLimit
    const limitNum = parsedLimit

    const [transactions, total] = await Promise.all([
      Transaction.find(match)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('category', 'name icon color type'),
      Transaction.countDocuments(match),
    ])

    res.json({
      transactions: transactions.map(serializeTxn),
      total,
      page:  parsedPage,
      pages: Math.ceil(total / limitNum) || 1,
    })
  } catch (err) { next(err) }
}

export async function createTransaction(req, res, next) {
  try {
    const userId = req.user._id
    const { type, amount, category, date, paymentMethod, notes } = req.body

    if (!type || !amount || !category || !date)
      return res.status(400).json({ message: 'type, amount, category, and date are required.' })

    if (!['income', 'expense'].includes(type))
      return res.status(400).json({ message: 'type must be income or expense.' })

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return res.status(400).json({ message: 'amount must be a positive number.' })

    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ message: 'Invalid category ID.' })

    const cat = await Category.findOne({ _id: category, user: userId })
    if (!cat)
      return res.status(400).json({ message: 'Category not found.' })

    if (isNaN(new Date(date).getTime()))
      return res.status(400).json({ message: 'Invalid date.' })

    const txn = await Transaction.create({
      user:          userId,
      type,
      amount:        parseFloat(amount),
      category,
      date:          new Date(date),
      paymentMethod: paymentMethod || 'upi',
      notes:         notes?.trim() || '',
    })

    const populated = await txn.populate('category', 'name icon color type')

    // Async alert check
    if (type === 'expense') {
      const mk = toMonthKey(new Date(date))
      checkBudgetAlerts(userId.toString(), mk).catch(() => {})
    }

    res.status(201).json({ transaction: serializeTxn(populated) })
  } catch (err) { next(err) }
}

export async function getTransaction(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID.' })
    }

    const txn = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate('category', 'name icon color type')
    if (!txn) return res.status(404).json({ message: 'Transaction not found.' })
    res.json({ transaction: serializeTxn(txn) })
  } catch (err) { next(err) }
}

export async function updateTransaction(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID.' })
    }

    const txn = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
    if (!txn) return res.status(404).json({ message: 'Transaction not found.' })

    const { type, amount, category, date, paymentMethod, notes } = req.body

    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ message: 'type must be income or expense.' })
      }
      txn.type = type
    }

    if (amount !== undefined) {
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'amount must be a positive number.' })
      }
      txn.amount = parseFloat(amount)
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Invalid category ID.' })
      }
      const cat = await Category.findOne({ _id: category, user: req.user._id })
      if (!cat) return res.status(400).json({ message: 'Category not found.' })
      txn.category = category
    }

    if (date !== undefined) {
      if (isNaN(new Date(date).getTime())) {
        return res.status(400).json({ message: 'Invalid date.' })
      }
      txn.date = new Date(date)
    }

    if (paymentMethod !== undefined) txn.paymentMethod = paymentMethod
    if (notes !== undefined) txn.notes = notes.trim()

    await txn.save()
    const populated = await txn.populate('category', 'name icon color type')

    // Re-check alerts for both old and new months
    checkBudgetAlerts(req.user._id.toString(), toMonthKey(txn.date)).catch(() => {})

    res.json({ transaction: serializeTxn(populated) })
  } catch (err) { next(err) }
}

export async function deleteTransaction(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID.' })
    }

    const txn = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!txn) return res.status(404).json({ message: 'Transaction not found.' })

    checkBudgetAlerts(req.user._id.toString(), toMonthKey(txn.date)).catch(() => {})

    res.json({ message: 'Transaction deleted.' })
  } catch (err) { next(err) }
}
