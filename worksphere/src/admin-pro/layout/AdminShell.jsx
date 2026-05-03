import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopNavbar from './TopNavbar'
import { applyDarkMode, getInitialDarkMode } from '../../utils/theme'

export default function AdminShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)

  useEffect(() => {
    applyDarkMode(darkMode)
  }, [darkMode])

  return (
    <div className="min-h-screen bg-primary-900 text-white">
      <div className="flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 z-50 bg-primary-900/75 xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            >
              <motion.div
                className="h-full w-[250px]"
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1">
          <TopNavbar
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((v) => !v)}
            onOpenMobileSidebar={() => setMobileOpen(true)}
          />
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
