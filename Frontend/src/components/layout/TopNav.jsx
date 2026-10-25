import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import UserAvatar from '../ui/UserAvatar'
import ThemeToggle from '../ui/ThemeToggle'

export default function TopNav({ title, onMenuToggle, unreadCount }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="topnav">
      {/* Hamburger — mobile only */}
      <button
        className="hamburger-btn"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        <i className="bi bi-list" style={{ fontSize: '1.4rem' }} />
      </button>

      <h1 className="topnav-title">{title}</h1>

      <div className="topnav-actions">
        {/* Theme mode toggle */}
        <ThemeToggle id="topnav-theme-toggle" />

        {/* Notification bell */}
        <button
          id="notif-bell-btn"
          className="topnav-icon-btn"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          title="Notifications"
        >
          <i className="bi bi-bell" style={{ fontSize: '1rem' }} />
          {unreadCount > 0 && (
            <span className="topnav-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div
          id="user-avatar-btn"
          className="topnav-avatar-wrap"
          onClick={() => navigate('/profile')}
          title="Profile & Settings"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/profile')}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <UserAvatar user={user} size={34} />
        </div>
      </div>
    </header>
  )
}
