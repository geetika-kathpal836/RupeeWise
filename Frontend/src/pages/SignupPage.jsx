import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthBrandingPanel from '../components/auth/AuthBrandingPanel'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await signup(form.name.trim(), form.email.trim(), form.password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not create your account. Please try again.'
      setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined, form: undefined }))
  }

  return (
    <div className="auth-page">
      {/* Redesigned left branding panel */}
      <AuthBrandingPanel mode="signup" />

      {/* Right panel */}
      <div className="auth-panel-right position-relative">
        <div className="auth-theme-toggle-wrap">
          <ThemeToggle id="signup-theme-toggle" />
        </div>
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Create your account</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              It only takes a moment to get started
            </p>
          </div>

          {errors.form && (
            <div className="alert alert-danger py-2 px-3" style={{ fontSize: '0.875rem', borderRadius: 'var(--radius-md)' }}>
              <i className="bi bi-exclamation-circle me-2" />
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="signup-name" className="form-label-custom">Full name</label>
              <input id="signup-name" type="text" className="form-control-custom" placeholder="Priya Sharma" value={form.name} onChange={set('name')} autoComplete="name" />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="signup-email" className="form-label-custom">Email address</label>
              <input id="signup-email" type="email" className="form-control-custom" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="signup-password" className="form-label-custom">Password</label>
              <input id="signup-password" type="password" className="form-control-custom" placeholder="At least 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="signup-confirm" className="form-label-custom">Confirm password</label>
              <input id="signup-confirm" type="password" className="form-control-custom" placeholder="Repeat your password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              className="btn-primary-custom w-100 justify-content-center"
              disabled={loading}
              style={{ padding: '0.625rem 1.25rem', fontSize: '0.9rem' }}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Creating account…</>
              ) : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
