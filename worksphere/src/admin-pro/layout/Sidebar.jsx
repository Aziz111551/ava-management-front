import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'

const items = [
  { to: '/admin-pro', label: 'Dashboard', icon: 'fa-solid fa-chart-line', end: true },
  { to: '/admin-pro/users', label: 'Users', icon: 'fa-solid fa-users' },
  { to: '/admin-pro/settings', label: 'Settings', icon: 'fa-solid fa-gear' },
]

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 86 : 258 }}
      transition={{ duration: 0.26, ease: [0.2, 0.9, 0.3, 1] }}
      className="relative hidden shrink-0 border-r border-slate-200 bg-white/95 p-3 backdrop-blur xl:block dark:border-slate-800 dark:bg-slate-950/90"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600 text-sm font-bold text-white">A</div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">AVA Admin</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Control Center</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <i className={`fa-solid ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`} aria-hidden />
        </button>
      </div>

      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <i className={item.icon} aria-hidden />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  )
}
