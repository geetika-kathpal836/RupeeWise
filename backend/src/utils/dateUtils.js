import { parseISO, startOfMonth, endOfMonth, format } from 'date-fns'

/**
 * Parse 'YYYY-MM' into { start: Date, end: Date } for that month.
 */
export function monthToDateRange(monthKey) {
  const base  = parseISO(`${monthKey}-01`)
  return {
    start: startOfMonth(base),
    end:   endOfMonth(base),
  }
}

/**
 * Return 'YYYY-MM' for a given Date.
 */
export function toMonthKey(date = new Date()) {
  return format(date, 'yyyy-MM')
}

/**
 * Convert a Decimal128 or number to a plain JS number.
 */
export function toNumber(val) {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  if (val.constructor?.name === 'Decimal128') return parseFloat(val.toString())
  return parseFloat(String(val)) || 0
}

/**
 * Compute next due date given frequency and a reference date.
 */
export function computeNextDue(frequency, from) {
  const d = new Date(from)
  switch (frequency) {
    case 'daily':   d.setDate(d.getDate() + 1);       break
    case 'weekly':  d.setDate(d.getDate() + 7);       break
    case 'monthly': d.setMonth(d.getMonth() + 1);     break
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break
  }
  return d
}
