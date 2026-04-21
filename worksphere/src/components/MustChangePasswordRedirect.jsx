import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Si l’API a renvoyé mustChangePassword sur l’utilisateur, force /first-password (doc BACKEND_EMPLOYEE_WELCOME). */
export default function MustChangePasswordRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user?.role === 'admin') return
    if (!user?.mustChangePassword) return
    if (location.pathname === '/first-password') return
    navigate('/first-password', { replace: true })
  }, [user, location.pathname, navigate])

  return null
}
