import mongoose from 'mongoose'

const NotificationSchema = new mongoose.Schema(
  {
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    budget:     { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
    category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    alertType:  { type: String, enum: ['near_limit', 'over_budget', 'info'], default: 'info' },
    title:      { type: String, required: true },
    message:    { type: String, required: true },
    isRead:     { type: Boolean, default: false },
    // Idempotency key: user-budgetId-month-threshold (e.g. '...budgetId...-2026-10-80')
    alertKey:   { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
)

NotificationSchema.index({ user: 1, createdAt: -1 })
NotificationSchema.index({ user: 1, isRead: 1 })

export default mongoose.model('Notification', NotificationSchema)
