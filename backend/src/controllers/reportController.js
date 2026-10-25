import mongoose from 'mongoose'
import Transaction from '../models/Transaction.js'
import Budget from '../models/Budget.js'
import Category from '../models/Category.js'
import { monthToDateRange, toNumber } from '../utils/dateUtils.js'
import { Parser } from 'json2csv'
import PDFDocument from 'pdfkit'
import { format } from 'date-fns'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { formatRupee } from '../utils/currency.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fontRegular = path.resolve(__dirname, '../assets/fonts/SegoeUI.ttf')
const fontBold = path.resolve(__dirname, '../assets/fonts/SegoeUI-Bold.ttf')

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

// ─── Monthly Summary (used by dashboard) ────────────────────────────────────
export async function getMonthlySummary(req, res, next) {
  try {
    const userId = req.user._id
    if (req.query.month && !MONTH_REGEX.test(req.query.month)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' })
    }
    const month = req.query.month || new Date().toISOString().slice(0, 7)
    const { start, end } = monthToDateRange(month)

    const [summary, allTime] = await Promise.all([
      // Income and expenses for the requested month
      Transaction.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            date: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $toDouble: '$amount' } },
          },
        },
      ]),
      // All-time balance
      Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $toDouble: '$amount' } },
          },
        },
      ]),
    ])

    const monthly = { income: 0, expenses: 0 }
    for (const s of summary) {
      if (s._id === 'income') monthly.income = s.total
      if (s._id === 'expense') monthly.expenses = s.total
    }

    const allTimeMap = { income: 0, expense: 0 }
    for (const s of allTime) allTimeMap[s._id] = s.total
    const balance = (allTimeMap.income - allTimeMap.expense) + toNumber(req.user.openingBalance)

    res.json({
      month,
      income: monthly.income,
      expenses: monthly.expenses,
      savings: monthly.income - monthly.expenses,
      balance,
    })
  } catch (err) { next(err) }
}

// ─── Summary for arbitrary date range ────────────────────────────────────────
export async function getSummaryRange(req, res, next) {
  try {
    const userId = req.user._id
    if (req.query.from && isNaN(new Date(req.query.from).getTime())) {
      return res.status(400).json({ message: 'Invalid from date format.' })
    }
    if (req.query.to && isNaN(new Date(req.query.to).getTime())) {
      return res.status(400).json({ message: 'Invalid to date format.' })
    }
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1)
    const to = req.query.to ? new Date(new Date(req.query.to).setHours(23, 59, 59, 999)) : new Date(new Date().setHours(23, 59, 59, 999))

    const result = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ])

    const map = { income: 0, expenses: 0 }
    for (const r of result) {
      if (r._id === 'income') map.income = r.total
      if (r._id === 'expense') map.expenses = r.total
    }

    res.json({ ...map, savings: map.income - map.expenses })
  } catch (err) { next(err) }
}

// ─── Category breakdown ───────────────────────────────────────────────────────
export async function getCategoryBreakdown(req, res, next) {
  try {
    const userId = req.user._id
    let from, to

    if (req.query.month) {
      if (!MONTH_REGEX.test(req.query.month)) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' })
      }
      const r = monthToDateRange(req.query.month)
      from = r.start; to = r.end
    } else {
      if (req.query.from && isNaN(new Date(req.query.from).getTime())) {
        return res.status(400).json({ message: 'Invalid from date format.' })
      }
      if (req.query.to && isNaN(new Date(req.query.to).getTime())) {
        return res.status(400).json({ message: 'Invalid to date format.' })
      }
      from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1)
      to = req.query.to ? new Date(new Date(req.query.to).setHours(23, 59, 59, 999)) : new Date(new Date().setHours(23, 59, 59, 999))
    }

    const agg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $sort: { total: -1 } },
    ])

    const grandTotal = agg.reduce((s, a) => s + a.total, 0)

    const categories = agg.map((a) => ({
      categoryId: a._id,
      categoryName: a.cat?.name || 'Unknown',
      color: a.cat?.color || '#64748b',
      totalExpense: a.total,
      percentage: grandTotal > 0 ? Math.round((a.total / grandTotal) * 1000) / 10 : 0,
    }))

    res.json({ categories })
  } catch (err) { next(err) }
}

// ─── Monthly trend ────────────────────────────────────────────────────────────
export async function getMonthlyTrend(req, res, next) {
  try {
    const userId = req.user._id
    if (req.query.year) {
      const parsedYear = parseInt(req.query.year, 10)
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        return res.status(400).json({ message: 'Invalid year.' })
      }
    }
    const year = parseInt(req.query.year || new Date().getFullYear(), 10)
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31, 23, 59, 59)

    const agg = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
      { $sort: { '_id.month': 1 } },
    ])

    // Build 12-month array
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthMap = {}
    for (let i = 1; i <= 12; i++) monthMap[i] = { month: MONTHS[i - 1], income: 0, expenses: 0 }

    for (const a of agg) {
      const m = a._id.month
      if (a._id.type === 'income') monthMap[m].income = a.total
      if (a._id.type === 'expense') monthMap[m].expenses = a.total
    }

    res.json({ year, months: Object.values(monthMap) })
  } catch (err) { next(err) }
}

// ─── Export (CSV / PDF) ───────────────────────────────────────────────────────
export async function exportReport(req, res, next) {
  try {
    const userId = req.user._id
    const fmt = req.query.format || 'csv'
    if (req.query.from && isNaN(new Date(req.query.from).getTime())) {
      return res.status(400).json({ message: 'Invalid from date format.' })
    }
    if (req.query.to && isNaN(new Date(req.query.to).getTime())) {
      return res.status(400).json({ message: 'Invalid to date format.' })
    }
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1)
    const to = req.query.to ? new Date(new Date(req.query.to).setHours(23, 59, 59, 999)) : new Date(new Date().setHours(23, 59, 59, 999))

    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: -1 })
      .populate('category', 'name')

    // Compute executive totals
    const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + toNumber(t.amount), 0)
    const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + toNumber(t.amount), 0)
    const netSavings = income - expenses

    if (fmt === 'csv') {
      const rows = transactions.map((t) => ({
        Date: format(new Date(t.date), 'yyyy-MM-dd'),
        Type: t.type,
        Amount: formatRupee(t.amount),
        Category: t.category?.name || 'Uncategorized',
        PaymentMethod: t.paymentMethod || 'upi',
        Notes: t.notes || '',
      }))

      const parser = new Parser({
        fields: ['Date', 'Type', 'Amount', 'Category', 'PaymentMethod', 'Notes'],
      })
      const csv = parser.parse(rows)

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="RupeeWise-report.csv"')
      // Include UTF-8 BOM so spreadsheet viewers render the ₹ symbol seamlessly
      return res.send('\ufeff' + csv)
    }

    if (fmt === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' })
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="RupeeWise-report.pdf"')
      doc.pipe(res)

      // Register TrueType fonts that support Unicode ₹
      if (fs.existsSync(fontRegular)) {
        doc.registerFont('AppFont', fontRegular)
        doc.registerFont('AppFont-Bold', fs.existsSync(fontBold) ? fontBold : fontRegular)
        doc.font('AppFont')
      }

      // Header
      doc.font('AppFont-Bold').fontSize(20).fillColor('#0f172a').text('RupeeWise — Financial Report', { align: 'left' })
      doc.moveDown(0.2)
      doc.font('AppFont').fontSize(10).fillColor('#64748b')
        .text(`Generated for: ${req.user.name || 'User'}   |   Period: ${format(from, 'dd MMM yyyy')} – ${format(to, 'dd MMM yyyy')}`, { align: 'left' })
      doc.moveDown(0.8)

      // Executive Summary Box
      const summaryY = doc.y
      doc.roundedRect(40, summaryY, 515, 62, 6).fillAndStroke('#f8fafc', '#e2e8f0')

      doc.font('AppFont').fontSize(9).fillColor('#64748b')
      doc.text('TOTAL INCOME', 55, summaryY + 12)
      doc.text('TOTAL EXPENSES', 220, summaryY + 12)
      doc.text('NET SAVINGS', 385, summaryY + 12)

      doc.font('AppFont-Bold').fontSize(14).fillColor('#0d9488')
      doc.text(formatRupee(income), 55, summaryY + 28)

      doc.font('AppFont-Bold').fontSize(14).fillColor('#e11d48')
      doc.text(formatRupee(expenses), 220, summaryY + 28)

      doc.font('AppFont-Bold').fontSize(14).fillColor(netSavings >= 0 ? '#0284c7' : '#e11d48')
      doc.text(formatRupee(netSavings), 385, summaryY + 28)

      doc.y = summaryY + 76

      // Category Breakdown Summary
      const catMap = {}
      for (const t of transactions) {
        if (t.type === 'expense') {
          const cName = t.category?.name || 'Other'
          catMap[cName] = (catMap[cName] || 0) + toNumber(t.amount)
        }
      }
      const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1])

      if (catEntries.length > 0) {
        doc.font('AppFont-Bold').fontSize(11).fillColor('#0f172a').text('Category-wise Spending Breakdown')
        doc.moveDown(0.3)
        doc.font('AppFont').fontSize(8.5).fillColor('#475569')
        const catLines = catEntries.map(([c, amt]) => `${c}: ${formatRupee(amt)} (${Math.round((amt / (expenses || 1)) * 100)}%)`).join('   •   ')
        doc.text(catLines, { width: 515, lineGap: 3 })
        doc.moveDown(0.8)
      }

      // Transactions Table
      doc.font('AppFont-Bold').fontSize(12).fillColor('#0f172a').text('Transaction History')
      doc.moveDown(0.4)

      const renderTableHeader = (y) => {
        doc.rect(40, y, 515, 20).fill('#f1f5f9')
        doc.font('AppFont-Bold').fontSize(8.5).fillColor('#475569')
        doc.text('Date', 48, y + 5)
        doc.text('Type', 115, y + 5)
        doc.text('Category', 170, y + 5)
        doc.text('Payment', 270, y + 5)
        doc.text('Notes', 345, y + 5)
        doc.text('Amount', 460, y + 5, { width: 85, align: 'right' })
      }

      let rowY = doc.y
      renderTableHeader(rowY)
      rowY += 20

      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i]
        const amtStr = `${t.type === 'income' ? '+' : '−'}${formatRupee(t.amount)}`
        const amtColor = t.type === 'income' ? '#0d9488' : '#e11d48'

        if (rowY > 750) {
          doc.addPage()
          rowY = 40
          renderTableHeader(rowY)
          rowY += 20
        }

        if (i % 2 === 1) {
          doc.rect(40, rowY, 515, 18).fill('#f8fafc')
        }

        doc.font('AppFont').fontSize(8).fillColor('#334155')
        doc.text(format(new Date(t.date), 'dd/MM/yyyy'), 48, rowY + 4)
        doc.text(t.type === 'income' ? 'Income' : 'Expense', 115, rowY + 4)
        doc.text(t.category?.name || '—', 170, rowY + 4, { width: 95, height: 12, ellipsis: true })
        doc.text(t.paymentMethod?.toUpperCase() || '—', 270, rowY + 4)
        doc.text(t.notes || '—', 345, rowY + 4, { width: 110, height: 12, ellipsis: true })
        doc.font('AppFont-Bold').fillColor(amtColor).text(amtStr, 460, rowY + 4, { width: 85, align: 'right' })

        rowY += 18
      }

      doc.end()
      return
    }

    res.status(400).json({ message: 'format must be csv or pdf.' })
  } catch (err) { next(err) }
}
