import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'
import logo from '../assets/logo.png'

export default function LandingPage() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => (e) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const navOffset = 70
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div className="landing-wrapper">
      {/* ============================================================
          1. NAVIGATION BAR
          ============================================================ */}
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-container d-flex align-items-center justify-content-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="landing-brand text-decoration-none d-flex align-items-center gap-2">
            <div className="landing-brand-logo">
              <img src={logo} alt="RupeeWise Logo" />
            </div>
            <div className="d-flex flex-column">
              <span className="landing-brand-name">RupeeWise</span>
              <span className="landing-brand-tag">Personal Finance</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="landing-nav-links d-none d-md-flex align-items-center gap-4">
            <a href="#home" onClick={scrollToSection('home')} className="landing-nav-link">
              Home
            </a>
            <a href="#features" onClick={scrollToSection('features')} className="landing-nav-link">
              Features
            </a>
            <a href="#how-it-works" onClick={scrollToSection('how-it-works')} className="landing-nav-link">
              How It Works
            </a>
            <a href="#benefits" onClick={scrollToSection('benefits')} className="landing-nav-link">
              Benefits
            </a>
          </nav>

          {/* Auth Actions & Theme Toggle */}
          <div className="landing-nav-actions d-flex align-items-center gap-2">
            <ThemeToggle id="landing-theme-toggle" />
            {user ? (
              <Link to="/dashboard" className="landing-btn-primary text-decoration-none">
                <i className="bi bi-grid-1x2 me-2" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="landing-btn-ghost text-decoration-none">
                  Log In
                </Link>
                <Link to="/signup" className="landing-btn-primary text-decoration-none">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ============================================================
            2. HERO SECTION
            ============================================================ */}
        <section id="home" className="landing-hero-section">
          {/* Background Ambient Accents */}
          <div className="landing-hero-blob blob-1" aria-hidden="true" />
          <div className="landing-hero-blob blob-2" aria-hidden="true" />

          <div className="landing-container">
            <div className="row align-items-center gy-5">
              {/* Left Column: Headline, Copy, CTAs */}
              <div className="col-lg-6">
                <div className="landing-badge-trust mb-3">
                  <i className="bi bi-stars text-primary me-2" />
                  Personal Finance Made Clear & Simple
                </div>

                <h1 className="landing-hero-headline">
                  Take control of your money.{' '}
                  <span className="landing-gradient-text">One smart decision</span> at a time.
                </h1>

                <p className="landing-hero-subtext">
                  Track your spending, plan your budgets, and understand where your money goes — all in one simple place.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="landing-hero-cta-group d-flex flex-wrap align-items-center gap-3 mb-4">
                  <Link
                    to={user ? '/dashboard' : '/signup'}
                    className="landing-btn-hero-primary text-decoration-none"
                    id="hero-start-tracking-btn"
                  >
                    <span>{user ? 'Go to Dashboard' : 'Start Tracking for Free'}</span>
                    <i className="bi bi-arrow-right ms-2" />
                  </Link>

                  <a
                    href="#features"
                    onClick={scrollToSection('features')}
                    className="landing-btn-hero-secondary text-decoration-none"
                  >
                    <span>Explore Features</span>
                    <i className="bi bi-chevron-down ms-2" />
                  </a>
                </div>

                {/* Trust Line */}
                <div className="landing-trust-line">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="bi bi-shield-check text-primary" />
                    <strong>Your money, organized. Your decisions, informed.</strong>
                  </div>
                  <div className="landing-trust-sub">
                    No credit card required • Instant access • Private & secure
                  </div>
                </div>
              </div>

              {/* Right Column: High-Fidelity Illustrative Product Visual */}
              <div className="col-lg-6">
                <div className="landing-hero-visual-card">
                  {/* Visual Card Header */}
                  <div className="hero-visual-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <span className="hero-dot red" />
                      <span className="hero-dot yellow" />
                      <span className="hero-dot green" />
                      <span className="hero-visual-title ms-2">RupeeWise Live Overview</span>
                    </div>
                    <span className="hero-status-pill">
                      <span className="pulse-dot" /> Live Preview
                    </span>
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="hero-metrics-grid">
                    <div className="hero-metric-tile">
                      <span className="hero-metric-label">NET BALANCE</span>
                      <div className="hero-metric-val">₹1,24,500</div>
                      <span className="hero-metric-trend text-success">
                        <i className="bi bi-arrow-up-right me-1" />+14.8% this month
                      </span>
                    </div>
                    <div className="hero-metric-tile">
                      <span className="hero-metric-label">MONTHLY INCOME</span>
                      <div className="hero-metric-val text-success">₹85,000</div>
                      <span className="hero-metric-sub">Salary & Consulting</span>
                    </div>
                    <div className="hero-metric-tile">
                      <span className="hero-metric-label">MONTHLY EXPENSES</span>
                      <div className="hero-metric-val text-danger">₹42,300</div>
                      <span className="hero-metric-sub">48% of total income</span>
                    </div>
                    <div className="hero-metric-tile">
                      <span className="hero-metric-label">SAVINGS RATE</span>
                      <div className="hero-metric-val text-primary">50.2%</div>
                      <span className="hero-metric-sub">Above 40% goal</span>
                    </div>
                  </div>

                  {/* Category Spending Breakdown Bars */}
                  <div className="hero-spending-breakdown">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="hero-section-caption">SPENDING BY CATEGORY</span>
                      <span className="hero-caption-muted">Current Month</span>
                    </div>

                    <div className="hero-stacked-bar mb-3">
                      <div className="bar-segment seg-food" style={{ width: '38%' }} title="Food & Dining (38%)" />
                      <div className="bar-segment seg-rent" style={{ width: '32%' }} title="Rent & Housing (32%)" />
                      <div className="bar-segment seg-bills" style={{ width: '18%' }} title="Bills & Utilities (18%)" />
                      <div className="bar-segment seg-other" style={{ width: '12%' }} title="Other (12%)" />
                    </div>

                    <div className="hero-category-legend">
                      <span className="legend-item"><span className="dot seg-food" /> Food & Dining (38%)</span>
                      <span className="legend-item"><span className="dot seg-rent" /> Rent (32%)</span>
                      <span className="legend-item"><span className="dot seg-bills" /> Utilities (18%)</span>
                      <span className="legend-item"><span className="dot seg-other" /> Other (12%)</span>
                    </div>
                  </div>

                  {/* Active Budget Indicator */}
                  <div className="hero-budget-preview">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="hero-budget-name">
                        <i className="bi bi-wallet2 text-primary me-2" />
                        Dining Out Budget
                      </span>
                      <span className="hero-budget-numbers">
                        ₹8,400 / <span className="text-muted">₹10,000</span> (84%)
                      </span>
                    </div>
                    <div className="hero-budget-bar-track">
                      <div className="hero-budget-bar-fill warn" style={{ width: '84%' }} />
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <span className="hero-budget-sub text-warning">
                        <i className="bi bi-exclamation-triangle me-1" />
                        Alert sent at 80% threshold
                      </span>
                      <span className="hero-budget-sub text-muted">₹1,600 remaining</span>
                    </div>
                  </div>

                  {/* Recent Transactions Preview Snippet */}
                  <div className="hero-recent-preview">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="hero-section-caption">RECENT TRANSACTIONS</span>
                      <span className="hero-caption-muted">Latest 2 entries</span>
                    </div>

                    <div className="hero-tx-item">
                      <div className="d-flex align-items-center gap-2">
                        <div className="hero-tx-icon expense">
                          <i className="bi bi-cart3" />
                        </div>
                        <div>
                          <div className="hero-tx-title">Whole Foods Market</div>
                          <div className="hero-tx-date">Yesterday • UPI</div>
                        </div>
                      </div>
                      <div className="hero-tx-amount expense">-₹1,850</div>
                    </div>

                    <div className="hero-tx-item">
                      <div className="d-flex align-items-center gap-2">
                        <div className="hero-tx-icon income">
                          <i className="bi bi-briefcase" />
                        </div>
                        <div>
                          <div className="hero-tx-title">Tech Corp • Monthly Salary</div>
                          <div className="hero-tx-date">Oct 25 • Bank Transfer</div>
                        </div>
                      </div>
                      <div className="hero-tx-amount income">+₹85,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            3. FEATURES SECTION
            ============================================================ */}
        <section id="features" className="landing-section bg-surface">
          <div className="landing-container">
            <div className="landing-section-header text-center mx-auto">
              <span className="landing-pill-tag">WHAT RUPEEWISE OFFERS</span>
              <h2 className="landing-section-title">Built for Real Financial Clarity</h2>
              <p className="landing-section-sub">
                Everything you need to organize your daily transactions, plan monthly limits, and understand where your money goes.
              </p>
            </div>

            <div className="row g-4">
              {/* Feature 1: Expense Tracking */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-blue-subtle text-primary">
                    <i className="bi bi-receipt" />
                  </div>
                  <h3 className="landing-feature-card-title">Expense Tracking</h3>
                  <p className="landing-feature-card-desc">
                    Record income and expenses effortlessly. Filter by customizable categories, payment methods (UPI, Debit Card, Credit Card, Bank Transfer, Cash), date ranges, and searchable notes.
                  </p>
                </div>
              </div>

              {/* Feature 2: Budget Planning */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-emerald-subtle text-success">
                    <i className="bi bi-wallet2" />
                  </div>
                  <h3 className="landing-feature-card-title">Budget Planning</h3>
                  <p className="landing-feature-card-desc">
                    Set monthly spending caps for each category. Dynamic progress indicators give you immediate feedback (Healthy, Warning at 80%, Overbudget at 100%) so you stay ahead.
                  </p>
                </div>
              </div>

              {/* Feature 3: Spending Insights */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-purple-subtle text-indigo">
                    <i className="bi bi-pie-chart" />
                  </div>
                  <h3 className="landing-feature-card-title">Spending Insights</h3>
                  <p className="landing-feature-card-desc">
                    Gain genuine insight with category donut distributions, income vs. expense trends, net savings computations, and month-by-month historical comparisons.
                  </p>
                </div>
              </div>

              {/* Feature 4: Smart Budget Alerts */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-amber-subtle text-warning">
                    <i className="bi bi-bell" />
                  </div>
                  <h3 className="landing-feature-card-title">Smart Budget Alerts</h3>
                  <p className="landing-feature-card-desc">
                    Stay protected against unexpected bill shocks. RupeeWise alerts you via in-app notifications the moment category spending approaches or exceeds target limits.
                  </p>
                </div>
              </div>

              {/* Feature 5: Recurring Transactions */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-teal-subtle text-teal">
                    <i className="bi bi-arrow-repeat" />
                  </div>
                  <h3 className="landing-feature-card-title">Recurring Transactions</h3>
                  <p className="landing-feature-card-desc">
                    Automate recurring salary credits, rent payments, gym memberships, and subscriptions across daily, weekly, monthly, and yearly frequencies with automated background processing.
                  </p>
                </div>
              </div>

              {/* Feature 6: Financial Reports */}
              <div className="col-md-6 col-lg-4">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon-box bg-rose-subtle text-danger">
                    <i className="bi bi-file-earmark-pdf" />
                  </div>
                  <h3 className="landing-feature-card-title">Financial Reports</h3>
                  <p className="landing-feature-card-desc">
                    Export your financial data anytime for tax prep, accounting, or personal review. Generate clean CSV spreadsheets or formatted, publication-ready PDF reports with 1 click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. HOW IT WORKS SECTION
            ============================================================ */}
        <section id="how-it-works" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header text-center mx-auto">
              <span className="landing-pill-tag">SIMPLE 3-STEP PROCESS</span>
              <h2 className="landing-section-title">How RupeeWise Works</h2>
              <p className="landing-section-sub">
                Designed to be straightforward, intuitive, and productive from your very first session.
              </p>
            </div>

            <div className="row g-4">
              <div className="col-md-4">
                <div className="landing-step-card">
                  <div className="landing-step-number">01</div>
                  <h3 className="landing-step-title">Create your account</h3>
                  <p className="landing-step-desc">
                    Register in seconds with your name and email. No banking login or credit card required. Your credentials and session remain encrypted and private.
                  </p>
                </div>
              </div>

              <div className="col-md-4">
                <div className="landing-step-card">
                  <div className="landing-step-number">02</div>
                  <h3 className="landing-step-title">Record income & expenses</h3>
                  <p className="landing-step-desc">
                    Log daily transactions with amount, category, date, and payment mode. Set recurring rules for ongoing obligations like rent, utilities, and salary.
                  </p>
                </div>
              </div>

              <div className="col-md-4">
                <div className="landing-step-card">
                  <div className="landing-step-number">03</div>
                  <h3 className="landing-step-title">Review budgets & reports</h3>
                  <p className="landing-step-desc">
                    Monitor category limits, inspect visual income-versus-expense charts, receive automatic threshold warnings, and export formatted reports as PDF or CSV.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            5. BENEFITS SECTION
            ============================================================ */}
        <section id="benefits" className="landing-section bg-surface">
          <div className="landing-container">
            <div className="row align-items-center gy-5">
              <div className="col-lg-5">
                <span className="landing-pill-tag">PRACTICAL VALUE</span>
                <h2 className="landing-section-title">Why RupeeWise?</h2>
                <p className="landing-section-sub mb-4">
                  Most people don't know where their monthly income actually disappears. RupeeWise replaces guesswork with actionable visibility.
                </p>

                <div className="landing-benefits-list">
                  <div className="landing-benefit-item">
                    <div className="benefit-icon-check">
                      <i className="bi bi-check-lg" />
                    </div>
                    <div>
                      <h4 className="benefit-title">Understand where your money goes</h4>
                      <p className="benefit-desc">
                        Stop wondering where your paycheck went. Clear category breakdowns show your exact spending distribution.
                      </p>
                    </div>
                  </div>

                  <div className="landing-benefit-item">
                    <div className="benefit-icon-check">
                      <i className="bi bi-check-lg" />
                    </div>
                    <div>
                      <h4 className="benefit-title">Identify spending patterns</h4>
                      <p className="benefit-desc">
                        Spot recurring leaks, discretionary spikes, and evaluate which lifestyle categories consume the largest portion of your income.
                      </p>
                    </div>
                  </div>

                  <div className="landing-benefit-item">
                    <div className="benefit-icon-check">
                      <i className="bi bi-check-lg" />
                    </div>
                    <div>
                      <h4 className="benefit-title">Keep category budgets visible</h4>
                      <p className="benefit-desc">
                        Live progress bars ensure you stay conscious of your spending limits before you overspend.
                      </p>
                    </div>
                  </div>

                  <div className="landing-benefit-item">
                    <div className="benefit-icon-check">
                      <i className="bi bi-check-lg" />
                    </div>
                    <div>
                      <h4 className="benefit-title">Review monthly financial trends</h4>
                      <p className="benefit-desc">
                        Compare your cash flow across months to see how your savings habits improve over time.
                      </p>
                    </div>
                  </div>

                  <div className="landing-benefit-item">
                    <div className="benefit-icon-check">
                      <i className="bi bi-check-lg" />
                    </div>
                    <div>
                      <h4 className="benefit-title">Make more informed financial decisions</h4>
                      <p className="benefit-desc">
                        Make plans for major purchases, vacations, or savings goals backed by reliable financial data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Visual Showcase */}
              <div className="col-lg-7">
                <div className="landing-benefits-card-composition">
                  <div className="composition-card card-main">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2">
                        <div className="comp-avatar">
                          <i className="bi bi-person-check text-white" />
                        </div>
                        <div>
                          <div className="comp-name">Personal Financial Health</div>
                          <div className="comp-sub">October 2026 Summary</div>
                        </div>
                      </div>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                        Healthy Ratio
                      </span>
                    </div>

                    <div className="comp-progress-group mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="comp-bar-label">Total Monthly Budget Utilization</span>
                        <span className="comp-bar-val">58% utilized</span>
                      </div>
                      <div className="comp-bar-track">
                        <div className="comp-bar-fill ok" style={{ width: '58%' }} />
                      </div>
                    </div>

                    <div className="row g-2">
                      <div className="col-6">
                        <div className="comp-stat-box">
                          <span className="comp-stat-label">DISCRETIONARY RATIO</span>
                          <span className="comp-stat-val text-primary">22.4%</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="comp-stat-box">
                          <span className="comp-stat-label">EMERGENCY SAVINGS</span>
                          <span className="comp-stat-val text-success">+₹42,700</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Notification Badge */}
                  <div className="composition-card card-floating">
                    <div className="d-flex align-items-center gap-2">
                      <div className="floating-notif-icon">
                        <i className="bi bi-bell text-warning" />
                      </div>
                      <div>
                        <div className="floating-notif-title">Dining Out reached 84%</div>
                        <div className="floating-notif-sub">Approaching monthly limit of ₹10,000</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            6. CLOSING CALL TO ACTION
            ============================================================ */}
        <section className="landing-cta-section">
          <div className="landing-container">
            <div className="landing-cta-box text-center">
              <h2 className="landing-cta-headline">Your finances deserve a clearer picture.</h2>
              <p className="landing-cta-subtext">
                Start organizing your money with RupeeWise today. Free, private, and effortless.
              </p>

              <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">
                <Link
                  to={user ? '/dashboard' : '/signup'}
                  className="landing-btn-hero-primary text-decoration-none"
                  id="cta-create-account-btn"
                >
                  <span>{user ? 'Open Your Dashboard' : 'Create Your Free Account'}</span>
                  <i className="bi bi-arrow-right ms-2" />
                </Link>
                {!user && (
                  <Link to="/login" className="landing-btn-ghost-light text-decoration-none">
                    <span>Sign In to Existing Account</span>
                  </Link>
                )}
              </div>

              <div className="landing-cta-reassurance">
                <span><i className="bi bi-check2 text-info me-1" /> No credit card needed</span>
                <span><i className="bi bi-check2 text-info me-1" /> Instant setup</span>
                <span><i className="bi bi-check2 text-info me-1" /> 100% private financial data</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================
          7. FOOTER
          ============================================================ */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="row gy-4 align-items-center justify-content-between mb-4">
            <div className="col-md-5">
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="landing-brand-logo small">
                  <img src={logo} alt="RupeeWise Logo" />
                </div>
                <span className="landing-brand-name">RupeeWise</span>
              </div>
              <p className="landing-footer-desc mb-0">
                A modern, private personal finance tracker built to help you track expenses, budget with discipline, and make confident financial decisions.
              </p>
            </div>

            <div className="col-md-6 d-flex justify-content-md-end flex-wrap gap-4">
              <a href="#home" onClick={scrollToSection('home')} className="landing-footer-link">Home</a>
              <a href="#features" onClick={scrollToSection('features')} className="landing-footer-link">Features</a>
              <a href="#how-it-works" onClick={scrollToSection('how-it-works')} className="landing-footer-link">How It Works</a>
              <a href="#benefits" onClick={scrollToSection('benefits')} className="landing-footer-link">Benefits</a>
              {user ? (
                <Link to="/dashboard" className="landing-footer-link">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="landing-footer-link">Log In</Link>
                  <Link to="/signup" className="landing-footer-link">Create Account</Link>
                </>
              )}
            </div>
          </div>

          <div className="landing-footer-bottom d-flex flex-column flex-sm-row justify-content-between align-items-center pt-3 border-top border-secondary-subtle">
            <span className="landing-footer-copy">
              © {currentYear} RupeeWise. All rights reserved.
            </span>
            <span className="landing-footer-credit mt-2 mt-sm-0">
              Honest, practical personal finance tracking.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
