import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import AuthBrandingPanel from '../components/auth/AuthBrandingPanel'
import ThemeToggle from '../components/ui/ThemeToggle'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required.'
    if (!form.password) e.password = 'Password is required.'
    return e
  }

  const handleSubmit = async (evt) => {
    evt.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.'
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
      <AuthBrandingPanel mode="login" />

      {/* Right form panel */}
      <div className="auth-panel-right position-relative">
        <div className="auth-theme-toggle-wrap">
          <ThemeToggle id="login-theme-toggle" />
        </div>
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome back</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Sign in to your RupeeWise account
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
              <label htmlFor="login-email" className="form-label-custom">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-control-custom"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="login-password" className="form-label-custom">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-control-custom"
                placeholder="Your password"
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn-primary-custom w-100 justify-content-center"
              disabled={loading}
              style={{ padding: '0.625rem 1.25rem', fontSize: '0.9rem' }}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Signing in…</>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ fontWeight: 600 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
