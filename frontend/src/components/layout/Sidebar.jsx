import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ScanSearch, Image, Video,
  History, Shield, FileText, AlertTriangle,
  BookOpen, HelpCircle, Settings, LogOut
} from 'lucide-react'
import { useAppAuth } from '../../App'
import Logo from '../common/Logo'

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
    ]
  },
  {
    label: 'Detect Content',
    items: [
      { to: '/detect', icon: ScanSearch, label: 'Analyze Media' },
      { to: '/detect/image', icon: Image, label: 'Image Analysis', sub: true },
      { to: '/detect/video', icon: Video, label: 'Video Analysis', sub: true }
    ]
  },
  {
    label: 'Investigation',
    items: [
      { to: '/history', icon: History, label: 'Detection History' },
      { to: '/evidence', icon: Shield, label: 'Evidence Vault' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/cybercrime/report', icon: AlertTriangle, label: 'Cybercrime Report' }
    ]
  },
  {
    label: 'Resources',
    items: [
      { to: '/awareness', icon: BookOpen, label: 'Awareness' },
      { to: '/resources', icon: HelpCircle, label: 'Security Resources' }
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' }
    ]
  }
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAppAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Logo size="md" />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">FAKENIX</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/detect'}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  `sidebar-nav-item${item.sub ? ' sidebar-sub-item' : ''}${isActive ? ' active' : ''}`
                }
              >
                <item.icon className="sidebar-nav-icon" size={16} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Signed in'}</div>
            <div className="sidebar-user-role">{user?.role || 'Analyst'}</div>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}
