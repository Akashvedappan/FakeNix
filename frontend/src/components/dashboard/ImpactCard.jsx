import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ImpactCard({ filesAnalyzed = 0, authenticVerified = 0, threatsIdentified = 0 }) {
  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', border: 'none' }}>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="card-title" style={{ color: 'white' }}>Your Impact</div>
          <div className="card-subtitle" style={{ color: '#94a3b8' }}>
            Helping build a safer internet
          </div>
        </div>
        <div style={{
          background: 'rgba(37,99,235,0.2)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 20,
          padding: '3px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#93c5fd',
          letterSpacing: 0.5
        }}>
          SDG 16
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
        {[
          { icon: Shield, label: 'Files Analyzed', value: filesAnalyzed, color: '#60a5fa' },
          { icon: CheckCircle, label: 'Authentic Media', value: authenticVerified, color: '#34d399' },
          { icon: AlertTriangle, label: 'Threats Identified', value: threatsIdentified, color: '#f87171' }
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '16px 12px',
              textAlign: 'center'
            }}
          >
            <Icon size={20} color={color} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
              {value}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: 500 }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
