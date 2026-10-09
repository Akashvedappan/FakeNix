import { useState, useEffect } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { Download, AlertTriangle, RefreshCw, ArrowLeft, SearchX, ImageOff } from 'lucide-react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { RiskBadge } from '../components/common/Badge'
import DetectionResult from '../components/detection/DetectionResult'
import RiskScore from '../components/detection/RiskScore'
import MetadataPanel from '../components/forensic/MetadataPanel'
import HashDisplay from '../components/forensic/HashDisplay'
import { LoadingState, ErrorState, EmptyView, InfoRow, DemoNotice } from '../components/common/StateViews'
import { useToast } from '../App'
import {
  formatDateTime, formatFileSize, formatConfidence, getResultLabel, getRiskLabel, NOT_AVAILABLE
} from '../utils/formatters'
import { getRiskColor } from '../utils/riskCalculator'
import { normalizeDetection } from '../utils/normalize'

const SEVERITY_COLORS = { high: 'var(--red)', critical: 'var(--red)', medium: 'var(--orange)', low: 'var(--green)' }

const VERDICT = {
  deepfake: { icon: '⚠️', label: 'DEEPFAKE DETECTED', cls: 'deepfake' },
  real: { icon: '✅', label: 'AUTHENTIC MEDIA', cls: 'real' },
  suspicious: { icon: '🔍', label: 'SUSPICIOUS MEDIA', cls: 'suspicious' }
}

function buildExplanation(det) {
  if (!det.result) return 'The analysis did not return a verdict for this file.'
  const verdict = getResultLabel(det.result).toLowerCase()
  const prob = formatConfidence(det.deepfakeProbability ?? det.confidence)
  const parts = [`The detection model classified this ${det.fileType || 'file'} as ${verdict}`]
  if (prob !== NOT_AVAILABLE) parts[0] += ` with a deepfake probability of ${prob}`
  parts[0] += '.'
  if (det.risk) parts.push(`This corresponds to a ${getRiskLabel(det.risk).toLowerCase()} risk classification.`)
  const count = det.indicators.length
  parts.push(count > 0
    ? `${count} manipulation indicator${count === 1 ? ' was' : 's were'} reported by the model.`
    : 'No specific manipulation indicators were reported.')
  return parts.join(' ')
}

export default function Result() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const stateDet = normalizeDetection(location.state?.result)
  const initial = stateDet?.id === id ? stateDet : null

  const [det, setDet] = useState(initial)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('analysis')
  const [downloading, setDownloading] = useState(false)
  const [reportId, setReportId] = useState(null)

  const load = async () => {
    if (!id || id === 'undefined' || id === 'null') {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const d = await detectionService.getDetectionResult(id)
      if (!d) setNotFound(true)
      else setDet(d)
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true)
      else setError(getErrorMessage(err, 'Unable to load this analysis result.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setReportId(null)
    setActiveTab('analysis')
    if (initial) {
      setDet(initial)
      setLoading(false)
      return
    }
    setDet(null)
    load()
  }, [id]) // eslint-disable-line

  if (loading) return <LoadingState text="Loading analysis result..." minHeight="60vh" />

  if (notFound) {
    return (
      <div className="card">
        <EmptyView
          icon={SearchX}
          title="Detection not found"
          description="This analysis result does not exist or you do not have access to it."
          action={<Link to="/history" className="btn btn-primary btn-sm">Go to Detection History</Link>}
        />
      </div>
    )
  }

  if (error || !det) {
    return (
      <div className="card">
        <ErrorState message={error || 'Unable to load this analysis result.'} onRetry={load} />
      </div>
    )
  }

  const verdict = VERDICT[det.result]
  const verdictClass = verdict?.cls || 'suspicious'
  const hasFrames = det.frames.length > 0
  const isVideo = det.fileType === 'video'

  const handleDownloadReport = async () => {
    if (!det.id) return
    setDownloading(true)
    try {
      let activeReportId = reportId
      if (!activeReportId) {
        const report = await detectionService.generateReport(det.id)
        activeReportId = report.reportId
        setReportId(activeReportId)
      }
      await detectionService.downloadReport(activeReportId)
      addToast(`Report ${activeReportId} downloaded.`, 'success', 'Download Complete')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to generate or download the report.'), 'error', 'Download Failed')
    } finally {
      setDownloading(false)
    }
  }

  const tabs = ['analysis', ...(isVideo ? ['frames'] : []), 'metadata', 'evidence']

  return (
    <div className="animate-slideUp">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {det.isDemo && <div style={{ marginBottom: 20 }}><DemoNotice /></div>}

      {/* Verdict Card */}
      <div className={`result-verdict ${verdictClass}`} style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{verdict?.icon || '❔'}</div>
        <div className={`verdict-label ${verdictClass}`}>{verdict?.label || 'NO VERDICT AVAILABLE'}</div>
        <RiskScore score={det.deepfakeProbability ?? det.confidence} risk={det.risk} />
        <div style={{ marginTop: 8 }}>
          <RiskBadge risk={det.risk} />
        </div>
        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
          {det.fileName || 'Unnamed file'} &nbsp;·&nbsp; Evidence ID:{' '}
          {det.evidenceId
            ? <strong className="evidence-id">{det.evidenceId}</strong>
            : <em style={{ color: 'var(--text-muted)' }}>{NOT_AVAILABLE}</em>}
        </div>
      </div>

      {/* Probabilities + File Info */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Detection Probabilities</div>
          <DetectionResult
            deepfakeProbability={det.deepfakeProbability}
            realProbability={det.realProbability}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <InfoRow label="Verdict" value={det.result ? getResultLabel(det.result) : null} />
            <InfoRow label="Risk Classification" value={det.risk ? getRiskLabel(det.risk) : null} />
            <InfoRow label="Status" value={det.status ? det.status.charAt(0).toUpperCase() + det.status.slice(1) : null} />
          </div>
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>File Information</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow label="Detection ID" value={det.id && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{det.id}</span>} />
            <InfoRow label="Evidence ID" value={det.evidenceId && <span className="evidence-id">{det.evidenceId}</span>} />
            <InfoRow label="File Name" value={det.fileName} />
            <InfoRow label="File Type" value={det.fileType?.toUpperCase()} />
            <InfoRow label="File Size" value={formatFileSize(det.fileSize)} />
            <InfoRow label="Resolution" value={det.resolution} />
            {isVideo && <InfoRow label="Duration" value={det.duration} />}
            {det.sourceUrl && <InfoRow label="Source URL" value={det.sourceUrl} />}
            <InfoRow label="Detection Date" value={formatDateTime(det.timestamp)} />
            <InfoRow label="AI Model" value={det.model} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={activeTab === t}
              className={`tab-btn ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'analysis' ? 'AI Analysis' : t === 'frames' ? 'Frame Analysis' : t === 'metadata' ? 'Metadata' : 'Evidence'}
            </button>
          ))}
        </div>

        {activeTab === 'analysis' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>AI Explanation</div>
              {det.explanation ? (
                <>
                  <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                    {det.explanation}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                    Assessment written by {det.model || 'the AI model'}. {buildExplanation(det)}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {buildExplanation(det)}
                </p>
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Analysis Indicators</div>
            <div className="indicators-list">
              {det.indicators.map((ind, idx) => (
                <div key={`${ind.name}-${idx}`} className="indicator-item">
                  <div className="indicator-dot" style={{ background: SEVERITY_COLORS[ind.severity] || 'var(--text-muted)' }} />
                  <span className="indicator-name">{ind.name}</span>
                  <div className="indicator-bar">
                    <div
                      className="indicator-bar-fill"
                      style={{
                        width: `${ind.score === null ? 0 : ind.score * 100}%`,
                        background: SEVERITY_COLORS[ind.severity] || 'var(--text-muted)'
                      }}
                    />
                  </div>
                  <span className="indicator-score">{ind.score === null ? 'N/A' : `${(ind.score * 100).toFixed(0)}%`}</span>
                  <RiskBadge risk={ind.severity} />
                  {ind.evidence && (
                    <div style={{ flexBasis: '100%', fontSize: 12.5, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.5 }}>
                      {ind.evidence}
                    </div>
                  )}
                </div>
              ))}
              {det.indicators.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
                  No specific indicators were reported for this media.
                </p>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Visual Explanation</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-main)', border: '1px dashed var(--border-hover)',
                borderRadius: 'var(--radius)', padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)'
              }}>
                <ImageOff size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                The analysis engine did not provide heatmap or visual attribution data for this result.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'frames' && (
          hasFrames ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Frame-Level Analysis</div>
                <Link to={`/result/${det.id}/frames`} className="btn btn-secondary btn-sm">Full Frame View</Link>
              </div>
              <div className="frame-grid">
                {det.frames.map((frame, idx) => (
                  <div key={`${frame.frameNum}-${idx}`} className="frame-card">
                    <div className="frame-number">Frame {String(frame.frameNum).padStart(3, '0')}</div>
                    <div className="frame-probability" style={{ color: frame.probability === null ? 'var(--text-muted)' : getRiskColor(frame.risk) }}>
                      {formatConfidence(frame.probability)}
                    </div>
                    <div className="frame-timestamp">{frame.timestamp || NOT_AVAILABLE}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>
              The analysis did not return frame-level results for this video.
            </p>
          )
        )}

        {activeTab === 'metadata' && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>File Metadata</div>
            <MetadataPanel metadata={det.metadata} />
          </div>
        )}

        {activeTab === 'evidence' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Forensic Evidence Information</div>
            <div className="card" style={{ background: 'var(--bg-main)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Evidence ID
              </div>
              {det.evidenceId
                ? <div className="evidence-id" style={{ fontSize: 18, fontWeight: 900 }}>{det.evidenceId}</div>
                : <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>{NOT_AVAILABLE}</div>}
            </div>
            <HashDisplay hash={det.sha256} label="SHA-256 Hash" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Detection Model" value={det.model} />
              <InfoRow label="Timestamp" value={formatDateTime(det.timestamp)} />
              <InfoRow label="Result" value={det.result ? getResultLabel(det.result) : null} />
              <InfoRow label="Risk Level" value={det.risk ? getRiskLabel(det.risk) : null} />
            </div>
            <Link to="/evidence" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
              Open Evidence Vault
            </Link>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleDownloadReport} disabled={downloading || !det.id}>
          {downloading ? <span className="loader-spinner sm" /> : <Download size={15} />}
          <span>{downloading ? 'Preparing report...' : 'Download Forensic Report'}</span>
        </button>
        <Link
          to={det.evidenceId ? `/cybercrime/report?evidenceId=${encodeURIComponent(det.evidenceId)}` : '/cybercrime/report'}
          className="btn btn-danger"
        >
          <AlertTriangle size={15} /> Report Cybercrime
        </Link>
        <Link to="/detect" className="btn btn-secondary">
          <RefreshCw size={15} /> Analyze Another File
        </Link>
        {isVideo && hasFrames && (
          <Link to={`/result/${det.id}/frames`} className="btn btn-outline">View All Frames</Link>
        )}
      </div>
    </div>
  )
}
