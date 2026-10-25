import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import UserAvatar from '../ui/UserAvatar'
import logo from '../../assets/logo.png';

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { to: '/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' },
      { to: '/transactions', icon: 'bi-arrow-left-right', label: 'Transactions' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budgets', icon: 'bi-wallet2', label: 'Budgets & Categories' },
      { to: '/recurring', icon: 'bi-arrow-repeat', label: 'Recurring' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: 'bi-bar-chart-line', label: 'Reports' },
      { to: '/notifications', icon: 'bi-bell', label: 'Notifications', badgeKey: 'unread' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', icon: 'bi-person-circle', label: 'Profile & Settings' },
    ],
  },
]

export default function Sidebar({ open, onClose, unreadCount }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        {/* Brand */}
        <NavLink to="/dashboard" className="sidebar-brand" onClick={onClose}>
          <div className="sidebar-brand-icon">
            <img src={logo} alt="RupeeWise Logo" />
          </div>
          <div>
            <div className="sidebar-brand-name">RupeeWise</div>
            <div className="sidebar-brand-tagline">Finance Tracker</div>
          </div>
        </NavLink>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={onClose}
                >
                  <i className={`bi ${item.icon} nav-icon`} />
                  <span>{item.label}</span>
                  {item.badgeKey === 'unread' && unreadCount > 0 && (
                    <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — user info + logout */}
        <div className="sidebar-footer">
          <div style={{ padding: '0 1.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserAvatar
                user={user}
                size={34}
                bgColor="rgba(59,130,246,0.25)"
                textColor="#93c5fd"
                style={{ border: '1px solid rgba(255, 255, 255, 0.15)' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ color: 'rgba(203,213,225,0.6)', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
          <button className="sidebar-nav-item" onClick={handleLogout} style={{ color: '#fca5a5' }}>
            <i className="bi bi-box-arrow-right nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
