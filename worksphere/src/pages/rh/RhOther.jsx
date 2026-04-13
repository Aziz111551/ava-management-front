import { useState, useEffect, useCallback } from 'react'
import { getReclamations, updateReclamation, getMaladies, addEmployee } from '../../services/api'
import { fetchEvaluations } from '../../services/evaluationsWebhook'
import {
  filterUnresolvedCandidats,
  setCandidatDecision,
  candidateToEmployeePayload,
} from '../../services/candidatsPhase1'
import { SectionTitle, Pill, Btn, Table, StatCard, Grid, Modal, Field, inputStyle } from '../../components/shared/UI'

// ── RECLAMATIONS ──────────────────────────────────────────────
export function Reclamations() {
  const [recs, setRecs] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { getReclamations().then(r => setRecs(r.data)).catch(() => {}) }, [])

  const priorityType = { urgent: 'red', high: 'amber', medium: 'blue', low: 'default' }
  const statusLabel = { open: { l: 'Open', t: 'amber' }, in_progress: { l: 'In Progress', t: 'blue' }, resolved: { l: 'Resolved', t: 'green' } }

  const update = async (id, status) => {
    try {
      await updateReclamation(id, { status })
      setRecs(prev => prev.map(r => r._id === id ? { ...r, status } : r))
      setSelected(null)
    } catch (err) {
      const msg = err.response?.data?.message || 'Error while updating'
      alert(msg)
    }
  }

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Open" value={recs.filter(r => r.status === 'open').length} color="var(--amber)" />
        <StatCard label="In Progress" value={recs.filter(r => r.status === 'in_progress').length} color="var(--blue)" />
        <StatCard label="Resolved" value={recs.filter(r => r.status === 'resolved').length} color="var(--green)" />
      </Grid>
      <SectionTitle>Complaints & Issues</SectionTitle>
      <Table
        columns={[
          { key: 'employeeName', label: 'Employee' },
          { key: 'subject', label: 'Subject', width: '1.5fr' },
          { key: 'category', label: 'Category', render: v => <Pill type="blue">{v}</Pill> },
          { key: 'priority', label: 'Priority', render: v => <Pill type={priorityType[v] || 'default'}>{v}</Pill> },
          { key: 'status', label: 'Status', render: v => <Pill type={statusLabel[v]?.t || 'default'}>{statusLabel[v]?.l || v}</Pill> },
          { key: 'date', label: 'Date', render: v => new Date(v).toLocaleDateString('en-US') },
          { key: '_id', label: '', width: '80px', render: (id, row) => <Btn small variant="ghost" onClick={() => setSelected(row)}>View</Btn> },
        ]}
        rows={recs}
      />
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Complaint detail">
        {selected && (
          <>
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>{selected.subject}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{selected.description}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Employee: <span style={{ color: 'var(--text)' }}>{selected.employeeName}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Category: <span style={{ color: 'var(--text)' }}>{selected.category}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn small variant="ghost" onClick={() => update(selected._id, 'in_progress')}>Take charge</Btn>
              <Btn small onClick={() => update(selected._id, 'resolved')}>Mark resolved</Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ── CANDIDATS ─────────────────────────────────────────────────
export function Candidats() {
  const [cands, setCands] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  const refreshList = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const rows = await fetchEvaluations()
      setCands(filterUnresolvedCandidats(rows))
    } catch (e) {
      setError(e?.message || 'Impossible de charger les évaluations')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEvaluations()
      .then((rows) => {
        if (!cancelled) setCands(filterUnresolvedCandidats(rows))
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Impossible de charger les évaluations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const handleAccept = async (row) => {
    const email = (row.email || '').trim()
    if (!email) {
      alert('Adresse e-mail requise pour ajouter l’employé à la liste.')
      return
    }
    setProcessingId(row._id)
    try {
      const payload = candidateToEmployeePayload(row)
      await addEmployee(payload)
      setCandidatDecision(row._id, 'accepted')
      setCands((prev) => prev.filter((c) => c._id !== row._id))
      window.dispatchEvent(new Event('ws-refresh-employees'))
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur lors de la création de l’employé'
      alert(msg)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = (row) => {
    if (!window.confirm('Refuser ce candidat ? Il sera retiré de cette liste (décision enregistrée sur cet appareil).')) return
    setCandidatDecision(row._id, 'declined')
    setCands((prev) => prev.filter((c) => c._id !== row._id))
  }

  const avgPct =
    cands.length > 0
      ? Math.round(cands.reduce((s, c) => s + c.score, 0) / cands.length) + '%'
      : '—'

  const openPositions = [...new Set(cands.map((c) => c.position))].length

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Accepted Candidates" value={loading ? '…' : cands.length} color="var(--cyan2)" />
        <StatCard label="Average Score" value={loading ? '…' : avgPct} color="var(--green)" />
        <StatCard label="Open Positions" value={loading ? '…' : openPositions} color="var(--blue)" />
      </Grid>
      <SectionTitle
        action={
          <Btn
            small
            variant="ghost"
            disabled={loading || refreshing}
            onClick={refreshList}
            title="Actualiser les données (webhook)"
            style={{ gap: '8px' }}
          >
            <i
              className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}
              aria-hidden
            />
            Refresh
          </Btn>
        }
      >
        Accepted Candidates — Phase 1
      </SectionTitle>
      {error && (
        <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>
      )}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text3)' }}>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          Chargement des candidats…
        </div>
      ) : (
        <Table
          columns={[
            { key: 'name', label: 'Candidate', render: (v, row) => (
              <div>
                <div style={{ fontWeight: '500', color: 'var(--text)', fontSize: '13px' }}>{v}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.email || '—'}</div>
              </div>
            )},
            { key: 'position', label: 'Position', render: v => <Pill type="blue">{v}</Pill> },
            { key: 'score', label: 'Score', render: v => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: v >= 85 ? 'var(--green)' : v >= 70 ? 'var(--amber)' : 'var(--red)', borderRadius: '2px' }} />
                </div>
                <span style={{ fontSize: '12px', color: v >= 85 ? 'var(--green)' : 'var(--amber)' }}>{v}%</span>
              </div>
            )},
            { key: 'date', label: 'Date', render: v => {
              const d = new Date(v)
              return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US')
            } },
            { key: 'notes', label: 'Notes', width: '1.5fr', render: v => <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{v}</span> },
            { key: 'cv', label: 'CV', width: '88px', render: (_, row) => {
              const href = row.cv && row.cv !== '#' ? row.cv : null
              const cvBtn = (
                <>
                  <i className="fa-regular fa-file-pdf" aria-hidden />
                  PDF
                </>
              )
              return href ? (
                <Btn small variant="ghost" onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}>
                  {cvBtn}
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.85 }} aria-hidden />
                </Btn>
              ) : (
                <Btn small variant="ghost" disabled>{cvBtn}</Btn>
              )
            } },
            {
              key: '_actions',
              label: 'Actions',
              width: '148px',
              render: (_, row) => {
                const busy = processingId === row._id
                return (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Btn
                      small
                      variant="primary"
                      disabled={busy}
                      title="Accepter — ajoute l’employé à la liste"
                      onClick={() => handleAccept(row)}
                    >
                      {busy ? (
                        <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                      ) : (
                        <i className="fa-solid fa-check" aria-hidden />
                      )}
                      <span>Accept</span>
                    </Btn>
                    <Btn
                      small
                      variant="danger"
                      disabled={busy}
                      title="Refuser — retirer de la phase 1"
                      onClick={() => handleDecline(row)}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden />
                      <span>Decline</span>
                    </Btn>
                  </div>
                )
              },
            },
          ]}
          rows={cands}
        />
      )}
    </div>
  )
}

// ── MALADIES ──────────────────────────────────────────────────
export function Maladies() {
  const [maladies, setMaladies] = useState([])
  useEffect(() => { getMaladies().then(r => setMaladies(r.data)).catch(() => {}) }, [])

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Active" value={maladies.filter(m => m.status === 'active').length} color="var(--red)" />
        <StatCard label="Resolved" value={maladies.filter(m => m.status === 'resolved').length} color="var(--green)" />
        <StatCard label="Total Days" value={maladies.reduce((s, m) => s + m.days, 0)} color="var(--amber)" />
      </Grid>
      <SectionTitle>Sick Leave Records</SectionTitle>
      <Table
        columns={[
          { key: 'employeeName', label: 'Employee' },
          { key: 'startDate', label: 'Start', render: v => new Date(v).toLocaleDateString('en-US') },
          { key: 'endDate', label: 'End', render: v => new Date(v).toLocaleDateString('en-US') },
          { key: 'days', label: 'Duration', width: '80px', render: v => `${v} days` },
          { key: 'doctor', label: 'Doctor' },
          { key: 'certificate', label: 'Certificate', width: '100px', render: v => <Pill type={v ? 'green' : 'red'}>{v ? 'Received' : 'Missing'}</Pill> },
          { key: 'status', label: 'Status', render: v => <Pill type={v === 'active' ? 'amber' : 'green'}>{v === 'active' ? 'In Progress' : 'Done'}</Pill> },
        ]}
        rows={maladies}
      />
    </div>
  )
}
