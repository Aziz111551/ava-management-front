import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const notificationsSeed = [
  { id: 1, text: 'Nouveau ticket support #T902', time: '2 min' },
  { id: 2, text: 'Paiement reçu: TRX-3011', time: '11 min' },
  { id: 3, text: 'Utilisateur bloqué automatiquement', time: '35 min' },
]

export default function TopNavbar({ darkMode, onToggleDark, onOpenMobileSidebar }) {
  const { user, login, logout } = useAuth()
  const [openNotif, setOpenNotif] = useState(false)
  const [openProfile, setOpenProfile] = useState(false)
  const adminSnapshot = useMemo(() => {
    try {
      const raw = localStorage.getItem('ws_admin_snapshot')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [user?.role])
  const canBackToAdmin =
    Boolean(adminSnapshot?.token && adminSnapshot?.user) &&
    String(user?.role || '').toLowerCase() !== 'admin'
  const adminOwnerLabel = adminSnapshot?.user?.name || adminSnapshot?.user?.email || 'Admin'
  const initials = useMemo(
    () => user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'AD',
    [user],
  )

  const handleBackToAdmin = () => {
    if (!adminSnapshot?.token || !adminSnapshot?.user) return
    login(adminSnapshot.user, adminSnapshot.token)
    localStorage.removeItem('ws_admin_snapshot')
    window.location.href = '/admin-pro'
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 xl:hidden dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <i className="fa-solid fa-bars" aria-hidden />
        </button>

        <div className="relative hidden flex-1 max-w-xl md:block">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search users, transactions, logs..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {canBackToAdmin && (
            <span
              title="Impersonation active"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-700 lg:hidden dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
            >
              <i className="fa-solid fa-user-secret text-xs" aria-hidden />
            </span>
          )}
          {canBackToAdmin && (
            <span className="hidden items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 lg:inline-flex dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <i className="fa-solid fa-user-secret text-[10px]" aria-hidden />
              Impersonation active
            </span>
          )}
          {canBackToAdmin && (
            <button
              type="button"
              onClick={handleBackToAdmin}
              className="rounded-xl border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200 dark:hover:bg-primary-900/60"
              title={`Retour vers la session de ${adminOwnerLabel}`}
            >
              Back to Admin
            </button>
          )}
          <button
            type="button"
            onClick={onToggleDark}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <i className={`fa-solid ${darkMode ? 'fa-sun' : 'fa-moon'}`} aria-hidden />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenNotif((v) => !v); setOpenProfile(false) }}
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="fa-regular fa-bell" aria-hidden />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <AnimatePresence>
              {openNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:text-slate-100">
                    Notifications
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notificationsSeed.map((n) => (
                      <li key={n.id} className="px-4 py-3">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{n.text}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{n.time}</p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setOpenProfile((v) => !v); setOpenNotif(false) }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-xs font-bold text-white">{initials}</span>
              <span className="hidden text-sm text-slate-700 dark:text-slate-200 md:block">{user?.name || 'Admin'}</span>
              <i className="fa-solid fa-chevron-down text-xs text-slate-400" aria-hidden />
            </button>
            <AnimatePresence>
              {openProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                >
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    Profile
                  </button>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    Preferences
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
