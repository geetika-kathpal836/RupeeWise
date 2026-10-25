import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'

const THEME_STORAGE_KEY = 'rupeewise-theme'

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
})

/**
 * Determine initial theme safely from localStorage or system preference.
 */
function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  // Synchronize DOM and localStorage whenever theme changes
  useEffect(() => {
    const validTheme = theme === 'dark' ? 'dark' : 'light'

    try {
      localStorage.setItem(THEME_STORAGE_KEY, validTheme)
    } catch {
      // Ignore localStorage errors
    }

    if (typeof document !== 'undefined') {
      const root = document.documentElement
      root.setAttribute('data-theme', validTheme)
      root.style.colorScheme = validTheme

      if (validTheme === 'dark') {
        root.classList.add('dark-theme')
      } else {
        root.classList.remove('dark-theme')
      }
    }
  }, [theme])

  // Listen for system theme changes if user hasn't set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY)
        // Only change automatically if user hasn't explicitly set a preference
        if (!saved) {
          setThemeState(e.matches ? 'dark' : 'light')
        }
      } catch {
        // Ignore
      }
    }

    mediaQuery.addEventListener?.('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const setTheme = useCallback((t) => {
    const validTheme = t === 'dark' ? 'dark' : 'light'
    setThemeState(validTheme)
  }, [])

  // Global keyboard shortcut (Alt+T or Option+T) for accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault()
        toggleTheme()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleTheme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
