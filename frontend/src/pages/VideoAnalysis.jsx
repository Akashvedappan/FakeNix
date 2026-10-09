import { Video, Shield, ScanSearch } from 'lucide-react'
import UploadDropzone from '../components/detection/UploadDropzone'
import AnalysisProgress from '../components/detection/AnalysisProgress'
import { detectionService } from '../services/detectionService'
import { useMediaAnalysis } from '../hooks/useMediaAnalysis'
import { VIDEO_TYPES } from '../utils/validators'

export default function VideoAnalysis() {
  const { file, selectFile, start, phase, uploadPct, error, busy } = useMediaAnalysis({
    allowedTypes: VIDEO_TYPES,
    formatsLabel: 'MP4, MOV, AVI, or MKV',
    analyze: (f, onProgress) => detectionService.analyzeVideo(f, onProgress)
  })

  return (
    <div className="animate-slideUp" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: '#f5f3ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Video size={20} color="#7c3aed" />
          </div>
          <div>
            <h1 className="page-title">Video Analysis</h1>
            <p className="page-subtitle">Frame-level AI deepfake detection for videos</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <UploadDropzone
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
          acceptLabel={['MP4', 'MOV', 'AVI', 'MKV']}
          onFile={busy ? () => {} : selectFile}
          file={file}
        />
        {error && (
          <div role="alert" style={{
            marginTop: 12, background: 'var(--red-bg)', border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius)', padding: '10px 14px',
            fontSize: 13, color: 'var(--red-text)'
          }}>
            {error}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: 'var(--blue-bg)', border: '1px solid var(--blue-border)',
        borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20, fontSize: 13
      }}>
        <Shield size={16} color="var(--brand-primary)" style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <strong style={{ color: 'var(--blue-text)' }}>Evidence Notice</strong>
          <br />
          <span style={{ color: 'var(--text-secondary)' }}>
            Uploaded videos are stored on the server as evidence. A SHA-256 and MD5 hash is recorded,
            metadata is extracted, and sampled frames are analyzed. Large videos can take a while to process.
          </span>
        </div>
      </div>

      {busy && <AnalysisProgress phase={phase} uploadPct={uploadPct} label="Analyzing Video..." />}

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700 }}
        onClick={start}
        disabled={!file || busy}
        id="analyze-video-btn"
      >
        {busy ? <><span className="loader-spinner sm" /> Analyzing...</> : <><ScanSearch size={16} /> Analyze Video</>}
      </button>
    </div>
  )
}
