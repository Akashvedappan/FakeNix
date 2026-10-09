import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Menu, Search, Bell, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAppAuth } from '../../App'
import { useNotifications } from '../../hooks/useNotifications'
import { formatTimeAgo } from '../../utils/formatters'
import Logo from '../common/Logo'

const NOTIF_COLORS = {
  critical: ['var(--red-bg)', 'var(--red)'],
  warning: ['var(--orange-bg)', 'var(--orange)'],
  success: ['var(--green-bg)', 'var(--green)'],
  info: ['var(--blue-bg)', 'var(--brand-primary)']
}

const breadcrumbMap = {
  '/dashboard': ['Dashboard'],
  '/detect': ['Detect Content', 'Analyze Media'],
  '/detect/image': ['Detect Content', 'Image Analysis'],
  '/detect/video': ['Detect Content', 'Video Analysis'],
  '/history': ['Investigation', 'Detection History'],
  '/evidence': ['Investigation', 'Evidence Vault'],
  '/reports': ['Investigation', 'Reports'],
  '/cybercrime/report': ['Investigation', 'Cybercrime Report'],
  '/awareness': ['Resources', 'Awareness'],
  '/resources': ['Resources', 'Security Resources'],
  '/settings': ['System', 'Settings'],
  '/notifications': ['Notifications']
}

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAppAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [search, setSearch] = useState('')
  const { notifications, unreadCount, reload: reloadNotifications, markRead } = useNotifications()
  const notifRef = useRef(null)
  const userRef = useRef(null)

  const crumbs = breadcrumbMap[location.pathname] ||
    (/^\/result\/[^/]+\/frames$/.test(location.pathname)
      ? ['Investigation', 'Analysis Result', 'Frames']
      : location.pathname.startsWith('/result') ? ['Investigation', 'Analysis Result'] : [])

  // Refresh alerts after navigating (e.g. a new analysis just completed).
  useEffect(() => {
    reloadNotifications()
  }, [location.pathname, reloadNotifications])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = search.trim()
    navigate(q ? `/history?q=${encodeURIComponent(q)}` : '/history')
  }

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <button className="navbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="navbar-breadcrumb">
        <Logo size="sm" />
        <span className="breadcrumb-root">FAKENIX</span>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="breadcrumb-sep">/</span>
            <span className={i === crumbs.length - 1 ? 'breadcrumb-current' : ''}>{c}</span>
          </span>
        ))}
      </div>

      {/* Search */}
      <form className="navbar-search" onSubmit={handleSearch} role="search">
        <Search size={14} className="navbar-search-icon" />
        <input
          placeholder="Search detections..."
          aria-label="Search detections"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {/* Actions */}
      <div className="navbar-actions">
        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => setShowNotifications((v) => !v)}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="navbar-badge" />}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <span className="notifications-title">Notifications</span>
                <Link
                  to="/notifications"
                  style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 600 }}
                  onClick={() => setShowNotifications(false)}
                >
                  View all
                </Link>
              </div>
              <div className="notifications-list">
                {notifications.length === 0 && (
                  <div style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No notifications yet.
                  </div>
                )}
                {notifications.slice(0, 5).map((n) => {
                  const [bg, color] = NOTIF_COLORS[n.type] || NOTIF_COLORS.info
                  return (
                    <Link
                      key={n.id}
                      to={n.link || '/notifications'}
                      className={`notification-item ${!n.read ? 'unread' : ''}`}
                      style={{ color: 'inherit' }}
                      onClick={() => { markRead([n.id]); setShowNotifications(false) }}
                    >
                      <div className="notification-icon-wrap" style={{ background: bg }}>
                        <Bell size={14} color={color} />
                      </div>
                      <div className="notification-content">
                        <div className="notification-message">{n.title}: {n.message}</div>
                        <div className="notification-time">{formatTimeAgo(n.timestamp)}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            className="navbar-user"
            onClick={() => setShowUserMenu((v) => !v)}
            aria-label="User menu"
          >
            <div className="navbar-avatar">{initials}</div>
            <span className="navbar-user-name">{user?.name?.split(' ')[0] || 'Account'}</span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 200,
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 200,
                overflow: 'hidden',
                animation: 'scaleIn 0.2s ease'
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', fontSize: 13, fontWeight: 500,
                  color: 'var(--text-primary)', transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-main)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <Settings size={14} /> Settings
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', fontSize: 13, fontWeight: 500,
                  color: 'var(--red)', width: '100%', background: 'none',
                  border: 'none', cursor: 'pointer', transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
