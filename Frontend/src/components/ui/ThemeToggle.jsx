import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle({
  className = '',
  id = 'theme-toggle-btn',
  showLabel = false,
  style = {},
}) {
  const { theme, isDark, toggleTheme } = useTheme()

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const title = isDark ? 'Light mode (Alt+T)' : 'Dark mode (Alt+T)'

  return (
    <button
      id={id}
      type="button"
      className={`theme-toggle-btn ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={title}
      style={style}
    >
      <span className="theme-toggle-icon-wrap" aria-hidden="true">
        {isDark ? (
          <i className="bi bi-sun-fill theme-sun-icon" />
        ) : (
          <i className="bi bi-moon-stars-fill theme-moon-icon" />
        )}
      </span>
      {showLabel && (
        <span className="theme-toggle-label ms-2">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  )
}
