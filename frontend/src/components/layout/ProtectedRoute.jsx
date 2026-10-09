import { Navigate, Outlet } from 'react-router-dom'
import { useAppAuth } from '../../App'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAppAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
