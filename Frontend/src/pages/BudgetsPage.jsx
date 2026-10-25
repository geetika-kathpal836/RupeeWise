import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, toMonthKey, monthLabel } from '../utils/format'
import { CATEGORY_COLORS } from '../utils/constants'
import { subMonths, addMonths } from 'date-fns'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const DEFAULT_ICONS = [
  'bi-basket', 'bi-bag', 'bi-bus-front', 'bi-mortarboard', 'bi-film',
  'bi-heart-pulse', 'bi-lightbulb', 'bi-airplane', 'bi-house', 'bi-three-dots',
  'bi-briefcase', 'bi-laptop', 'bi-building', 'bi-graph-up', 'bi-star',
]

function MonthPicker({ value, onChange }) {
  const prev = () => onChange(toMonthKey(subMonths(new Date(`${value}-01`), 1)))
  const next = () => {
    const nx = toMonthKey(addMonths(new Date(`${value}-01`), 1))
    if (nx <= toMonthKey()) onChange(nx)
  }
  return (
    <div className="month-picker">
      <button type="button" onClick={prev}><i className="bi bi-chevron-left" /></button>
      <span>{monthLabel(value)}</span>
      <button type="button" onClick={next} disabled={value >= toMonthKey()}><i className="bi bi-chevron-right" /></button>
    </div>
  )
}

// ── Category Modal ────────────────────────────────────────────
function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:  category?.name  || '',
    type:  category?.type  || 'expense',
    icon:  category?.icon  || 'bi-three-dots',
    color: category?.color || CATEGORY_COLORS[0],
  })
  const [saving, setSaving]   = useState(false)
  const [errors, setErrors]   = useState({})

  const set = (f) => (e) => {
    setForm((fr) => ({ ...fr, [f]: e.target.value }))
    setErrors((er) => ({ ...er, [f]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Category name is required.' }); return }
    setSaving(true)
    try {
      if (category) {
        await api.put(`/categories/${category._id}`, form)
        toast.success('Category updated.')
      } else {
        await api.post('/categories', form)
        toast.success('Category created.')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{category ? 'Edit Category' : 'New Category'}</h5>
            <button className="btn-icon" onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="cat-name" className="form-label-custom">Name</label>
                <input id="cat-name" type="text" className="form-control-custom" placeholder="e.g. Groceries" value={form.name} onChange={set('name')} />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="mb-3">
                <label htmlFor="cat-type" className="form-label-custom">Type</label>
                <select id="cat-type" className="form-control-custom" value={form.type} onChange={set('type')}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label-custom">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEFAULT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      style={{
                        width: 38, height: 38, borderRadius: 8, border: `2px solid ${form.icon === icon ? form.color : 'var(--color-border)'}`,
                        background: form.icon === icon ? form.color + '22' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: form.icon === icon ? form.color : 'var(--color-text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <i className={`bi ${icon}`} style={{ fontSize: '1rem' }} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label-custom">Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORY_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: col }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: col, border: `3px solid ${form.color === col ? '#1e3a5f' : 'transparent'}`,
                        cursor: 'pointer', transition: 'border 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer gap-2">
              <button type="button" className="btn-secondary-custom" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : (category ? 'Save changes' : 'Create category')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Budget Modal ──────────────────────────────────────────────
function BudgetModal({ budget, category, month, onClose, onSaved }) {
  const [limit, setLimit]   = useState(budget?.limit ? String(budget.limit) : '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!limit || isNaN(Number(limit)) || Number(limit) <= 0) { setError('Enter a valid budget amount.'); return }
    setSaving(true)
    try {
      if (budget) {
        await api.put(`/budgets/${budget._id}`, { limit: parseFloat(limit) })
        toast.success('Budget updated.')
      } else {
        await api.post('/budgets', { category: category._id, month, limit: parseFloat(limit) })
        toast.success('Budget set.')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save budget.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog modal-dialog-centered modal-sm">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{budget ? 'Edit Budget' : 'Set Budget'}</h5>
            <button className="btn-icon" onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Monthly budget for <strong>{category?.name}</strong> — {monthLabel(month)}
              </p>
              <label htmlFor="budget-limit" className="form-label-custom">Monthly limit (₹)</label>
              <input
                id="budget-limit"
                type="number"
                min="1"
                step="1"
                className="form-control-custom"
                placeholder="e.g. 5000"
                value={limit}
                onChange={(e) => { setLimit(e.target.value); setError('') }}
                autoFocus
              />
              {error && <div className="form-error">{error}</div>}
            </div>
            <div className="modal-footer gap-2">
              <button type="button" className="btn-secondary-custom" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : (budget ? 'Update' : 'Set budget')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function BudgetsPage() {
  const { user } = useAuth()
  const currency = user?.currency || 'INR'

  const [month, setMonth]             = useState(toMonthKey())
  const [categories,   setCategories] = useState([])
  const [budgets,      setBudgets]    = useState([])
  const [loading,      setLoading]    = useState(true)
  const [catModal,     setCatModal]   = useState(null)  // null | 'new' | category obj
  const [budgetModal,  setBudgetModal]= useState(null)  // null | { category, budget? }
  const [deleteId,     setDeleteId]   = useState(null)
  const [activeTab,    setActiveTab]  = useState('budgets') // 'budgets' | 'categories'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, budgetRes] = await Promise.all([
        api.get('/categories'),
        api.get(`/budgets?month=${month}`),
      ])
      setCategories(catRes.data.categories || [])
      setBudgets(budgetRes.data.budgets || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  const getBudget = (catId) => budgets.find((b) => b.category === catId || b.category?._id === catId)

  const handleDeleteCat = async () => {
    try {
      await api.delete(`/categories/${deleteId}`)
      toast.success('Category deleted.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete category.')
    } finally { setDeleteId(null) }
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories  = categories.filter((c) => c.type === 'income')

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Budgets & Categories</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>Manage spending limits and organize your finances.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <button className="btn-primary-custom" id="add-category-btn" onClick={() => setCatModal('new')}>
            <i className="bi bi-plus-lg" /> New Category
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {[
          { key: 'budgets',    label: 'Budget Overview' },
          { key: 'categories', label: 'All Categories' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '0.375rem 1rem',
              border: 'none',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              background: activeTab === t.key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--color-text-muted)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* Budget tab */}
          {activeTab === 'budgets' && (
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                Budgets for <strong>{monthLabel(month)}</strong>. Set a limit on any expense category to get notified before you overspend.
              </p>
              {expenseCategories.length === 0 ? (
                <EmptyState icon="bi-wallet2" title="No expense categories" message="Create a category first, then set a monthly budget." action={
                  <button className="btn-primary-custom" onClick={() => setCatModal('new')}>Create category</button>
                } />
              ) : (
                <div className="row g-3">
                  {expenseCategories.map((cat) => {
                    const budget = getBudget(cat._id)
                    const spent  = budget?.spent ?? 0
                    const limit  = budget?.limit ?? 0
                    const pct    = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
                    const fillClass = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok'
                    const remaining = limit - spent

                    return (
                      <div key={cat._id} className="col-12 col-md-6 col-xl-4">
                        <div className="budget-card">
                          <div className="budget-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={`bi ${cat.icon}`} style={{ color: cat.color, fontSize: '1rem' }} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cat.name}</div>
                                {budget && pct >= 80 && (
                                  <span className={pct >= 100 ? 'badge-expense' : 'badge-warning'} style={{ marginTop: 2 }}>
                                    {pct >= 100 ? 'Over budget' : `${pct.toFixed(0)}% used`}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              id={`set-budget-${cat._id}`}
                              className="btn-icon edit"
                              onClick={() => setBudgetModal({ category: cat, budget })}
                              title={budget ? 'Edit budget' : 'Set budget'}
                            >
                              <i className={`bi ${budget ? 'bi-pencil' : 'bi-plus-lg'}`} style={{ fontSize: '0.85rem' }} />
                            </button>
                          </div>

                          {budget ? (
                            <>
                              <div className="progress-bar-custom">
                                <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="budget-meta">
                                <span>Spent: {formatCurrency(spent, currency)}</span>
                                <span style={{ color: remaining < 0 ? 'var(--color-expense)' : 'var(--color-text-muted)' }}>
                                  {remaining >= 0 ? `${formatCurrency(remaining, currency)} left` : `${formatCurrency(Math.abs(remaining), currency)} over`}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: 4 }}>
                                Limit: {formatCurrency(limit, currency)}
                              </div>
                            </>
                          ) : (
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                              You haven't set a budget for this category yet.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Categories tab */}
          {activeTab === 'categories' && (
            <div>
              {[
                { label: 'Expense Categories', items: expenseCategories },
                { label: 'Income Categories',  items: incomeCategories },
              ].map(({ label, items }) => (
                <div key={label} style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>{label}</h3>
                  {items.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No categories yet.</p>
                  ) : (
                    <div className="row g-3">
                      {items.map((cat) => (
                        <div key={cat._id} className="col-12 col-sm-6 col-md-4 col-xl-3">
                          <div style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.875rem',
                            boxShadow: 'var(--shadow-xs)',
                            transition: 'box-shadow 0.2s',
                          }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={`bi ${cat.icon}`} style={{ color: cat.color, fontSize: '1.1rem' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{cat.type}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button className="btn-icon edit" onClick={() => setCatModal(cat)} title="Edit" id={`edit-cat-${cat._id}`}>
                                <i className="bi bi-pencil" style={{ fontSize: '0.8rem' }} />
                              </button>
                              <button className="btn-icon danger" onClick={() => setDeleteId(cat._id)} title="Delete" id={`delete-cat-${cat._id}`}>
                                <i className="bi bi-trash" style={{ fontSize: '0.8rem' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Category modal */}
      {catModal && (
        <CategoryModal
          category={catModal === 'new' ? null : catModal}
          onClose={() => setCatModal(null)}
          onSaved={() => { setCatModal(null); fetchData() }}
        />
      )}

      {/* Budget modal */}
      {budgetModal && (
        <BudgetModal
          budget={budgetModal.budget}
          category={budgetModal.category}
          month={month}
          onClose={() => setBudgetModal(null)}
          onSaved={() => { setBudgetModal(null); fetchData() }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete category?"
        message="Deleting this category will not remove transactions, but they will become uncategorized."
        confirmLabel="Delete"
        confirmClass="btn-danger-custom"
        onConfirm={handleDeleteCat}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
