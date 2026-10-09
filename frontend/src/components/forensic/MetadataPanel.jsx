import { formatDateTime, formatFileSize } from '../../utils/formatters'
import { InfoRow } from '../common/StateViews'

const str = (v) => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : null)

export default function MetadataPanel({ metadata }) {
  const m = metadata && typeof metadata === 'object' ? metadata : {}

  const rows = [
    { label: 'Format', value: str(m.format) },
    { label: 'MIME Type', value: str(m.mimeType) },
    { label: 'File Size', value: m.fileSizeBytes != null ? formatFileSize(Number(m.fileSizeBytes)) : null },
    { label: 'Resolution', value: str(m.resolution) || (m.width && m.height ? `${m.width}x${m.height}` : null) },
    { label: 'Color Mode', value: str(m.mode) },
    { label: 'Duration', value: str(m.duration) },
    { label: 'Codec', value: str(m.codec) },
    { label: 'Bitrate', value: str(m.bitrate) },
    { label: 'Frame Rate', value: str(m.fps) ? `${m.fps} fps` : null },
    { label: 'Audio Codec', value: str(m.audioCodec) },
    { label: 'Created', value: m.created ? formatDateTime(m.created) : null },
    { label: 'Modified', value: m.modified ? formatDateTime(m.modified) : null },
    { label: 'GPS Data', value: str(m.gpsData) },
    { label: 'Software Tag', value: str(m.softwareTag) },
    { label: 'EXIF Stripped', value: typeof m.exifStripped === 'boolean' ? (m.exifStripped ? 'Yes' : 'No') : null }
  ].filter((r) => r.value)

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No metadata was extracted for this file.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(({ label, value }) => (
        <InfoRow key={label} label={label} value={value} />
      ))}
    </div>
  )
}
