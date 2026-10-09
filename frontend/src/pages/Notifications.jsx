import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, ShieldCheck, FileCheck, Check, ArrowRight, RefreshCw } from 'lucide-react'
import { formatDateTime } from '../utils/formatters'
import { useNotifications } from '../hooks/useNotifications'
import { LoadingState, ErrorState, EmptyView } from '../components/common/StateViews'

const TYPE_STYLE = {
  critical: { bg: 'var(--red-bg)', color: 'var(--red)', Icon: AlertTriangle },
  warning: { bg: 'var(--orange-bg)', color: 'var(--orange)', Icon: AlertTriangle },
  success: { bg: 'var(--green-bg)', color: 'var(--green)', Icon: ShieldCheck },
  info: { bg: 'var(--blue-bg)', color: 'var(--brand-primary)', Icon: FileCheck }
}

export default function Notifications() {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, error, reload, markRead, markAllRead } = useNotifications()
  const [filter, setFilter] = useState('all')

  const flagged = notifications.filter((n) => n.type === 'critical' || n.type === 'warning')
  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : filter === 'flagged' ? flagged : notifications

  return (
    <div className="animate-slideUp" style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && <span className="badge badge-red">{unreadCount} Unread</span>}
          </div>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            Alerts generated from your detection results and forensic reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-secondary btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <Check size={14} /> Mark All Read
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['all', `All (${notifications.length})`],
          ['unread', `Unread (${unreadCount})`],
          ['flagged', `Flagged (${flagged.length})`]
        ].map(([key, label]) => (
          <button key={key} className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'} btn-xs`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && notifications.length === 0 ? (
          <LoadingState text="Loading notifications..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyView
            icon={Bell}
            title={notifications.length === 0 ? 'No notifications yet' : 'Nothing in this view'}
            description={notifications.length === 0 ? 'Alerts appear here after you analyze files or generate reports.' : 'Try a different filter.'}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((item) => {
              const style = TYPE_STYLE[item.type] || TYPE_STYLE.info
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    markRead([item.id])
                    if (item.link) navigate(item.link)
                  }}
                  style={{
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    background: !item.read ? 'rgba(37, 99, 235, 0.04)' : 'transparent'
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: style.bg, color: style.color }}>
                    <style.Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.title}</span>
                        {!item.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} aria-label="Unread" />}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(item.timestamp)}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>{item.message}</p>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, alignSelf: 'center' }} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
