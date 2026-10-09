import { Check } from 'lucide-react'

/**
 * Upload/analysis progress driven by real request state:
 *  - phase 'uploading': uploadPct comes from axios onUploadProgress
 *  - phase 'analyzing': upload finished, waiting for the server's response
 */
export default function AnalysisProgress({ phase, uploadPct, label }) {
  const steps = [
    { key: 'uploading', name: 'Uploading file', status: phase === 'uploading' ? `${uploadPct}%` : 'Complete' },
    { key: 'analyzing', name: 'Hashing, metadata extraction and AI analysis on server', status: phase === 'analyzing' ? 'Running...' : 'Pending' }
  ]
  const activeIdx = phase === 'uploading' ? 0 : 1

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
        <div className="loader-spinner" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
        <div style={{ width: '100%' }}>
          <div className="progress-bar-track" aria-label="Upload progress" role="progressbar" aria-valuenow={uploadPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar-fill" style={{ width: `${phase === 'uploading' ? uploadPct : 100}%` }} />
          </div>
        </div>
        <div className="processing-stages" style={{ width: '100%' }}>
          {steps.map((s, i) => {
            const done = i < activeIdx
            const active = i === activeIdx
            return (
              <div key={s.key} className={`stage-item ${done ? 'completed' : active ? 'active' : ''}`}>
                <div className={`stage-icon ${done ? 'completed' : active ? 'active' : 'pending'}`}>
                  {done ? <Check size={12} /> : i + 1}
                </div>
                <span className="stage-name">{s.name}</span>
                <span className={`stage-status ${done ? 'done' : active ? 'running' : ''}`}>{s.status}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
