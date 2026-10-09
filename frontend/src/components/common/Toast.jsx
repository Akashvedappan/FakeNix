import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle size={18} color="var(--green)" />,
  error: <AlertCircle size={18} color="var(--red)" />,
  warning: <AlertTriangle size={18} color="var(--orange)" />,
  info: <Info size={18} color="var(--brand-primary)" />
}

export default function Toast({ toast, onClose }) {
  const { type = 'info', title, message } = toast

  return (
    <div className={`toast ${type}`} role="alert" aria-live="polite">
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  )
}
