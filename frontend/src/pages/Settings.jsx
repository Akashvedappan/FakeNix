import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Save, LogOut, Server } from 'lucide-react'
import { useAppAuth, useToast } from '../App'
import { authService } from '../services/authService'
import { API_BASE_URL, getErrorMessage } from '../services/api'
import { LoadingState, ErrorState, InfoRow } from '../components/common/StateViews'
import { formatDate } from '../utils/formatters'

export default function Settings() {
  const { user, login, logout } = useAppAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(user)
  const [form, setForm] = useState({ name: user?.name || '', organization: user?.organization || '' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  const loadProfile = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const fresh = await authService.getProfile()
      if (fresh) {
        setProfile(fresh)
        setForm({ name: fresh.name || '', organization: fresh.organization || '' })
        login(fresh)
      }
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Unable to load your profile.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, []) // eslint-disable-line

  const dirty = form.name.trim() !== (profile?.name || '') || form.organization.trim() !== (profile?.organization || '')

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setNameError('Name is required.')
      return
    }
    setSaving(true)
    try {
      const { user: updated } = await authService.updateProfile({
        name: form.name.trim(),
        organization: form.organization.trim()
      })
      if (updated) {
        setProfile(updated)
        setForm({ name: updated.name || '', organization: updated.organization || '' })
        login(updated)
      }
      addToast('Your profile was updated.', 'success', 'Profile Saved')
    } catch (err) {
      addToast(getErrorMessage(err, 'Unable to update your profile.'), 'error', 'Save Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="animate-slideUp" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your investigator profile and session.</p>
      </div>

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} color="var(--brand-primary)" />
          <div className="card-title">Profile</div>
        </div>

        {loading && !profile ? (
          <LoadingState text="Loading profile..." />
        ) : loadError && !profile ? (
          <ErrorState message={loadError} onRetry={loadProfile} />
        ) : (
          <>
            {loadError && (
              <div role="alert" style={{ fontSize: 12.5, color: 'var(--orange-text)', background: 'var(--orange-bg)', border: '1px solid var(--orange-border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                Showing cached profile. {loadError}
              </div>
            )}
            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameError('') }}
                  className="form-control"
                  autoComplete="name"
                  maxLength={120}
                />
                {nameError && <span role="alert" style={{ fontSize: 12, color: 'var(--red-text)' }}>{nameError}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-org">Organization</label>
                <input
                  id="profile-org"
                  type="text"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="form-control"
                  autoComplete="organization"
                  maxLength={160}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email</label>
                <input id="profile-email" type="email" value={profile?.email || ''} readOnly className="form-control" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Email cannot be changed from the app.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-role">Role</label>
                <input id="profile-role" type="text" value={profile?.role || ''} readOnly className="form-control" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Roles are assigned by an administrator.</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
                {saving ? <span className="loader-spinner sm" /> : <Save size={15} />} {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Server size={18} color="var(--brand-primary)" />
          <div className="card-title">Account & Connection</div>
        </div>
        <InfoRow label="Member since" value={profile?.joinDate ? formatDate(profile.joinDate) : null} />
        <InfoRow label="API server" value={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{API_BASE_URL}</span>} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" className="btn btn-danger btn-sm" onClick={handleLogout}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>
    </div>
  )
}
