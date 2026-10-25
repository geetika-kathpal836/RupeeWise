import mongoose from 'mongoose'

const BudgetSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    month:    { type: String, required: true },   // 'YYYY-MM'
    limit:    { type: mongoose.Types.Decimal128, required: true },
  },
  { timestamps: true }
)

// One budget per user+category+month
BudgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true })

export default mongoose.model('Budget', BudgetSchema)
