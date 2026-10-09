import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useCallback, useMemo, createContext, useContext } from 'react'
import { authService } from './services/authService'

// Layout
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Toast context
import Toast from './components/common/Toast'

// Pages — Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'

// Pages — Protected
import Dashboard from './pages/Dashboard'
import Detect from './pages/Detect'
import ImageAnalysis from './pages/ImageAnalysis'
import VideoAnalysis from './pages/VideoAnalysis'
import Result from './pages/Result'
import FrameAnalysis from './pages/FrameAnalysis'
import History from './pages/History'
import Evidence from './pages/Evidence'
import Reports from './pages/Reports'
import CybercrimeReport from './pages/CybercrimeReport'
import Awareness from './pages/Awareness'
import Resources from './pages/Resources'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'

// Auth Context
export const AuthContext = createContext(null)
export const ToastContext = createContext(null)

export function useAppAuth() {
  return useContext(AuthContext)
}

export function useToast() {
  return useContext(ToastContext)
}

function App() {
  const [user, setUser] = useState(authService.getCurrentUser())
  const [toasts, setToasts] = useState([])

  const login = useCallback((userData) => setUser(userData), [])
  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', title = '') => {
    const id = Date.now() + Math.random()
    // Keep at most 4 toasts on screen.
    setToasts((prev) => [...prev.slice(-3), { id, message, type, title }])
    setTimeout(() => removeToast(id), 4500)
  }, [removeToast])

  const authValue = useMemo(() => ({ user, login, logout, isAuthenticated: !!user }), [user, login, logout])
  const toastValue = useMemo(() => ({ addToast }), [addToast])

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

            {/* Protected — wrapped in AppLayout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/detect" element={<Detect />} />
                <Route path="/detect/image" element={<ImageAnalysis />} />
                <Route path="/detect/video" element={<VideoAnalysis />} />
                <Route path="/detect/url" element={<Navigate to="/detect" replace />} />
                <Route path="/analysis/processing" element={<Navigate to="/detect" replace />} />
                <Route path="/result/:id" element={<Result />} />
                <Route path="/result/:id/frames" element={<FrameAnalysis />} />
                <Route path="/history" element={<History />} />
                <Route path="/evidence" element={<Evidence />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/cybercrime/report" element={<CybercrimeReport />} />
                <Route path="/awareness" element={<Awareness />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

        {/* Toast container */}
        <div className="toast-container">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}

export default App
