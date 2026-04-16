import { useState, useEffect, useCallback, useMemo } from 'react'
import { getReclamations, updateReclamation, getMaladies } from '../../services/api'
import { fetchEvaluations } from '../../services/evaluationsWebhook'
import { filterNotDeclined, setCandidatDecision } from '../../services/candidatsPhase1'
import {
  getPhase1Rows,
  getPhase2Rows,
  setPipelineStage,
  setTechPassedWithSnapshot,
  markPhysicalSent,
  getStageFor,
} from '../../services/candidatPipeline'
import { issueTechnicalTestInvite } from '../../services/techTestInvite'
import { sendPhase2PhysicalInvite, defaultMeetingDatetimeLocal } from '../../services/phase2PhysicalInvite'
import { SectionTitle, Pill, Btn, Table, StatCard, Grid, Modal, Field, inputStyle } from '../../components/shared/UI'

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
  const [cands, setCands] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [processingId, setProcessingId] = useState(null)
  const [pipelineTick, setPipelineTick] = useState(0)
  const [schedulePhase2Row, setSchedulePhase2Row] = useState(null)
  const [meetingLocal, setMeetingLocal] = useState('')
  const [teamsUrl, setTeamsUrl] = useState('')
  const [rhNote, setRhNote] = useState('')

  const phase1Rows = useMemo(() => getPhase1Rows(cands), [cands, pipelineTick])
  const phase2Rows = useMemo(() => getPhase2Rows(cands), [cands, pipelineTick])

  const refreshList = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      const rows = await fetchEvaluations()
      setCands(filterNotDeclined(rows))
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
      alert(err.message || 'Impossible d’envoyer le test technique.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleMarkTechPassed = (row) => {
    if (
      !window.confirm(
        'Marquer le test technique comme réussi ? Le candidat passera en Phase 2 (test physique / Teams).',
      )
    )
      return
    setTechPassedWithSnapshot(row._id, row)
    setPipelineTick((t) => t + 1)
  }

  const openSchedulePhase2 = (row) => {
    const email = (row.email || '').trim()
    if (!email) {
      alert('Adresse e-mail requise.')
      return
    }
    setSchedulePhase2Row(row)
    setMeetingLocal(defaultMeetingDatetimeLocal())
    setTeamsUrl('')
    setRhNote('')
  }

  const closeSchedulePhase2 = () => {
    if (processingId) return
    setSchedulePhase2Row(null)
  }

  const handleSendPhase2Email = async () => {
    if (!schedulePhase2Row) return
    const row = schedulePhase2Row
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
      setSchedulePhase2Row(null)
      alert(
        res.emailSent
          ? res.message || 'Convocation Phase 2 envoyée.'
          : `E-mail non envoyé : ${res.message || 'erreur Resend'}`,
      )
    } catch (err) {
      alert(err.message || 'Impossible d’envoyer la convocation.')
    } finally {
      setProcessingId(null)
    }
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
    width: '240px',
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
            title="Le candidat a réussi le test → passe en Phase 2"
            onClick={() => handleMarkTechPassed(row)}
          >
            <i className="fa-solid fa-arrow-right" aria-hidden />
            <span>OK test → Ph.2</span>
          </Btn>
          <Btn small variant="danger" disabled={busy} title="Refuser" onClick={() => handleDecline(row)}>
            <i className="fa-solid fa-xmark" aria-hidden />
          </Btn>
        </div>
      )
    },
  }

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
            onClick={() => openSchedulePhase2(row)}
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
      <Grid cols={3} gap={12}>
        <StatCard label="Phase 1 — en cours" value={loading ? '…' : phase1Rows.length} color="var(--cyan2)" />
        <StatCard label="Phase 2 — test physique (Teams)" value={loading ? '…' : phase2Rows.length} color="var(--amber)" />
        <StatCard label="Score moyen (Ph.1)" value={loading ? '…' : avgPhase1} color="var(--green)" />
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
        Recrutement — Phase 1 &amp; 2
      </SectionTitle>
      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '860px', lineHeight: 1.55, marginBottom: '18px' }}>
        <strong>Phase 1 — Test technique :</strong> envoyez le lien du test en ligne ; lorsque le candidat a réussi, cliquez « OK test → Ph.2 ».
        <br />
        <strong>Phase 2 — Test physique / Teams :</strong> le candidat apparaît ci-dessous ; planifiez la date et le lien Teams, puis envoyez la
        convocation.
      </p>
      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text3)' }}>
          <i className="fa-solid fa-spinner fa-spin" aria-hidden />
          Chargement…
        </div>
      ) : (
        <>
          <div style={{ marginTop: '8px' }}>
            <SectionTitle>Phase 1 — Test technique</SectionTitle>
          </div>
          <Table columns={[...candidateColumns({ onPdf: openPdf }), phase1Actions]} rows={phase1Rows} />

          <div style={{ marginTop: '28px' }}>
            <SectionTitle>Phase 2 — Test physique (entretien Teams)</SectionTitle>
          </div>
          {phase2Rows.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '12px' }}>
              Aucun candidat en Phase 2 pour l’instant. Validez d’abord la réussite du test technique en Phase 1.
            </p>
          ) : (
            <Table columns={[...candidateColumns({ onPdf: openPdf }), phase2Actions]} rows={phase2Rows} />
          )}
        </>
      )}

      <Modal open={!!schedulePhase2Row} onClose={closeSchedulePhase2} title="Phase 2 — Convocation Teams">
        {schedulePhase2Row && (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px', lineHeight: 1.5 }}>
              <strong>{schedulePhase2Row.name}</strong>
              <br />
              <span style={{ color: 'var(--text3)' }}>{schedulePhase2Row.email}</span>
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
              <Btn variant="ghost" onClick={closeSchedulePhase2} disabled={!!processingId}>
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
