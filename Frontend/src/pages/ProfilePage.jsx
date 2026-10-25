import { useState, useRef } from 'react'
import { toast } from 'sonner'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { CURRENCIES } from '../utils/constants'
import UserAvatar from '../components/ui/UserAvatar'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { theme, isDark, setTheme } = useTheme()

  const [profile, setProfile] = useState({
    name:          user?.name          || '',
    currency:      user?.currency      || 'INR',
    monthlyIncome: user?.monthlyIncome ? String(user.monthlyIncome) : '',
  })
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [saving,    setSaving]    = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [errors,    setErrors]    = useState({})
  const [pwdErrors, setPwdErrors] = useState({})

  // Profile picture states
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl,   setPreviewUrl]   = useState(null)
  const [uploading,    setUploading]    = useState(false)
  const [removing,     setRemoving]     = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const setP = (f) => (e) => { setProfile((pr) => ({ ...pr, [f]: e.target.value })); setErrors((er) => ({ ...er, [f]: undefined })) }
  const setPw = (f) => (e) => { setPwd((p) => ({ ...p, [f]: e.target.value })); setPwdErrors((er) => ({ ...er, [f]: undefined })) }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Format validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are supported.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2. Size validation (5 MB limit)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Image exceeds the 5 MB maximum size limit.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 3. Create preview
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('profilePicture', selectedFile)

      await api.post('/users/profile-picture', formData)
      await refreshUser()
      toast.success('Profile picture updated successfully.')
      handleCancelPreview()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload profile picture.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    setShowRemoveConfirm(false)
    setRemoving(true)
    try {
      await api.delete('/users/profile-picture')
      await refreshUser()
      toast.success('Profile picture removed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove profile picture.')
    } finally {
      setRemoving(false)
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profile.name.trim()) { setErrors({ name: 'Name is required.' }); return }
    setSaving(true)
    try {
      await api.put('/users/me', {
        name:          profile.name.trim(),
        currency:      profile.currency,
        monthlyIncome: profile.monthlyIncome ? parseFloat(profile.monthlyIncome) : undefined,
      })
      await refreshUser()
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save profile.')
    } finally { setSaving(false) }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    const e2 = {}
    if (!pwd.current)            e2.current = 'Current password is required.'
    if (pwd.next.length < 6)     e2.next    = 'New password must be at least 6 characters.'
    if (pwd.next !== pwd.confirm) e2.confirm = 'Passwords do not match.'
    if (Object.keys(e2).length)  { setPwdErrors(e2); return }
    setSavingPwd(true)
    try {
      await api.put('/users/me/password', { currentPassword: pwd.current, newPassword: pwd.next })
      toast.success('Password changed.')
      setPwd({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password.')
    } finally { setSavingPwd(false) }
  }

  return (
    <>
      <div className="mb-4">
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 2 }}>Profile & Settings</h1>
        <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>Manage your account details and preferences.</p>
      </div>

      <div className="row g-4">
        {/* Profile info */}
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header-custom">
              <span className="card-title-custom">Account Details</span>
            </div>
            <div className="card-body">
              {/* Avatar & Photo Upload / Remove Section */}
              <div
                className="profile-photo-card mb-4 p-3 rounded-3"
                style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div style={{ position: 'relative' }}>
                    <UserAvatar
                      user={user}
                      src={previewUrl || undefined}
                      size={64}
                      style={{
                        boxShadow: 'var(--shadow-sm)',
                        border: previewUrl
                          ? '2px solid var(--color-secondary)'
                          : '2px solid #ffffff',
                      }}
                    />
                    {uploading && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                        }}
                      >
                        <span className="spinner-border spinner-border-sm" />
                      </div>
                    )}
                  </div>

                  <div className="flex-grow-1" style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {user?.email}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-text-light)', marginTop: 2 }}>
                      JPEG, PNG, or WebP &bull; Max 5 MB
                    </div>
                  </div>

                  {/* Upload / Change / Cancel / Remove Actions */}
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <input
                      id="profile-picture-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />

                    {previewUrl ? (
                      <>
                        <button
                          id="save-photo-btn"
                          type="button"
                          className="btn-primary-custom"
                          onClick={handleUploadPhoto}
                          disabled={uploading}
                          style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
                        >
                          {uploading ? (
                            <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                          ) : (
                            <><i className="bi bi-check-lg" /> Save photo</>
                          )}
                        </button>
                        <button
                          id="cancel-photo-btn"
                          type="button"
                          className="btn-secondary-custom"
                          onClick={handleCancelPreview}
                          disabled={uploading}
                          style={{ fontSize: '0.825rem', padding: '0.4rem 0.75rem' }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id="upload-photo-btn"
                          type="button"
                          className="btn-secondary-custom"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || removing}
                          style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
                        >
                          <i className="bi bi-camera me-1" />
                          {user?.profilePictureUrl ? 'Change photo' : 'Upload photo'}
                        </button>

                        {user?.profilePictureUrl && (
                          <button
                            id="remove-photo-btn"
                            type="button"
                            className="btn-icon danger"
                            onClick={() => setShowRemoveConfirm(true)}
                            disabled={uploading || removing}
                            title="Remove photo"
                            style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)' }}
                          >
                            {removing ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              <i className="bi bi-trash3" style={{ fontSize: '0.9rem' }} />
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {previewUrl && (
                  <div
                    className="mt-2 pt-2 border-top d-flex align-items-center gap-2"
                    style={{ fontSize: '0.8rem', color: 'var(--color-secondary)' }}
                  >
                    <i className="bi bi-info-circle" />
                    <span>
                      Previewing <strong>{selectedFile?.name}</strong>. Click &ldquo;Save photo&rdquo; to update your profile picture.
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleProfileSave}>
                <div className="mb-3">
                  <label htmlFor="profile-name" className="form-label-custom">Full name</label>
                  <input id="profile-name" type="text" className="form-control-custom" value={profile.name} onChange={setP('name')} />
                  {errors.name && <div className="form-error">{errors.name}</div>}
                </div>

                <div className="mb-3">
                  <label htmlFor="profile-email" className="form-label-custom">Email address</label>
                  <input id="profile-email" type="email" className="form-control-custom" value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Email cannot be changed.</div>
                </div>

                <div className="mb-3">
                  <label htmlFor="profile-currency" className="form-label-custom">Preferred currency</label>
                  <select id="profile-currency" className="form-control-custom" value={profile.currency} onChange={setP('currency')}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="profile-income" className="form-label-custom">
                    Monthly income <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input id="profile-income" type="number" min="0" step="1" className="form-control-custom" placeholder="e.g. 50000" value={profile.monthlyIncome} onChange={setP('monthlyIncome')} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Used for savings rate reference on the dashboard.</div>
                </div>

                <button id="save-profile-btn" type="submit" className="btn-primary-custom" disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Save changes'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header-custom">
              <span className="card-title-custom">Change Password</span>
            </div>
            <div className="card-body">
              <form onSubmit={handlePasswordSave}>
                <div className="mb-3">
                  <label htmlFor="pwd-current" className="form-label-custom">Current password</label>
                  <input id="pwd-current" type="password" className="form-control-custom" value={pwd.current} onChange={setPw('current')} autoComplete="current-password" />
                  {pwdErrors.current && <div className="form-error">{pwdErrors.current}</div>}
                </div>
                <div className="mb-3">
                  <label htmlFor="pwd-next" className="form-label-custom">New password</label>
                  <input id="pwd-next" type="password" className="form-control-custom" placeholder="At least 6 characters" value={pwd.next} onChange={setPw('next')} autoComplete="new-password" />
                  {pwdErrors.next && <div className="form-error">{pwdErrors.next}</div>}
                </div>
                <div className="mb-4">
                  <label htmlFor="pwd-confirm" className="form-label-custom">Confirm new password</label>
                  <input id="pwd-confirm" type="password" className="form-control-custom" value={pwd.confirm} onChange={setPw('confirm')} autoComplete="new-password" />
                  {pwdErrors.confirm && <div className="form-error">{pwdErrors.confirm}</div>}
                </div>
                <button id="change-pwd-btn" type="submit" className="btn-primary-custom" disabled={savingPwd}>
                  {savingPwd ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</> : 'Change password'}
                </button>
              </form>
            </div>
          </div>

          {/* Account info */}
          <div className="card mt-4">
            <div className="card-header-custom">
              <span className="card-title-custom">About Your Account</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Member since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—' },
                  { label: 'Currency', value: user?.currency || 'INR' },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border-light)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Appearance & Theme card */}
          <div className="card mt-4">
            <div className="card-header-custom">
              <span className="card-title-custom">Appearance & Theme</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Customize your interface appearance. The chosen theme applies across all pages and persists across sessions.
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  id="theme-select-light"
                  className={`btn-secondary-custom ${!isDark ? 'active-theme-option' : ''}`}
                  onClick={() => setTheme('light')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <i className="bi bi-sun-fill me-2 text-warning" />
                  Light Mode
                </button>
                <button
                  type="button"
                  id="theme-select-dark"
                  className={`btn-secondary-custom ${isDark ? 'active-theme-option' : ''}`}
                  onClick={() => setTheme('dark')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <i className="bi bi-moon-stars-fill me-2 text-primary" />
                  Dark Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Photo Confirmation Dialog */}
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Remove profile picture?"
        message="Are you sure you want to remove your profile picture? Your default name initials avatar will be restored."
        confirmLabel="Remove photo"
        confirmClass="btn-danger-custom"
        onConfirm={handleRemovePhoto}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </>
  )
}
