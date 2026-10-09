import { Link } from 'react-router-dom'
import { ShieldAlert, Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(239,68,68,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--red)',
        marginBottom: 20
      }}>
        <ShieldAlert size={44} />
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '3.5rem',
        fontWeight: 900,
        letterSpacing: '2px',
        color: 'var(--red)',
        marginBottom: 8
      }}>
        404
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
        Forensic Artifact Not Found
      </h1>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.95rem',
        maxWidth: 460,
        marginTop: 10,
        marginBottom: 28,
        lineHeight: 1.5
      }}>
        The requested digital record, route, or evidence token does not exist in the FAKENIX 2.0 cryptographic matrix or has been expunged.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/dashboard" className="btn btn-primary">
          <Home size={16} /> Return to Dashboard
        </Link>
        <Link to="/detect" className="btn btn-secondary">
          <Search size={16} /> New Detection Scan
        </Link>
      </div>
    </div>
  )
}
