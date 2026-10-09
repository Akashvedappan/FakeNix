export default function StatCard({ label, value, hint, icon: Icon, color = '#2563eb', bgColor = '#eff6ff' }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-icon" style={{ background: bgColor }}>
        {Icon && <Icon size={22} color={color} />}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
        )}
      </div>
    </div>
  )
}
