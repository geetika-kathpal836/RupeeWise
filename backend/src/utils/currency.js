import { toNumber } from './dateUtils.js'

/**
 * Format any number, Decimal128, or numeric string as Indian Rupee with '₹' prefix,
 * Indian thousands/lakhs separators, and 2 decimal places.
 *
 * Examples:
 *   1500      -> '₹1,500.00'
 *   250.5     -> '₹250.50'
 *   0         -> '₹0.00'
 *   12500.75  -> '₹12,500.75'
 *   125000    -> '₹1,25,000.00'
 */
export function formatRupee(amount) {
  const num = toNumber(amount)
  if (isNaN(num)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export { toNumber }
