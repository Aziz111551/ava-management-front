import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import AdminShell from '../layout/AdminShell'
import DashboardPage from '../pages/DashboardPage'
import UsersPage from '../pages/UsersPage'
import SettingsPage from '../pages/SettingsPage'

function TransitionWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  )
}

function AdminProContentRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route index element={<TransitionWrapper><DashboardPage /></TransitionWrapper>} />
        <Route path="users" element={<TransitionWrapper><UsersPage /></TransitionWrapper>} />
        <Route path="settings" element={<TransitionWrapper><SettingsPage /></TransitionWrapper>} />
        <Route path="*" element={<Navigate to="/admin-pro" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function AdminProRouter() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route path="*" element={<AdminProContentRoutes />} />
      </Route>
    </Routes>
  )
}
