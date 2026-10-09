import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, Cpu } from 'lucide-react'
import { useAppAuth, useToast } from '../App'
import { authService } from '../services/authService'
import { getErrorMessage } from '../services/api'
import Logo from '../components/common/Logo'
import { validateEmail, validatePassword, getPasswordStrength } from '../utils/validators'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login } = useAppAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const strength = getPasswordStrength(form.password)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    if (!form.email) errs.email = 'Email is required'
    else if (!validateEmail(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    else if (!validatePassword(form.password)) errs.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (!agreed) errs.terms = 'Please confirm to continue'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const result = await authService.register(form.name.trim(), form.email.trim(), form.password)
      login(result.user)
      addToast('Account created successfully! Welcome to FAKENIX.', 'success', 'Account Created')
      navigate('/dashboard')
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed. Please try again.')
      addToast(message, 'error', 'Registration Failed')
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <Logo size="xl" className="auth-left-logo" />
        <h1 className="auth-left-title">Join the fight against digital deception.</h1>
        <p className="auth-left-subtitle">
          Create your account and start detecting deepfakes, preserving evidence, and reporting cybercrime — for free.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {[
            'Free demo access — no credit card needed',
            'Analyze images, videos, and URLs',
            'Generate forensic evidence reports',
            'Contribute to safer internet (SDG 16)'
          ].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#cbd5e1' }}>
              <CheckCircle size={14} color="#34d399" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container">
          <Logo size="lg" className="auth-form-logo" />
          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-subtitle">Start detecting deepfakes in minutes</p>

          {errors.general && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              fontSize: 13, color: 'var(--red-text)', marginBottom: 16
            }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Name</label>
              <div className="input-with-icon">
                <User size={15} className="input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Akash Kumar"
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                />
              </div>
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-suffix"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
              {form.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className="strength-segment"
                        style={{ background: s <= strength.score ? strength.color : undefined }}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  id="reg-confirm"
                  type="password"
                  className={`form-input ${errors.confirm ? 'error' : ''}`}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, cursor: 'pointer', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ accentColor: 'var(--brand-primary)', marginTop: 2 }}
                />
                I understand that files I upload for analysis are stored on this server as evidence records.
              </label>
              {errors.terms && <span className="form-error" style={{ marginTop: 4 }}>{errors.terms}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '12px', fontSize: 15, fontWeight: 700 }}
            >
              {loading ? <span className="loader-spinner sm" /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-link">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
