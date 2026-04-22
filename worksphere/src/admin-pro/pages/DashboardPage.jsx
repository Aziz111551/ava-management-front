import { useEffect, useMemo, useState } from 'react'
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
import { monthlyRevenue, taskCompletion, recentActivity } from '../data/mockData'
import { getActivityApi, getTransactionsApi, getUsersApi } from '../../services/adminProApi'

function Stat({ label, value, icon, trend }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="ap-panel flex items-center justify-between p-5"
    >
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        <p className="mt-1 text-xs text-emerald-500">{trend}</p>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
        <i className={icon} aria-hidden />
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 12540,
    tasks: 328,
    revenue: 84220,
    usersTrend: '+12.4% this month',
    tasksTrend: '+4.1% this week',
    revenueTrend: '+18.7% this quarter',
  })
  const [activityRows, setActivityRows] = useState(recentActivity)
  const [chartRevenue, setChartRevenue] = useState(monthlyRevenue)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setDashboardError('')
      try {
        const [usersRes, txRes, actRes] = await Promise.allSettled([
          getUsersApi({ limit: 200 }),
          getTransactionsApi({ limit: 200 }),
          getActivityApi({ limit: 20 }),
        ])

        if (cancelled) return

        const usersCount =
          usersRes.status === 'fulfilled' ? usersRes.value.rows.length : stats.users

        let txList = []
        if (txRes.status === 'fulfilled') txList = txRes.value
        const revenue = txList.reduce((sum, tx) => sum + Number(tx.amount || tx.total || 0), 0)

        const grouped = new Map()
        txList.forEach((tx) => {
          const iso = tx.createdAt || tx.date || tx.timestamp
          const d = iso ? new Date(iso) : null
          if (!d || Number.isNaN(d.getTime())) return
          const key = `${d.getFullYear()}-${d.getMonth()}`
          const prev = grouped.get(key) || { revenue: 0, users: 0, d }
          prev.revenue += Number(tx.amount || tx.total || 0)
          prev.users += 0
          grouped.set(key, prev)
        })
        const revRows = [...grouped.values()]
          .sort((a, b) => a.d - b.d)
          .slice(-7)
          .map((x) => ({
            name: x.d.toLocaleDateString('fr-FR', { month: 'short' }),
            revenue: Math.round(x.revenue),
            users: 0,
          }))

        if (revRows.length >= 2) setChartRevenue(revRows)
        if (txList.length > 0) {
          const mapped = txList
            .slice(0, 4)
            .map((tx, i) => ({
              id: tx.id || tx._id || `TRX-${i + 1}`,
              actor: tx.actor || tx.source || 'System',
              action: tx.action || 'Transaction updated',
              target: tx.reference || tx.user || tx.email || '—',
              date: tx.createdAt || tx.date || '—',
            }))
          if (mapped.length > 0) setActivityRows(mapped)
        } else if (actRes.status === 'fulfilled' && Array.isArray(actRes.value) && actRes.value.length > 0) {
          setActivityRows(
            actRes.value.slice(0, 8).map((a, i) => ({
              id: a.id || a._id || `ACT-${i + 1}`,
              actor: a.actor || a.user || 'System',
              action: a.action || a.event || a.message || 'Activity',
              target: a.target || a.entity || '—',
              date: a.date || a.createdAt || '—',
            })),
          )
        }

        setStats((prev) => ({
          ...prev,
          users: usersCount || prev.users,
          tasks: actRes.status === 'fulfilled' && Array.isArray(actRes.value) ? actRes.value.length : prev.tasks,
          revenue: revenue > 0 ? Math.round(revenue) : prev.revenue,
          usersTrend: usersRes.status === 'fulfilled' ? 'API /api/users' : 'fallback local',
          tasksTrend: actRes.status === 'fulfilled' ? 'API /api/activity' : 'fallback local',
          revenueTrend: txRes.status === 'fulfilled' ? 'API /api/transactions' : 'fallback local',
        }))
      } catch (e) {
        if (!cancelled) setDashboardError(e?.message || 'Fallback dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total Users" value={stats.users.toLocaleString('fr-FR')} trend={stats.usersTrend} icon="fa-solid fa-users" />
        <Stat label="Open Tasks" value={stats.tasks.toLocaleString('fr-FR')} trend={stats.tasksTrend} icon="fa-solid fa-list-check" />
        <Stat label="Revenue" value={`$${stats.revenue.toLocaleString('fr-FR')}`} trend={stats.revenueTrend} icon="fa-solid fa-sack-dollar" />
      </div>
      {dashboardError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          {dashboardError}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Revenue Trend" subtitle="Monthly revenue over time">
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

        <Card title="Task Progress" subtitle="Completed vs pending by week">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskCompletion}>
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
