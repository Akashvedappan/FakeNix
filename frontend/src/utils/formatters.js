export const NOT_AVAILABLE = 'Not available'

/**
 * Parse an API timestamp. The backend emits naive ISO strings for UTC
 * (e.g. "2026-09-28T05:02:00.57"), which browsers would otherwise read as local time.
 */
export const parseDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  let input = value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(value)) {
    input = `${value}Z`
  }
  const date = new Date(input)
  return isNaN(date.getTime()) ? null : date
}

export const formatDate = (value) => {
  const date = parseDate(value)
  if (!date) return NOT_AVAILABLE
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  })
}

export const formatDateTime = (value) => {
  const date = parseDate(value)
  if (!date) return NOT_AVAILABLE
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export const formatTimeAgo = (value) => {
  const date = parseDate(value)
  if (!date) return NOT_AVAILABLE
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/** Accepts a byte count or an already formatted string like "0.14 MB". */
export const formatFileSize = (value) => {
  if (value === null || value === undefined || value === '') return NOT_AVAILABLE
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed.toUpperCase() === 'N/A') return NOT_AVAILABLE
    if (/^\d+$/.test(trimmed)) return formatFileSize(Number(trimmed))
    return trimmed
  }
  const bytes = Number(value)
  if (!Number.isFinite(bytes) || bytes < 0) return NOT_AVAILABLE
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

export const truncateHash = (hash, len = 16) => {
  if (!hash || typeof hash !== 'string') return NOT_AVAILABLE
  if (hash.length <= len + 8) return hash
  return hash.slice(0, len) + '...' + hash.slice(-8)
}

/** Format a 0–100 percentage. Returns "Not available" instead of "NaN%". */
export const formatConfidence = (value, digits = 1) => {
  if (value === null || value === undefined || value === '') return NOT_AVAILABLE
  const num = Number(value)
  if (!Number.isFinite(num)) return NOT_AVAILABLE
  return `${num.toFixed(digits)}%`
}

/** Display a scalar value safely; objects/empties become "Not available". */
export const displayValue = (value) => {
  if (value === null || value === undefined) return NOT_AVAILABLE
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : NOT_AVAILABLE
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'string') return value.trim() ? value : NOT_AVAILABLE
  return NOT_AVAILABLE
}

export const getResultLabel = (result) => {
  const map = {
    deepfake: 'Deepfake',
    real: 'Authentic',
    suspicious: 'Suspicious'
  }
  if (!result) return NOT_AVAILABLE
  return map[result] || String(result)
}

export const getRiskLabel = (risk) => {
  const map = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
  if (!risk) return NOT_AVAILABLE
  return map[risk] || String(risk)
}

/** Trigger a browser download for in-memory data. */
export const downloadBlob = (data, filename, type = 'application/octet-stream') => {
  const blob = data instanceof Blob ? data : new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
