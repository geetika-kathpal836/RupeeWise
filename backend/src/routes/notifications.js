import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getNotifications, markRead, markAllRead } from '../controllers/notificationController.js'

const router = Router()
router.use(protect)

router.get('/',                  getNotifications)
router.patch('/:id/read',        markRead)
router.patch('/read-all',        markAllRead)

export default router
