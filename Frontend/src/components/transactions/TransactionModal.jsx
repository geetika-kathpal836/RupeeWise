import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import api from '../../services/api'
import { PAYMENT_METHODS, RECURRENCE_FREQUENCIES } from '../../utils/constants'
import { format } from 'date-fns'

const EMPTY_FORM = {
  type:          'expense',
  amount:        '',
  category:      '',
  date:          format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'upi',
  notes:         '',
  isRecurring:   false,
  frequency:     'monthly',
  startDate:     format(new Date(), 'yyyy-MM-dd'),
  endDate:       '',
}

export default function TransactionModal({ transaction, onClose, onSaved }) {
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data.categories || [])
    }).catch(() => {})
  }, [])

  // Populate form when editing
  useEffect(() => {
    if (transaction) {
      setForm({
        type:          transaction.type          || 'expense',
        amount:        String(transaction.amount || ''),
        category:      transaction.category?._id || transaction.category || '',
        date:          transaction.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: transaction.paymentMethod || 'upi',
        notes:         transaction.notes         || '',
        isRecurring:   false,
        frequency:     'monthly',
        startDate:     format(new Date(), 'yyyy-MM-dd'),
        endDate:       '',
      })
    }
  }, [transaction])

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  )

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => {
      const next = { ...f, [field]: val }
      // Reset category when type changes
      if (field === 'type') next.category = ''
      return next
    })
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount greater than zero.'
    if (!form.category)
      e.category = 'Please select a category.'
    if (!form.date)
      e.date = 'Date is required.'
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payload = {
        type:          form.type,
        amount:        parseFloat(form.amount),
        category:      form.category,
        date:          form.date,
        paymentMethod: form.paymentMethod,
        notes:         form.notes.trim(),
      }
      if (transaction) {
        await api.put(`/transactions/${transaction._id}`, payload)
        toast.success('Transaction updated.')
      } else {
        await api.post('/transactions', payload)
        toast.success('Transaction added.')
        if (form.isRecurring) {
          await api.post('/recurring-transactions', {
            type:          form.type,
            amount:        parseFloat(form.amount),
            category:      form.category,
            paymentMethod: form.paymentMethod,
            notes:         form.notes.trim(),
            frequency:     form.frequency,
            startDate:     form.startDate,
            endDate:       form.endDate || undefined,
          })
          toast.success('Recurring rule created.')
        }
      }
      onSaved()
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not save transaction.'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{transaction ? 'Edit Transaction' : 'Add Transaction'}</h5>
            <button className="btn-icon" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Type toggle */}
              <div className="mb-3">
                <label className="form-label-custom">Type</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={`type-toggle-btn ${form.type === 'expense' ? 'active-expense' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, type: 'expense', category: '' }))}
                  >
                    <i className="bi bi-arrow-up-circle me-1" /> Expense
                  </button>
                  <button
                    type="button"
                    className={`type-toggle-btn ${form.type === 'income' ? 'active-income' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, type: 'income', category: '' }))}
                  >
                    <i className="bi bi-arrow-down-circle me-1" /> Income
                  </button>
                </div>
              </div>

              <div className="row g-3">
                {/* Amount */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="txn-amount" className="form-label-custom">Amount (₹)</label>
                  <input
                    id="txn-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-control-custom"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={set('amount')}
                  />
                  {errors.amount && <div className="form-error">{errors.amount}</div>}
                </div>

                {/* Date */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="txn-date" className="form-label-custom">Date</label>
                  <input
                    id="txn-date"
                    type="date"
                    className="form-control-custom"
                    value={form.date}
                    onChange={set('date')}
                  />
                  {errors.date && <div className="form-error">{errors.date}</div>}
                </div>

                {/* Category */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="txn-category" className="form-label-custom">Category</label>
                  <select id="txn-category" className="form-control-custom" value={form.category} onChange={set('category')}>
                    <option value="">Select category</option>
                    {filteredCategories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category && <div className="form-error">{errors.category}</div>}
                </div>

                {/* Payment method */}
                <div className="col-12 col-sm-6">
                  <label htmlFor="txn-payment" className="form-label-custom">Payment Method</label>
                  <select id="txn-payment" className="form-control-custom" value={form.paymentMethod} onChange={set('paymentMethod')}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div className="col-12">
                  <label htmlFor="txn-notes" className="form-label-custom">Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    id="txn-notes"
                    type="text"
                    className="form-control-custom"
                    placeholder="e.g. Lunch with team, Monthly rent…"
                    value={form.notes}
                    onChange={set('notes')}
                    maxLength={200}
                  />
                </div>

                {/* Recurring — only on create */}
                {!transaction && (
                  <div className="col-12">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: form.isRecurring ? '0.75rem' : 0 }}>
                      <input
                        id="txn-recurring"
                        type="checkbox"
                        checked={form.isRecurring}
                        onChange={set('isRecurring')}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-secondary)', cursor: 'pointer' }}
                      />
                      <label htmlFor="txn-recurring" className="form-label-custom" style={{ marginBottom: 0, cursor: 'pointer' }}>
                        Make this a recurring transaction
                      </label>
                    </div>

                    {form.isRecurring && (
                      <div className="row g-3">
                        <div className="col-12 col-sm-4">
                          <label htmlFor="txn-frequency" className="form-label-custom">Frequency</label>
                          <select id="txn-frequency" className="form-control-custom" value={form.frequency} onChange={set('frequency')}>
                            {RECURRENCE_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </div>
                        <div className="col-12 col-sm-4">
                          <label htmlFor="txn-startdate" className="form-label-custom">Start date</label>
                          <input id="txn-startdate" type="date" className="form-control-custom" value={form.startDate} onChange={set('startDate')} />
                        </div>
                        <div className="col-12 col-sm-4">
                          <label htmlFor="txn-enddate" className="form-label-custom">End date <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
                          <input id="txn-enddate" type="date" className="form-control-custom" value={form.endDate} onChange={set('endDate')} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer gap-2">
              <button type="button" className="btn-secondary-custom" onClick={onClose}>Cancel</button>
              <button
                id="save-txn-btn"
                type="submit"
                className="btn-primary-custom"
                disabled={saving}
              >
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : (transaction ? 'Save changes' : 'Add transaction')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
