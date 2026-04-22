import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Card from '../components/Card'
import DataTable from '../components/DataTable'
import { SkeletonLine } from '../components/LoadingSkeleton'
import { getActivityApi, getTransactionsApi, getUsersApi } from '../../services/adminProApi'
import { fetchMeetings } from '../../services/meetings'

const FALLBACK_ACTIVITY = [
  { id: 'ACT-F1', actor: 'System', action: 'Aucune activité API', target: '—', date: '—' },
]

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

function periodStart(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - Math.max(0, days - 1))
  return d
}

function inRange(value, start, end) {
  if (!value) return false
  const d = new Date(value)
  return !Number.isNaN(d.getTime()) && d >= start && d <= end
}

function trend(current, previous) {
  if (!previous) return current ? '+100%' : '0%'
  const p = Math.round(((current - previous) / previous) * 100)
  return `${p > 0 ? '+' : ''}${p}%`
}

function buildRevenueSeries(transactions, meetings, days) {
  const now = new Date()
  const start = periodStart(days)
  const map = new Map()

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    map.set(d.toISOString().slice(0, 10), { d, amount: 0, meetings: 0 })
  }

  transactions.forEach((tx) => {
    const d = new Date(tx.createdAt || tx.date || tx.timestamp || '')
    if (Number.isNaN(d.getTime()) || d < start || d > now) return
    const row = map.get(d.toISOString().slice(0, 10))
    if (row) row.amount += toNum(tx.amount || tx.total)
  })

  meetings.forEach((m) => {
    const d = new Date(m.scheduledAt || m.createdAt || '')
    if (Number.isNaN(d.getTime()) || d < start || d > now) return
    const row = map.get(d.toISOString().slice(0, 10))
    if (row) row.meetings += 1
  })

  return [...map.values()].map((x) => ({
    name: x.d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    revenue: Math.round(x.amount || x.meetings * 120),
  }))
}

function buildTaskSeries(meetings, days) {
  const now = new Date()
  const start = periodStart(days)
  const buckets = [
    { name: 'S1', completed: 0, pending: 0 },
    { name: 'S2', completed: 0, pending: 0 },
    { name: 'S3', completed: 0, pending: 0 },
    { name: 'S4', completed: 0, pending: 0 },
  ]

  meetings.forEach((m) => {
    const d = new Date(m.scheduledAt || m.createdAt || '')
    if (Number.isNaN(d.getTime()) || d < start || d > now) return
    const ratio = (d.getTime() - start.getTime()) / Math.max(1, now.getTime() - start.getTime())
    const idx = Math.min(3, Math.max(0, Math.floor(ratio * 4)))
    const st = String(m.status || '').toLowerCase()
    if (['completed', 'ended', 'done'].includes(st)) buckets[idx].completed += 1
    else buckets[idx].pending += 1
  })

  return buckets
}

function buildActivityRows(activity, transactions, meetings) {
  if (Array.isArray(activity) && activity.length > 0) {
    return activity.slice(0, 8).map((a, i) => ({
      id: a.id || a._id || `ACT-${i + 1}`,
      actor: a.actor || a.user || 'System',
      action: a.action || a.event || a.message || 'Activity',
      target: a.target || a.entity || '—',
      date: formatDateTime(a.date || a.createdAt),
    }))
  }
  if (Array.isArray(transactions) && transactions.length > 0) {
    return transactions.slice(0, 8).map((tx, i) => ({
      id: tx.id || tx._id || `TRX-${i + 1}`,
      actor: tx.actor || tx.source || 'Billing',
      action: tx.action || 'Transaction updated',
      target: tx.reference || tx.user || tx.email || '—',
      date: formatDateTime(tx.createdAt || tx.date || tx.timestamp),
    }))
  }
  if (Array.isArray(meetings) && meetings.length > 0) {
    return meetings.slice(0, 8).map((m, i) => ({
      id: m.id || `MEET-${i + 1}`,
      actor: m.rhName || m.rhEmail || 'RH',
      action: `Meeting ${m.status || 'updated'}`,
      target: m.participantName || m.participantEmail || '—',
      date: formatDateTime(m.scheduledAt || m.createdAt),
    }))
  }
  return FALLBACK_ACTIVITY
}

function Stat({ label, value, icon, trendText }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="ap-panel flex items-center justify-between p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
          <motion.span
            key={value}
            initial={{ opacity: 0.3, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.span>
        </h3>
        <p className="mt-1 text-xs text-emerald-500">{trendText}</p>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
        <i className={icon} aria-hidden />
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [periodDays, setPeriodDays] = useState(30)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [stats, setStats] = useState({
    users: 0,
    tasks: 0,
    revenue: 0,
    usersTrend: 'live',
    tasksTrend: 'live',
    revenueTrend: 'live',
  })
  const [activityRows, setActivityRows] = useState(FALLBACK_ACTIVITY)
  const [chartRevenue, setChartRevenue] = useState([])
  const [taskProgress, setTaskProgress] = useState([])
  const [dashboardError, setDashboardError] = useState('')

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setDashboardError('')
    try {
      const now = new Date()
      const start = periodStart(periodDays)
      const prevStart = new Date(start)
      prevStart.setDate(start.getDate() - periodDays)

      const [usersRes, txRes, actRes, meetingsRes] = await Promise.allSettled([
        getUsersApi({ limit: 400 }),
        getTransactionsApi({ limit: 400 }),
        getActivityApi({ limit: 80 }),
        fetchMeetings({ viewer: 'rh' }),
      ])

      const usersCount = usersRes.status === 'fulfilled' ? usersRes.value.rows.length : 0
      const txList = txRes.status === 'fulfilled' && Array.isArray(txRes.value) ? txRes.value : []
      const activity = actRes.status === 'fulfilled' && Array.isArray(actRes.value) ? actRes.value : []
      const meetings =
        meetingsRes.status === 'fulfilled' && Array.isArray(meetingsRes.value?.meetings)
          ? meetingsRes.value.meetings
          : []

      const currentRevenue = txList
        .filter((tx) => inRange(tx.createdAt || tx.date || tx.timestamp, start, now))
        .reduce((sum, tx) => sum + toNum(tx.amount || tx.total), 0)
      const previousRevenue = txList
        .filter((tx) => inRange(tx.createdAt || tx.date || tx.timestamp, prevStart, start))
        .reduce((sum, tx) => sum + toNum(tx.amount || tx.total), 0)

      const openTasks = meetings.filter((m) => !['completed', 'ended', 'done'].includes(String(m.status || '').toLowerCase())).length
      const previousOpenTasks = meetings.filter((m) => {
        const d = new Date(m.scheduledAt || m.createdAt || '')
        if (Number.isNaN(d.getTime()) || d < prevStart || d > start) return false
        return !['completed', 'ended', 'done'].includes(String(m.status || '').toLowerCase())
      }).length

      setChartRevenue(buildRevenueSeries(txList, meetings, periodDays))
      setTaskProgress(buildTaskSeries(meetings, periodDays))
      setActivityRows(buildActivityRows(activity, txList, meetings))

      setStats({
        users: usersCount,
        tasks: openTasks,
        revenue: Math.round(currentRevenue || meetings.length * 120),
        usersTrend:
          usersRes.status === 'fulfilled'
            ? `API /api/users · ${periodDays}j`
            : `fallback local · ${periodDays}j`,
        tasksTrend: `${trend(openTasks, previousOpenTasks)} vs période précédente`,
        revenueTrend: `${trend(currentRevenue, previousRevenue)} vs période précédente`,
      })
      setLastUpdated(new Date())
    } catch (e) {
      setDashboardError(e?.message || 'Dashboard indisponible.')
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [periodDays])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const id = window.setInterval(() => {
      loadDashboard({ silent: true })
    }, 45000)
    return () => clearInterval(id)
  }, [autoRefresh, loadDashboard])

  const columns = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'actor', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target' },
      { key: 'date', label: 'Date' },
    ],
    [],
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonLine className="h-28" />
          <SkeletonLine className="h-28" />
          <SkeletonLine className="h-28" />
        </div>
        <SkeletonLine className="h-80" />
        <SkeletonLine className="h-80" />
      </div>
    )
  }

  const lastUpdatedLabel = lastUpdated ? formatDateTime(lastUpdated) : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriodDays(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                periodDays === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {d} jours
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto refresh
          </label>
          <button
            type="button"
            onClick={() => loadDashboard({ silent: true })}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            <i className={`fa-solid fa-rotate ${refreshing ? 'fa-spin' : ''}`} aria-hidden />
            Rafraîchir
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total Users" value={stats.users.toLocaleString('fr-FR')} trendText={stats.usersTrend} icon="fa-solid fa-users" />
        <Stat label="Open Tasks" value={stats.tasks.toLocaleString('fr-FR')} trendText={stats.tasksTrend} icon="fa-solid fa-list-check" />
        <Stat label="Revenue" value={`$${stats.revenue.toLocaleString('fr-FR')}`} trendText={stats.revenueTrend} icon="fa-solid fa-sack-dollar" />
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">Dernière mise à jour: {lastUpdatedLabel}</div>
      {dashboardError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {dashboardError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Revenue Trend" subtitle="Données glissantes sur la période sélectionnée">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Task Progress" subtitle="Complétées vs en attente">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="completed" fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Recent Activity" subtitle="Latest admin actions">
        <DataTable columns={columns} rows={activityRows} />
      </Card>
    </motion.div>
  )
}
