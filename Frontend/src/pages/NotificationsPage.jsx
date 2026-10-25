import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import api from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

function NotifIcon({ type }) {
  const configs = {
    warn:    { icon: 'bi-exclamation-triangle', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    danger:  { icon: 'bi-x-octagon',           bg: 'var(--color-expense-bg)', color: 'var(--color-expense)' },
    info:    { icon: 'bi-info-circle',          bg: '#eff6ff',                 color: 'var(--color-secondary)' },
  }
  const c = configs[type] || configs.info
  return (
    <div className="notif-icon" style={{ background: c.bg }}>
      <i className={`bi ${c.icon}`} style={{ color: c.color, fontSize: '1rem' }} />
    </div>
  )
}

export default function NotificationsPage() {
  const outletCtx = useOutletContext()
  const [notifications, setNotifications] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [marking,  setMarking]  = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((ns) => ns.map((n) => n._id === id ? { ...n, isRead: true } : n))
      outletCtx?.refreshUnread?.()
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    setMarking(true)
    try {
      await api.patch('/notifications/read-all')
      setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })))
      outletCtx?.refreshUnread?.()
      toast.success('All notifications marked as read.')
    } catch { toast.error('Could not mark all as read.') }
    finally { setMarking(false) }
  }

  const unread = notifications.filter((n) => !n.isRead)

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Notifications</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
            {unread.length > 0 ? `${unread.length} unread notification${unread.length !== 1 ? 's' : ''}` : "You're all caught up."}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            id="mark-all-read-btn"
            className="btn-secondary-custom"
            onClick={markAllRead}
            disabled={marking}
          >
            {marking ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-check2-all me-1" />}
            Mark all as read
          </button>
        )}
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : notifications.length === 0 ? (
          <div className="card-body">
            <EmptyState icon="bi-bell" title="No notifications yet" message="Budget alerts will appear here when you approach or exceed your spending limits." />
          </div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div
                key={n._id}
                id={`notif-${n._id}`}
                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => { if (!n.isRead) markRead(n._id) }}
                style={{ cursor: !n.isRead ? 'pointer' : 'default' }}
              >
                <NotifIcon type={n.alertType === 'over_budget' ? 'danger' : n.alertType === 'near_limit' ? 'warn' : 'info'} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: n.isRead ? 400 : 600 }}>{n.title}</span>
                    {!n.isRead && <span className="notif-unread-dot" style={{ marginTop: 5 }} />}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: 4 }}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
