import { useEffect, useState } from 'react'
import { getRiskColor } from '../../utils/riskCalculator'
import { toNumber } from '../../utils/normalize'

export default function RiskScore({ score, risk, animated = true }) {
  const target = toNumber(score)
  const [displayScore, setDisplayScore] = useState(animated ? 0 : target ?? 0)

  useEffect(() => {
    if (target === null) return
    if (!animated) {
      setDisplayScore(target)
      return
    }
    let current = 0
    const step = Math.max(target / (1200 / 16), 0.1)
    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        setDisplayScore(target)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.round(current * 10) / 10)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, animated])

  const color = target === null ? 'var(--text-muted)' : getRiskColor(risk)

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: target === null ? 32 : 72,
        fontWeight: 900,
        color,
        lineHeight: 1,
        letterSpacing: target === null ? 0 : -3,
        fontFamily: 'var(--font-mono)',
        transition: 'color 0.3s'
      }}>
        {target === null ? 'Not available' : `${displayScore.toFixed(1)}%`}
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--text-muted)',
        marginTop: 6,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 1
      }}>
        Deepfake Probability
      </div>
    </div>
  )
}
