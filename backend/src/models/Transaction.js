import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    type:          { type: String, enum: ['income', 'expense'],              required: true },
    amount:        { type: mongoose.Types.Decimal128,                        required: true },
    category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    date:          { type: Date,                                             required: true },
    paymentMethod: { type: String, enum: ['cash','upi','debit_card','credit_card','bank_transfer','other'], default: 'upi' },
    notes:         { type: String, trim: true, default: '' },
    recurringId:   { type: mongoose.Schema.Types.ObjectId, ref: 'RecurringTransaction', default: null },
    // Idempotency key for recurring job
    recurringKey:  { type: String, default: undefined },
  },
  { timestamps: true }
)

// Compound index for date-range queries per user
TransactionSchema.index({ user: 1, date: -1 })
TransactionSchema.index({ user: 1, date: -1, type: 1 })
TransactionSchema.index({ user: 1, date: -1, category: 1 })
// Unique recurring key to prevent duplicates
TransactionSchema.index({ recurringKey: 1 }, { unique: true, sparse: true })

export default mongoose.model('Transaction', TransactionSchema)
