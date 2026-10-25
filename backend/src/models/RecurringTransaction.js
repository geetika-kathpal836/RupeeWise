import mongoose from 'mongoose'

const RecurringTransactionSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    type:          { type: String, enum: ['income', 'expense'],              required: true },
    amount:        { type: mongoose.Types.Decimal128,                        required: true },
    category:      { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    paymentMethod: { type: String, enum: ['cash','upi','debit_card','credit_card','bank_transfer','other'], default: 'upi' },
    notes:         { type: String, default: '' },
    frequency:     { type: String, enum: ['daily','weekly','monthly','yearly'], required: true },
    startDate:     { type: Date, required: true },
    endDate:       { type: Date, default: null },
    nextDueDate:   { type: Date, required: true },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
)

RecurringTransactionSchema.index({ user: 1 })
RecurringTransactionSchema.index({ isActive: 1, nextDueDate: 1 })

export default mongoose.model('RecurringTransaction', RecurringTransactionSchema)
