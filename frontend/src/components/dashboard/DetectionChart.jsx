import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { detectionService } from '../../services/detectionService'
import { getErrorMessage } from '../../services/api'

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const formatTickDate = (tickVal) => {
  if (!tickVal) return ''
  if (typeof tickVal === 'string' && tickVal.length === 10 && tickVal.includes('-')) {
    const parts = tickVal.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return `${MONTH_NAMES_SHORT[parts[1] - 1]} ${parts[2]}`
    }
  }
  return tickVal
}

const formatTooltipLabel = (label) => {
  if (!label) return ''
  if (typeof label === 'string' && label.length === 10 && label.includes('-')) {
    const parts = label.split('-').map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return `${MONTH_NAMES_LONG[parts[1] - 1]} ${parts[2]}, ${parts[0]}`
    }
  }
  return label
}

export function DetectionTrendChart({ days = 11, customData = null }) {
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrend = useCallback(async () => {
    if (customData) {
      setTrendData(customData)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await detectionService.getDetectionTrend(days)
      if (res && Array.isArray(res.trend)) {
        setTrendData(res.trend)
      } else if (Array.isArray(res)) {
        setTrendData(res)
      } else {
        setTrendData([])
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load detection trend.'))
    } finally {
      setLoading(false)
    }
  }, [days, customData])

  useEffect(() => {
    fetchTrend()

    // Re-check when window is focused or becomes visible (e.g. overnight date shift)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchTrend()
      }
    }

    window.addEventListener('focus', fetchTrend)
    document.addEventListener('visibilitychange', handleVisibility)

    // Periodic light polling (every 60 seconds)
    const interval = setInterval(fetchTrend, 60000)

    return () => {
      window.removeEventListener('focus', fetchTrend)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [fetchTrend])

  if (loading && trendData.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: 'rgba(248, 250, 252, 0.5)',
          borderRadius: 8
        }}
      >
        <RefreshCw size={24} className="animate-spin text-muted" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>Loading detection trend...</span>
      </div>
    )
  }

  if (error && trendData.length === 0) {
    return (
      <div
        style={{
          height: 220,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          background: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fee2e2',
          padding: 16
        }}
      >
        <AlertCircle size={24} color="#dc2626" />
        <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>{error}</span>
        <button
          onClick={fetchTrend}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  if (!loading && !error && trendData.every((d) => !d.total)) {
    return <ChartEmpty height={220} text={`No detections in the last ${days} days.`} />
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickFormatter={formatTickDate}
        />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
        <Tooltip
          labelFormatter={formatTooltipLabel}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="real" stroke="#22c55e" strokeWidth={2} dot={false} name="Real" />
        <Line type="monotone" dataKey="deepfake" stroke="#ef4444" strokeWidth={2} dot={false} name="Deepfake" />
        <Line type="monotone" dataKey="suspicious" stroke="#f97316" strokeWidth={2} dot={false} name="Suspicious" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ChartEmpty({ height = 200, text = 'No detections yet.' }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
      {text}
    </div>
  )
}

export function DistributionPieChart({ real = 0, deepfake = 0, suspicious = 0 }) {
  const data = [
    { name: 'Real', value: real, color: '#22c55e' },
    { name: 'Deepfake', value: deepfake, color: '#ef4444' },
    { name: 'Suspicious', value: suspicious, color: '#f97316' }
  ].filter((d) => d.value > 0)

  if (data.length === 0) return <ChartEmpty text="No detections to chart yet." />

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={data.length > 1 ? 3 : 0}
          dataKey="value"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MediaTypeChart({ image = 0, video = 0, url = 0 }) {
  const data = [
    { type: 'Image', count: image },
    { type: 'Video', count: video },
    ...(url > 0 ? [{ type: 'URL', count: url }] : [])
  ]

  if (image + video + url === 0) return <ChartEmpty text="No analyzed media yet." />

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Files" />
      </BarChart>
    </ResponsiveContainer>
  )
}
