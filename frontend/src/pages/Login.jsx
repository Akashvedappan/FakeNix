import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Cpu, Shield, Brain, CheckCircle } from 'lucide-react'
import { useAppAuth, useToast } from '../App'
import { authService } from '../services/authService'
import { getErrorMessage } from '../services/api'
import Logo from '../components/common/Logo'
import { validateEmail } from '../utils/validators'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { login } = useAppAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const fillDemo = () => {
    setEmail('demo@fakenix.ai')
    setPassword('Demo@123')
  }

  const validate = () => {
    const errs = {}
    if (!email) errs.email = 'Email is required'
    else if (!validateEmail(email)) errs.email = 'Enter a valid email'
    if (!password) errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const result = await authService.login(email, password)
      login(result.user)
      addToast('Welcome back! Dashboard loaded.', 'success', 'Login Successful')
      navigate('/dashboard')
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed. Please try again.')
      setErrors({ general: message })
      addToast(message, 'error', 'Authentication Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      {/* Left */}
      <div className="auth-left">
        <Logo size="xl" className="auth-left-logo" />
        <h1 className="auth-left-title">A safer internet starts with you.</h1>
        <p className="auth-left-subtitle">
          FAKENIX 2.0 provides enterprise-grade deepfake detection, digital forensics, and cybercrime evidence management.
        </p>
        <div className="auth-feature-list">
          {[
            [Shield, 'AI-powered deepfake detection'],
            [Brain, 'Explainable AI with visual indicators'],
            [CheckCircle, 'Cryptographic evidence integrity'],
            [Cpu, 'Real-time forensic analysis']
          ].map(([Icon, text]) => (
            <div className="auth-feature-item" key={text}>
              <div className="auth-feature-icon">
                <Icon size={14} />
              </div>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="auth-right">
        <div className="auth-form-container">
          <Logo size="lg" className="auth-form-logo" />
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-subtitle">Sign in to your FAKENIX account</p>

          {/* Demo credentials box */}
          <div className="demo-credentials-box">
            <div className="demo-credentials-title">🔑 Demo Credentials</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>
              Available after running <code>python scripts/seed_demo_data.py</code> in the backend.
            </div>
            <div className="demo-credentials-row">
              <span className="demo-credentials-label">Email</span>
              <span className="demo-credentials-value">demo@fakenix.ai</span>
            </div>
            <div className="demo-credentials-row">
              <span className="demo-credentials-label">Password</span>
              <span className="demo-credentials-value">Demo@123</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: 8, width: '100%' }}
              onClick={fillDemo}
            >
              Use Demo Credentials
            </button>
          </div>

          {errors.general && (
            <div role="alert" style={{
              background: 'var(--red-bg)',
              border: '1px solid var(--red-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--red-text)',
              marginBottom: 16
            }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ padding: '12px', fontSize: 15, fontWeight: 700 }}
            >
              {loading ? <span className="loader-spinner sm" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

          </form>

          <div className="auth-link">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
