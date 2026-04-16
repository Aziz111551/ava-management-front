import { useState, useEffect, useCallback, useMemo } from 'react'
import { getReclamations, updateReclamation, getMaladies } from '../../services/api'
import { fetchEvaluations } from '../../services/evaluationsWebhook'
import { filterNotDeclined, setCandidatDecision } from '../../services/candidatsPhase1'
import {
  getPhase1Rows,
  getPhase2Rows,
  TECH_AUTO_PASS_MIN,
  setPipelineStage,
  setTechPassedWithSnapshot,
  markPhysicalSent,
  getStageFor,
} from '../../services/candidatPipeline'
import { fetchRemoteTechPipeline } from '../../services/pipelineRemote'
import { issueTechnicalTestInvite } from '../../services/techTestInvite'
import { sendPhase2PhysicalInvite, defaultMeetingDatetimeLocal } from '../../services/phase2PhysicalInvite'
import { SectionTitle, Pill, Btn, Table, StatCard, Grid, Modal, Field, inputStyle } from '../../components/shared/UI'

function useRemotePipelineLookup() {
  const [remoteLookup, setRemoteLookup] = useState(() => ({ byId: {}, byEmail: {} }))
  const refreshRemote = useCallback(async () => {
    const r = await fetchRemoteTechPipeline()
    setRemoteLookup(r)
  }, [])
  useEffect(() => {
    refreshRemote()
    const id = window.setInterval(refreshRemote, 45000)
    return () => clearInterval(id)
  }, [refreshRemote])
  return { remoteLookup, refreshRemote }
}

const techScoreColumn = {
  key: '_techTestScore',
  label: 'Test technique',
  width: '120px',
  render: (_, row) => {
    const t = row._techTestScore
    if (t == null || !Number.isFinite(Number(t))) {
      return <span style={{ fontSize: '12px', color: 'var(--text3)' }}>—</span>
    }
    const n = Math.round(Number(t))
    return (
      <span
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: n > TECH_AUTO_PASS_MIN ? 'var(--green)' : 'var(--cyan)',
        }}
      >
        {n}/100
      </span>
    )
  },
}

function insertColumnAfter(columns, afterKey, col) {
  const i = columns.findIndex((c) => c.key === afterKey)
  if (i === -1) return [...columns, col]
  return [...columns.slice(0, i + 1), col, ...columns.slice(i + 1)]
}

const candidateColumns = (opts) => {
  const { onPdf } = opts
  return [
    {
      key: 'name',
      label: 'Candidat',
      render: (v, row) => (
        <div>
          <div style={{ fontWeight: '500', color: 'var(--text)', fontSize: '13px' }}>{v}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.email || '—'}</div>
        </div>
      ),
    },
    { key: 'position', label: 'Poste', render: (v) => <Pill type="blue">{v}</Pill> },
    {
      key: 'score',
      label: 'Score',
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '60px',
              height: '4px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, v)}%`,
                height: '100%',
                background: v >= 85 ? 'var(--green)' : v >= 70 ? 'var(--amber)' : 'var(--red)',
                borderRadius: '2px',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: v >= 85 ? 'var(--green)' : 'var(--amber)' }}>{v}%</span>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (v) => {
        const d = new Date(v)
        return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('fr-FR')
      },
    },
    {
      key: 'notes',
      label: 'Notes',
      width: '1.2fr',
      render: (v) => <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{v}</span>,
    },
    {
      key: 'cv',
      label: 'CV',
      width: '72px',
      render: (_, row) => {
        const href = row.cv && row.cv !== '#' ? row.cv : null
        const cvBtn = (
          <>
            <i className="fa-regular fa-file-pdf" aria-hidden />
            PDF
          </>
        )
        return href ? (
          <Btn small variant="ghost" onClick={() => onPdf(href)}>
            {cvBtn}
          </Btn>
        ) : (
          <Btn small variant="ghost" disabled>
            {cvBtn}
          </Btn>
        )
      },
    },
  ]
}

// ── RECLAMATIONS ──────────────────────────────────────────────
export function Reclamations() {
  const [recs, setRecs] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getReclamations()
      .then((r) => setRecs(r.data))
      .catch(() => {})
  }, [])

  const priorityType = { urgent: 'red', high: 'amber', medium: 'blue', low: 'default' }
  const statusLabel = {
    open: { l: 'Open', t: 'amber' },
    in_progress: { l: 'In Progress', t: 'blue' },
    resolved: { l: 'Resolved', t: 'green' },
  }

  const update = async (id, status) => {
    try {
      await updateReclamation(id, { status })
      setRecs((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)))
      setSelected(null)
    } catch (err) {
      const msg = err.response?.data?.message || 'Error while updating'
      alert(msg)
    }
  }

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Open" value={recs.filter((r) => r.status === 'open').length} color="var(--amber)" />
        <StatCard label="In Progress" value={recs.filter((r) => r.status === 'in_progress').length} color="var(--blue)" />
        <StatCard label="Resolved" value={recs.filter((r) => r.status === 'resolved').length} color="var(--green)" />
      </Grid>
      <SectionTitle>Complaints & Issues</SectionTitle>
      <Table
        columns={[
          { key: 'employeeName', label: 'Employee' },
          { key: 'subject', label: 'Subject', width: '1.5fr' },
          { key: 'category', label: 'Category', render: (v) => <Pill type="blue">{v}</Pill> },
          { key: 'priority', label: 'Priority', render: (v) => <Pill type={priorityType[v] || 'default'}>{v}</Pill> },
          {
            key: 'status',
            label: 'Status',
            render: (v) => <Pill type={statusLabel[v]?.t || 'default'}>{statusLabel[v]?.l || v}</Pill>,
          },
          { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString('en-US') },
          {
            key: '_id',
            label: '',
            width: '80px',
            render: (id, row) => (
              <Btn small variant="ghost" onClick={() => setSelected(row)}>
                View
              </Btn>
            ),
          },
        ]}
        rows={recs}
      />
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Complaint detail">
        {selected && (
          <>
            <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>
                {selected.subject}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{selected.description}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                Employee: <span style={{ color: 'var(--text)' }}>{selected.employeeName}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                Category: <span style={{ color: 'var(--text)' }}>{selected.category}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn small variant="ghost" onClick={() => update(selected._id, 'in_progress')}>
                Take charge
              </Btn>
              <Btn small onClick={() => update(selected._id, 'resolved')}>
                Mark resolved
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ── CANDIDATS ─────────────────────────────────────────────────
export function Candidats() {
  const { remoteLookup, refreshRemote } = useRemotePipelineLookup()
  const [cands, setCands] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [pipelineTick, setPipelineTick] = useState(0)

  const phase1Rows = useMemo(
    () => getPhase1Rows(cands, remoteLookup),
    [cands, pipelineTick, remoteLookup],
  )

  const refreshList = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const rows = await fetchEvaluations()
      setCands(filterNotDeclined(rows))
      await refreshRemote()
    } catch (e) {
      setError(e?.message || 'Impossible de charger les évaluations')
    } finally {
      setRefreshing(false)
    }
  }, [refreshRemote])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEvaluations()
      .then((rows) => {
        if (!cancelled) setCands(filterNotDeclined(rows))
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Impossible de charger les évaluations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openPdf = (href) => window.open(href, '_blank', 'noopener,noreferrer')

  const handleSendTechEmail = async (row) => {
    const email = (row.email || '').trim()
    if (!email) {
      alert('Adresse e-mail requise.')
      return
    }
    setProcessingId(row._id)
    try {
      const inv = await issueTechnicalTestInvite({
        email,
        name: row.name?.trim() || 'Candidat',
        candidatId: row._id,
      })
      setPipelineStage(row._id, 'tech_sent')
      setPipelineTick((t) => t + 1)
      let msg = inv.emailSent
        ? inv.message || `E-mail test technique envoyé à ${email}.`
        : `${inv.message ? `${inv.message}\n\n` : ''}Lien :\n${inv.inviteUrl}`
      try {
        await navigator.clipboard.writeText(inv.inviteUrl)
        msg += '\n\n(Lien copié dans le presse-papiers.)'
      } catch {
        /* ignore */
      }
      alert(msg)
    } catch (err) {
      alert(err.message || "Impossible d'envoyer le test technique.")
    } finally {
      setProcessingId(null)
    }
  }

  const handleManualPhase2 = (row) => {
    if (
      !window.confirm(
        'Passer ce candidat en Phase 2 manuellement (sans score en ligne) ?',
      )
    )
      return
    setTechPassedWithSnapshot(row._id, row)
    setPipelineTick((t) => t + 1)
  }

  const handleDecline = (row) => {
    if (!window.confirm('Refuser ce candidat ? Il sera retiré des listes (stockage local).')) return
    setCandidatDecision(row._id, 'declined')
    setCands((prev) => prev.filter((c) => c._id !== row._id))
    setPipelineTick((t) => t + 1)
  }

  const avgPhase1 =
    phase1Rows.length > 0
      ? Math.round(phase1Rows.reduce((s, c) => s + c.score, 0) / phase1Rows.length) + '%'
      : '—'

  const phase1Actions = {
    key: '_actions',
    label: 'Actions',
    width: '260px',
    render: (_, row) => {
      const busy = processingId === row._id
      const sent = getStageFor(row._id) === 'tech_sent'
      return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {sent && (
            <span style={{ fontSize: '10px' }}>
              <Pill type="green">Lien test envoyé</Pill>
            </span>
          )}
          <Btn
            small
            variant="primary"
            disabled={busy}
            title="Envoyer l’e-mail avec le lien du test technique en ligne"
            onClick={() => handleSendTechEmail(row)}
          >
            {busy ? (
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
            ) : (
              <i className="fa-solid fa-laptop-code" aria-hidden />
            )}
            <span>Test technique</span>
          </Btn>
          <Btn
            small
            variant="ghost"
            disabled={busy}
            title="Cas exceptionnel : passage à la Phase 2 sans score auto"
            onClick={() => handleManualPhase2(row)}
          >
            <i className="fa-solid fa-arrow-right" aria-hidden />
            <span>Ph.2 manuel</span>
          </Btn>
          <Btn small variant="danger" disabled={busy} title="Refuser" onClick={() => handleDecline(row)}>
            <i className="fa-solid fa-xmark" aria-hidden />
          </Btn>
        </div>
      )
    },
  }

  return (
    <div>
      <Grid cols={2} gap={12}>
        <StatCard label="Phase 1 — en cours" value={loading ? '…' : phase1Rows.length} color="var(--cyan2)" />
        <StatCard label="Score évaluations (moy.)" value={loading ? '…' : avgPhase1} color="var(--green)" />
      </Grid>

      <SectionTitle
        action={
          <Btn
            small
            variant="ghost"
            disabled={loading || refreshing}
            onClick={refreshList}
            title="Actualiser la liste et la sync test technique"
            style={{ gap: '8px' }}
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`} aria-hidden />
            Refresh
          </Btn>
        }
      >
        Phase 1 — Test technique
      </SectionTitle>
      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '860px', lineHeight: 1.55, marginBottom: '18px' }}>
        Envoyez le lien du test en ligne. Si le candidat obtient un <strong>score supérieur à {TECH_AUTO_PASS_MIN}/100</strong> à
        la correction IA, il apparaît automatiquement dans la page{' '}
        <strong>Phase 2 — Test physique</strong> (menu gauche) avec son score affiché. Cas exceptionnel : bouton « Ph.2 manuel ».
      </p>
      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text3)' }}>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          Chargement…
        </div>
      ) : (
        <Table columns={[...candidateColumns({ onPdf: openPdf }), phase1Actions]} rows={phase1Rows} />
      )}
    </div>
  )
}

// ── CANDIDATS PHASE 2 (test physique / Teams) ─────────────────
export function CandidatsPhase2() {
  const { remoteLookup, refreshRemote } = useRemotePipelineLookup()
  const [cands, setCands] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [pipelineTick, setPipelineTick] = useState(0)
  const [scheduleRow, setScheduleRow] = useState(null)
  const [meetingLocal, setMeetingLocal] = useState('')
  const [teamsUrl, setTeamsUrl] = useState('')
  const [rhNote, setRhNote] = useState('')

  const phase2Rows = useMemo(
    () => getPhase2Rows(cands, remoteLookup),
    [cands, pipelineTick, remoteLookup],
  )

  const refreshList = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const rows = await fetchEvaluations()
      setCands(filterNotDeclined(rows))
      await refreshRemote()
    } catch (e) {
      setError(e?.message || 'Impossible de charger les évaluations')
    } finally {
      setRefreshing(false)
    }
  }, [refreshRemote])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchEvaluations()
      .then((rows) => {
        if (!cancelled) setCands(filterNotDeclined(rows))
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Impossible de charger les évaluations')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openPdf = (href) => window.open(href, '_blank', 'noopener,noreferrer')

  const openSchedule = (row) => {
    const email = (row.email || '').trim()
    if (!email) {
      alert('Adresse e-mail requise.')
      return
    }
    setScheduleRow(row)
    setMeetingLocal(defaultMeetingDatetimeLocal())
    setTeamsUrl('')
    setRhNote('')
  }

  const closeSchedule = () => {
    if (processingId) return
    setScheduleRow(null)
  }

  const handleSendPhase2Email = async () => {
    if (!scheduleRow) return
    const row = scheduleRow
    const email = (row.email || '').trim()
    const name = row.name?.trim() || 'Candidat'
    const url = teamsUrl.trim()
    if (!url.startsWith('http')) {
      alert('Collez un lien Teams valide (https://).')
      return
    }
    if (!meetingLocal) {
      alert('Choisissez la date et l’heure de l’entretien.')
      return
    }
    const meetingAtIso = new Date(meetingLocal).toISOString()
    setProcessingId(row._id)
    try {
      const res = await sendPhase2PhysicalInvite({
        email,
        candidateName: name,
        meetingAt: meetingAtIso,
        teamsUrl: url,
        note: rhNote.trim() || undefined,
      })
      markPhysicalSent(row._id, { meetingAt: meetingAtIso, teamsUrl: url })
      setPipelineTick((t) => t + 1)
      setScheduleRow(null)
      alert(
        res.emailSent
          ? res.message || 'Convocation Phase 2 envoyée.'
          : `E-mail non envoyé : ${res.message || 'erreur Resend'}`,
      )
    } catch (err) {
      alert(err.message || "Impossible d'envoyer la convocation.")
    } finally {
      setProcessingId(null)
    }
  }

  const phase2ColsBase = insertColumnAfter(
    candidateColumns({ onPdf: openPdf }),
    'position',
    techScoreColumn,
  )

  const phase2Actions = {
    key: '_actions',
    label: 'Actions',
    width: '160px',
    render: (_, row) => {
      const busy = processingId === row._id
      return (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Btn
            small
            variant="primary"
            disabled={busy}
            title="Envoyer date + lien Teams (test physique / entretien)"
            onClick={() => openSchedule(row)}
          >
            {busy ? <i className="fa-solid fa-spinner fa-spin" aria-hidden /> : <i className="fa-brands fa-microsoft" aria-hidden />}
            <span>Teams</span>
          </Btn>
        </div>
      )
    },
  }

  return (
    <div>
      <Grid cols={2} gap={12}>
        <StatCard label="Phase 2 — à convoquer" value={loading ? '…' : phase2Rows.length} color="var(--amber)" />
        <StatCard label="Passage auto depuis le test" value={`> ${TECH_AUTO_PASS_MIN} / 100`} color="var(--cyan2)" />
      </Grid>

      <SectionTitle
        action={
          <Btn
            small
            variant="ghost"
            disabled={loading || refreshing}
            onClick={refreshList}
            title="Actualiser"
            style={{ gap: '8px' }}
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`} aria-hidden />
            Refresh
          </Btn>
        }
      >
        Phase 2 — Test physique (Teams)
      </SectionTitle>
      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '880px', lineHeight: 1.55, marginBottom: '18px' }}>
        Candidats ayant obtenu plus de {TECH_AUTO_PASS_MIN}/100 au test technique en ligne (sync Netlify), ou passage manuel depuis
        la Phase 1. Colonne <strong>Test technique</strong> : score IA obtenu sur l’exercice.
      </p>
      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text3)' }}>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          Chargement…
        </div>
      ) : phase2Rows.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
          Aucun candidat en Phase 2. Attendez qu’un candidat termine le test avec un score &gt; {TECH_AUTO_PASS_MIN}, ou utilisez « Ph.2
          manuel » sur la Phase 1.
        </p>
      ) : (
        <Table columns={[...phase2ColsBase, phase2Actions]} rows={phase2Rows} />
      )}

      <Modal open={!!scheduleRow} onClose={closeSchedule} title="Phase 2 — Convocation Teams">
        {scheduleRow && (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px', lineHeight: 1.5 }}>
              <strong>{scheduleRow.name}</strong>
              <br />
              <span style={{ color: 'var(--text3)' }}>{scheduleRow.email}</span>
            </p>
            <Field label="Date et heure (entretien / test physique)">
              <input
                type="datetime-local"
                style={inputStyle}
                value={meetingLocal}
                onChange={(e) => setMeetingLocal(e.target.value)}
              />
            </Field>
            <Field label="Lien de la réunion Teams">
              <input
                type="url"
                style={inputStyle}
                value={teamsUrl}
                onChange={(e) => setTeamsUrl(e.target.value)}
                placeholder="https://teams.microsoft.com/l/meetup-join/…"
              />
            </Field>
            <Field label="Notes (optionnel)">
              <textarea
                style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                value={rhNote}
                onChange={(e) => setRhNote(e.target.value)}
                placeholder="Consignes pour le candidat…"
              />
            </Field>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Btn variant="ghost" onClick={closeSchedule} disabled={!!processingId}>
                Annuler
              </Btn>
              <Btn onClick={handleSendPhase2Email} disabled={!!processingId}>
                {processingId ? (
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                ) : (
                  <i className="fa-regular fa-paper-plane" aria-hidden />
                )}
                Envoyer convocation Phase 2
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

// ── MALADIES ──────────────────────────────────────────────────
export function Maladies() {
  const [maladies, setMaladies] = useState([])
  useEffect(() => {
    getMaladies()
      .then((r) => setMaladies(r.data))
      .catch(() => {})
  }, [])

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Active" value={maladies.filter((m) => m.status === 'active').length} color="var(--red)" />
        <StatCard label="Resolved" value={maladies.filter((m) => m.status === 'resolved').length} color="var(--green)" />
        <StatCard label="Total Days" value={maladies.reduce((s, m) => s + m.days, 0)} color="var(--amber)" />
      </Grid>
      <SectionTitle>Sick Leave Records</SectionTitle>
      <Table
        columns={[
          { key: 'employeeName', label: 'Employee' },
          { key: 'startDate', label: 'Start', render: (v) => new Date(v).toLocaleDateString('en-US') },
          { key: 'endDate', label: 'End', render: (v) => new Date(v).toLocaleDateString('en-US') },
          { key: 'days', label: 'Duration', width: '80px', render: (v) => `${v} days` },
          { key: 'doctor', label: 'Doctor' },
          {
            key: 'certificate',
            label: 'Certificate',
            width: '100px',
            render: (v) => <Pill type={v ? 'green' : 'red'}>{v ? 'Received' : 'Missing'}</Pill>,
          },
          {
            key: 'status',
            label: 'Status',
            render: (v) => <Pill type={v === 'active' ? 'amber' : 'green'}>{v === 'active' ? 'In Progress' : 'Done'}</Pill>,
          },
        ]}
        rows={maladies}
      />
    </div>
  )
}
