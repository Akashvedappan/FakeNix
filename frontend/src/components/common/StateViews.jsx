import { AlertCircle, RefreshCw, FolderOpen, FlaskConical } from 'lucide-react'
import { NOT_AVAILABLE } from '../../utils/formatters'

export function LoadingState({ text = 'Loading...', minHeight }) {
  return (
    <div className="state-view" style={minHeight ? { minHeight } : undefined} role="status" aria-live="polite">
      <div className="loader-spinner" />
      <div className="state-view-desc">{text}</div>
    </div>
  )
}

export function ErrorState({ title = 'Unable to load data', message, onRetry, minHeight }) {
  return (
    <div className="state-view error" style={minHeight ? { minHeight } : undefined} role="alert">
      <AlertCircle size={28} color="var(--red)" />
      <div className="state-view-title">{title}</div>
      {message && <div className="state-view-desc">{message}</div>}
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} style={{ marginTop: 6 }}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  )
}

export function EmptyView({ icon: Icon = FolderOpen, title = 'Nothing here yet', description, action }) {
  return (
    <div className="state-view">
      <Icon size={32} color="var(--text-muted)" />
      <div className="state-view-title">{title}</div>
      {description && <div className="state-view-desc">{description}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

/** Label/value row that renders "Not available" for missing values. */
export function InfoRow({ label, value }) {
  const missing = value === null || value === undefined || value === '' || value === NOT_AVAILABLE
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className={`info-row-value${missing ? ' muted' : ''}`}>{missing ? NOT_AVAILABLE : value}</span>
    </div>
  )
}

/** Shown only for results the backend flagged with isDemo. */
export function DemoNotice({ children }) {
  return (
    <div
      role="note"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: 'linear-gradient(90deg, #f5f3ff, #eff6ff)',
        border: '1px solid #ddd6fe',
        borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13
      }}
    >
      <span className="demo-badge"><FlaskConical size={12} /> DEMO ANALYSIS</span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {children || 'The backend is running in demo mode. This result was simulated and no trained AI model was used.'}
      </span>
    </div>
  )
}
