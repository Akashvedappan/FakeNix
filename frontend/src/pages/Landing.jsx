import { Link } from 'react-router-dom'
import {
  Cpu, ScanSearch, Shield, Brain, FileText, AlertTriangle, History,
  ChevronRight, CheckCircle, Globe
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Deepfake Detection',
    desc: 'State-of-the-art EfficientNet-B4 model trained on millions of real and synthetic faces for accurate detection.',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  {
    icon: Shield,
    title: 'Digital Forensics',
    desc: 'Cryptographic evidence hashing, chain of custody logging, and tamper-evident audit trails.',
    color: '#16a34a',
    bg: '#f0fdf4'
  },
  {
    icon: ScanSearch,
    title: 'Explainable AI (XAI)',
    desc: 'Grad-CAM visualizations and indicator breakdowns show exactly why media was flagged.',
    color: '#7c3aed',
    bg: '#f5f3ff'
  },
  {
    icon: CheckCircle,
    title: 'Evidence Integrity',
    desc: 'SHA-256 hashing and timestamping ensure evidence is cryptographically verifiable and court-ready.',
    color: '#0891b2',
    bg: '#ecfeff'
  },
  {
    icon: AlertTriangle,
    title: 'Cybercrime Reporting',
    desc: 'Generate structured incident reports with attached forensic evidence for investigative use.',
    color: '#dc2626',
    bg: '#fef2f2'
  },
  {
    icon: History,
    title: 'Detection History',
    desc: 'Searchable audit log of all analyzed media with exportable forensic reports.',
    color: '#b45309',
    bg: '#fffbeb'
  }
]

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">FAKENIX</div>
        <div className="landing-nav-links">
          <a href="#features" className="btn btn-ghost" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Features
          </a>
          <a href="#impact" className="btn btn-ghost" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Impact
          </a>
          <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-content">
          <div>
            <div className="hero-eyebrow">
              <Cpu size={12} />
              AI-Powered Cybersecurity Platform
            </div>
            <h1 className="hero-title">
              <span className="hero-brand">FAKENIX</span><br />
              2.0
            </h1>
            <p className="hero-tagline">Detect. Verify. Investigate. Report.</p>
            <p className="hero-desc">
              AI-powered deepfake detection and digital evidence analysis for a safer and more trustworthy digital world.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started <ChevronRight size={16} />
              </Link>
              <Link to="/detect" className="btn btn-outline btn-lg">
                <ScanSearch size={16} />
                Analyze Media
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat-item">
                <span className="hero-stat-value">Image + Video</span>
                <span className="hero-stat-label">Media Analysis</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">SHA-256</span>
                <span className="hero-stat-label">Evidence Hashing</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-value">PDF</span>
                <span className="hero-stat-label">Forensic Reports</span>
              </div>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="hero-visual">
            <div className="hero-dashboard-preview">
              <div className="preview-header">
                <div className="preview-dot" style={{ background: '#ef4444' }} />
                <div className="preview-dot" style={{ background: '#f97316' }} />
                <div className="preview-dot" style={{ background: '#22c55e' }} />
                <span className="preview-title">SAMPLE RESULT (ILLUSTRATION)</span>
              </div>

              <div className="preview-result-card">
                <div className="preview-verdict">⚠ DEEPFAKE DETECTED</div>
                <div className="preview-score">92.4%</div>
                <div style={{ fontSize: 11, color: 'var(--red-text)', fontWeight: 600 }}>HIGH RISK</div>
              </div>

              <div className="preview-file-info">
                {[
                  ['Evidence ID', 'FX-2026-00142'],
                  ['File', 'interview_clip.mp4'],
                  ['SHA-256', 'a91f4b9e7e8c...b5c6'],
                  ['Model', 'EfficientNet-B4']
                ].map(([label, val]) => (
                  <div className="preview-info-row" key={label}>
                    <span className="preview-info-label">{label}</span>
                    <span className="preview-info-value">{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
                <div style={{ flex: 1, background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--red-text)', textAlign: 'center' }}>
                  Deepfake 92.4%
                </div>
                <div style={{ flex: 1, background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--green-text)', textAlign: 'center' }}>
                  Real 7.6%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: '#f8fafc', padding: '80px 0' }}>
        <div className="landing-section" style={{ padding: '0 60px' }}>
          <div className="section-eyebrow">
            <span className="badge badge-blue">CAPABILITIES</span>
          </div>
          <h2 className="section-title">Everything You Need to Fight Digital Deception</h2>
          <p className="section-desc">
            FAKENIX 2.0 combines cutting-edge AI with digital forensic tools to detect, verify, and document deepfake media.
          </p>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div className="feature-card" key={title}>
                <div className="feature-icon" style={{ background: bg }}>
                  <Icon size={22} color={color} />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="impact-section">
        <div className="impact-content">
          <div className="impact-left">
            <div className="impact-sdg-badge">
              <Globe size={12} />
              SDG 16 — Peace, Justice & Strong Institutions
            </div>
            <h2>Building Digital Trust for a Safer World</h2>
            <p style={{ marginBottom: 16 }}>
              FAKENIX directly contributes to UN Sustainable Development Goal 16 by strengthening institutions' ability to detect and document digital misinformation and synthetic media threats.
            </p>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              By empowering individuals, organizations, and law enforcement with AI-driven forensic tools, we support transparency, accountability, and access to justice in the digital age.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              {['Digital Trust', 'Responsible AI', 'Cybersecurity', 'Digital Forensics'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#94a3b8',
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="impact-cards">
            {[
              { value: 'Detect', label: 'Image & video deepfakes' },
              { value: 'Explain', label: 'Indicators & frame scores' },
              { value: 'Preserve', label: 'SHA-256 evidence records' },
              { value: 'Verify', label: 'On-demand integrity checks' },
              { value: 'Report', label: 'PDF forensic reports' },
              { value: 'Act', label: 'Incident report preparation' }
            ].map(({ value, label }) => (
              <div className="impact-card" key={label}>
                <div className="impact-card-value">{value}</div>
                <div className="impact-card-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 2, color: 'white', marginBottom: 4 }}>
              FAKENIX
            </div>
            <div style={{ fontSize: 12, color: '#475569' }}>
              AI-Powered Deepfake Detection &amp; Digital Forensics
            </div>
          </div>
          <div className="landing-footer-links">
            <Link to="/resources">Resources</Link>
            <Link to="/awareness">Awareness</Link>
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>
            © 2026 FAKENIX. Hackathon Demo.
          </div>
        </div>
      </footer>
    </div>
  )
}
