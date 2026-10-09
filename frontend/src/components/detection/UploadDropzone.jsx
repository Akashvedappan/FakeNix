import { useRef, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'

export default function UploadDropzone({ accept, acceptLabel, onFile, file }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  const handleChange = (e) => {
    const f = e.target.files[0]
    // Reset so choosing the same file again still fires onChange.
    e.target.value = ''
    if (f) onFile(f)
  }

  if (file) {
    return (
      <div
        className="dropzone"
        style={{ borderStyle: 'solid', borderColor: 'var(--brand-primary)', background: 'var(--blue-bg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div className="dropzone-icon" style={{ width: 40, height: 40 }}>
            <UploadCloud size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onFile(null)}
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`dropzone ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload file dropzone"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <div className="dropzone-icon">
        <UploadCloud size={28} />
      </div>
      <div className="dropzone-title">Drag & drop your file here</div>
      <div className="dropzone-subtitle">or click to browse files</div>
      <div className="dropzone-formats">
        {acceptLabel?.map((fmt) => (
          <span key={fmt} className="dropzone-format-badge">{fmt}</span>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        Maximum file size: 100 MB
      </div>
    </div>
  )
}
