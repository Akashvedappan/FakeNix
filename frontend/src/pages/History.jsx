import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Download, Trash2, ArrowUpRight, FileVideo, FileImage, Link2, Shield, RefreshCw } from 'lucide-react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { ResultBadge, RiskBadge } from '../components/common/Badge'
import { LoadingState, ErrorState, EmptyView } from '../components/common/StateViews'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatConfidence, parseDate, downloadBlob } from '../utils/formatters'
import { clampPercent } from '../utils/normalize'
import { useToast } from '../App'

const TYPE_ICONS = { video: FileVideo, url: Link2 }

// Quote a CSV cell and neutralise spreadsheet formula injection.
const csvCell = (value) => {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export default function History() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: detections, setData: setDetections, loading, error, reload } = useAsync(
    () => detectionService.getDetectionHistory(), [], { initialData: [] }
  )
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [resultFilter, setResultFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Navbar search updates ?q= while this page is open.
  useEffect(() => {
    const q = searchParams.get('q')
    if (q !== null) setSearchTerm(q)
  }, [searchParams])

  const filteredDetections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const ts = (d) => parseDate(d.timestamp)?.getTime() || 0
    return detections
      .filter((item) => {
        const matchesSearch = !term ||
          [item.fileName, item.evidenceId, item.sha256, item.id].some((v) => v && v.toLowerCase().includes(term))
        const matchesResult = resultFilter === 'all' || item.result === resultFilter
        const matchesType = typeFilter === 'all' || item.fileType === typeFilter
        return matchesSearch && matchesResult && matchesType
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return ts(a) - ts(b)
        if (sortBy === 'probability') return (b.deepfakeProbability ?? -1) - (a.deepfakeProbability ?? -1)
        return ts(b) - ts(a)
      })
  }, [detections, searchTerm, resultFilter, typeFilter, sortBy])

  const hasFilters = searchTerm || resultFilter !== 'all' || typeFilter !== 'all'

  const resetFilters = () => {
    setSearchTerm('')
    setResultFilter('all')
    setTypeFilter('all')
    if (searchParams.get('q')) setSearchParams({})
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await detectionService.deleteDetection(pendingDelete.id)
      setDetections((prev) => prev.filter((d) => d.id !== pendingDelete.id))
      addToast('Detection, evidence and related reports were deleted.', 'success', 'Record Deleted')
      setPendingDelete(null)
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to delete this record.'), 'error', 'Delete Failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = () => {
    if (filteredDetections.length === 0) return
    const header = ['Detection ID', 'Evidence ID', 'File Name', 'Type', 'Result', 'Risk', 'Deepfake Probability (%)', 'Timestamp (UTC)', 'SHA-256', 'Demo Result']
    const rows = filteredDetections.map((d) => [
      d.id, d.evidenceId, d.fileName, d.fileType, d.result, d.risk,
      d.deepfakeProbability ?? '', parseDate(d.timestamp)?.toISOString() || '', d.sha256, d.isDemo ? 'yes' : 'no'
    ].map(csvCell).join(','))
    downloadBlob([header.map(csvCell).join(','), ...rows].join('\n'), `fakenix_detection_history_${Date.now()}.csv`, 'text/csv')
    addToast(`Exported ${filteredDetections.length} record(s) as CSV.`, 'success', 'Export Complete')
  }

  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">Detection History</h1>
          <p className="page-subtitle">All media you have analyzed, with verdicts and evidence hashes.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} disabled={filteredDetections.length === 0}>
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/detect')}>
            + New Detection
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              placeholder="Search by file name, evidence ID, detection ID or SHA-256..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 38 }}
              aria-label="Search detections"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Result:
            <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="form-control" style={{ width: 'auto', padding: '6px 12px' }}>
              <option value="all">All Verdicts</option>
              <option value="deepfake">Deepfake</option>
              <option value="real">Authentic</option>
              <option value="suspicious">Suspicious</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Type:
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-control" style={{ width: 'auto', padding: '6px 12px' }}>
              <option value="all">All Formats</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="url">URL</option>
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sort:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-control" style={{ width: 'auto', padding: '6px 12px' }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="probability">Deepfake Probability</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingState text="Loading detection history..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : detections.length === 0 ? (
          <EmptyView
            icon={Shield}
            title="No detections yet"
            description="Analyze an image or video and it will appear here."
            action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/detect')}>Start an analysis</button>}
          />
        ) : filteredDetections.length === 0 ? (
          <EmptyView
            icon={Search}
            title="No matching records"
            description="No detections match your current search or filters."
            action={hasFilters && <button className="btn btn-secondary btn-sm" onClick={resetFilters}><RefreshCw size={14} /> Reset Filters</button>}
          />
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Media File & Evidence ID</th>
                  <th>Type</th>
                  <th>Verdict</th>
                  <th>Deepfake Prob.</th>
                  <th>Risk Level</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetections.map((item) => {
                  const Icon = TYPE_ICONS[item.fileType] || FileImage
                  return (
                    <tr key={item.id} onClick={() => navigate(`/result/${item.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} color={item.fileType === 'video' ? 'var(--accent-purple)' : 'var(--accent-blue)'} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                              {item.fileName || 'Unnamed file'}
                              {item.isDemo && <span className="badge badge-purple" style={{ marginLeft: 6, fontSize: 10 }}>DEMO</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              {item.evidenceId || item.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.fileType || 'N/A'}
                        </span>
                      </td>
                      <td><ResultBadge result={item.result} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatConfidence(item.deepfakeProbability ?? item.confidence)}</span>
                          <div style={{ width: 50, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{
                              width: `${clampPercent(item.deepfakeProbability ?? item.confidence)}%`,
                              height: '100%',
                              background: item.result === 'deepfake' ? 'var(--red)' : item.result === 'real' ? 'var(--green)' : 'var(--orange)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td><RiskBadge risk={item.risk} /></td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(item.timestamp)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/result/${item.id}`)} title="Open result" aria-label="Open result">
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => setPendingDelete(item)}
                            title="Delete record"
                            aria-label="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
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

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete detection record?"
        message={`This permanently deletes "${pendingDelete?.fileName || pendingDelete?.id}" together with its evidence record and any generated reports from the server. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
