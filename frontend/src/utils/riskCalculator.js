export const getRiskLevel = (confidence) => {
  if (confidence >= 85) return 'high'
  if (confidence >= 50) return 'medium'
  return 'low'
}

export const getRiskColor = (risk) => {
  const map = {
    low: '#22c55e',
    medium: '#f97316',
    high: '#ef4444',
    critical: '#dc2626'
  }
  return map[risk] || '#6b7280'
}

export const getResultColor = (result) => {
  const map = {
    real: '#22c55e',
    suspicious: '#f97316',
    deepfake: '#ef4444'
  }
  return map[result] || '#6b7280'
}

export const getResultBgColor = (result) => {
  const map = {
    real: 'var(--green-bg)',
    suspicious: 'var(--orange-bg)',
    deepfake: 'var(--red-bg)'
  }
  return map[result] || 'var(--gray-bg)'
}

export const calculateThreatScore = (indicators) => {
  if (!indicators || indicators.length === 0) return 0
  const total = indicators.reduce((sum, ind) => sum + ind.score, 0)
  return Math.round((total / indicators.length) * 100)
}
