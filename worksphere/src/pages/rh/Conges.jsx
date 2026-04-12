import { useState, useEffect } from 'react'
import { getConges, updateConge } from '../../services/api'
import { SectionTitle, Pill, Btn, Table, StatCard, Grid } from '../../components/shared/UI'

export default function Conges() {
  const [conges, setConges] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { getConges().then(r => setConges(r.data)).catch(() => {}) }, [])

  const filtered = filter === 'all' ? conges : conges.filter(c => c.status === filter)

  const updateStatus = async (id, status) => {
    try {
      await updateConge(id, { status })
      setConges(prev => prev.map(c => c._id === id ? { ...c, status } : c))
    } catch (err) {
      const msg = err.response?.data?.message || 'Error while updating'
      alert(msg)
    }
  }

  const counts = {
    pending: conges.filter(c => c.status === 'pending').length,
    approved: conges.filter(c => c.status === 'approved').length,
    rejected: conges.filter(c => c.status === 'rejected').length,
    totalDays: conges.filter(c => c.status === 'approved').reduce((s, c) => s + c.days, 0),
  }

  return (
    <div>
      <Grid cols={4} gap={12}>
        <StatCard label="Pending" value={counts.pending} color="var(--amber)" />
        <StatCard label="Approved" value={counts.approved} color="var(--green)" />
        <StatCard label="Rejected" value={counts.rejected} color="var(--red)" />
        <StatCard label="Approved Days" value={counts.totalDays} color="var(--blue)" />
      </Grid>

      <SectionTitle>Leave Requests</SectionTitle>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer',
            background: filter === s ? 'var(--cyan)' : 'var(--card)',
            color: filter === s ? '#fff' : 'var(--text2)',
            border: `1px solid ${filter === s ? 'var(--cyan)' : 'var(--border)'}`,
          }}>
            {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : s === 'approved' ? 'Approved' : 'Rejected'}
            {s === 'pending' && counts.pending > 0 && (
              <span style={{ marginLeft: '6px', background: 'var(--amber)', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '10px' }}>{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      <Table
        columns={[
          { key: 'employeeName', label: 'Employee', width: '1.2fr' },
          { key: 'type', label: 'Type', render: v => <Pill type="blue">{v}</Pill> },
          { key: 'startDate', label: 'Start', render: v => new Date(v).toLocaleDateString('en-US') },
          { key: 'endDate', label: 'End', render: v => new Date(v).toLocaleDateString('en-US') },
          { key: 'days', label: 'Days', width: '70px', render: v => `${v}d` },
          { key: 'reason', label: 'Reason', width: '1.5fr' },
          { key: 'status', label: 'Statut', width: '100px', render: v => (
            <Pill type={v === 'approved' ? 'green' : v === 'rejected' ? 'red' : 'amber'}>
              {v === 'approved' ? 'Approved' : v === 'rejected' ? 'Rejected' : 'Pending'}
            </Pill>
          )},
          { key: '_id', label: 'Actions', width: '140px', render: (id, row) => row.status === 'pending' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Btn small onClick={() => updateStatus(id, 'approved')}>✓</Btn>
              <Btn small variant="danger" onClick={() => updateStatus(id, 'rejected')}>✕</Btn>
            </div>
          ) : <span style={{ fontSize: '12px', color: 'var(--text3)' }}>—</span> },
        ]}
        rows={filtered}
      />
    </div>
  )
}
