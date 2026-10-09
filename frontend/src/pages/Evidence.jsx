import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, XCircle,
  Copy, Download, Clock, RefreshCw, Search, ShieldOff, ArrowUpRight
} from 'lucide-react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { ResultBadge } from '../components/common/Badge'
import { LoadingState, ErrorState, EmptyView } from '../components/common/StateViews'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatConfidence, downloadBlob } from '../utils/formatters'
import { useToast } from '../App'

const STATUS_BADGE = {
  verified: { cls: 'badge-green', icon: CheckCircle2, text: 'Integrity Verified' },
  failed: { cls: 'badge-red', icon: XCircle, text: 'Integrity Check Failed' },
  tampered: { cls: 'badge-red', icon: XCircle, text: 'Integrity Check Failed' },
  pending: { cls: 'badge-orange', icon: AlertCircle, text: 'Pending Verification' }
}

export default function Evidence() {
  const { addToast } = useToast()
  const { data: evidenceList, setData: setEvidenceList, loading, error, reload } = useAsync(
    () => detectionService.getEvidence(), [], { initialData: [] }
  )
  const [verifyingId, setVerifyingId] = useState(null)
  const [auditing, setAuditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const counts = useMemo(() => ({
    verified: evidenceList.filter((e) => e.status === 'verified').length,
    failed: evidenceList.filter((e) => e.status === 'failed' || e.status === 'tampered').length
  }), [evidenceList])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return evidenceList.filter((e) => {
      const matchesTerm = !term || [e.evidenceId, e.fileName, e.sha256, e.md5].some((v) => v && v.toLowerCase().includes(term))
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'failed' ? e.status === 'failed' || e.status === 'tampered' : e.status === statusFilter)
      return matchesTerm && matchesStatus
    })
  }, [evidenceList, searchTerm, statusFilter])

  const applyStatus = (evidenceId, status) => {
    setEvidenceList((prev) => prev.map((e) => (
      e.evidenceId === evidenceId
        ? { ...e, status, integrityCheck: status === 'verified' ? new Date().toISOString() : e.integrityCheck }
        : e
    )))
  }

  const verifyOne = async (item) => {
    const res = await detectionService.verifyEvidence(item.evidenceId)
    if (res.status) applyStatus(item.evidenceId, res.status)
    return res
  }

  const handleVerify = async (item) => {
    if (!item.evidenceId) return
    setVerifyingId(item.evidenceId)
    try {
      const res = await verifyOne(item)
      if (res.match) {
        addToast(`SHA-256 recomputed for ${item.evidenceId} matches the stored hash.`, 'success', 'Integrity Verified')
      } else {
        addToast(res.reason || `SHA-256 for ${item.evidenceId} does not match.`, 'error', 'Integrity Check Failed')
      }
    } catch (err) {
      addToast(getErrorMessage(err, 'Integrity verification failed.'), 'error', 'Verification Error')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleAuditAll = async () => {
    const targets = evidenceList.filter((e) => e.evidenceId)
    if (targets.length === 0) return
    setAuditing(true)
    let passed = 0
    let failed = 0
    let errored = 0
    for (const item of targets) {
      setVerifyingId(item.evidenceId)
      try {
        const res = await verifyOne(item)
        if (res.match) passed++
        else failed++
      } catch {
        errored++
      }
    }
    setVerifyingId(null)
    setAuditing(false)
    const summary = `${passed} verified, ${failed} failed${errored ? `, ${errored} could not be checked` : ''}.`
    addToast(summary, failed || errored ? 'warning' : 'success', 'Integrity Audit Complete')
  }

  const handleExportRecord = (item) => {
    const record = {
      exportedAt: new Date().toISOString(),
      evidenceId: item.evidenceId,
      detectionId: item.detectionId,
      fileName: item.fileName,
      fileType: item.fileType,
      sha256: item.sha256,
      md5: item.md5,
      integrityStatus: item.status,
      lastVerified: item.integrityCheck,
      sealedAt: item.timestamp,
      detectionResult: item.result,
      confidence: item.confidence,
      chainOfCustody: item.chainOfCustody,
      metadata: item.metadata
    }
    downloadBlob(JSON.stringify(record, null, 2), `${item.evidenceId || 'evidence'}_custody_record.json`, 'application/json')
    addToast(`Custody record for ${item.evidenceId} exported as JSON.`, 'success', 'Export Complete')
  }

  const copyHash = async (hash) => {
    try {
      await navigator.clipboard.writeText(hash)
      addToast('SHA-256 copied to clipboard.', 'info', 'Copied')
    } catch {
      addToast('Clipboard access is not available in this browser.', 'error', 'Copy Failed')
    }
  }

  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-toolbar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Evidence Vault</h1>
            <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Lock size={12} /> Chain of Custody
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Evidence records for every analyzed file, with SHA-256/MD5 hashes and a recorded chain of custody.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleAuditAll} disabled={auditing || loading || evidenceList.length === 0}>
          {auditing ? <span className="loader-spinner sm" /> : <RefreshCw size={14} />}
          {auditing ? 'Verifying...' : 'Verify All'}
        </button>
      </div>

      <div className="grid-3">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', flexShrink: 0 }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified Records</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{loading ? '—' : `${counts.verified} / ${evidenceList.length}`}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>
            <ShieldOff size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Failed Integrity Checks</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: counts.failed ? 'var(--red)' : undefined }}>{loading ? '—' : counts.failed}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)', flexShrink: 0 }}>
            <Key size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hash Algorithms</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>SHA-256 + MD5</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="search"
              className="form-control"
              style={{ paddingLeft: 38 }}
              placeholder="Search by evidence ID, file name or hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search evidence"
            />
          </div>
          <select className="form-control" style={{ width: 'auto', padding: '6px 12px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by integrity status">
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filtered.length} of {evidenceList.length} records
          </span>
        </div>

        {loading ? (
          <LoadingState text="Loading evidence records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : evidenceList.length === 0 ? (
          <EmptyView
            icon={Lock}
            title="No evidence records yet"
            description="An evidence record is created automatically each time you analyze a file."
            action={<Link to="/detect" className="btn btn-primary btn-sm">Analyze a file</Link>}
          />
        ) : filtered.length === 0 ? (
          <EmptyView icon={Search} title="No matching records" description="Try a different search term or status filter." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.map((item) => {
              const badge = STATUS_BADGE[item.status] || STATUS_BADGE.pending
              const BadgeIcon = badge.icon
              const busy = verifyingId === item.evidenceId
              return (
                <div key={item.id} style={{ padding: 20, borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flexWrap: 'wrap' }}>
                      <div className="evidence-id" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        {item.evidenceId || 'No evidence ID'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-word' }}>{item.fileName || 'Unnamed file'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Recorded {formatDateTime(item.timestamp)}
                          {item.integrityCheck && <> · Last verified {formatDateTime(item.integrityCheck)}</>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={`badge ${badge.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <BadgeIcon size={12} /> {badge.text}
                      </span>
                      <button className="btn btn-secondary btn-sm" disabled={busy || auditing || !item.evidenceId} onClick={() => handleVerify(item)}>
                        {busy ? <span className="loader-spinner sm" /> : <ShieldCheck size={14} />}
                        <span>Verify Hash</span>
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleExportRecord(item)} title="Export custody record (JSON)" aria-label="Export custody record as JSON">
                        <Download size={14} />
                      </button>
                      {item.detectionId && (
                        <Link to={`/result/${item.detectionId}`} className="btn btn-ghost btn-sm" title="Open analysis result" aria-label="Open analysis result">
                          <ArrowUpRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Detection:</span> <ResultBadge result={item.result} />
                    <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>
                    <strong>{formatConfidence(item.confidence)}</strong>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SHA-256</span>
                      {item.sha256 && (
                        <button className="btn btn-ghost btn-xs" onClick={() => copyHash(item.sha256)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Copy size={12} /> Copy Hash
                        </button>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: item.sha256 ? 'var(--accent-cyan)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                      {item.sha256 || 'Not available'}
                    </div>
                    {item.md5 && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                        MD5: {item.md5}
                      </div>
                    )}
                  </div>

                  {item.chainOfCustody.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Chain of Custody</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {item.chainOfCustody.map((step, idx) => (
                          <div
                            key={idx}
                            title={formatDateTime(step.time)}
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <Clock size={12} color="var(--text-muted)" />
                            <span style={{ fontWeight: 600 }}>{step.action}</span>
                            {step.by && <span style={{ color: 'var(--text-muted)' }}>by {step.by}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
