import { useState } from 'react'
import {
  BookOpen, Eye, ShieldAlert, CheckCircle2, XCircle, AlertTriangle,
  Lightbulb, Sparkles, Cpu, Layers, HelpCircle, ArrowRight
} from 'lucide-react'

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: 'Which of the following is often the most reliable visual indicator of an AI-generated face swap video?',
    options: [
      'The resolution of the video is exactly 1080p',
      'Inconsistent lighting and lack of specular reflections in the eyes',
      'The background audio is stereo rather than mono',
      'The video file format is MP4'
    ],
    answer: 1,
    explanation: 'GANs and autoencoders frequently fail to accurately model corneal specular reflections and 3D physics-based lighting, resulting in flat or divergent eye reflections.'
  },
  {
    id: 2,
    question: 'In digital forensics, what does an SHA-256 hash verify about a media file?',
    options: [
      'The identity of the person shown in the video',
      'Whether the video is fun or informative',
      'Cryptographic integrity, proving the file has not been altered or tampered with',
      'The compression bitrate of the audio track'
    ],
    answer: 2,
    explanation: 'An SHA-256 hash creates a unique 256-bit cryptographic fingerprint of the file. Even changing a single bit alters the entire hash.'
  },
  {
    id: 3,
    question: 'What is a "voice clone" or "audio deepfake" attack commonly used for in modern cybercrime?',
    options: [
      'Speeding up podcast playback',
      'CEO fraud or emergency extortion calls impersonating family members',
      'Improving microphone noise cancellation',
      'Creating subtitles automatically'
    ],
    answer: 1,
    explanation: 'Synthetic voice clones require as little as 3 seconds of reference audio and are frequently weaponized in urgent wire transfer scams and hostage scams.'
  }
]

export default function Awareness() {
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)

  const handleSelectOption = (qId, optionIdx) => {
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optionIdx }))
  }

  return (
    <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(139,92,246,0.1) 100%)', borderColor: 'rgba(14,165,233,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'rgba(14,165,233,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <BookOpen size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
              Deepfake Defense & Digital Forensics Academy
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4, margin: 0 }}>
              Understand the mechanics of synthetic media manipulation, learn visual forensic cues, and build institutional cyber resilience.
            </p>
          </div>
        </div>
      </div>

      {/* Anatomy of Synthetic Media Section */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Anatomy of Deepfake Manipulation</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Modern synthetic media relies on three major generative paradigms:
          </p>
        </div>

        <div className="grid grid-3">
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Generative Adversarial Nets (GANs)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              A Generator creates synthetic faces while a Discriminator evaluates authenticity. Over millions of training iterations, the generator learns to produce photorealistic facial composites.
            </p>
            <div style={{ marginTop: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
              COMMON FLAW: Texture grid noise & boundary blurring
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Latent Diffusion Models</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Iteratively de-noises Gaussian noise in a compressed latent space to construct ultra-high-resolution images. Dominates contemporary text-to-video generation.
            </p>
            <div style={{ marginTop: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
              COMMON FLAW: Temporal warping & limb geometry bugs
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(14,165,233,0.1)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Neural Audio Synthesizers</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Diffusion-based vocoders convert text and acoustic tokens into target voice timbres, mimicking vocal inflections, accent, and breathing patterns.
            </p>
            <div style={{ marginTop: 'auto', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
              COMMON FLAW: Robotic breath rhythm & lip desync
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Cues: How to Spot a Deepfake */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Key Forensic Indicators Used by FAKENIX 2.0</div>

        <div className="grid grid-2" style={{ gap: 16 }}>
          <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <Eye size={22} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>Corneal Reflections & Eye Blink Rates</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Authentic human eyes reflect physical room light sources identically in both pupils. In deepfakes, specular light dots are often mismatched, absent, or blink at unnatural rhythmic intervals.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <Layers size={22} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>Facial Blending Boundary Seams</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                When swapping a face onto a target body, blending filters smooth the neck and jawline boundaries, causing localized high-frequency gradient dropouts and pixelated halos.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <AlertTriangle size={22} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>Teeth and Inner Oral Cavity Geometry</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                GANs struggle with individual tooth articulation and inner mouth textures. Deepfake subjects often have a solid white tooth block or blurry tongue rendering during speech.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
            <CheckCircle2 size={22} color="var(--green)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>Phoneme-to-Viseme Synchronization</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Bilabial sounds (such as "B", "M", "P") require lips to close completely. Synthetic lip-synced videos frequently fail to close lips on these consonants.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Forensic Knowledge Check */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HelpCircle size={22} color="var(--accent-purple)" />
          <div>
            <div className="card-title">Interactive Forensic Knowledge Check</div>
            <div className="card-subtitle">Test your ability to recognize synthetic manipulation and cryptographic evidence concepts</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {QUIZ_QUESTIONS.map((q) => {
            const userChoice = selectedAnswers[q.id]
            const isAnswered = userChoice !== undefined
            const isCorrect = userChoice === q.answer

            return (
              <div
                key={q.id}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 12, color: 'var(--text-primary)' }}>
                  {q.id}. {q.question}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, optIdx) => {
                    let btnStyle = {
                      textAlign: 'left',
                      padding: '10px 14px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }

                    if (isAnswered) {
                      if (optIdx === q.answer) {
                        btnStyle = {
                          ...btnStyle,
                          background: 'rgba(34,197,94,0.15)',
                          borderColor: 'var(--green)',
                          color: 'var(--green)',
                          fontWeight: 600
                        }
                      } else if (userChoice === optIdx) {
                        btnStyle = {
                          ...btnStyle,
                          background: 'rgba(239,68,68,0.15)',
                          borderColor: 'var(--red)',
                          color: 'var(--red)'
                        }
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        style={btnStyle}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>

                {isAnswered && (
                  <div style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    fontSize: '0.8rem',
                    color: isCorrect ? 'var(--green)' : 'var(--red)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8
                  }}>
                    <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span><strong>Forensic Insight:</strong> {q.explanation}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
