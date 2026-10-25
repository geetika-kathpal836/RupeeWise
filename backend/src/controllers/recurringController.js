import mongoose from 'mongoose'
import RecurringTransaction from '../models/RecurringTransaction.js'
import Category from '../models/Category.js'
import { computeNextDue, toNumber } from '../utils/dateUtils.js'

function serializeRule(r) {
  return {
    _id:           r._id,
    type:          r.type,
    amount:        toNumber(r.amount),
    category:      r.category,
    paymentMethod: r.paymentMethod,
    notes:         r.notes,
    frequency:     r.frequency,
    startDate:     r.startDate,
    endDate:       r.endDate,
    nextDueDate:   r.nextDueDate,
    isActive:      r.isActive,
    createdAt:     r.createdAt,
  }
}

export async function getRules(req, res, next) {
  try {
    const rules = await RecurringTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('category', 'name icon color type')
    res.json({ rules: rules.map(serializeRule) })
  } catch (err) { next(err) }
}

export async function createRule(req, res, next) {
  try {
    const { type, amount, category, paymentMethod, notes, frequency, startDate, endDate } = req.body
    if (!type || !amount || !category || !frequency || !startDate)
      return res.status(400).json({ message: 'type, amount, category, frequency, and startDate are required.' })

    if (!['income', 'expense'].includes(type))
      return res.status(400).json({ message: 'type must be income or expense.' })

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ message: 'amount must be a positive number.' })

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency))
      return res.status(400).json({ message: 'frequency must be daily, weekly, monthly, or yearly.' })

    if (isNaN(new Date(startDate).getTime()))
      return res.status(400).json({ message: 'Invalid startDate.' })

    if (endDate && isNaN(new Date(endDate).getTime()))
      return res.status(400).json({ message: 'Invalid endDate.' })

    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ message: 'Invalid category ID.' })

    const cat = await Category.findOne({ _id: category, user: req.user._id })
    if (!cat)
      return res.status(400).json({ message: 'Category not found or does not belong to you.' })

    const start = new Date(startDate)
    const rule  = await RecurringTransaction.create({
      user:          req.user._id,
      type,
      amount:        parsedAmount,
      category,
      paymentMethod: paymentMethod || 'upi',
      notes:         notes?.trim() || '',
      frequency,
      startDate:     start,
      endDate:       endDate ? new Date(endDate) : null,
      nextDueDate:   start,
    })
    const populated = await rule.populate('category', 'name icon color type')
    res.status(201).json({ rule: serializeRule(populated) })
  } catch (err) { next(err) }
}

export async function updateRule(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid rule ID.' })

    const rule = await RecurringTransaction.findOne({ _id: req.params.id, user: req.user._id })
    if (!rule) return res.status(404).json({ message: 'Recurring rule not found.' })

    if (req.body.type && !['income', 'expense'].includes(req.body.type))
      return res.status(400).json({ message: 'type must be income or expense.' })

    if (req.body.amount !== undefined) {
      const parsedAmount = parseFloat(req.body.amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0)
        return res.status(400).json({ message: 'amount must be a positive number.' })
    }

    if (req.body.frequency && !['daily', 'weekly', 'monthly', 'yearly'].includes(req.body.frequency))
      return res.status(400).json({ message: 'frequency must be daily, weekly, monthly, or yearly.' })

    if (req.body.startDate && isNaN(new Date(req.body.startDate).getTime()))
      return res.status(400).json({ message: 'Invalid startDate.' })

    if (req.body.endDate && isNaN(new Date(req.body.endDate).getTime()))
      return res.status(400).json({ message: 'Invalid endDate.' })

    if (req.body.category) {
      if (!mongoose.Types.ObjectId.isValid(req.body.category))
        return res.status(400).json({ message: 'Invalid category ID.' })
      const cat = await Category.findOne({ _id: req.body.category, user: req.user._id })
      if (!cat) return res.status(400).json({ message: 'Category not found or does not belong to you.' })
    }

    const allowed = ['type','amount','category','paymentMethod','notes','frequency','startDate','endDate','isActive']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'amount') rule.amount = parseFloat(req.body.amount)
        else if (key === 'startDate') rule.startDate = new Date(req.body.startDate)
        else if (key === 'endDate')   rule.endDate   = req.body.endDate ? new Date(req.body.endDate) : null
        else rule[key] = req.body[key]
      }
    }

    await rule.save()
    const populated = await rule.populate('category', 'name icon color type')
    res.json({ rule: serializeRule(populated) })
  } catch (err) { next(err) }
}

export async function deleteRule(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
      return res.status(400).json({ message: 'Invalid rule ID.' })

    const rule = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!rule) return res.status(404).json({ message: 'Recurring rule not found.' })
    res.json({ message: 'Recurring rule deleted.' })
  } catch (err) { next(err) }
}
