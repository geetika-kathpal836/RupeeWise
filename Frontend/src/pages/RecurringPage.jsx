import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/format'
import { PAYMENT_METHODS, RECURRENCE_FREQUENCIES } from '../utils/constants'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'

function RecurringModal({ rule, onClose, onSaved }) {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    type:          rule?.type          || 'expense',
    amount:        rule?.amount ? String(rule.amount) : '',
    category:      rule?.category?._id || rule?.category || '',
    paymentMethod: rule?.paymentMethod || 'upi',
    notes:         rule?.notes         || '',
    frequency:     rule?.frequency     || 'monthly',
    startDate:     rule?.startDate ? format(new Date(rule.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    endDate:       rule?.endDate   ? format(new Date(rule.endDate), 'yyyy-MM-dd') : '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => {})
  }, [])

  const filtered = categories.filter((c) => c.type === form.type || c.type === 'both')
  const set = (f) => (e) => { setForm((fr) => ({ ...fr, [f]: e.target.value })); setErrors((er) => ({ ...er, [f]: undefined })) }

  const validate = () => {
    const e = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) e.amount = 'Enter a valid amount.'
    if (!form.category) e.category = 'Select a category.'
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        type: form.type, amount: parseFloat(form.amount), category: form.category,
        paymentMethod: form.paymentMethod, notes: form.notes.trim(),
        frequency: form.frequency, startDate: form.startDate,
        endDate: form.endDate || undefined,
      }
      if (rule) {
        await api.put(`/recurring-transactions/${rule._id}`, payload)
        toast.success('Recurring rule updated.')
      } else {
        await api.post('/recurring-transactions', payload)
        toast.success('Recurring rule created.')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save.')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{rule ? 'Edit Recurring Rule' : 'New Recurring Rule'}</h5>
            <button className="btn-icon" onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label-custom">Type</label>
                <div className="type-toggle">
                  <button type="button" className={`type-toggle-btn ${form.type === 'expense' ? 'active-expense' : ''}`} onClick={() => setForm((f) => ({ ...f, type: 'expense', category: '' }))}>
                    <i className="bi bi-arrow-up-circle me-1" /> Expense
                  </button>
                  <button type="button" className={`type-toggle-btn ${form.type === 'income' ? 'active-income' : ''}`} onClick={() => setForm((f) => ({ ...f, type: 'income', category: '' }))}>
                    <i className="bi bi-arrow-down-circle me-1" /> Income
                  </button>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-amount" className="form-label-custom">Amount (₹)</label>
                  <input id="rec-amount" type="number" min="0.01" step="0.01" className="form-control-custom" placeholder="0.00" value={form.amount} onChange={set('amount')} />
                  {errors.amount && <div className="form-error">{errors.amount}</div>}
                </div>
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-frequency" className="form-label-custom">Frequency</label>
                  <select id="rec-frequency" className="form-control-custom" value={form.frequency} onChange={set('frequency')}>
                    {RECURRENCE_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-category" className="form-label-custom">Category</label>
                  <select id="rec-category" className="form-control-custom" value={form.category} onChange={set('category')}>
                    <option value="">Select category</option>
                    {filtered.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  {errors.category && <div className="form-error">{errors.category}</div>}
                </div>
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-payment" className="form-label-custom">Payment Method</label>
                  <select id="rec-payment" className="form-control-custom" value={form.paymentMethod} onChange={set('paymentMethod')}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-startdate" className="form-label-custom">Start date</label>
                  <input id="rec-startdate" type="date" className="form-control-custom" value={form.startDate} onChange={set('startDate')} />
                </div>
                <div className="col-12 col-sm-6">
                  <label htmlFor="rec-enddate" className="form-label-custom">End date <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="rec-enddate" type="date" className="form-control-custom" value={form.endDate} onChange={set('endDate')} />
                </div>
                <div className="col-12">
                  <label htmlFor="rec-notes" className="form-label-custom">Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="rec-notes" type="text" className="form-control-custom" placeholder="e.g. Monthly rent, Netflix subscription…" value={form.notes} onChange={set('notes')} maxLength={200} />
                </div>
              </div>
            </div>
            <div className="modal-footer gap-2">
              <button type="button" className="btn-secondary-custom" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary-custom" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : (rule ? 'Save changes' : 'Create rule')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function RecurringPage() {
  const { user } = useAuth()
  const currency  = user?.currency || 'INR'
  const [rules,     setRules]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRule,  setEditRule]  = useState(null)
  const [deleteId,  setDeleteId]  = useState(null)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/recurring-transactions')
      setRules(data.rules || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRules() }, [fetchRules])

  const togglePause = async (rule) => {
    try {
      await api.put(`/recurring-transactions/${rule._id}`, { isActive: !rule.isActive })
      toast.success(rule.isActive ? 'Rule paused.' : 'Rule resumed.')
      fetchRules()
    } catch { toast.error('Could not update rule.') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/recurring-transactions/${deleteId}`)
      toast.success('Recurring rule deleted.')
      fetchRules()
    } catch { toast.error('Could not delete rule.') }
    finally { setDeleteId(null) }
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Recurring Transactions</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            Set up rules for regular income and expenses — rent, salary, subscriptions.
          </p>
        </div>
        <button id="add-recurring-btn" className="btn-primary-custom" onClick={() => { setEditRule(null); setShowModal(true) }}>
          <i className="bi bi-plus-lg" /> New Rule
        </button>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : rules.length === 0 ? (
          <div className="card-body">
            <EmptyState icon="bi-arrow-repeat" title="No recurring rules yet" message="Set up a rule for any transaction that happens on a regular schedule." action={
              <button className="btn-primary-custom" onClick={() => setShowModal(true)}>Create first rule</button>
            } />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Frequency</th>
                  <th>Next Due</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule._id} id={`rec-row-${rule._id}`}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                          background: rule.type === 'income' ? 'var(--color-income-bg)' : 'var(--color-expense-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <i className={`bi ${rule.type === 'income' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'}`}
                             style={{ color: rule.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)', fontSize: '0.9rem' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{rule.notes || rule.category?.name || 'Recurring'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{rule.category?.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-neutral" style={{ textTransform: 'capitalize' }}>{rule.frequency}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {rule.nextDueDate ? format(new Date(rule.nextDueDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={rule.type === 'income' ? 'amount-income' : 'amount-expense'}>
                        {rule.type === 'income' ? '+' : '−'}{formatCurrency(rule.amount, currency)}
                      </span>
                    </td>
                    <td>
                      {rule.isActive ? (
                        <span className="badge-income"><i className="bi bi-check-circle" />Active</span>
                      ) : (
                        <span className="badge-neutral"><i className="bi bi-pause-circle" style={{ marginRight: 3 }} />Paused</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" onClick={() => togglePause(rule)} title={rule.isActive ? 'Pause' : 'Resume'} id={`pause-rec-${rule._id}`}>
                        <i className={`bi ${rule.isActive ? 'bi-pause' : 'bi-play'}`} />
                      </button>
                      <button className="btn-icon edit" onClick={() => { setEditRule(rule); setShowModal(true) }} title="Edit" id={`edit-rec-${rule._id}`}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn-icon danger" onClick={() => setDeleteId(rule._id)} title="Delete" id={`delete-rec-${rule._id}`}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RecurringModal
          rule={editRule}
          onClose={() => { setShowModal(false); setEditRule(null) }}
          onSaved={() => { setShowModal(false); setEditRule(null); fetchRules() }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete recurring rule?"
        message="This rule will stop generating new transactions. Transactions already created will remain."
        confirmLabel="Delete"
        confirmClass="btn-danger-custom"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
