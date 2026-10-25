import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { format, subMonths, addMonths } from 'date-fns'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, toMonthKey, monthLabel, savingsRate } from '../utils/format'
import { CHART_COLORS } from '../utils/constants'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import TransactionModal from '../components/transactions/TransactionModal'

// ── Month Picker ────────────────────────────────────────────
function MonthPicker({ value, onChange }) {
  const prev = () => onChange(toMonthKey(subMonths(new Date(`${value}-01`), 1)))
  const next = () => {
    const nx = toMonthKey(addMonths(new Date(`${value}-01`), 1))
    if (nx <= toMonthKey()) onChange(nx)
  }
  return (
    <div className="month-picker">
      <button onClick={prev} aria-label="Previous month"><i className="bi bi-chevron-left" /></button>
      <span>{monthLabel(value)}</span>
      <button onClick={next} aria-label="Next month" disabled={value >= toMonthKey()}><i className="bi bi-chevron-right" /></button>
    </div>
  )
}

// ── Custom Pie tooltip ───────────────────────────────────────
function PieTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{ background: 'var(--rw-surface)', border: '1px solid var(--rw-border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem', color: 'var(--rw-text)' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: 'var(--rw-text-muted)' }}>{formatCurrency(d.value, currency)}</div>
      <div style={{ color: 'var(--rw-text-muted)' }}>{d.payload.percentage?.toFixed(1)}%</div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const currency  = user?.currency || 'INR'

  const [month, setMonth]             = useState(toMonthKey())
  const [summary, setSummary]         = useState(null)
  const [catData, setCatData]         = useState([])
  const [trendData, setTrendData]     = useState([])
  const [budgetData, setBudgetData]   = useState([])
  const [recent, setRecent]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAddTxn, setShowAddTxn]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, catRes, trendRes, budgetRes, recentRes] = await Promise.all([
        api.get(`/reports/summary?month=${month}`),
        api.get(`/reports/by-category?month=${month}`),
        api.get(`/reports/monthly-trend?year=${month.slice(0,4)}`),
        api.get(`/budgets?month=${month}`),
        api.get('/transactions?limit=5&page=1'),
      ])
      setSummary(sumRes.data)
      setCatData(catRes.data.categories || [])
      setTrendData(trendRes.data.months || [])
      setBudgetData(budgetRes.data.budgets || [])
      setRecent(recentRes.data.transactions || [])
    } catch {
      // leave previous data
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchAll() }, [fetchAll])

  const income   = summary?.income   || 0
  const expenses = summary?.expenses || 0
  const savings  = income - expenses
  const rate     = savingsRate(income, expenses)
  const balance  = summary?.balance  || 0

  // ── Summary Cards ────────────────────────────────────────
  const cards = [
    {
      id: 'card-balance',
      label: 'Current Balance',
      value: formatCurrency(balance, currency),
      icon: 'bi-bank',
      iconBg: '#eff6ff',
      iconColor: 'var(--color-secondary)',
      sub: 'All time net',
    },
    {
      id: 'card-income',
      label: 'Income',
      value: formatCurrency(income, currency),
      icon: 'bi-arrow-down-circle',
      iconBg: 'var(--color-income-bg)',
      iconColor: 'var(--color-income)',
      sub: monthLabel(month),
    },
    {
      id: 'card-expenses',
      label: 'Expenses',
      value: formatCurrency(expenses, currency),
      icon: 'bi-arrow-up-circle',
      iconBg: 'var(--color-expense-bg)',
      iconColor: 'var(--color-expense)',
      sub: monthLabel(month),
    },
    {
      id: 'card-savings',
      label: 'Savings',
      value: formatCurrency(savings, currency),
      icon: 'bi-piggy-bank',
      iconBg: savings >= 0 ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
      iconColor: savings >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
      sub: `${rate}% savings rate`,
    },
  ]

  return (
    <>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>
            Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            Here's your financial overview for {monthLabel(month)}.
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <button
            id="quick-add-txn-btn"
            className="btn-primary-custom"
            onClick={() => setShowAddTxn(true)}
          >
            <i className="bi bi-plus-lg" /> Add Transaction
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner minHeight="400px" /> : (
        <>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            {cards.map((c) => (
              <div key={c.id} className="col-12 col-sm-6 col-xl-3">
                <div className="summary-card" id={c.id}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="summary-card-icon-wrap" style={{ background: c.iconBg }}>
                      <i className={`bi ${c.icon}`} style={{ fontSize: '1.2rem', color: c.iconColor }} />
                    </div>
                    <div className="summary-card-label">{c.label}</div>
                  </div>
                  <div className="summary-card-value">{c.value}</div>
                  <div className="summary-card-sub">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-4 mb-4">
            {/* Category donut chart */}
            <div className="col-12 col-lg-5">
              <div className="card h-100">
                <div className="card-header-custom">
                  <span className="card-title-custom">Spending by Category</span>
                  <button className="btn-icon" onClick={() => navigate('/reports')} title="See full report">
                    <i className="bi bi-arrow-right" />
                  </button>
                </div>
                <div className="card-body">
                  {catData.length === 0 ? (
                    <EmptyState icon="bi-pie-chart" title="No expenses yet" message="Add your first expense to see category breakdown." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={catData}
                          dataKey="totalExpense"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={2}
                        >
                          {catData.map((entry, i) => (
                            <Cell
                              key={entry.categoryId || i}
                              fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]}
                              cursor="pointer"
                              onClick={() => navigate(`/transactions?category=${entry.categoryId}`)}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip currency={currency} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Legend */}
                  {catData.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.5rem' }}>
                      {catData.slice(0, 6).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                          <span className="cat-dot" style={{ background: c.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ color: 'var(--color-text-muted)' }}>{c.categoryName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="col-12 col-lg-7">
              <div className="card h-100">
                <div className="card-header-custom">
                  <span className="card-title-custom">Income vs Expenses — {month.slice(0, 4)}</span>
                </div>
                <div className="card-body">
                  {trendData.length === 0 ? (
                    <EmptyState icon="bi-bar-chart" title="No data yet" message="Your monthly trend will appear here." />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trendData} barGap={4} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
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
          </div>

          <div className="row g-4">
            {/* Budget overview */}
            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-header-custom">
                  <span className="card-title-custom">Budget Overview</span>
                  <button className="btn-icon" onClick={() => navigate('/budgets')} title="Manage budgets">
                    <i className="bi bi-arrow-right" />
                  </button>
                </div>
                <div className="card-body">
                  {budgetData.length === 0 ? (
                    <EmptyState icon="bi-wallet2" title="No budgets set" message="Set category budgets to track your spending limits." action={
                      <button className="btn-primary-custom" onClick={() => navigate('/budgets')}>Set a budget</button>
                    } />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {budgetData.slice(0, 5).map((b) => {
                        const pct = b.limit > 0 ? Math.min((b.spent / b.limit) * 100, 100) : 0
                        const fillClass = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok'
                        return (
                          <div key={b._id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="cat-dot" style={{ background: b.categoryColor || '#64748b' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{b.categoryName}</span>
                                {pct >= 80 && <span className={`badge-${fillClass === 'danger' ? 'expense' : 'warning'}`}>{pct >= 100 ? 'Over budget' : 'Near limit'}</span>}
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {formatCurrency(b.spent, currency)} / {formatCurrency(b.limit, currency)}
                              </span>
                            </div>
                            <div className="progress-bar-custom">
                              <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="col-12 col-lg-6">
              <div className="card">
                <div className="card-header-custom">
                  <span className="card-title-custom">Recent Transactions</span>
                  <button className="btn-icon" onClick={() => navigate('/transactions')} title="View all">
                    <i className="bi bi-arrow-right" />
                  </button>
                </div>
                {recent.length === 0 ? (
                  <div className="card-body">
                    <EmptyState icon="bi-receipt" title="No transactions yet" message="Add your first transaction to get started." action={
                      <button className="btn-primary-custom" onClick={() => setShowAddTxn(true)}>Add transaction</button>
                    } />
                  </div>
                ) : (
                  <div>
                    {recent.map((txn) => (
                      <div key={txn._id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--color-border-light)' }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: txn.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i
                            className={`bi bi-${txn.type === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}`}
                            style={{ color: txn.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)', fontSize: '1rem' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {txn.notes || txn.category?.name || 'Transaction'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {txn.category?.name} · {format(new Date(txn.date), 'dd MMM')}
                          </div>
                        </div>
                        <div className={txn.type === 'income' ? 'amount-income' : 'amount-expense'} style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                          {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount, currency)}
                        </div>
                      </div>
                    ))}
                    <div style={{ padding: '0.75rem 1.25rem' }}>
                      <button className="btn-secondary-custom w-100 justify-content-center" onClick={() => navigate('/transactions')}>
                        View all transactions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick-add transaction modal */}
      {showAddTxn && (
        <TransactionModal
          onClose={() => setShowAddTxn(false)}
          onSaved={() => { setShowAddTxn(false); fetchAll() }}
        />
      )}
    </>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
