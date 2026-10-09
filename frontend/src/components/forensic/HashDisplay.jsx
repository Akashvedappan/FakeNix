import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function HashDisplay({ hash, label = 'SHA-256' }) {
  const [copied, setCopied] = useState(false)

  const copyHash = async () => {
    if (!hash) return
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          {label}
        </div>
      )}
      <div className="hash-display">
        <span className="hash-text" title={hash}>{hash || 'N/A'}</span>
        <button
          className="hash-copy-btn"
          onClick={copyHash}
          title={copied ? 'Copied!' : 'Copy hash'}
          aria-label={copied ? 'Hash copied' : 'Copy hash to clipboard'}
        >
          {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}
