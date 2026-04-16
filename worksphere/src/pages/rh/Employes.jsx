import { useState, useEffect } from 'react'
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../../services/api'
import { generateTemporaryPassword, sendEmployeeWelcomeEmail } from '../../services/employeeWelcome'
import { SectionTitle, Pill, Btn, Table, Modal, Field, inputStyle, Grid, StatCard } from '../../components/shared/UI'

const MOCK = [
  { _id: '1', name: 'Ali Ben Salah', email: 'ali@company.com', department: 'Engineering', role: 'employee', employeeType: 'Developer', status: 'active', joinDate: '2023-03-15' },
  { _id: '2', name: 'Sara Mzali', email: 'sara@company.com', department: 'Marketing', role: 'employee', employeeType: 'Marketing', status: 'active', joinDate: '2022-09-01' },
  { _id: '3', name: 'Karim Jlassi', email: 'karim@company.com', department: 'Commercial', role: 'employee', employeeType: 'Commercial', status: 'leave', joinDate: '2021-06-10' },
  { _id: '4', name: 'Nour Hammami', email: 'nour@company.com', department: 'HR', role: 'rh', employeeType: 'HR', status: 'sick', joinDate: '2020-01-20' },
  { _id: '5', name: 'Asma Cherni', email: 'asma@company.com', department: 'Engineering', role: 'employee', employeeType: 'Developer', status: 'active', joinDate: '2023-09-01' },
]

const statusLabel = { active: { label: 'Active', type: 'green' }, leave: { label: 'On Leave', type: 'amber' }, sick: { label: 'Sick', type: 'red' } }
/** Default form for new employees — status is always `active` (no Statut field on add). */
const EMPTY = { name: '', email: '', department: '', employeeType: 'Developer', role: 'employee', status: 'active', joinDate: '' }
const TYPES = ['Developer', 'Sales', 'Marketing', 'Manager', 'HR', 'Designer', 'Accountant']

export default function Employes() {
  const [employees, setEmployees] = useState(MOCK)
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    const load = () => getEmployees().then((r) => setEmployees(r.data)).catch(() => {})
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
      const temporaryPassword = generateTemporaryPassword(8)
      const payload = { ...form, status: 'active', password: temporaryPassword }
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

      const tempForEmail = created?.temporaryPassword || temporaryPassword
      const loginUrl = `${window.location.origin}/login`
      try {
        const mail = await sendEmployeeWelcomeEmail({
          email: form.email.trim(),
          name: form.name.trim(),
          temporaryPassword: tempForEmail,
          loginUrl,
        })
        if (!mail.emailSent) {
          alert(
            `Employé créé.\n\nL’e-mail n’a pas été envoyé : ${mail.message || 'erreur inconnue'}\n\nMot de passe temporaire (à communiquer) :\n${tempForEmail}`,
          )
        }
      } catch (e) {
        alert(
          `Employé créé.\n\nErreur lors de l’envoi de l’e-mail : ${e.message || e}\n\nMot de passe temporaire (à communiquer) :\n${tempForEmail}`,
        )
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
        <StatCard label="Total Employees" value={employees.length} color="var(--cyan2)" />
        <StatCard label="Active" value={counts.active} color="var(--green)" />
        <StatCard label="On Leave" value={counts.leave} color="var(--amber)" />
        <StatCard label="Sick" value={counts.sick} color="var(--red)" />
      </Grid>

      <SectionTitle action={<Btn onClick={openAdd}>+ Add</Btn>}>
        Employee List
      </SectionTitle>

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

      <Table
        columns={[
          { key: 'name', label: 'Name', width: '1.5fr', render: (v, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--cyan-dim)', border: '1px solid var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--cyan2)', flexShrink: 0 }}>
                {v.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
