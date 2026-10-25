import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout      from './components/layout/AppLayout'

import LandingPage      from './pages/LandingPage'
import LoginPage        from './pages/LoginPage'
import SignupPage       from './pages/SignupPage'
import DashboardPage    from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import BudgetsPage      from './pages/BudgetsPage'
import RecurringPage    from './pages/RecurringPage'
import ReportsPage      from './pages/ReportsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage      from './pages/ProfilePage'

function AppRoutes() {
  const { theme } = useTheme()

  return (
    <>
      <Toaster position="top-right" richColors closeButton theme={theme} />
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"     element={<DashboardPage />} />
            <Route path="/transactions"  element={<TransactionsPage />} />
            <Route path="/budgets"       element={<BudgetsPage />} />
            <Route path="/recurring"     element={<RecurringPage />} />
            <Route path="/reports"       element={<ReportsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile"       element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

