import { useState, useEffect } from 'react'
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../../services/api'
import { sendEmployeeWelcomeEmail } from '../../services/employeeWelcome'
import { SectionTitle, Pill, Btn, Table, Modal, Field, inputStyle, Grid, StatCard } from '../../components/shared/UI'

const statusLabel = { active: { label: 'Active', type: 'green' }, leave: { label: 'On Leave', type: 'amber' }, sick: { label: 'Sick', type: 'red' } }
/** Default form for new employees — status is always `active` (no Statut field on add). */
const EMPTY = { name: '', email: '', department: '', employeeType: 'Developer', role: 'employee', status: 'active', joinDate: '' }
const TYPES = ['Developer', 'Sales', 'Marketing', 'Manager', 'HR', 'Designer', 'Accountant']

export default function Employes() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const load = () => {
      setFetchError(null)
      setLoading(true)
      return getEmployees()
        .then((r) => setEmployees(Array.isArray(r.data) ? r.data : []))
        .catch((err) => {
          const msg =
            err?.response?.data?.message ||
            (err?.message?.includes('Network') || !err?.response
              ? 'API injoignable ou CORS : sur Nest, autorisez l’origine Netlify (ex. https://votre-site.netlify.app) dans enableCors.'
              : err.message || 'Impossible de charger les employés.')
          setFetchError(msg)
          setEmployees([])
        })
        .finally(() => setLoading(false))
    }
    load()
    const onRefresh = () => load()
    window.addEventListener('ws-refresh-employees', onRefresh)
    return () => window.removeEventListener('ws-refresh-employees', onRefresh)
  }, [])

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal('edit') }
  const openEdit = (emp) => { setForm({ ...emp }); setEditId(emp._id); setModal('edit') }

  const handleSave = async () => {
    if (editId) {
      await updateEmployee(editId, form).catch(() => {})
      setEmployees(prev => prev.map(e => e._id === editId ? { ...e, ...form } : e))
    } else {
      const payload = { ...form, status: 'active' }
      let created
      try {
        const res = await addEmployee(payload)
        created = res.data
      } catch (err) {
        const msg = err.response?.data?.message || 'Error while creating employee'
        alert(msg)
        return
      }
      const newEmp = {
        ...form,
        status: 'active',
        _id: created?._id || created?.id || Date.now().toString(),
        ...created,
      }
      setEmployees((prev) => [...prev, newEmp])

      const apiTemp =
        created?.temporaryPassword ||
        created?.tempPassword ||
        created?.plainPassword ||
        created?.generatedPassword ||
        created?.initialPassword
      const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(form.email.trim())}`
      try {
        const mail = await sendEmployeeWelcomeEmail({
          email: form.email.trim(),
          name: form.name.trim(),
          ...(apiTemp ? { temporaryPassword: String(apiTemp) } : {}),
          loginUrl,
        })
        if (!mail.emailSent) {
          const extra = apiTemp
            ? `\n\nMot de passe temporaire (à communiquer) :\n${apiTemp}`
            : '\n\nIndiquez au collaborateur d’ouvrir la page de connexion et d’utiliser « Mot de passe oublié » avec son e-mail.'
          alert(`Employé créé.\n\nL’e-mail n’a pas été envoyé : ${mail.message || 'erreur inconnue'}${extra}`)
        }
      } catch (e) {
        const extra = apiTemp
          ? `\n\nMot de passe temporaire (à communiquer) :\n${apiTemp}`
          : '\n\nIndiquez au collaborateur d’utiliser « Mot de passe oublié » sur la page de connexion.'
        alert(`Employé créé.\n\nErreur lors de l’envoi de l’e-mail : ${e.message || e}${extra}`)
      }
    }
      setModal(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return
    await deleteEmployee(id).catch(() => {})
    setEmployees(prev => prev.filter(e => e._id !== id))
  }

  const counts = { active: employees.filter(e => e.status === 'active').length, leave: employees.filter(e => e.status === 'leave').length, sick: employees.filter(e => e.status === 'sick').length }

  return (
    <div>
      <Grid cols={4} gap={12}>
        <StatCard label="Total Employees" value={loading ? '…' : employees.length} color="var(--cyan2)" />
        <StatCard label="Active" value={loading ? '…' : counts.active} color="var(--green)" />
        <StatCard label="On Leave" value={loading ? '…' : counts.leave} color="var(--amber)" />
        <StatCard label="Sick" value={loading ? '…' : counts.sick} color="var(--red)" />
      </Grid>

      <SectionTitle action={<Btn onClick={openAdd}>+ Add</Btn>}>
        Employee List
      </SectionTitle>

      {fetchError && (
        <div
          style={{
            fontSize: '13px',
            color: 'var(--red)',
            marginBottom: '14px',
            padding: '12px 14px',
            background: 'var(--red-bg)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(255,82,82,0.25)',
            lineHeight: 1.5,
          }}
        >
          {fetchError}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input
          style={{ ...inputStyle, flex: 1, maxWidth: '280px' }}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {['all', 'active', 'leave', 'sick'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer',
            background: filterStatus === s ? 'var(--cyan)' : 'var(--card)',
            color: filterStatus === s ? '#fff' : 'var(--text2)',
            border: `1px solid ${filterStatus === s ? 'var(--cyan)' : 'var(--border)'}`,
          }}>
            {s === 'all' ? 'All' : s === 'active' ? 'Active' : s === 'leave' ? 'On Leave' : 'Sick'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text3)', padding: '8px 0' }}>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          Chargement des employés…
        </div>
      ) : (
      <Table
        columns={[
          { key: 'name', label: 'Name', width: '1.5fr', render: (v, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--cyan-dim)', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--cyan2)', flexShrink: 0 }}>
                {(v || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{v}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.email}</div>
              </div>
            </div>
          )},
          { key: 'department', label: 'Department' },
          { key: 'employeeType', label: 'Type', render: v => <Pill type="blue">{v}</Pill> },
          { key: 'status', label: 'Status', width: '100px', render: v => <Pill type={statusLabel[v]?.type || 'default'}>{statusLabel[v]?.label || v}</Pill> },
          { key: '_id', label: 'Actions', width: '120px', render: (_, row) => (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Btn small variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
              <Btn small variant="danger" onClick={() => handleDelete(row._id)}>✕</Btn>
            </div>
          )},
        ]}
        rows={filtered}
      />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={editId ? 'Edit Employee' : 'Add Employee'}>
        <Field label="Full Name"><input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="First Last" /></Field>
        <Field label="Email"><input style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" /></Field>
        <Field label="Department"><input style={inputStyle} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Ex: Engineering" /></Field>
        <Field label="Type">
          <select style={inputStyle} value={form.employeeType} onChange={e => setForm(p => ({ ...p, employeeType: e.target.value }))}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="System Role">
          <select style={inputStyle} value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
            <option value="employee">Employee</option>
            <option value="rh">HR Manager</option>
          </select>
        </Field>
        {editId != null && (
          <Field label="Status">
            <select style={inputStyle} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="leave">On Leave</option>
              <option value="sick">Sick</option>
            </select>
          </Field>
        )}
        <Field label="Hire Date"><input type="date" style={inputStyle} value={form.joinDate} onChange={e => setForm(p => ({ ...p, joinDate: e.target.value }))} /></Field>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn onClick={handleSave}>{editId ? 'Save' : 'Add Employee'}</Btn>
        </div>
      </Modal>
    </div>
  )
}
