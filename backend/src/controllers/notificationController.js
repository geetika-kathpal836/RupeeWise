import mongoose from 'mongoose'
import Notification from '../models/Notification.js'

export async function getNotifications(req, res, next) {
  try {
    const userId = req.user._id
    const { limit = 50, unread } = req.query
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50))

    const query = { user: userId }
    if (unread === 'true') query.isRead = false

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(parsedLimit),
      Notification.countDocuments({ user: userId, isRead: false }),
    ])

    res.json({ notifications, unreadCount })
  } catch (err) { next(err) }
}

export async function markRead(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid notification ID.' })
    }

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    )
    if (!notif) return res.status(404).json({ message: 'Notification not found.' })
    res.json({ notification: notif })
  } catch (err) { next(err) }
}

export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true })
    res.json({ message: 'All notifications marked as read.' })
  } catch (err) { next(err) }
}
