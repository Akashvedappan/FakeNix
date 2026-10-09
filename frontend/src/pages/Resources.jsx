import {
  PhoneCall, Shield, BookOpen, ExternalLink, Scale, FileText,
  AlertTriangle, CheckCircle, Globe, Terminal
} from 'lucide-react'

export default function Resources() {
  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
          Cybercrime & Forensic Resources
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Emergency helplines, statutory legal frameworks, open-source forensic datasets, and victim incident response workflows.
        </p>
      </div>

      {/* Emergency Helplines */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <PhoneCall size={20} color="var(--red)" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Emergency Cybercrime Helplines & Portals</h2>
        </div>

        <div className="grid grid-3">
          <div className="card" style={{ borderLeft: '4px solid var(--red)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>India (MHA)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--red)', margin: '4px 0' }}>1930</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>National Cyber Crime Helpline</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
              Immediate financial fraud freezing and cybercrime incident lodging. Portal: <strong>cybercrime.gov.in</strong>
            </p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>United States (FBI)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>IC3.gov</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Internet Crime Complaint Center</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
              Federal cybercrime reporting hub for AI impersonation, wire fraud, and extortion.
            </p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>European Union</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', margin: '4px 0' }}>Europol EC3</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>European Cybercrime Centre</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4 }}>
              Cross-border synthetic child exploitation & synthetic fraud investigation division.
            </p>
          </div>
        </div>
      </div>

      {/* Incident Response Workflow */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Shield size={20} color="var(--accent-cyan)" />
          <div className="card-title">Victim Incident Response Playbook</div>
        </div>

        <div className="grid grid-4" style={{ gap: 14 }}>
          <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: 4 }}>STEP 01</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Do Not Engage</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Never pay ransoms or negotiate with blackmailers. Payments guarantee repeated escalation.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: 4 }}>STEP 02</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Preserve Evidence</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Upload original media to FAKENIX 2.0 to freeze SHA-256 hashes and capture metadata before removal.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: 4 }}>STEP 03</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Platform Takedown</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              File immediate non-consensual synthetic media takedowns under StopNCII.org and DMCA channels.
            </p>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: 4 }}>STEP 04</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>Legal Lodging</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Export the FAKENIX Cybercrime Dossier and submit to National Cyber Crime portal or local cyber police.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Legal Frameworks */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Scale size={20} color="var(--accent-purple)" />
          <div className="card-title">Statutory Legal Frameworks & Evidence Admissibility</div>
        </div>

        <div className="grid grid-2" style={{ gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: 6 }}>
              Section 66D — Information Technology Act 2000
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Punishment for cheating by personation by using computer resources. Applicable to AI video/audio clones created to deceive individuals or siphon funds.
            </p>
          </div>

          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-purple)', marginBottom: 6 }}>
              Section 66E & 67A — Privacy & Explicit Synthetic Media
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Violation of bodily privacy and publication of sexually explicit synthetic media carrying severe imprisonment and non-bailable prosecution.
            </p>
          </div>

          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--green)', marginBottom: 6 }}>
              Section 65B — Admissibility of Electronic Records
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Mandates cryptographic chain-of-custody certificates verifying computer integrity at the time digital evidence was produced and extracted.
            </p>
          </div>

          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--orange)', marginBottom: 6 }}>
              European Union AI Act (Transparency Obligations)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Requires mandatory machine-readable watermarks and public disclaimers on all artificially generated audio, image, and video content.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
