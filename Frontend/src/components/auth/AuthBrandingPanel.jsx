import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'

export default function AuthBrandingPanel({ mode = 'signup' }) {
  const isLogin = mode === 'login'

  const headline = isLogin
    ? 'Welcome back. Your financial overview is waiting.'
    : 'Your money. Your goals. Your clarity.'

  const description =
    'Everything you need to understand your spending, stay on top of your budgets, and make more confident financial decisions.'

  const highlights = [
    { icon: 'bi-receipt', title: 'Track every transaction', desc: 'Categorize income and expenses with payment modes and notes' },
    { icon: 'bi-pie-chart', title: 'Plan category budgets', desc: 'Set monthly limits with automated 80% and 100% alerts' },
    { icon: 'bi-graph-up-arrow', title: 'Understand spending trends', desc: 'Visual monthly comparisons and category breakdowns' },
    { icon: 'bi-file-earmark-arrow-down', title: 'Export financial reports', desc: '1-click formatted PDF summaries and CSV data export' },
  ]

  return (
    <div className="auth-panel-left d-none d-md-flex auth-panel-branding">
      {/* Background ambient lighting effects */}
      <div className="auth-brand-glow-top" aria-hidden="true" />
      <div className="auth-brand-glow-bottom" aria-hidden="true" />
      <div className="auth-brand-grid-pattern" aria-hidden="true" />

      <div className="auth-brand-content">
        {/* Brand Header */}
        <Link to="/" className="auth-brand-header text-decoration-none" title="RupeeWise Home">
          <div className="auth-brand-logo-wrap">
            <img src={logo} alt="RupeeWise Logo" className="auth-brand-logo-img" />
          </div>
          <div>
            <div className="auth-brand-title">RupeeWise</div>
            <div className="auth-brand-subtitle">Personal Finance Tracker</div>
          </div>
        </Link>

        {/* High-Contrast Main Headline & Description */}
        <div className="auth-brand-hero-text">
          <h1 className="auth-brand-headline">{headline}</h1>
          <p className="auth-brand-description">{description}</p>
        </div>

        {/* Central Financial Illustration Card */}
        <div className="auth-preview-card" aria-hidden="true">
          {/* Card Top: Net Balance & Status */}
          <div className="auth-preview-card-header">
            <div>
              <span className="auth-preview-label">NET BALANCE</span>
              <div className="auth-preview-balance">
                ₹1,24,500
                <span className="auth-preview-badge">
                  <i className="bi bi-arrow-up-right me-1" />
                  +18.2%
                </span>
              </div>
            </div>
            <div className="auth-preview-chip">
              <span className="auth-preview-chip-dot" />
              Live Preview
            </div>
          </div>

          {/* Card Middle: Income vs Expense Bars */}
          <div className="auth-preview-flow">
            <div className="auth-preview-flow-row">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="auth-flow-label">
                  <i className="bi bi-arrow-down-left text-success me-1" />
                  Monthly Income
                </span>
                <span className="auth-flow-value text-success">₹85,000</span>
              </div>
              <div className="auth-flow-track">
                <div className="auth-flow-bar income" style={{ width: '78%' }} />
              </div>
            </div>

            <div className="auth-preview-flow-row">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="auth-flow-label">
                  <i className="bi bi-arrow-up-right text-info me-1" />
                  Monthly Expenses
                </span>
                <span className="auth-flow-value text-info">₹42,300</span>
              </div>
              <div className="auth-flow-track">
                <div className="auth-flow-bar expense" style={{ width: '42%' }} />
              </div>
            </div>
          </div>

          {/* Card Bottom: Budget Health Indicator */}
          <div className="auth-preview-budget">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="auth-budget-name">Category Budgets</span>
              <span className="auth-budget-status">
                <i className="bi bi-check-circle-fill text-success me-1" />
                68% Utilized • Healthy
              </span>
            </div>
            <div className="auth-budget-track">
              <div className="auth-budget-bar" style={{ width: '68%' }} />
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="auth-brand-highlights">
          {highlights.map((item, idx) => (
            <div key={idx} className="auth-highlight-item">
              <div className="auth-highlight-icon">
                <i className={`bi ${item.icon}`} />
              </div>
              <div className="auth-highlight-text">
                <div className="auth-highlight-title">{item.title}</div>
                <div className="auth-highlight-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Trust Note */}
        <div className="auth-brand-footer-note">
          <i className="bi bi-shield-check text-primary-light me-1" />
          <span>Private, secure, and built for mindful financial clarity.</span>
        </div>
      </div>
    </div>
  )
}
