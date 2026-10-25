import mongoose from 'mongoose'

const CategorySchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:  { type: String, required: true, trim: true },
    type:  { type: String, enum: ['income', 'expense', 'both'], default: 'expense' },
    icon:  { type: String, default: 'bi-three-dots' },
    color: { type: String, default: '#64748b' },
  },
  { timestamps: true }
)

// Prevent duplicate category names per user
CategorySchema.index({ user: 1, name: 1 }, { unique: true })

export default mongoose.model('Category', CategorySchema)
