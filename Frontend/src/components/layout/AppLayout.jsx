import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import api from '../../services/api'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets & Categories',
  '/recurring': 'Recurring Transactions',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/profile': 'Profile & Settings',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const location = useLocation()

  const title = PAGE_TITLES[location.pathname] ?? 'RupeeWise'

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=1&unread=true')
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchUnread()
    // Refresh count every 60 seconds
    const interval = setInterval(fetchUnread, 60_000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Also refresh when navigating away from notifications page
  useEffect(() => {
    if (location.pathname !== '/notifications') {
      fetchUnread()
    }
  }, [location.pathname, fetchUnread])

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />
      <div className="main-content">
        <TopNav
          title={title}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          unreadCount={unreadCount}
        />
        <main className="page-body">
          <Outlet context={{ refreshUnread: fetchUnread }} />
        </main>
      </div>
    </div>
  )
}
