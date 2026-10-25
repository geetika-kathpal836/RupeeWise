import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { signup, login, logout, me } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max:      20,
  message:  { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            () => process.env.NODE_ENV === 'test',
})

const router = Router()

router.post('/signup', limiter, signup)
router.post('/login',  limiter, login)
router.post('/logout', logout)
router.get('/me', protect, me)

export default router
