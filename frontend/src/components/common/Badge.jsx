export default function Badge({ type, children }) {
  const classMap = {
    real: 'badge badge-real',
    authentic: 'badge badge-real',
    deepfake: 'badge badge-deepfake',
    suspicious: 'badge badge-suspicious',
    low: 'badge badge-low',
    medium: 'badge badge-medium',
    high: 'badge badge-high',
    critical: 'badge badge-critical',
    blue: 'badge badge-blue',
    gray: 'badge badge-gray',
    verified: 'badge badge-verified',
    pending: 'badge badge-pending',
    tampered: 'badge badge-tampered',
    failed: 'badge badge-tampered',
    ready: 'badge badge-real',
    generating: 'badge badge-pending',
    image: 'badge badge-blue',
    video: 'badge badge-gray',
    url: 'badge badge-gray'
  }

  const cls = classMap[type] || 'badge badge-gray'

  return <span className={cls}>{children || type || 'N/A'}</span>
}

export function ResultBadge({ result }) {
  const labels = { deepfake: 'DEEPFAKE', real: 'AUTHENTIC', suspicious: 'SUSPICIOUS' }
  if (!result) return <Badge type="gray">NO VERDICT</Badge>
  return <Badge type={result}>{labels[result] || String(result).toUpperCase()}</Badge>
}

export function RiskBadge({ risk }) {
  if (!risk) return <Badge type="gray">RISK N/A</Badge>
  return <Badge type={risk}>{String(risk).toUpperCase()} RISK</Badge>
}

export function FileTypeBadge({ type }) {
  if (!type) return <Badge type="gray">N/A</Badge>
  return <Badge type={type}>{String(type).toUpperCase()}</Badge>
}

export function StatusBadge({ status }) {
  if (!status) return <Badge type="gray">Unknown</Badge>
  const text = String(status)
  return <Badge type={text}>{text.charAt(0).toUpperCase() + text.slice(1)}</Badge>
}
