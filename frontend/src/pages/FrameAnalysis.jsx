import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FileVideo, Download, ChevronLeft, ChevronRight, Play, Pause, Layers, Film, SearchX } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { detectionService } from '../services/detectionService'
import { RiskBadge } from '../components/common/Badge'
import { LoadingState, ErrorState, EmptyView, InfoRow, DemoNotice } from '../components/common/StateViews'
import { useAsync } from '../hooks/useAsync'
import { getRiskColor } from '../utils/riskCalculator'
import { formatConfidence, downloadBlob, NOT_AVAILABLE } from '../utils/formatters'
import { useToast } from '../App'

export default function FrameAnalysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { data: det, loading, error, reload } = useAsync(() => detectionService.getDetectionResult(id), [id])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [threshold, setThreshold] = useState(70)

  const frames = useMemo(() => det?.frames || [], [det])
  const scored = frames.filter((f) => f.probability !== null)

  useEffect(() => {
    if (!isPlaying || frames.length < 2) return
    const interval = setInterval(() => {
      setSelectedFrameIndex((prev) => (prev + 1) % frames.length)
    }, 900)
    return () => clearInterval(interval)
  }, [isPlaying, frames.length])

  if (loading) return <LoadingState text="Loading frame analysis..." minHeight="60vh" />

  if (error) {
    const notFound = /not found/i.test(error)
    return (
      <div className="card">
        {notFound
          ? <EmptyView icon={SearchX} title="Detection not found" description="This analysis result does not exist or you do not have access to it." action={<Link to="/history" className="btn btn-primary btn-sm">Go to Detection History</Link>} />
          : <ErrorState message={error} onRetry={reload} />}
      </div>
    )
  }

  if (!det) return null

  const backLink = (
    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/result/${id}`)}>
      <ArrowLeft size={16} /> Back to Result
    </button>
  )

  if (frames.length === 0) {
    return (
      <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>{backLink}</div>
        <div className="card">
          <EmptyView
            icon={Film}
            title="No frame-level data"
            description={det.fileType === 'video'
              ? 'The analysis did not return per-frame results for this video.'
              : 'Frame analysis is only available for video detections.'}
          />
        </div>
      </div>
    )
  }

  const selectedFrame = frames[Math.min(selectedFrameIndex, frames.length - 1)]
  const chartData = frames.map((f, i) => ({ frame: `F#${f.frameNum}`, probability: f.probability, index: i }))
  const peakFrame = scored.length ? scored.reduce((max, f) => (f.probability > max.probability ? f : max), scored[0]) : null
  const avg = scored.length ? scored.reduce((sum, f) => sum + f.probability, 0) / scored.length : null
  const flaggedCount = scored.filter((f) => f.probability >= threshold).length

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      detectionId: det.id,
      evidenceId: det.evidenceId,
      fileName: det.fileName,
      model: det.model,
      isDemo: det.isDemo,
      frames: frames.map(({ frameNum, timestamp, probability, risk, anomalies }) => ({ frameNum, timestamp, probability, risk, anomalies }))
    }
    downloadBlob(JSON.stringify(payload, null, 2), `${det.id}_frames.json`, 'application/json')
    addToast(`Exported ${frames.length} frame records as JSON.`, 'success', 'Export Complete')
  }

  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {backLink}
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontWeight: 600 }}>Frame-by-Frame Analysis</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}>
          <Download size={14} /> Export Frame Data (JSON)
        </button>
      </div>

      {det.isDemo && <DemoNotice />}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <FileVideo size={20} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, wordBreak: 'break-word' }}>{det.fileName || 'Unnamed video'}</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Evidence ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{det.evidenceId || NOT_AVAILABLE}</span>
              {' · '}Model: <span style={{ color: 'var(--text-secondary)' }}>{det.model || NOT_AVAILABLE}</span>
              {' · '}Frames analyzed: {frames.length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              ['Average', formatConfidence(avg), 'var(--text-primary)'],
              ['Peak', peakFrame ? `${formatConfidence(peakFrame.probability)} (F#${peakFrame.frameNum})` : NOT_AVAILABLE, 'var(--red)'],
              [`≥ ${threshold}%`, `${flaggedCount} / ${scored.length}`, 'var(--orange)']
            ].map(([label, value, color]) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="frame-layout">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="var(--brand-primary)" />
              <span style={{ fontWeight: 600 }}>Frame #{selectedFrame.frameNum}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsPlaying((p) => !p)} disabled={frames.length < 2}>
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'Pause' : 'Step Through'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Timestamp" value={selectedFrame.timestamp} />
            <InfoRow
              label="Deepfake probability"
              value={selectedFrame.probability === null ? null : (
                <span style={{ color: getRiskColor(selectedFrame.risk) }}>{formatConfidence(selectedFrame.probability)}</span>
              )}
            />
            <InfoRow label="Risk" value={selectedFrame.risk ? <RiskBadge risk={selectedFrame.risk} /> : null} />
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Reported anomalies</div>
            {selectedFrame.anomalies.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                {selectedFrame.anomalies.map((a, idx) => <li key={idx}>{a}</li>)}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                The analysis did not report specific anomalies for this frame.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" disabled={selectedFrameIndex === 0} onClick={() => setSelectedFrameIndex((i) => Math.max(0, i - 1))}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedFrameIndex + 1} of {frames.length}</span>
            <button className="btn btn-secondary btn-sm" disabled={selectedFrameIndex === frames.length - 1} onClick={() => setSelectedFrameIndex((i) => Math.min(frames.length - 1, i + 1))}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card-title">Flagging Threshold</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Count frames whose deepfake probability is at or above this value. This only filters the view; it does not change the analysis.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Threshold</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)' }}>{threshold}%</span>
          </div>
          <input
            type="range"
            min="30"
            max="95"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--red)' }}
            aria-label="Flagging threshold"
          />
          <div style={{ fontSize: 13 }}>
            <strong>{flaggedCount}</strong> of {scored.length} scored frames at or above {threshold}%.
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="card-title">Deepfake Probability Over Time</div>
          <p className="card-subtitle">Select a frame below to inspect it.</p>
        </div>

        <div style={{ height: 200, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id="spectrumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="frame" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val) => [formatConfidence(val), 'Deepfake probability']} />
              <ReferenceLine y={threshold} stroke="#f97316" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="probability" stroke="#ef4444" strokeWidth={2.5} fill="url(#spectrumGrad)" connectNulls activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {frames.map((frame, idx) => {
            const isSelected = idx === selectedFrameIndex
            return (
              <button
                key={`${frame.frameNum}-${idx}`}
                type="button"
                onClick={() => setSelectedFrameIndex(idx)}
                aria-pressed={isSelected}
                style={{
                  minWidth: 120,
                  background: isSelected ? 'var(--red-bg)' : 'var(--bg-secondary)',
                  border: `2px solid ${isSelected ? 'var(--red)' : 'var(--border-color)'}`,
                  borderRadius: 8,
                  padding: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>Frame #{frame.frameNum}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: frame.probability === null ? 'var(--text-muted)' : getRiskColor(frame.risk) }}>
                  {formatConfidence(frame.probability)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{frame.timestamp || NOT_AVAILABLE}</div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
