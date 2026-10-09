import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, CheckCircle, Clock, Plus, FileSearch, ArrowUpRight } from 'lucide-react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { ResultBadge } from '../components/common/Badge'
import { LoadingState, ErrorState, EmptyView } from '../components/common/StateViews'
import Modal from '../components/common/Modal'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatDate, formatConfidence, getResultLabel } from '../utils/formatters'
import { useToast } from '../App'

async function loadReportsPage() {
  const [reports, detections] = await Promise.allSettled([
    detectionService.getReports(),
    detectionService.getDetectionHistory()
  ])
  if (reports.status === 'rejected') throw reports.reason
  return {
    reports: reports.value,
    detections: detections.status === 'fulfilled' ? detections.value : []
  }
}

export default function Reports() {
  const { addToast } = useToast()
  const { data, setData, loading, error, reload } = useAsync(loadReportsPage, [])
  const [downloadingId, setDownloadingId] = useState(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [selectedDetection, setSelectedDetection] = useState('')
  const [generating, setGenerating] = useState(false)

  const reports = data?.reports || []
  const detections = data?.detections || []

  const detectionById = useMemo(() => {
    const map = new Map()
    detections.forEach((d) => d.id && map.set(d.id, d))
    return map
  }, [detections])

  const reportedIds = useMemo(() => new Set(reports.map((r) => r.detectionId).filter(Boolean)), [reports])
  const unreported = detections.filter((d) => d.id && !reportedIds.has(d.id))
  const readyCount = reports.filter((r) => r.status === 'ready').length

  const handleDownload = async (report) => {
    if (!report.reportId) return
    setDownloadingId(report.reportId)
    try {
      await detectionService.downloadReport(report.reportId)
      addToast(`${report.reportId}.pdf downloaded.`, 'success', 'Download Complete')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to download this report.'), 'error', 'Download Failed')
    } finally {
      setDownloadingId(null)
    }
  }

  const openGenerate = () => {
    setSelectedDetection(unreported[0]?.id || detections[0]?.id || '')
    setShowGenerate(true)
  }

  const handleGenerate = async () => {
    if (!selectedDetection) return
    setGenerating(true)
    try {
      const report = await detectionService.generateReport(selectedDetection)
      setData((prev) => ({
        ...prev,
        reports: [report, ...prev.reports.filter((r) => r.reportId !== report.reportId)]
      }))
      addToast(`Report ${report.reportId} is ready to download.`, 'success', 'Report Generated')
      setShowGenerate(false)
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to generate the report.'), 'error', 'Generation Failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Forensic Reports</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Generate and download PDF forensic reports for your completed analyses.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" disabled={loading || !!error || detections.length === 0} onClick={openGenerate}>
          <Plus size={15} /> Generate Report
        </button>
      </div>

      <div className="grid-3">
        {[
          { label: 'Reports', value: reports.length, icon: FileText, color: 'var(--accent-purple)', bg: '#f5f3ff' },
          { label: 'Ready to Download', value: readyCount, icon: CheckCircle, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'Analyses Without Report', value: unreported.length, icon: FileSearch, color: 'var(--accent-cyan)', bg: '#ecfeff' }
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{loading || error ? '—' : value}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
              <Icon size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="card-title">Generated Reports</div>
          <Link to="/cybercrime/report" className="btn btn-ghost btn-xs">Prepare Incident Report &rarr;</Link>
        </div>

        {loading ? (
          <LoadingState text="Loading reports..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : reports.length === 0 ? (
          <EmptyView
            icon={FileText}
            title="No reports yet"
            description={detections.length > 0 ? 'Generate a PDF report for one of your analyses.' : 'Analyze a file first, then generate a report for it.'}
            action={detections.length > 0
              ? <button className="btn btn-primary btn-sm" onClick={openGenerate}>Generate Report</button>
              : <Link to="/detect" className="btn btn-primary btn-sm">Analyze a file</Link>}
          />
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Report ID & Type</th>
                  <th>Media File</th>
                  <th>Verdict</th>
                  <th>Confidence</th>
                  <th>Generated</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const linked = r.detectionId ? detectionById.get(r.detectionId) : null
                  return (
                    <tr key={r.id || r.reportId}>
                      <td>
                        <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {r.reportId || 'No report ID'}
                          {linked?.isDemo && <span className="badge badge-purple" style={{ marginLeft: 6, fontSize: 10 }}>DEMO</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.reportType || 'Forensic report'}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{r.fileName || 'Not available'}</div>
                        {r.evidenceId && <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{r.evidenceId}</div>}
                      </td>
                      <td><ResultBadge result={r.result} /></td>
                      <td><span style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatConfidence(r.confidence)}</span></td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(r.generatedDate)}</span></td>
                      <td>
                        {r.status === 'ready' ? (
                          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> Ready</span>
                        ) : (
                          <span className="badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {r.status || 'Unknown'}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownload(r)}
                            disabled={!r.reportId || downloadingId === r.reportId}
                            title="Download PDF"
                          >
                            {downloadingId === r.reportId ? <span className="loader-spinner sm" /> : <Download size={14} />} PDF
                          </button>
                          {linked && (
                            <Link to={`/result/${r.detectionId}`} className="btn btn-ghost btn-sm" title="Open analysis result" aria-label="Open analysis result">
                              <ArrowUpRight size={14} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showGenerate}
        onClose={generating ? undefined : () => setShowGenerate(false)}
        title="Generate Forensic Report"
        maxWidth={520}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowGenerate(false)} disabled={generating}>Cancel</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !selectedDetection}>
              {generating && <span className="loader-spinner sm" />} Generate PDF
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="report-detection">Analysis</label>
          <select
            id="report-detection"
            className="form-control"
            value={selectedDetection}
            onChange={(e) => setSelectedDetection(e.target.value)}
          >
            {detections.map((d) => (
              <option key={d.id} value={d.id}>
                {(d.fileName || d.id)} — {getResultLabel(d.result)} — {formatDate(d.timestamp)}{reportedIds.has(d.id) ? ' (has report)' : ''}{d.isDemo ? ' [demo]' : ''}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            If a report already exists for the selected analysis, the existing report is returned.
          </span>
        </div>
      </Modal>
    </div>
  )
}
