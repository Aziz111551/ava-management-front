import { useEffect, useState } from 'react'
import { applyDarkMode, getInitialDarkMode } from '../../utils/theme'

export default function PreferencesPage() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)

  useEffect(() => {
    applyDarkMode(darkMode)
  }, [darkMode])

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Preferences</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Paramètres d’affichage de l’interface.
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="theme-select">
            Theme
          </label>
          <select
            id="theme-select"
            value={darkMode ? 'dark' : 'light'}
            onChange={(e) => setDarkMode(e.target.value === 'dark')}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </section>
  )
}
