import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './pages/auth/Login'

import RHLayout from './pages/rh/RHLayout'
import Calendrier from './pages/rh/Calendrier'
import Employes from './pages/rh/Employes'
import Conges from './pages/rh/Conges'
import { Reclamations, Candidats, Maladies } from './pages/rh/RhOther'

import EmployeeLayout from './pages/employee/EmployeeLayout'
import EmployeeDashboard from './pages/employee/Dashboard'
import { MesProjets, TachesTrello } from './pages/employee/EmployeeWork'
import { DemandeConge, DeclarerMaladie } from './pages/employee/EmployeeRH'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text3)', fontSize: '14px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <motion.span
          aria-hidden
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--cyan)',
            boxShadow: '0 0 12px var(--cyan)',
          }}
        />
        Loading…
      </motion.div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'rh' ? '/rh/calendrier' : '/employee/dashboard'} replace />
  }
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'rh') return <Navigate to="/rh/calendrier" replace />
  return <Navigate to="/employee/dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* RH ROUTES */}
          <Route path="/rh" element={
            <ProtectedRoute requiredRole="rh">
              <RHLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/rh/calendrier" replace />} />
            <Route path="calendrier" element={<Calendrier />} />
            <Route path="reclamations" element={<Reclamations />} />
            <Route path="conges" element={<Conges />} />
            <Route path="candidats" element={<Candidats />} />
            <Route path="maladies" element={<Maladies />} />
            <Route path="employes" element={<Employes />} />
          </Route>

          {/* EMPLOYEE ROUTES */}
          <Route path="/employee" element={
            <ProtectedRoute requiredRole="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="projets" element={<MesProjets />} />
            <Route path="taches" element={<TachesTrello />} />
            <Route path="conges" element={<DemandeConge />} />
            <Route path="maladie" element={<DeclarerMaladie />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
