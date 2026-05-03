import { useEffect, useState } from 'react'
import { applyDarkMode, getInitialDarkMode } from '../../utils/theme'

export default function PreferencesPage() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)

  useEffect(() => {
    applyDarkMode(darkMode)
  }, [darkMode])

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-primary-700 bg-primary-700/70 p-6 shadow-soft">
      <h1 className="text-2xl font-bold text-white">Preferences</h1>
      <p className="mt-2 text-sm text-[#B5D3E2]">
        Paramètres d’affichage de l’interface.
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-primary-600 bg-primary-800/70 p-4">
          <label className="block text-sm font-medium text-[#B5D3E2]" htmlFor="theme-select">
            Theme
          </label>
          <select
            id="theme-select"
            value={darkMode ? 'dark' : 'light'}
            onChange={(e) => setDarkMode(e.target.value === 'dark')}
            className="mt-2 w-full rounded-lg border border-primary-600 bg-primary-700 px-3 py-2 text-sm text-white outline-none focus:border-accent-cyan"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </section>
  )
}
