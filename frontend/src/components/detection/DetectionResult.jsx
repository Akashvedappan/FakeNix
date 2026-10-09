import { useEffect, useState } from 'react'
import { clampPercent, toNumber } from '../../utils/normalize'
import { formatConfidence } from '../../utils/formatters'

/** Horizontal probability bar. Bar width is clamped; the label shows the actual value. */
export function ProbabilityBar({ label, value, color }) {
  const [width, setWidth] = useState(0)
  const num = toNumber(value)

  useEffect(() => {
    const timer = setTimeout(() => setWidth(clampPercent(num)), 300)
    return () => clearTimeout(timer)
  }, [num])

  return (
    <div className="confidence-bar-row">
      <span className="confidence-bar-label">{label}</span>
      <div
        className="confidence-bar-track"
        role="progressbar"
        aria-label={`${label} probability`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={num ?? undefined}
      >
        <div className="confidence-bar-fill" style={{ width: `${width}%`, background: color }} />
      </div>
      <span className="confidence-bar-pct" style={{ color: num === null ? 'var(--text-muted)' : color, fontSize: num === null ? 12 : undefined }}>
        {num === null ? 'N/A' : formatConfidence(num)}
      </span>
    </div>
  )
}

export default function DetectionResult({ deepfakeProbability, realProbability }) {
  const hasAny = toNumber(deepfakeProbability) !== null || toNumber(realProbability) !== null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ProbabilityBar label="Deepfake" value={deepfakeProbability} color="var(--red)" />
      <ProbabilityBar label="Real" value={realProbability} color="var(--green)" />
      {!hasAny && (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
          The analysis did not return probability scores for this file.
        </p>
      )}
    </div>
  )
}
