import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import Button from '../components/Button'
import Card from '../components/Card'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import LoadingSkeletonTable from '../components/LoadingSkeleton'
import { usersSeed } from '../data/mockData'
import {
  createUserApi,
  deleteUserApi,
  getAdminPermissionsApi,
  getUsersApi,
  impersonateUserApi,
  updateUserApi,
} from '../../services/adminProApi'

function toTimestamp(value) {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function pickUserDate(row, keys) {
  for (const k of keys) {
    const v = row?.[k] ?? row?._raw?.[k]
    if (v) return v
  }
  return ''
}

function formatDateTime(value) {
  const ts = toTimestamp(value)
  if (!ts) return '—'
  return new Date(ts).toLocaleString('fr-FR')
}

function csvCell(value) {
  const v = String(value ?? '')
  return `"${v.replaceAll('"', '""')}"`
}

function getLandingByRole(role) {
  if (role === 'rh') return '/rh'
  if (role === 'admin') return '/admin-pro'
  return '/employee'
}

const ADMIN_SNAPSHOT_KEY = 'ws_admin_snapshot'

export default function UsersPage() {
  const { user, login } = useAuth()
  const [users, setUsers] = useState(usersSeed)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [total, setTotal] = useState(usersSeed.length)
  const [selectedIds, setSelectedIds] = useState([])
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [permissions, setPermissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [quickView, setQuickView] = useState(null)
  const [impersonating, setImpersonating] = useState(false)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('create')
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'employee',
    status: 'active',
    department: '',
    employeeType: '',
  })

  const openModal = (row, nextMode) => {
    if (row) {
      setSelected(row)
      setForm({
        name: row.name || '',
        email: row.email || '',
        role: row.role || 'employee',
        status: row.status || 'active',
        department: row._raw?.department || '',
        employeeType: row._raw?.employeeType || '',
      })
    } else {
      setSelected(null)
      setForm({
        name: '',
        email: '',
        role: 'employee',
        status: 'active',
        department: '',
        employeeType: '',
      })
    }
    setMode(nextMode)
    setOpen(true)
  }

  const deleteUser = async (row) => {
    if (!canDelete) return
    if (!window.confirm(`Delete ${row.name}?`)) return
    try {
      await deleteUserApi(row.id)
    } catch {
      /* fallback local */
    }
    await loadUsers(page, search)
  }

  const canCreate = useMemo(
    () => user?.role === 'admin' && (permissions.length === 0 || permissions.includes('users:create')),
    [permissions, user?.role],
  )
  const canEdit = useMemo(
    () => user?.role === 'admin' && (permissions.length === 0 || permissions.includes('users:update')),
    [permissions, user?.role],
  )
  const canDelete = useMemo(
    () => user?.role === 'admin' && (permissions.length === 0 || permissions.includes('users:delete')),
    [permissions, user?.role],
  )
  const canBulkUpdate = useMemo(
    () => user?.role === 'admin' && (permissions.length === 0 || permissions.includes('users:update')),
    [permissions, user?.role],
  )

  async function loadUsers(nextPage = 1, q = '') {
    setLoading(true)
    setError('')
    try {
      const data = await getUsersApi({ page: nextPage, limit, search: q })
      setUsers(data.rows)
      setTotal(Number(data.pagination?.total ?? data.total ?? data.rows.length))
      setSelectedIds([])
    } catch (e) {
      setUsers(usersSeed)
      setTotal(usersSeed.length)
      setSelectedIds([])
      setError(
        e?.response?.status === 404
          ? 'Endpoint /api/users non disponible pour le moment — affichage fallback.'
          : (e?.message || 'Impossible de charger les utilisateurs, fallback actif.'),
      )
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    const t = setTimeout(() => {
      loadUsers(page, search)
    }, 260)
    return () => clearTimeout(t)
  }, [page, search])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statusFilter])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const roleMatch = roleFilter === 'all' || String(u.role || '').toLowerCase() === roleFilter
      const statusMatch = statusFilter === 'all' || String(u.status || '').toLowerCase() === statusFilter
      return roleMatch && statusMatch
    })
  }, [users, roleFilter, statusFilter])

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers]
    arr.sort((a, b) => {
      if (sortKey === 'createdAt') {
        const av = toTimestamp(pickUserDate(a, ['createdAt', 'created_at', 'createdOn']))
        const bv = toTimestamp(pickUserDate(b, ['createdAt', 'created_at', 'createdOn']))
        const cmp = av - bv
        return sortDir === 'asc' ? cmp : -cmp
      }
      if (sortKey === 'lastLoginAt') {
        const av = toTimestamp(pickUserDate(a, ['lastLoginAt', 'lastLogin', 'lastSeenAt', 'updatedAt']))
        const bv = toTimestamp(pickUserDate(b, ['lastLoginAt', 'lastLogin', 'lastSeenAt', 'updatedAt']))
        const cmp = av - bv
        return sortDir === 'asc' ? cmp : -cmp
      }
      const av = String(a?.[sortKey] ?? '').toLowerCase()
      const bv = String(b?.[sortKey] ?? '').toLowerCase()
      const cmp = av.localeCompare(bv, 'fr', { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filteredUsers, sortDir, sortKey])

  const allSelectedOnPage =
    sortedUsers.length > 0 && sortedUsers.every((u) => selectedIds.includes(u.id))

  const selectedCount = selectedIds.length

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const pageStats = useMemo(() => {
    const active = filteredUsers.filter((u) => String(u.status || '').toLowerCase() === 'active').length
    const blocked = filteredUsers.filter((u) => String(u.status || '').toLowerCase() === 'blocked').length
    const rh = filteredUsers.filter((u) => String(u.role || '').toLowerCase() === 'rh').length
    const admins = filteredUsers.filter((u) => String(u.role || '').toLowerCase() === 'admin').length
    return { active, blocked, rh, admins }
  }, [filteredUsers])

  const submitForm = async (e) => {
    e.preventDefault()
    if (mode === 'create' && !canCreate) return
    if (mode === 'edit' && !canEdit) return
    setSaving(true)
    try {
      if (mode === 'create') {
        await createUserApi(form)
      } else if (mode === 'edit' && selected) {
        await updateUserApi(selected.id, form)
      }
      setOpen(false)
      await loadUsers(page, search)
    } catch (err) {
      setError(err?.message || 'Impossible de sauvegarder cet utilisateur.')
    } finally {
      setSaving(false)
    }
  }

  const toggleSortDir = () => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  const toggleRowSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleSelectAllOnPage = () => {
    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !sortedUsers.some((u) => u.id === id)))
      return
    }
    const union = new Set([...selectedIds, ...sortedUsers.map((u) => u.id)])
    setSelectedIds([...union])
  }

  const bulkDelete = async () => {
    if (!canDelete || selectedIds.length === 0) return
    if (!window.confirm(`Delete ${selectedIds.length} selected user(s)?`)) return
    setSaving(true)
    try {
      await Promise.allSettled(selectedIds.map((id) => deleteUserApi(id)))
      await loadUsers(page, search)
    } catch (e) {
      setError(e?.message || 'Bulk delete failed.')
    } finally {
      setSaving(false)
    }
  }

  const bulkSetStatus = async (status) => {
    if (!canBulkUpdate || selectedIds.length === 0) return
    setSaving(true)
    try {
      const targets = users.filter((u) => selectedIds.includes(u.id))
      await Promise.allSettled(
        targets.map((u) =>
          updateUserApi(u.id, {
            name: u.name,
            email: u.email,
            role: u.role,
            status,
            department: u._raw?.department || '',
            employeeType: u._raw?.employeeType || '',
          }),
        ),
      )
      await loadUsers(page, search)
    } catch (e) {
      setError(e?.message || 'Bulk status update failed.')
    } finally {
      setSaving(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const exportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login']
    const rows = sortedUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      formatDateTime(pickUserDate(u, ['createdAt', 'created_at', 'createdOn'])),
      formatDateTime(pickUserDate(u, ['lastLoginAt', 'lastLogin', 'lastSeenAt', 'updatedAt'])),
    ])
    const csv = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')
    a.href = url
    a.download = `users-export-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const runImpersonate = async () => {
    if (!quickView?.id) return
    if (!window.confirm(`Se connecter comme ${quickView.name || quickView.email || quickView.id} ?`)) return
    setImpersonating(true)
    setError('')
    try {
      const tokenBefore = localStorage.getItem('ws_token') || ''
      if (user?.role === 'admin' && tokenBefore) {
        localStorage.setItem(
          ADMIN_SNAPSHOT_KEY,
          JSON.stringify({
            token: tokenBefore,
            user,
            createdAt: new Date().toISOString(),
          }),
        )
      }
      const { token, user: nextUser } = await impersonateUserApi(quickView.id)
      login(nextUser, token)
      window.location.href = getLandingByRole(nextUser?.role)
    } catch (e) {
      setError(
        e?.response?.status === 404
          ? "Endpoint impersonation manquant côté backend. Implémente /api/auth/impersonate."
          : (e?.message || "Impossible d'exécuter l'impersonation."),
      )
    } finally {
      setImpersonating(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: '__select',
        label: (
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={allSelectedOnPage}
            onChange={toggleSelectAllOnPage}
          />
        ),
        render: (_, row) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.name}`}
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleRowSelection(row.id)}
          />
        ),
      },
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      {
        key: 'createdAt',
        label: 'Created at',
        render: (_, row) => formatDateTime(pickUserDate(row, ['createdAt', 'created_at', 'createdOn'])),
      },
      {
        key: 'lastLoginAt',
        label: 'Last login',
        render: (_, row) => formatDateTime(pickUserDate(row, ['lastLoginAt', 'lastLogin', 'lastSeenAt', 'updatedAt'])),
      },
      {
        key: 'role',
        label: 'Role',
        render: (value) => (
          <span className="rounded-lg bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
            {value}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => {
          const tones = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            blocked: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
          }
          return (
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${tones[value] || tones.pending}`}>
              {value}
            </span>
          )
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setQuickView(row)}>View</Button>
            {canEdit && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openModal(row, 'edit')}>Edit</Button>}
            {canDelete && <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteUser(row)}>Delete</Button>}
          </div>
        ),
      },
    ],
    [allSelectedOnPage, canDelete, canEdit, selectedIds, sortedUsers],
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <Card
        title="Users Management"
        subtitle="Search, view and manage platform users"
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total (global)</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Visible (page)</p>
            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{filteredUsers.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Active</p>
            <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{pageStats.active}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/40 dark:bg-rose-900/20">
            <p className="text-xs text-rose-700 dark:text-rose-300">Blocked</p>
            <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">{pageStats.blocked}</p>
          </div>
          <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-3 dark:border-primary-900/40 dark:bg-primary-900/20">
            <p className="text-xs text-primary-700 dark:text-primary-300">RH / Admin</p>
            <p className="mt-1 text-xl font-bold text-primary-700 dark:text-primary-300">
              {pageStats.rh} / {pageStats.admins}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                loadUsers(1, search)
              }
            }}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Role: All</option>
            <option value="employee">Employee</option>
            <option value="rh">RH</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
          {canCreate && <Button onClick={() => openModal(null, 'create')}>+ Add User</Button>}
          <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => loadUsers(page, search)}>
            Refresh
          </Button>
          <Button variant="ghost" className="px-3 py-2 text-xs" onClick={clearFilters}>
            Clear filters
          </Button>
          <Button variant="secondary" className="px-3 py-2 text-xs" onClick={exportCsv} disabled={loading || sortedUsers.length === 0}>
            Export CSV
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="name">Sort: Name</option>
              <option value="email">Sort: Email</option>
              <option value="role">Sort: Role</option>
              <option value="status">Sort: Status</option>
              <option value="createdAt">Sort: Created at</option>
              <option value="lastLoginAt">Sort: Last login</option>
              <option value="id">Sort: ID</option>
            </select>
            <Button variant="secondary" className="px-3 py-2 text-xs" onClick={toggleSortDir}>
              {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            {error}
          </div>
        )}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs dark:border-primary-900/40 dark:bg-primary-900/20">
            <span className="font-semibold text-primary-700 dark:text-primary-300">
              {selectedCount} selected
            </span>
            {canBulkUpdate && (
              <>
                <Button variant="secondary" className="px-2.5 py-1.5 text-xs" disabled={saving} onClick={() => bulkSetStatus('active')}>
                  Set Active
                </Button>
                <Button variant="secondary" className="px-2.5 py-1.5 text-xs" disabled={saving} onClick={() => bulkSetStatus('blocked')}>
                  Set Blocked
                </Button>
              </>
            )}
            {canDelete && (
              <Button variant="danger" className="px-2.5 py-1.5 text-xs" disabled={saving} onClick={bulkDelete}>
                Bulk Delete
              </Button>
            )}
          </div>
        )}
        {loading ? <LoadingSkeletonTable /> : <DataTable columns={columns} rows={sortedUsers} />}
        {!loading && sortedUsers.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
            Aucun utilisateur ne correspond aux filtres actuels.
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Page {page} / {totalPages} · {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <motion.aside
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 dark:border-slate-800 dark:bg-slate-950/70"
      >
        {quickView ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick details</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{quickView.name || 'Utilisateur'}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{quickView.email || '—'}</p>
              </div>
              <Button variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setQuickView(null)}>
                Close
              </Button>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">ID</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quickView.id}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quickView.role || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quickView.status || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{quickView._raw?.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Created at</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(pickUserDate(quickView, ['createdAt', 'created_at', 'createdOn']))}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Last login</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                  {formatDateTime(pickUserDate(quickView, ['lastLoginAt', 'lastLogin', 'lastSeenAt', 'updatedAt']))}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <Button
                variant="primary"
                className="w-full"
                disabled={impersonating || String(quickView.role || '').toLowerCase() === 'admin'}
                onClick={runImpersonate}
                title={String(quickView.role || '').toLowerCase() === 'admin' ? 'Impersonation admin désactivée' : 'Se connecter en tant que cet utilisateur'}
              >
                {impersonating ? 'Impersonating...' : 'Impersonate user'}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            Sélectionne un utilisateur avec <strong>View</strong> pour voir ses détails ici.
          </div>
        )}
      </motion.aside>

      <Modal
        open={open}
        onClose={() => {
          if (saving) return
          setOpen(false)
        }}
        title={mode === 'edit' ? 'Edit User' : 'Create User'}
      >
        {(mode === 'edit' || mode === 'create') && (
          <form className="space-y-3" onSubmit={submitForm}>
            <label className="block text-xs text-slate-300">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
              />
            </label>
            <label className="block text-xs text-slate-300">
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-300">
                Role
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                >
                  <option value="employee">employee</option>
                  <option value="rh">rh</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="block text-xs text-slate-300">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                >
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="blocked">blocked</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-300">
                Department
                <input
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                />
              </label>
              <label className="block text-xs text-slate-300">
                Employee type
                <input
                  value={form.employeeType}
                  onChange={(e) => setForm((p) => ({ ...p, employeeType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-primary-400"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  )
}
