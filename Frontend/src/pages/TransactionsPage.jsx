import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate } from '../utils/format'
import { PAYMENT_METHODS } from '../utils/constants'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import TransactionModal from '../components/transactions/TransactionModal'

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const { user } = useAuth()
  const currency  = user?.currency || 'INR'
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters
  const [filters, setFilters] = useState({
    type:          searchParams.get('type')     || '',
    category:      searchParams.get('category') || '',
    paymentMethod: '',
    from:          '',
    to:            '',
    q:             '',
  })
  const [page,          setPage]          = useState(1)
  const [transactions,  setTransactions]  = useState([])
  const [total,         setTotal]         = useState(0)
  const [categories,    setCategories]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [editTxn,       setEditTxn]       = useState(null)
  const [deleteId,      setDeleteId]      = useState(null)

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories')
      setCategories(data.categories || [])
    } catch { /* silent */ }
  }

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page)
      params.set('limit', PAGE_SIZE)
      if (filters.type)          params.set('type', filters.type)
      if (filters.category)      params.set('category', filters.category)
      if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod)
      if (filters.from)          params.set('from', filters.from)
      if (filters.to)            params.set('to', filters.to)
      if (filters.q)             params.set('q', filters.q)

      const { data } = await api.get(`/transactions?${params}`)
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load transactions.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { fetchCategories() }, [])
  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const handleFilterChange = (field) => (e) => {
    setFilters((f) => ({ ...f, [field]: e.target.value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ type: '', category: '', paymentMethod: '', from: '', to: '', q: '' })
    setPage(1)
    setSearchParams({})
  }

  const handleEdit = (txn) => { setEditTxn(txn); setShowModal(true) }

  const handleDelete = async () => {
    try {
      await api.delete(`/transactions/${deleteId}`)
      toast.success('Transaction deleted.')
      setDeleteId(null)
      fetchTransactions()
    } catch {
      toast.error('Could not delete transaction.')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Transactions</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            {total > 0 ? `${total} transaction${total !== 1 ? 's' : ''} found` : 'Your full transaction history'}
          </p>
        </div>
        <button
          id="add-txn-btn"
          className="btn-primary-custom"
          onClick={() => { setEditTxn(null); setShowModal(true) }}
        >
          <i className="bi bi-plus-lg" /> Add Transaction
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar mb-4">
        <input
          id="txn-search"
          type="search"
          placeholder="Search notes…"
          value={filters.q}
          onChange={handleFilterChange('q')}
          style={{ minWidth: 160 }}
        />
        <select id="txn-filter-type" value={filters.type} onChange={handleFilterChange('type')}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select id="txn-filter-category" value={filters.category} onChange={handleFilterChange('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select id="txn-filter-payment" value={filters.paymentMethod} onChange={handleFilterChange('paymentMethod')}>
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>From</span>
          <input id="txn-from" type="date" value={filters.from} onChange={handleFilterChange('from')} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>To</span>
          <input id="txn-to" type="date" value={filters.to} onChange={handleFilterChange('to')} max={new Date().toISOString().split('T')[0]}/>
        </div>
        {hasFilters && (
          <button className="btn-icon" onClick={clearFilters} title="Clear filters">
            <i className="bi bi-x-circle" style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="card">
        {loading ? <LoadingSpinner /> : transactions.length === 0 ? (
          <div className="card-body">
            <EmptyState
              icon="bi-receipt"
              title={hasFilters ? 'No matching transactions' : 'No transactions yet'}
              message={hasFilters ? 'Try adjusting or clearing the filters.' : 'Add your first income or expense to get started.'}
              action={!hasFilters && (
                <button className="btn-primary-custom" onClick={() => setShowModal(true)}>
                  Add transaction
                </button>
              )}
            />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th>Payment</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn._id} id={`txn-row-${txn._id}`}>
                      <td style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(txn.date)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="cat-dot" style={{ background: txn.category?.color || '#64748b' }} />
                          <span>{txn.category?.name || '—'}</span>
                          {txn.recurringId && <span className="recurring-badge"><i className="bi bi-arrow-repeat" />Recurring</span>}
                        </div>
                      </td>
                      <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: txn.notes ? 'var(--color-text)' : 'var(--color-text-light)' }}>
                        {txn.notes || '—'}
                      </td>
                      <td>
                        <span className="badge-neutral">
                          {PAYMENT_METHODS.find((m) => m.value === txn.paymentMethod)?.label || txn.paymentMethod || '—'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span className={txn.type === 'income' ? 'amount-income' : 'amount-expense'}>
                          {txn.type === 'income' ? '+' : '−'}{formatCurrency(txn.amount, currency)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon edit" onClick={() => handleEdit(txn)} title="Edit" id={`edit-txn-${txn._id}`}>
                          <i className="bi bi-pencil" />
                        </button>
                        <button className="btn-icon danger" onClick={() => setDeleteId(txn._id)} title="Delete" id={`delete-txn-${txn._id}`}>
                          <i className="bi bi-trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-secondary-custom" onClick={() => setPage((p) => p - 1)} disabled={page === 1} style={{ padding: '4px 12px' }}>
                    <i className="bi bi-chevron-left" />
                  </button>
                  <span style={{ padding: '4px 10px', fontSize: '0.875rem' }}>{page} / {totalPages}</span>
                  <button className="btn-secondary-custom" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} style={{ padding: '4px 12px' }}>
                    <i className="bi bi-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <TransactionModal
          transaction={editTxn}
          onClose={() => { setShowModal(false); setEditTxn(null) }}
          onSaved={() => { setShowModal(false); setEditTxn(null); fetchTransactions() }}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete transaction?"
        message="This will permanently remove this transaction and update your balances. This action cannot be undone."
        confirmLabel="Delete"
        confirmClass="btn-danger-custom"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
