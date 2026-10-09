import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ScanSearch, Image, Video, CheckCircle, Shield, AlertTriangle, Inbox } from 'lucide-react'
import { useAppAuth } from '../App'
import StatCard from '../components/dashboard/StatCard'
import ActivityTable from '../components/dashboard/ActivityTable'
import { DetectionTrendChart, DistributionPieChart, MediaTypeChart } from '../components/dashboard/DetectionChart'
import ImpactCard from '../components/dashboard/ImpactCard'
import { LoadingState, ErrorState, EmptyView } from '../components/common/StateViews'
import { detectionService } from '../services/detectionService'
import { useAsync } from '../hooks/useAsync'
import { parseDate, formatTimeAgo, formatConfidence } from '../utils/formatters'

const TREND_DAYS = 11
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const quickActions = [
  { to: '/detect/image', icon: Image, label: 'Detect Image', color: '#2563eb', bg: '#eff6ff' },
  { to: '/detect/video', icon: Video, label: 'Detect Video', color: '#7c3aed', bg: '#f5f3ff' },
  { to: '/evidence', icon: Shield, label: 'Evidence Vault', color: '#0891b2', bg: '#ecfeff' },
  { to: '/cybercrime/report', icon: AlertTriangle, label: 'Report Cybercrime', color: '#dc2626', bg: '#fef2f2' }
]

// Reports are not loaded here: the backend's GET /reports seeds sample records
// for users who have none, so it is only called from the Reports page.
async function loadDashboard() {
  return { detections: await detectionService.getDetectionHistory() }
}

export default function Dashboard() {
  const { user } = useAppAuth()
  const firstName = user?.name?.split(' ')[0] || 'Analyst'
  const { data, loading, error, reload } = useAsync(loadDashboard, [])

  const stats = useMemo(() => {
    const detections = data?.detections || []
    const weekAgo = Date.now() - WEEK_MS
    const count = (fn) => detections.filter(fn).length
    const inLastWeek = (d) => (parseDate(d.timestamp)?.getTime() || 0) >= weekAgo
    return {
      total: detections.length,
      deepfake: count((d) => d.result === 'deepfake'),
      suspicious: count((d) => d.result === 'suspicious'),
      real: count((d) => d.result === 'real'),
      image: count((d) => d.fileType === 'image'),
      video: count((d) => d.fileType === 'video'),
      url: count((d) => d.fileType === 'url'),
      totalWeek: count(inLastWeek),
      deepfakeWeek: count((d) => d.result === 'deepfake' && inLastWeek(d)),
      suspiciousWeek: count((d) => d.result === 'suspicious' && inLastWeek(d)),
      realWeek: count((d) => d.result === 'real' && inLastWeek(d)),
      demo: count((d) => d.isDemo),
      alerts: detections.filter((d) => d.result === 'deepfake' || d.result === 'suspicious').slice(0, 4)
    }
  }, [data])

  return (
    <div className="animate-slideUp">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {firstName} 👋</h1>
        <p className="page-subtitle">Let's make the internet a safer place.</p>
      </div>

      {loading && !data ? (
        <div className="card" style={{ marginBottom: 24 }}><LoadingState text="Loading your detection statistics..." /></div>
      ) : error ? (
        <div className="card" style={{ marginBottom: 24 }}><ErrorState message={error} onRetry={reload} /></div>
      ) : (
        <>
          {stats.demo > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
              {stats.demo} of {stats.total} detections were produced in backend demo mode (simulated results).
            </div>
          )}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Total Files Analyzed" value={stats.total} hint={`${stats.totalWeek} in the last 7 days`} icon={ScanSearch} color="#2563eb" bgColor="#eff6ff" />
            <StatCard label="Deepfakes Detected" value={stats.deepfake} hint={`${stats.deepfakeWeek} in the last 7 days`} icon={AlertTriangle} color="#ef4444" bgColor="#fef2f2" />
            <StatCard label="Suspicious Media" value={stats.suspicious} hint={`${stats.suspiciousWeek} in the last 7 days`} icon={Shield} color="#f97316" bgColor="#fff7ed" />
            <StatCard label="Authentic Media" value={stats.real} hint={`${stats.realWeek} in the last 7 days`} icon={CheckCircle} color="#16a34a" bgColor="#f0fdf4" />
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Quick Actions</div>
            <div className="card-subtitle">Start a new analysis or report</div>
          </div>
        </div>
        <div className="quick-actions">
          {quickActions.map(({ to, icon: Icon, label, color, bg }) => (
            <Link key={to} to={to} className="quick-action-card">
              <div className="quick-action-icon" style={{ background: bg }}>
                <Icon size={22} color={color} />
              </div>
              <span className="quick-action-label">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Detection Trend</div>
              <div className="card-subtitle">Last {TREND_DAYS} days</div>
            </div>
          </div>
          <DetectionTrendChart days={TREND_DAYS} />
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Distribution</div>
              <div className="card-subtitle">All-time verdicts</div>
            </div>
          </div>
          {data ? <DistributionPieChart real={stats.real} deepfake={stats.deepfake} suspicious={stats.suspicious} /> : error ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unavailable.</p> : <LoadingState />}
        </div>
      </div>

      {/* Activity + Alerts + Media Types */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest detections</div>
            </div>
            <Link to="/history" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {loading && !data ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : stats.total === 0 ? (
            <EmptyView
              icon={Inbox}
              title="No detections yet"
              description="Analyze an image or video to see it here."
              action={<Link to="/detect" className="btn btn-primary btn-sm">Start an analysis</Link>}
            />
          ) : (
            <ActivityTable detections={data.detections} limit={5} />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Alerts</div>
              <Link to="/notifications" style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 600 }}>View all</Link>
            </div>
            {data && stats.alerts.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No deepfake or suspicious detections.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stats.alerts.map((d) => (
                <Link key={d.id} to={`/result/${d.id}`} className="alert-item" style={{ color: 'inherit' }}>
                  <div className="alert-dot" style={{ background: d.result === 'deepfake' ? 'var(--red)' : 'var(--orange)' }} />
                  <div className="alert-content">
                    <div className="alert-message">
                      {d.result === 'deepfake' ? 'Deepfake' : 'Suspicious media'}: {d.fileName || 'Unnamed file'} ({formatConfidence(d.deepfakeProbability ?? d.confidence)})
                    </div>
                    <div className="alert-time">{formatTimeAgo(d.timestamp)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Media Types</div>
            </div>
            {data ? <MediaTypeChart image={stats.image} video={stats.video} url={stats.url} /> : error ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unavailable.</p> : <LoadingState />}
          </div>
        </div>
      </div>

      {data && (
        <ImpactCard
          filesAnalyzed={stats.total}
          authenticVerified={stats.real}
          threatsIdentified={stats.deepfake + stats.suspicious}
        />
      )}
    </div>
  )
}
