import { format, parseISO, startOfMonth, endOfMonth, isValid } from 'date-fns'

/**
 * Format a monetary amount with currency symbol.
 * @param {number|string} amount
 * @param {string} currency  e.g. 'INR', 'USD'
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format a date string (ISO) into a readable form.
 * @param {string|Date} date
 * @param {string} fmt  date-fns format string
 */
export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, fmt)
}

/**
 * Return 'YYYY-MM' string for the given Date.
 */
export function toMonthKey(date = new Date()) {
  return format(date, 'yyyy-MM')
}

/**
 * Parse 'YYYY-MM' to a JS Date at the start of that month.
 */
export function fromMonthKey(key) {
  return startOfMonth(parseISO(`${key}-01`))
}

/**
 * Get ISO date range for a 'YYYY-MM' key.
 */
export function monthKeyToRange(key) {
  const start = startOfMonth(parseISO(`${key}-01`))
  const end   = endOfMonth(start)
  return {
    from: format(start, 'yyyy-MM-dd'),
    to:   format(end,   'yyyy-MM-dd'),
  }
}

/**
 * Human-readable month label: 'October 2026'
 */
export function monthLabel(key) {
  const d = fromMonthKey(key)
  return format(d, 'MMMM yyyy')
}

/**
 * Safe savings rate (avoid NaN / Infinity when income = 0)
 */
export function savingsRate(income, expenses) {
  if (!income || income === 0) return 0
  const rate = ((income - expenses) / income) * 100
  return Math.max(0, Math.round(rate * 10) / 10)
}

/**
 * Get user initials from name string.
 */
export function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
