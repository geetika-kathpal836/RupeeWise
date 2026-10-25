import 'dotenv/config'
import app from './src/app.js'
import { connectDB } from './src/config/db.js'
import cron from 'node-cron'
import { processRecurringTransactions } from './src/services/recurringService.js'

const PORT = process.env.PORT || 5000

async function start() {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`)
  })

  // Run recurring job every hour
  cron.schedule('0 * * * *', () => {
    console.log('[Cron] Running recurring transaction job…')
    processRecurringTransactions()
  })

  console.log('[Cron] Recurring job scheduled — runs every hour')
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
