import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { ResultBadge, RiskBadge, FileTypeBadge } from '../common/Badge'
import { formatDate, formatConfidence, NOT_AVAILABLE } from '../../utils/formatters'

export default function ActivityTable({ detections = [], limit }) {
  const rows = limit ? detections.slice(0, limit) : detections

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Evidence ID</th>
            <th>File Name</th>
            <th>Type</th>
            <th>Result</th>
            <th>Risk</th>
            <th>Deepfake Prob.</th>
            <th>Date</th>
            <th><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((det) => (
            <tr key={det.id}>
              <td>
                {det.evidenceId
                  ? <span className="evidence-id">{det.evidenceId}</span>
                  : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{NOT_AVAILABLE}</span>}
              </td>
              <td style={{ maxWidth: 220 }}>
                <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word' }}>{det.fileName || 'Unnamed file'}</span>
              </td>
              <td><FileTypeBadge type={det.fileType} /></td>
              <td><ResultBadge result={det.result} /></td>
              <td><RiskBadge risk={det.risk} /></td>
              <td>
                <span style={{
                  fontWeight: 700,
                  color: det.result === 'deepfake' ? 'var(--red)' : det.result === 'suspicious' ? 'var(--orange)' : det.result === 'real' ? 'var(--green)' : 'var(--text-muted)'
                }}>
                  {formatConfidence(det.deepfakeProbability ?? det.confidence)}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                {formatDate(det.timestamp)}
              </td>
              <td>
                <Link to={`/result/${det.id}`} className="btn btn-ghost btn-icon" title="View result" aria-label={`View result for ${det.fileName || det.id}`}>
                  <Eye size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
