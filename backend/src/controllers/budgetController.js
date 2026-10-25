import mongoose from 'mongoose'
import Budget     from '../models/Budget.js'
import Transaction from '../models/Transaction.js'
import Category   from '../models/Category.js'
import { monthToDateRange, toNumber } from '../utils/dateUtils.js'
import { checkBudgetAlerts } from '../services/alertService.js'

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

export async function getBudgets(req, res, next) {
  try {
    const userId = req.user._id
    const month  = req.query.month || new Date().toISOString().slice(0, 7)

    if (!MONTH_REGEX.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format.' })
    }

    const { start, end } = monthToDateRange(month)

    // Get all budgets for this user+month
    const budgets = await Budget.find({ user: userId, month }).populate('category', 'name icon color type')

    // Aggregate spending per category for this month
    const spendingAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$category', spent: { $sum: { $toDouble: '$amount' } } } },
    ])

    const spendingMap = {}
    for (const s of spendingAgg) spendingMap[s._id.toString()] = s.spent

    const result = budgets.map((b) => {
      const catId = b.category?._id?.toString()
      const spent = spendingMap[catId] || 0
      const limit = toNumber(b.limit)
      return {
        _id:           b._id,
        category:      b.category?._id,
        categoryName:  b.category?.name,
        categoryColor: b.category?.color,
        categoryIcon:  b.category?.icon,
        month:         b.month,
        limit,
        spent,
        remaining:     limit - spent,
        percentage:    limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0,
      }
    })

    res.json({ budgets: result })
  } catch (err) { next(err) }
}

function serializeBudget(b) {
  return {
    _id:       b._id,
    user:      b.user,
    category:  b.category,
    month:     b.month,
    limit:     toNumber(b.limit),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }
}

export async function createBudget(req, res, next) {
  try {
    const { category, month, limit } = req.body
    if (!category || !month || !limit)
      return res.status(400).json({ message: 'category, month, and limit are required.' })

    if (!MONTH_REGEX.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format.' })
    }

    if (isNaN(parseFloat(limit)) || parseFloat(limit) <= 0)
      return res.status(400).json({ message: 'limit must be a positive number.' })

    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ message: 'Invalid category ID.' })

    const cat = await Category.findOne({ _id: category, user: req.user._id })
    if (!cat)
      return res.status(400).json({ message: 'Category not found.' })

    const budget = await Budget.create({
      user: req.user._id, category, month, limit: parseFloat(limit),
    })
    checkBudgetAlerts(req.user._id.toString(), month).catch(() => {})
    res.status(201).json({ budget: serializeBudget(budget) })
  } catch (err) { next(err) }
}

export async function updateBudget(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid budget ID.' })
    }

    const { limit } = req.body
    if (limit === undefined || isNaN(parseFloat(limit)) || parseFloat(limit) <= 0)
      return res.status(400).json({ message: 'limit must be a positive number.' })

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { limit: parseFloat(limit) } },
      { returnDocument: 'after' }
    )
    if (!budget) return res.status(404).json({ message: 'Budget not found.' })
    checkBudgetAlerts(req.user._id.toString(), budget.month).catch(() => {})
    res.json({ budget: serializeBudget(budget) })
  } catch (err) { next(err) }
}

export async function deleteBudget(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid budget ID.' })
    }

    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!budget) return res.status(404).json({ message: 'Budget not found.' })
    res.json({ message: 'Budget deleted.' })
  } catch (err) { next(err) }
}
