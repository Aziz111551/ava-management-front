import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import { getAdminPermissionsApi, getSettingsApi, updateSettingsApi } from '../../services/adminProApi'

export default function SettingsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    appName: 'WorkSphere Admin',
    supportEmail: 'support@worksphere.tn',
    timezone: 'Africa/Tunis',
    notifications: true,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState([])

  const canUpdate =
    user?.role === 'admin' &&
    (permissions.length === 0 || permissions.includes('settings:update'))

  const onChange = (key, value) => {
    setSaved(false)
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canUpdate) return
    setError('')
    try {
      await updateSettingsApi(form)
      setSaved(true)
    } catch (e2) {
      setSaved(false)
      setError(e2?.message || 'Impossible de sauvegarder les paramètres.')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getSettingsApi()
        if (!cancelled) setForm(data)
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.response?.status === 404
              ? 'Endpoint /api/settings non disponible — édition locale uniquement.'
              : (e?.message || 'Chargement des paramètres impossible.'),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await getAdminPermissionsApi()
        if (!cancelled) setPermissions(Array.isArray(p) ? p : [])
      } catch {
        if (!cancelled) setPermissions([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <Card title="Settings" subtitle="General platform and notification settings">
        <form className="space-y-4" onSubmit={onSubmit}>
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
              {error}
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">App Name</span>
            <input
              disabled={loading}
              value={form.appName}
              onChange={(e) => onChange('appName', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Support Email</span>
            <input
              type="email"
              disabled={loading}
              value={form.supportEmail}
              onChange={(e) => onChange('supportEmail', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Timezone</span>
            <select
              disabled={loading}
              value={form.timezone}
              onChange={(e) => onChange('timezone', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="Africa/Tunis">Africa/Tunis</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="UTC">UTC</option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
            <input
              type="checkbox"
              disabled={loading}
              checked={form.notifications}
              onChange={(e) => onChange('notifications', e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">Enable email notifications</span>
          </label>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading || !canUpdate}>
              {loading ? 'Loading…' : 'Save Settings'}
            </Button>
            {!canUpdate && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Permission `settings:update` requise.
              </span>
            )}
            {saved && <span className="text-sm text-emerald-500">Settings saved successfully.</span>}
          </div>
        </form>
      </Card>
    </motion.div>
  )
}
