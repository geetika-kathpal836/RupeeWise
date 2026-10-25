import RecurringTransaction from '../models/RecurringTransaction.js'
import Transaction          from '../models/Transaction.js'
import { computeNextDue, toMonthKey, toNumber } from '../utils/dateUtils.js'
import { checkBudgetAlerts } from './alertService.js'

/**
 * Process all due recurring transactions.
 * Safe to call multiple times — idempotent via recurringKey.
 */
export async function processRecurringTransactions() {
  const now = new Date()
  console.log(`[RecurringJob] Running at ${now.toISOString()}`)

  try {
    // Find all active rules that are due
    const dueRules = await RecurringTransaction.find({
      isActive:    true,
      nextDueDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    })

    console.log(`[RecurringJob] ${dueRules.length} rule(s) due`)

    for (const rule of dueRules) {
      // Process rule — may have multiple missed periods
      let current = new Date(rule.nextDueDate)

      while (current <= now) {
        // Check end date
        if (rule.endDate && current > rule.endDate) break

        const recurringKey = `${rule._id}-${current.toISOString().slice(0, 10)}`

        try {
          await Transaction.create({
            user:          rule.user,
            type:          rule.type,
            amount:        rule.amount,
            category:      rule.category,
            date:          new Date(current),
            paymentMethod: rule.paymentMethod,
            notes:         rule.notes || '',
            recurringId:   rule._id,
            recurringKey,
          })
          console.log(`[RecurringJob] Created transaction for rule ${rule._id} on ${recurringKey}`)

          // Check budget alerts
          const mk = toMonthKey(current)
          await checkBudgetAlerts(rule.user.toString(), mk)
        } catch (err) {
          if (err.code === 11000) {
            // Already created — skip
          } else {
            console.error(`[RecurringJob] Error creating txn for ${recurringKey}:`, err.message)
          }
        }

        // Advance to next occurrence
        current = computeNextDue(rule.frequency, current)
      }

      // Update nextDueDate on the rule
      await RecurringTransaction.findByIdAndUpdate(rule._id, { nextDueDate: current })
    }

    console.log('[RecurringJob] Done')
  } catch (err) {
    console.error('[RecurringJob] Fatal error:', err.message)
  }
}
