import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { toast } from 'sonner'
import { format } from 'date-fns'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, savingsRate } from '../utils/format'
import { CHART_COLORS } from '../utils/constants'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

const CURRENT_YEAR = new Date().getFullYear()

export default function ReportsPage() {
  const { user } = useAuth()
  const currency  = user?.currency || 'INR'

  const [from, setFrom]         = useState(`${CURRENT_YEAR}-01-01`)
  const [to,   setTo]           = useState(format(new Date(), 'yyyy-MM-dd'))
  const [year, setYear]         = useState(String(CURRENT_YEAR))
  const [summary, setSummary]   = useState(null)
  const [catData, setCatData]   = useState([])
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(null) // 'csv' | 'pdf' | null

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, catRes, trendRes] = await Promise.all([
        api.get(`/reports/summary-range?from=${from}&to=${to}`),
        api.get(`/reports/by-category?from=${from}&to=${to}`),
        api.get(`/reports/monthly-trend?year=${year}`),
      ])
      setSummary(sumRes.data)
      setCatData(catRes.data.categories || [])
      setTrendData(trendRes.data.months || [])
    } catch {
      toast.error('Could not load report data.')
    } finally {
      setLoading(false)
    }
  }, [from, to, year])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleExport = async (type) => {
    setExporting(type)
    try {
      const res = await api.get(`/reports/export?from=${from}&to=${to}&format=${type}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(res.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `paisa-path-report-${from}-to-${to}.${type}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${type.toUpperCase()} exported successfully.`)
    } catch {
      toast.error(`Could not export ${type.toUpperCase()} report.`)
    } finally {
      setExporting(null)
    }
  }

  const income   = summary?.income   || 0
  const expenses = summary?.expenses || 0
  const savings  = income - expenses
  const rate     = savingsRate(income, expenses)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Reports</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>Understand your spending patterns over any period.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            id="export-csv-btn"
            className="btn-secondary-custom"
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
          >
            {exporting === 'csv' ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-filetype-csv" />}
            {' '}Export CSV
          </button>
          <button
            id="export-pdf-btn"
            className="btn-secondary-custom"
            onClick={() => handleExport('pdf')}
            disabled={!!exporting}
          >
            {exporting === 'pdf' ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-file-earmark-pdf" />}
            {' '}Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>From</span>
          <input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>To</span>
          <input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Year (trend)</span>
          <select id="report-year" value={year} onChange={(e) => setYear(e.target.value)}
            style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.375rem 0.75rem', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-sans)', outline: 'none' }}>
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner minHeight="400px" /> : (
        <>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Income',   value: formatCurrency(income, currency),   color: 'var(--color-income)',   icon: 'bi-arrow-down-circle',    bg: 'var(--color-income-bg)' },
              { label: 'Total Expenses', value: formatCurrency(expenses, currency), color: 'var(--color-expense)',  icon: 'bi-arrow-up-circle',      bg: 'var(--color-expense-bg)' },
              { label: 'Net Savings',    value: formatCurrency(savings, currency),  color: savings >= 0 ? 'var(--color-income)' : 'var(--color-expense)', icon: 'bi-piggy-bank', bg: savings >= 0 ? 'var(--color-income-bg)' : 'var(--color-expense-bg)' },
              { label: 'Savings Rate',   value: `${rate}%`,                         color: rate >= 20 ? 'var(--color-income)' : 'var(--color-warning)', icon: 'bi-percent', bg: 'var(--color-warning-bg)' },
            ].map((c, i) => (
              <div key={i} className="col-12 col-sm-6 col-xl-3">
                <div className="summary-card">
                  <div className="d-flex align-items-center gap-3">
                    <div className="summary-card-icon-wrap" style={{ background: c.bg }}>
                      <i className={`bi ${c.icon}`} style={{ fontSize: '1.2rem', color: c.color }} />
                    </div>
                    <div className="summary-card-label">{c.label}</div>
                  </div>
                  <div className="summary-card-value" style={{ color: c.color }}>{c.value}</div>
                  <div className="summary-card-sub">{format(new Date(from), 'dd MMM yyyy')} – {format(new Date(to), 'dd MMM yyyy')}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-4 mb-4">
            {/* Monthly trend */}
            <div className="col-12 col-lg-7">
              <div className="card h-100">
                <div className="card-header-custom">
                  <span className="card-title-custom">Monthly Trend — {year}</span>
                </div>
                <div className="card-body">
                  {trendData.length === 0 ? (
                    <EmptyState icon="bi-bar-chart" title="No trend data" message="Add some transactions to see monthly trends." />
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={trendData} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v) => formatCurrency(v, currency)}
                          contentStyle={{ backgroundColor: 'var(--rw-surface)', borderColor: 'var(--rw-border)', borderRadius: 8, color: 'var(--rw-text)' }}
                          itemStyle={{ color: 'var(--rw-text)' }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '0.8rem' }}
                          formatter={(val) => <span style={{ color: 'var(--rw-text)' }}>{val}</span>}
                        />
                        <Bar dataKey="income"   name="Income"   fill="var(--color-income)"  radius={[3,3,0,0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="var(--color-expense)" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="col-12 col-lg-5">
              <div className="card h-100">
                <div className="card-header-custom">
                  <span className="card-title-custom">Category Breakdown</span>
                </div>
                <div className="card-body">
                  {catData.length === 0 ? (
                    <EmptyState icon="bi-pie-chart" title="No expense data" message="No expenses in the selected period." />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={catData} dataKey="totalExpense" nameKey="categoryName" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                            {catData.map((entry, i) => (
                              <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v) => formatCurrency(v, currency)}
                            contentStyle={{ backgroundColor: 'var(--rw-surface)', borderColor: 'var(--rw-border)', borderRadius: 8, color: 'var(--rw-text)' }}
                            itemStyle={{ color: 'var(--rw-text)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Category table */}
                      <div style={{ marginTop: '0.75rem' }}>
                        {catData.map((c, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.375rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="cat-dot" style={{ background: c.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span style={{ fontSize: '0.8rem' }}>{c.categoryName}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.percentage?.toFixed(1)}%</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-expense)' }}>{formatCurrency(c.totalExpense, currency)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
