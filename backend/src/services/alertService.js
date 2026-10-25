import mongoose from 'mongoose'
import Transaction from '../models/Transaction.js'
import Budget from '../models/Budget.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { monthToDateRange, toMonthKey, toNumber } from '../utils/dateUtils.js'
import { sendEmail } from './emailService.js'

/**
 * Check budget thresholds for a user after any transaction change.
 * Generates idempotent in-app + email alerts at 80% and 100%.
 */
export async function checkBudgetAlerts(userId, monthKey) {
  try {
    const mk = monthKey || toMonthKey()
    const { start, end } = monthToDateRange(mk)

    // Fetch all expense budgets for this user+month
    const budgets = await Budget.find({ user: userId, month: mk }).populate('category')

    if (!budgets.length) return

    // Aggregate spending per category for this month
    const spendingAgg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ])

    const spendingMap = {}
    for (const s of spendingAgg) {
      spendingMap[s._id.toString()] = s.total
    }

    const user = await User.findById(userId).select('email name')

    for (const budget of budgets) {
      const catId = budget.category?._id?.toString() || budget.category?.toString()
      if (!catId) continue
      const spent = spendingMap[catId] || 0
      const limit = toNumber(budget.limit)
      if (limit <= 0) continue

      const pct = (spent / limit) * 100

      // Check 80% threshold
      if (pct >= 80) {
        await createAlert({
          userId,
          budget,
          threshold: 80,
          pct,
          spent,
          limit,
          alertType: pct >= 100 ? 'over_budget' : 'near_limit',
          user,
          mk,
        })
      }

      // Check 100% threshold (separate alert)
      if (pct >= 100) {
        await createAlert({
          userId,
          budget,
          threshold: 100,
          pct,
          spent,
          limit,
          alertType: 'over_budget',
          user,
          mk,
        })
      }
    }
  } catch (err) {
    console.error('[AlertService] Error:', err.message)
  }
}

async function createAlert({ userId, budget, threshold, pct, spent, limit, alertType, user, mk }) {
  const budgetId = budget._id.toString()
  const catName = budget.category?.name || 'Unknown'
  const alertKey = `${userId}-${budgetId}-${mk}-${threshold}`

  // Idempotency — skip if already notified for this key
  const existing = await Notification.findOne({ alertKey })
  if (existing) return

  const title = threshold >= 100
    ? `${catName} budget fully used`
    : `${catName} budget at ${threshold}%`

  const message = threshold >= 100
    ? pct > 100
      ? `You've exceeded your ${catName} budget. Spent ₹${spent.toFixed(0)} of ₹${limit.toFixed(0)}.`
      : `You've used your entire ${catName} budget of ₹${limit.toFixed(0)} this month.`
    : `You've spent ₹${spent.toFixed(0)} of your ₹${limit.toFixed(0)} ${catName} budget (${pct.toFixed(0)}% used).`

  try {
    await Notification.create({
      user: userId,
      budget: budget._id,
      category: budget.category._id,
      alertType,
      title,
      message,
      alertKey,
    })
    console.log(`[AlertService] Created alert: ${alertKey}`)
  } catch (err) {
    if (err.code === 11000) return // Race condition — already created
    throw err
  }

  // Send email (fire-and-forget)
  if (user?.email) {
    sendEmail({
      to: user.email,
      subject: `RupeeWise: ${title}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#1e3a5f">Budget Alert</h2>
          <p>${message}</p>
          <p style="color:#64748b;font-size:0.85rem">
            Log in to RupeeWise to view your spending details.
          </p>
        </div>
      `,
    }).catch(() => { })
  }
}
