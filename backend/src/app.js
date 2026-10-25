import express from 'express'
import cors    from 'cors'
import helmet  from 'helmet'
import cookieParser from 'cookie-parser'

import authRoutes        from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import categoryRoutes    from './routes/categories.js'
import budgetRoutes      from './routes/budgets.js'
import reportRoutes      from './routes/reports.js'
import notificationRoutes from './routes/notifications.js'
import recurringRoutes   from './routes/recurring.js'
import userRoutes        from './routes/users.js'
import { errorHandler }  from './middleware/errorHandler.js'
import { processRecurringTransactions } from './services/recurringService.js'

const app = express()

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet())

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...(process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(/[,|]+/).map((s) => s.trim()).filter(Boolean) : [])
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',                   authRoutes)
app.use('/api/transactions',           transactionRoutes)
app.use('/api/categories',             categoryRoutes)
app.use('/api/budgets',                budgetRoutes)
app.use('/api/reports',                reportRoutes)
app.use('/api/notifications',          notificationRoutes)
app.use('/api/recurring-transactions', recurringRoutes)
app.use('/api/users',                  userRoutes)

// ── Protected cron trigger endpoint (for external schedulers like Render cron) ─
app.post('/api/jobs/run-recurring', async (req, res) => {
  const secret = req.headers['x-cron-secret']
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden.' })
  }
  await processRecurringTransactions()
  res.json({ message: 'Job triggered.' })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler)

export default app
