import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldAlert, Send, CheckCircle, Printer, ArrowLeft, Info } from 'lucide-react'
import { detectionService } from '../services/detectionService'
import { getErrorMessage } from '../services/api'
import { InfoRow, LoadingState, ErrorState } from '../components/common/StateViews'
import { useAsync } from '../hooks/useAsync'
import { formatDateTime, formatDate, formatConfidence, getResultLabel } from '../utils/formatters'
import { validateEmail, validateURL } from '../utils/validators'
import { useToast } from '../App'

const INCIDENT_TYPES = [
  ['deepfake_impersonation', 'Deepfake Identity Impersonation'],
  ['non_consensual_content', 'Non-Consensual Synthetic Media (NCII)'],
  ['financial_ceo_fraud', 'CEO / Financial Voice or Video Fraud'],
  ['misinformation_election', 'Disinformation / Public Misinformation'],
  ['extortion_blackmail', 'AI Extortion / Blackmail'],
  ['other', 'Other']
]

const PLATFORMS = [
  ['social_media', 'Social Media (X / Instagram / Facebook)'],
  ['messaging_app', 'Instant Messaging (WhatsApp / Telegram)'],
  ['video_host', 'Video Hosting (YouTube / TikTok / Vimeo)'],
  ['email_phish', 'Email / Spear Phishing'],
  ['darkweb_forum', 'Dark Web / Third-party Forum'],
  ['other', 'Other']
]

const labelFor = (list, value) => list.find(([v]) => v === value)?.[1] || value || 'Not provided'

const todayISO = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
}

const MIN_DESCRIPTION = 20

async function loadFormData() {
  const [evidence, previous] = await Promise.allSettled([
    detectionService.getEvidence(),
    detectionService.getCybercrimeReports()
  ])
  return {
    evidence: evidence.status === 'fulfilled' ? evidence.value : [],
    evidenceError: evidence.status === 'rejected' ? getErrorMessage(evidence.reason) : null,
    previous: previous.status === 'fulfilled' ? previous.value : [],
    previousError: previous.status === 'rejected' ? getErrorMessage(previous.reason) : null
  }
}

export default function CybercrimeReport() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()
  const { data, loading, reload, setData } = useAsync(loadFormData, [])

  const [formData, setFormData] = useState({
    incidentType: 'deepfake_impersonation',
    platform: 'social_media',
    sourceUrl: '',
    incidentDate: todayISO(),
    victimName: '',
    victimEmail: '',
    victimPhone: '',
    suspectDetails: '',
    evidenceId: searchParams.get('evidenceId') || '',
    description: '',
    declaredTruthful: false
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  const evidence = data?.evidence || []
  const selectedEvidence = evidence.find((e) => e.evidenceId === formData.evidenceId)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (formData.description.trim().length < MIN_DESCRIPTION) {
      errs.description = `Please describe the incident (at least ${MIN_DESCRIPTION} characters).`
    }
    if (formData.sourceUrl.trim() && !validateURL(formData.sourceUrl.trim())) {
      errs.sourceUrl = 'Enter a full URL, including https://'
    }
    if (formData.victimEmail.trim() && !validateEmail(formData.victimEmail.trim())) {
      errs.victimEmail = 'Enter a valid email address.'
    }
    if (formData.incidentDate && formData.incidentDate > todayISO()) {
      errs.incidentDate = 'The incident date cannot be in the future.'
    }
    if (!formData.declaredTruthful) {
      errs.declaredTruthful = 'Please confirm the declaration.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      addToast('Please fix the highlighted fields.', 'error', 'Validation Error')
      return
    }

    // The backend stores complainant/suspect details in `additionalInformation`.
    const extra = [
      formData.victimName.trim() && `Complainant name: ${formData.victimName.trim()}`,
      formData.victimEmail.trim() && `Complainant email: ${formData.victimEmail.trim()}`,
      formData.victimPhone.trim() && `Complainant phone: ${formData.victimPhone.trim()}`,
      formData.suspectDetails.trim() && `Suspect details: ${formData.suspectDetails.trim()}`
    ].filter(Boolean).join('\n')

    const payload = {
      incidentType: formData.incidentType,
      description: formData.description.trim(),
      incidentDate: formData.incidentDate || null,
      platform: formData.platform,
      sourceUrl: formData.sourceUrl.trim() || null,
      evidenceId: formData.evidenceId || null,
      additionalInformation: extra || null
    }

    setSubmitting(true)
    try {
      const res = await detectionService.submitCybercrimeReport(payload)
      if (!res?.reportId) throw new Error('The server did not return a report reference.')
      setSubmitted({ ...res, payload, extra })
      setData((prev) => prev && ({
        ...prev,
        previous: [{ id: res.reportId, reportId: res.reportId, incidentType: payload.incidentType, platform: payload.platform, evidenceId: payload.evidenceId, status: res.status, timestamp: res.timestamp }, ...prev.previous]
      }))
      addToast('Incident report prepared.', 'success', 'Report Prepared')
    } catch (err) {
      addToast(getErrorMessage(err, 'Failed to prepare the incident report.'), 'error', 'Submission Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const p = submitted.payload
    return (
      <div className="animate-slideUp" style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', borderColor: 'var(--green-border)', background: 'var(--green-bg)' }}>
          <CheckCircle size={40} color="var(--green)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Incident Report Prepared</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 520, margin: '8px auto 16px', lineHeight: 1.6 }}>
            {submitted.message}
          </p>
          <div className="evidence-id" style={{ display: 'inline-block', fontSize: '1.05rem', padding: '8px 16px' }}>
            Reference: {submitted.reportId}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card-title" style={{ marginBottom: 6 }}>Report Summary</div>
          <InfoRow label="Reference" value={submitted.reportId} />
          <InfoRow label="Status" value={submitted.status} />
          <InfoRow label="Prepared" value={formatDateTime(submitted.timestamp)} />
          <InfoRow label="Incident Type" value={labelFor(INCIDENT_TYPES, p.incidentType)} />
          <InfoRow label="Platform" value={labelFor(PLATFORMS, p.platform)} />
          <InfoRow label="Incident Date" value={p.incidentDate ? formatDate(p.incidentDate) : null} />
          <InfoRow label="Source URL" value={p.sourceUrl} />
          <InfoRow label="Linked Evidence" value={p.evidenceId} />
          <div style={{ fontSize: 13 }}>
            <div className="info-row-label" style={{ marginBottom: 4 }}>Description</div>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5 }}>{p.description}</div>
          </div>
          {submitted.extra && (
            <div style={{ fontSize: 13 }}>
              <div className="info-row-label" style={{ marginBottom: 4 }}>Additional Information</div>
              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5 }}>{submitted.extra}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print Summary
          </button>
          <button className="btn btn-secondary" onClick={() => { setSubmitted(null); setFormData((f) => ({ ...f, description: '', suspectDetails: '', declaredTruthful: false })) }}>
            Prepare Another Report
          </button>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Next Steps</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            FAKENIX does not submit reports to any authority. File this report yourself with your local cybercrime
            police station or online, for example via the National Cyber Crime Reporting Portal (cybercrime.gov.in,
            helpline 1930) in India or IC3.gov in the United States. Attach the evidence record and its SHA-256 hash
            from the Evidence Vault.
          </p>
        </div>
      </div>
    )
  }

  const fieldError = (name) => errors[name] && (
    <span className="form-error" role="alert" style={{ color: 'var(--red-text)', fontSize: 12 }}>{errors[name]}</span>
  )

  return (
    <div className="animate-slideUp" style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={26} color="var(--red)" style={{ flexShrink: 0 }} />
          <h1 className="page-title" style={{ margin: 0 }}>Cybercrime Incident Report</h1>
        </div>
        <p className="page-subtitle" style={{ marginTop: 4 }}>
          Prepare a structured incident report you can submit to the appropriate authorities.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--blue-bg)', border: '1px solid var(--blue-border)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
        <Info size={16} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
        FAKENIX only prepares and stores this report. It is not sent to law enforcement automatically.
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
        <div className="card-title">1. Incident Details</div>

        <div className="grid-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="incidentType">Type of Incident</label>
            <select id="incidentType" name="incidentType" value={formData.incidentType} onChange={handleChange} className="form-control">
              {INCIDENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="platform">Platform / Channel</label>
            <select id="platform" name="platform" value={formData.platform} onChange={handleChange} className="form-control">
              {PLATFORMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="sourceUrl">Source URL (optional)</label>
            <input id="sourceUrl" type="url" name="sourceUrl" placeholder="https://..." value={formData.sourceUrl} onChange={handleChange} className="form-control" />
            {fieldError('sourceUrl')}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="incidentDate">Date Discovered / Occurred</label>
            <input id="incidentDate" type="date" name="incidentDate" max={todayISO()} value={formData.incidentDate} onChange={handleChange} className="form-control" />
            {fieldError('incidentDate')}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">Description of the Incident *</label>
          <textarea
            id="description"
            name="description"
            rows="5"
            placeholder="How the media was discovered, who was depicted, the harm or fraud caused, and anything known about who is responsible..."
            value={formData.description}
            onChange={handleChange}
            className="form-control"
            aria-required="true"
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formData.description.trim().length} characters</span>
          {fieldError('description')}
        </div>

        <div className="card-title" style={{ marginTop: 10 }}>2. Linked Evidence</div>

        <div className="form-group">
          <label className="form-label" htmlFor="evidenceId">Evidence Vault Record (optional)</label>
          {loading ? (
            <LoadingState text="Loading your evidence records..." />
          ) : data?.evidenceError ? (
            <ErrorState title="Could not load evidence records" message={data.evidenceError} onRetry={reload} />
          ) : (
            <>
              <select id="evidenceId" name="evidenceId" value={formData.evidenceId} onChange={handleChange} className="form-control">
                <option value="">No evidence linked</option>
                {formData.evidenceId && !selectedEvidence && (
                  <option value={formData.evidenceId}>{formData.evidenceId}</option>
                )}
                {evidence.map((e) => (
                  <option key={e.id} value={e.evidenceId || ''} disabled={!e.evidenceId}>
                    {e.evidenceId} — {e.fileName || 'Unnamed file'} — {getResultLabel(e.result)} {formatConfidence(e.confidence)}
                  </option>
                ))}
              </select>
              {evidence.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You have no evidence records yet. Analyze a file to create one.</span>
              )}
              {selectedEvidence?.sha256 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  SHA-256: {selectedEvidence.sha256}
                </span>
              )}
            </>
          )}
        </div>

        <div className="card-title" style={{ marginTop: 10 }}>3. Complainant Information (optional)</div>

        <div className="grid-3" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="victimName">Full Name</label>
            <input id="victimName" type="text" name="victimName" value={formData.victimName} onChange={handleChange} className="form-control" autoComplete="name" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="victimEmail">Email Address</label>
            <input id="victimEmail" type="email" name="victimEmail" value={formData.victimEmail} onChange={handleChange} className="form-control" autoComplete="email" />
            {fieldError('victimEmail')}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="victimPhone">Contact Phone</label>
            <input id="victimPhone" type="tel" name="victimPhone" value={formData.victimPhone} onChange={handleChange} className="form-control" autoComplete="tel" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="suspectDetails">Suspect Details (optional)</label>
          <textarea id="suspectDetails" name="suspectDetails" rows="2" value={formData.suspectDetails} onChange={handleChange} className="form-control" placeholder="Usernames, profile links, phone numbers or other identifying details" />
        </div>

        <div>
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, border: `1px solid ${errors.declaredTruthful ? 'var(--red-border)' : 'var(--border-color)'}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <input
              type="checkbox"
              id="declaredTruthful"
              name="declaredTruthful"
              checked={formData.declaredTruthful}
              onChange={handleChange}
              style={{ marginTop: 3, accentColor: 'var(--brand-primary)' }}
            />
            <label htmlFor="declaredTruthful" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.5 }}>
              I confirm that the information provided is true and accurate to the best of my knowledge.
            </label>
          </div>
          {fieldError('declaredTruthful')}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <span className="loader-spinner sm" /> : <Send size={15} />}
            <span>{submitting ? 'Preparing...' : 'Prepare Incident Report'}</span>
          </button>
        </div>
      </form>

      {!loading && (data?.previous?.length > 0 || data?.previousError) && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div className="card-title">Your Prepared Incident Reports</div>
          </div>
          {data.previousError ? (
            <ErrorState message={data.previousError} onRetry={reload} />
          ) : (
            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr><th>Reference</th><th>Incident Type</th><th>Platform</th><th>Evidence</th><th>Prepared</th></tr>
                </thead>
                <tbody>
                  {data.previous.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.reportId || 'N/A'}</td>
                      <td>{labelFor(INCIDENT_TYPES, r.incidentType)}</td>
                      <td>{labelFor(PLATFORMS, r.platform)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.evidenceId || '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateTime(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
