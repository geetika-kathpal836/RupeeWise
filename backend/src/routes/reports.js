import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getMonthlySummary, getSummaryRange, getCategoryBreakdown, getMonthlyTrend, exportReport } from '../controllers/reportController.js'

const router = Router()
router.use(protect)

router.get('/summary',       getMonthlySummary)
router.get('/summary-range', getSummaryRange)
router.get('/by-category',   getCategoryBreakdown)
router.get('/monthly-trend', getMonthlyTrend)
router.get('/export',        exportReport)

export default router
