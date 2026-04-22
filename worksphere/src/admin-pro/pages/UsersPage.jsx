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
  updateUserApi,
} from '../../services/adminProApi'

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState(usersSeed)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(8)
  const [total, setTotal] = useState(usersSeed.length)
  const [selectedIds, setSelectedIds] = useState([])
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [permissions, setPermissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('view')
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
  }, [search])

  const filteredUsers = useMemo(() => {
    return users
  }, [users, search])

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers]
    arr.sort((a, b) => {
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
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => openModal(row, 'view')}>View</Button>
            {canEdit && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openModal(row, 'edit')}>Edit</Button>}
            {canDelete && <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => deleteUser(row)}>Delete</Button>}
          </div>
        ),
      },
    ],
    [allSelectedOnPage, canDelete, canEdit, selectedIds, sortedUsers],
  )

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
      <Card
        title="Users Management"
        subtitle="Search, view and manage platform users"
        className="space-y-4"
      >
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
          {canCreate && <Button onClick={() => openModal(null, 'create')}>+ Add User</Button>}
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

      <Modal
        open={open}
        onClose={() => {
          if (saving) return
          setOpen(false)
        }}
        title={mode === 'edit' ? 'Edit User' : mode === 'create' ? 'Create User' : 'User Details'}
      >
        {selected && (
          <div className="space-y-3 text-sm">
            {mode === 'view' ? (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-slate-200">
                <p><strong>ID:</strong> {selected.id}</p>
                <p><strong>Name:</strong> {selected.name}</p>
                <p><strong>Email:</strong> {selected.email}</p>
                <p><strong>Role:</strong> {selected.role}</p>
                <p><strong>Status:</strong> {selected.status}</p>
              </div>
            ) : null}
          </div>
        )}
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
