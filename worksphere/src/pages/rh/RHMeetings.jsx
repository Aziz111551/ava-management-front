import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { addEmployee, getEmployees } from '../../services/api'
import { sendCandidateRefusalEmail } from '../../services/candidateDecision'
import { sendEmployeeWelcomeEmail } from '../../services/employeeWelcome'
import { createMeetingInvite, fetchMeetings, saveMeetingDecision } from '../../services/meetings'
import { Btn, Empty, Field, Grid, Modal, Pill, SectionTitle, StatCard, Table, inputStyle } from '../../components/shared/UI'

function fmtDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

function buildAiSuggestion(item) {
  if (item?.reportStatus && item.reportStatus !== 'ready') {
    if (item.reportStatus === 'running') return 'Rapport IA en cours de génération…'
    if (item.reportStatus === 'error') return 'Rapport IA en erreur — ouvrez la réunion et relancez la génération.'
    if (item.status === 'completed' && item.reportStatus === 'idle') return 'Réunion terminée — rapport pas encore généré : ouvrez la réunion pour lancer le rapport.'
  }
  const report = item?.reportPreview || item?.summaryReport || {}
  const rating = String(report.rating || '').toLowerCase()
  const recommendation = String(report.recommendation || '').trim()
  if (rating.includes('fort') || rating.includes('excellent') || recommendation.toLowerCase().includes('favorable')) {
    return `Favorable. ${recommendation}`.trim()
  }
  if (rating.includes('réserve') || rating.includes('mitig')) {
    return `À discuter. ${recommendation}`.trim()
  }
  if (rating.includes('faible') || recommendation.toLowerCase().includes('défavorable') || recommendation.toLowerCase().includes('refus')) {
    return `Défavorable. ${recommendation}`.trim()
  }
  return recommendation || 'Décision IA disponible dans le rapport.'
}

function isPhase3CandidateMeeting(item) {
  return item?.type === 'candidate_phase2'
}

/** Candidats visibles en Phase 3 : entretien physique Phase 2, une fois la réunion close ou le rapport engagé. */
function isPhase3Listable(item) {
  if (!isPhase3CandidateMeeting(item)) return false
  if (item.phase3Decision) return true
  return (
    item.status === 'completed' ||
    item.reportStatus === 'ready' ||
    item.reportStatus === 'running' ||
    item.reportStatus === 'error'
  )
}

function canPhase3Decide(item) {
  return isPhase3CandidateMeeting(item) && !item.phase3Decision && item.reportStatus === 'ready'
}

const EMPTY_FORM = {
  employeeId: '',
  scheduledAt: '',
  note: '',
}

const EMPLOYEE_TYPES = ['Developer', 'Sales', 'Marketing', 'Manager', 'HR', 'Designer', 'Accountant']

export default function RHMeetings() {
  const location = useLocation()
  const isPhase3Page = location.pathname.startsWith('/rh/phase3')

  const [meetings, setMeetings] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reportModal, setReportModal] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [decisionModal, setDecisionModal] = useState(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [employeeType, setEmployeeType] = useState('Developer')
  const [processingDecision, setProcessingDecision] = useState(false)

  const rhUser = useMemo(() => JSON.parse(localStorage.getItem('ws_user') || '{}') || {}, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [meetingRes, employeeRes] = await Promise.all([
        fetchMeetings({ viewer: 'rh' }),
        getEmployees().catch(() => ({ data: [] })),
      ])
      setMeetings(Array.isArray(meetingRes.meetings) ? meetingRes.meetings : [])
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data.filter((item) => item.role === 'employee') : [])
    } catch (err) {
      setError(err.message || 'Impossible de charger les réunions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectedEmployee = useMemo(
    () => employees.find((item) => String(item._id) === form.employeeId),
    [employees, form.employeeId],
  )

  const meetingStats = {
    upcoming: meetings.filter((item) => item.status === 'scheduled').length,
    live: meetings.filter((item) => item.status === 'live').length,
    reports: meetings.filter((item) => item.reportStatus === 'ready').length,
  }

  const readyReports = meetings.filter((item) => item.reportStatus === 'ready' && item.reportPreview)

  const phase3Pool = useMemo(() => meetings.filter(isPhase3CandidateMeeting), [meetings])

  const phase3Meetings = useMemo(() => {
    const rows = meetings.filter(isPhase3Listable)
    return rows.sort((a, b) => {
      const aDone = a.phase3Decision ? 1 : 0
      const bDone = b.phase3Decision ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      return new Date(b.scheduledAt || b.createdAt || 0).getTime() - new Date(a.scheduledAt || a.createdAt || 0).getTime()
    })
  }, [meetings])

  const phase3Stats = {
    pending: phase3Pool.filter(
      (item) =>
        !item.phase3Decision &&
        (item.status === 'completed' ||
          item.reportStatus === 'ready' ||
          item.reportStatus === 'running' ||
          item.reportStatus === 'error'),
    ).length,
    accepted: phase3Pool.filter((item) => item.phase3Decision === 'accepted').length,
    refused: phase3Pool.filter((item) => item.phase3Decision === 'refused').length,
  }

  const hasOnlyEmployeeMeetings =
    meetings.length > 0 && meetings.every((m) => m.type === 'employee_rh') && phase3Pool.length === 0

  const createEmployeeMeeting = async () => {
    if (!selectedEmployee) {
      alert('Choisissez un employé.')
      return
    }
    if (!form.scheduledAt) {
      alert('Choisissez la date et l’heure.')
      return
    }
    setSending(true)
    try {
      await createMeetingInvite({
        type: 'employee_rh',
        participantRole: 'employee',
        participantId: selectedEmployee._id,
        participantName: selectedEmployee.name,
        participantEmail: selectedEmployee.email,
        rhName: rhUser?.name || 'Responsable RH',
        rhEmail: rhUser?.email || '',
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        note: form.note.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setOpenModal(false)
      await load()
    } catch (err) {
      alert(err.message || 'Impossible de créer la réunion.')
    } finally {
      setSending(false)
    }
  }

  const resetDecisionState = () => {
    setDecisionModal(null)
    setDecisionReason('')
    setDepartment('Engineering')
    setEmployeeType('Developer')
  }

  const handleRefuse = async () => {
    if (!decisionModal) return
    if (!canPhase3Decide(decisionModal)) {
      alert('Le rapport IA doit être prêt avant d’enregistrer la décision.')
      return
    }
    setProcessingDecision(true)
    try {
      let emailSent = false
      let emailMessage = ''
      try {
        const mail = await sendCandidateRefusalEmail({
          email: decisionModal.participantEmail,
          name: decisionModal.participantName,
          reason: decisionReason.trim() || 'Votre candidature n’a pas été retenue après la réunion finale.',
        })
        emailSent = !!mail.emailSent
        emailMessage = mail.message || ''
      } catch (err) {
        emailMessage = err.message || 'Erreur lors de l’envoi de l’e-mail de refus.'
      }

      await saveMeetingDecision({
        meetingId: decisionModal.id,
        decision: 'refused',
        decisionReason: decisionReason.trim() || 'Candidature refusée après Phase 3.',
        actorName: rhUser?.name || 'Responsable RH',
        actorEmail: rhUser?.email || '',
        actorRole: 'rh',
        employeeAccount: {
          email: decisionModal.participantEmail,
          emailSent,
          emailMessage,
        },
      })

      await load()
      resetDecisionState()
      alert(emailSent ? 'Candidat refusé et e-mail envoyé.' : `Candidat refusé. E-mail non envoyé: ${emailMessage || 'erreur inconnue'}`)
    } catch (err) {
      alert(err.message || 'Impossible d’enregistrer le refus.')
    } finally {
      setProcessingDecision(false)
    }
  }

  const handleAccept = async () => {
    if (!decisionModal) return
    if (!canPhase3Decide(decisionModal)) {
      alert('Le rapport IA doit être prêt avant d’accepter le candidat.')
      return
    }
    setProcessingDecision(true)
    try {
      const payload = {
        name: decisionModal.participantName,
        email: decisionModal.participantEmail,
        department: department.trim() || 'Engineering',
        employeeType,
        role: 'employee',
        status: 'active',
        joinDate: new Date().toISOString().slice(0, 10),
      }

      const createRes = await addEmployee(payload)
      const created = createRes.data || {}
      const tempPassword =
        created?.temporaryPassword ||
        created?.tempPassword ||
        created?.plainPassword ||
        created?.generatedPassword ||
        created?.initialPassword

      const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(decisionModal.participantEmail || '')}`
      let emailSent = false
      let emailMessage = ''
      try {
        const mail = await sendEmployeeWelcomeEmail({
          email: decisionModal.participantEmail,
          name: decisionModal.participantName,
          ...(tempPassword ? { temporaryPassword: String(tempPassword) } : {}),
          loginUrl,
        })
        emailSent = !!mail.emailSent
        emailMessage = mail.message || ''
      } catch (err) {
        emailMessage = err.message || 'Erreur lors de l’envoi de l’e-mail.'
      }

      await saveMeetingDecision({
        meetingId: decisionModal.id,
        decision: 'accepted',
        decisionReason: decisionReason.trim() || 'Candidat accepté après Phase 3.',
        actorName: rhUser?.name || 'Responsable RH',
        actorEmail: rhUser?.email || '',
        actorRole: 'rh',
        employeeAccount: {
          id: created?._id || created?.id || null,
          email: decisionModal.participantEmail,
          department: payload.department,
          employeeType: payload.employeeType,
          temporaryPassword: tempPassword ? String(tempPassword) : '',
          emailSent,
          emailMessage,
        },
      })

      await load()
      resetDecisionState()
      alert(
        emailSent
          ? 'Candidat accepté. Le compte employé a été créé et l’e-mail a été envoyé.'
          : `Candidat accepté. Compte créé, mais e-mail non envoyé: ${emailMessage || 'erreur inconnue'}`,
      )
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Impossible d’accepter le candidat.')
    } finally {
      setProcessingDecision(false)
    }
  }

  return (
    <div>
      <Grid cols={3} gap={12}>
        {isPhase3Page ? (
          <>
            <StatCard label="Décisions en attente" value={loading ? '…' : phase3Stats.pending} color="var(--amber)" />
            <StatCard label="Candidats acceptés" value={loading ? '…' : phase3Stats.accepted} color="var(--green)" />
            <StatCard label="Candidats refusés" value={loading ? '…' : phase3Stats.refused} color="var(--red)" />
          </>
        ) : (
          <>
            <StatCard label="Réunions planifiées" value={loading ? '…' : meetingStats.upcoming} color="var(--cyan2)" />
            <StatCard label="En direct" value={loading ? '…' : meetingStats.live} color="var(--amber)" />
            <StatCard label="Rapports IA prêts" value={loading ? '…' : meetingStats.reports} color="var(--green)" />
          </>
        )}
      </Grid>

      <SectionTitle
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn small variant="ghost" onClick={load} disabled={loading}>
              Actualiser
            </Btn>
            {!isPhase3Page && (
              <Btn small onClick={() => setOpenModal(true)}>
                Nouvelle réunion employé
              </Btn>
            )}
          </div>
        }
      >
        {isPhase3Page ? 'Phase 3 — Décision finale' : 'Réunions intégrées'}
      </SectionTitle>

      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '860px', lineHeight: 1.55, marginBottom: '16px' }}>
        {isPhase3Page
          ? 'Phase 3 concerne uniquement les entretiens candidats créés depuis la Phase 2 (test physique). Dès que la réunion est clôturée par le RH, le candidat apparaît ici ; les boutons Accepter / Refuser sont actifs lorsque le rapport IA est prêt. Les réunions RH ↔ employé restent dans « Réunions intégrées ».'
          : 'Cette vue centralise les réunions RH planifiées dans WorkSphere pour les candidats Phase 2 et les employés, avec accès à la salle intégrée et au rapport IA final.'}
      </p>

      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Chargement des réunions…</div>
      ) : isPhase3Page ? (
        phase3Meetings.length === 0 ? (
          <Empty
            message={
              hasOnlyEmployeeMeetings
                ? 'Aucun entretien candidat Phase 2 : vous n’avez que des réunions RH ↔ employé. Créez une réunion candidat depuis « Phase 2 – Test physique », puis clôturez-la pour voir la décision ici.'
                : 'Aucun entretien candidat Phase 2 clôturé pour le moment. Planifiez l’entretien physique dans Phase 2, terminez la réunion depuis la salle RH, puis le candidat apparaîtra ici.'
            }
          />
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'participantName',
                  label: 'Candidat',
                  render: (value, row) => (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.participantEmail}</div>
                    </div>
                  ),
                },
                { key: 'scheduledAt', label: 'Créneau', render: (value) => fmtDate(value) },
                {
                  key: 'reportStatus',
                  label: 'Rapport IA',
                  render: (value) => (
                    <Pill type={value === 'ready' ? 'green' : value === 'running' ? 'amber' : value === 'error' ? 'red' : 'default'}>
                      {value === 'ready' ? 'Prêt' : value === 'running' ? 'Génération' : value === 'error' ? 'Erreur' : '—'}
                    </Pill>
                  ),
                },
                {
                  key: 'reportPreview',
                  label: 'Avis IA',
                  width: '2fr',
                  render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{buildAiSuggestion(row)}</span>,
                },
                {
                  key: 'phase3Decision',
                  label: 'Décision RH',
                  render: (value) => (
                    <Pill type={value === 'accepted' ? 'green' : value === 'refused' ? 'red' : 'default'}>
                      {value === 'accepted' ? 'Accepté' : value === 'refused' ? 'Refusé' : 'En attente'}
                    </Pill>
                  ),
                },
                {
                  key: 'id',
                  label: 'Actions',
                  width: '280px',
                  render: (_, row) => (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Btn small variant="ghost" onClick={() => setReportModal(row)}>
                        Rapport
                      </Btn>
                      <Link to={`/rh/meetings/${row.id}`} style={{ textDecoration: 'none' }}>
                        <Btn small variant="ghost">Ouvrir</Btn>
                      </Link>
                      {!row.phase3Decision && canPhase3Decide(row) && (
                        <Btn small onClick={() => setDecisionModal(row)}>
                          Accepter / Refuser
                        </Btn>
                      )}
                    </div>
                  ),
                },
              ]}
              rows={phase3Meetings}
            />

            <div style={{ marginTop: '22px' }}>
              <SectionTitle>Rapports détaillés par candidat</SectionTitle>
              <div style={{ display: 'grid', gap: '12px' }}>
                {phase3Meetings.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                          {item.participantName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                          {item.participantEmail} · {fmtDate(item.scheduledAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.reportPreview?.rating && <Pill type="blue">{item.reportPreview.rating}</Pill>}
                        <Pill
                          type={
                            item.reportStatus === 'ready'
                              ? 'green'
                              : item.reportStatus === 'running'
                                ? 'amber'
                                : item.reportStatus === 'error'
                                  ? 'red'
                                  : 'default'
                          }
                        >
                          {item.reportStatus === 'ready'
                            ? 'Rapport prêt'
                            : item.reportStatus === 'running'
                              ? 'Rapport…'
                              : item.reportStatus === 'error'
                                ? 'Rapport erreur'
                                : 'Rapport —'}
                        </Pill>
                        <Pill type={item.phase3Decision === 'accepted' ? 'green' : item.phase3Decision === 'refused' ? 'red' : 'default'}>
                          {item.phase3Decision === 'accepted' ? 'Accepté' : item.phase3Decision === 'refused' ? 'Refusé' : 'En attente'}
                        </Pill>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                      <strong>Décision IA :</strong> {buildAiSuggestion(item)}
                    </div>

                    {item.reportPreview?.participantOpinion && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Avis IA sur le candidat
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.participantOpinion}
                        </div>
                      </div>
                    )}

                    {item.reportPreview?.recommendation && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Recommandation IA
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.recommendation}
                        </div>
                      </div>
                    )}

                    {item.reportPreview?.conversationSummary && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Résumé de la réunion
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.conversationSummary}
                        </div>
                      </div>
                    )}

                    {item.phase3DecisionReason && (
                      <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                        <strong>Motif RH :</strong> {item.phase3DecisionReason}
                      </div>
                    )}

                    {!item.phase3Decision && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                        <Btn variant="ghost" onClick={() => setReportModal(item)}>
                          Aperçu rapport
                        </Btn>
                        <Link to={`/rh/meetings/${item.id}`} style={{ textDecoration: 'none' }}>
                          <Btn variant="ghost">Ouvrir la réunion</Btn>
                        </Link>
                        {canPhase3Decide(item) ? (
                          <>
                            <Btn variant="danger" onClick={() => setDecisionModal(item)}>
                              Refuser
                            </Btn>
                            <Btn onClick={() => setDecisionModal(item)}>Accepter</Btn>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Décision après rapport IA prêt.</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      ) : meetings.length === 0 ? (
        <Empty message="Aucune réunion intégrée pour le moment." />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'participantName',
                label: 'Participant',
                render: (value, row) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.participantEmail}</div>
                  </div>
                ),
              },
              {
                key: 'type',
                label: 'Type',
                render: (value) => (
                  <Pill type={value === 'employee_rh' ? 'blue' : 'cyan'}>
                    {value === 'employee_rh' ? 'RH ↔ Employé' : 'RH ↔ Candidat'}
                  </Pill>
                ),
              },
              { key: 'scheduledAt', label: 'Créneau', render: (value) => fmtDate(value) },
              {
                key: 'status',
                label: 'Statut',
                render: (value) => (
                  <Pill type={value === 'completed' ? 'green' : value === 'live' ? 'amber' : 'default'}>
                    {value === 'completed' ? 'Terminée' : value === 'live' ? 'En cours' : 'Planifiée'}
                  </Pill>
                ),
              },
              {
                key: 'reportStatus',
                label: 'Rapport IA',
                render: (value) => (
                  <Pill type={value === 'ready' ? 'green' : value === 'running' ? 'amber' : value === 'error' ? 'red' : 'default'}>
                    {value === 'ready' ? 'Prêt' : value === 'running' ? 'Génération' : value === 'error' ? 'Erreur' : '—'}
                  </Pill>
                ),
              },
              {
                key: 'phase3Decision',
                label: 'Phase 3',
                render: (value) => (
                  <Pill type={value === 'accepted' ? 'green' : value === 'refused' ? 'red' : 'default'}>
                    {value === 'accepted' ? 'Accepté' : value === 'refused' ? 'Refusé' : 'En attente'}
                  </Pill>
                ),
              },
              {
                key: 'eventCount',
                label: 'Journal',
                render: (value) => <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{value || 0} événements</span>,
              },
              {
                key: 'id',
                label: 'Actions',
                width: '220px',
                render: (_, row) => (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to={`/rh/meetings/${row.id}`} style={{ textDecoration: 'none' }}>
                      <Btn small>Ouvrir</Btn>
                    </Link>
                    {row.reportStatus === 'ready' && (
                      <Btn small variant="ghost" onClick={() => setReportModal(row)}>
                        Rapport
                      </Btn>
                    )}
                  </div>
                ),
              },
            ]}
            rows={meetings}
          />

          {readyReports.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <SectionTitle>Rapports détaillés par réunion</SectionTitle>
              <div style={{ display: 'grid', gap: '12px' }}>
                {readyReports.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--border2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                          {item.participantName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                          {item.type === 'employee_rh' ? 'Réunion RH ↔ employé' : 'Réunion RH ↔ candidat'} · {fmtDate(item.scheduledAt)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {item.reportPreview?.rating && <Pill type="blue">{item.reportPreview.rating}</Pill>}
                        <Link to={`/rh/meetings/${item.id}`} style={{ textDecoration: 'none' }}>
                          <Btn small>Voir détail</Btn>
                        </Link>
                      </div>
                    </div>

                    {item.reportPreview?.participantOpinion && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Avis sur le participant
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.participantOpinion}
                        </div>
                      </div>
                    )}

                    {item.reportPreview?.recommendation && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Recommandation RH
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.recommendation}
                        </div>
                      </div>
                    )}

                    {item.reportPreview?.conversationSummary && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                          Ce qui a été discuté
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                          {item.reportPreview.conversationSummary}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={openModal} onClose={() => !sending && setOpenModal(false)} title="Nouvelle réunion RH ↔ employé">
        <Field label="Employé">
          <select
            style={inputStyle}
            value={form.employeeId}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
          >
            <option value="">Choisir un employé…</option>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>
                {employee.name} — {employee.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date et heure">
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.scheduledAt}
            onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
          />
        </Field>
        <Field label="Note RH (optionnel)">
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Objectifs, contexte, points à traiter…"
          />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Btn variant="ghost" onClick={() => setOpenModal(false)} disabled={sending}>
            Annuler
          </Btn>
          <Btn onClick={createEmployeeMeeting} disabled={sending}>
            {sending ? 'Création…' : 'Créer la réunion'}
          </Btn>
        </div>
      </Modal>

      <Modal open={!!decisionModal} onClose={() => !processingDecision && resetDecisionState()} title="Décision finale RH">
        {decisionModal && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <strong>Candidat :</strong> {decisionModal.participantName}
              <br />
              <strong>E-mail :</strong> {decisionModal.participantEmail}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <strong>Décision IA :</strong> {buildAiSuggestion(decisionModal)}
            </div>

            {decisionModal.reportPreview?.participantOpinion && (
              <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                <strong>Avis IA :</strong> {decisionModal.reportPreview.participantOpinion}
              </div>
            )}

            <Field label="Motif / commentaire RH">
              <textarea
                style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Décision finale RH, appréciation globale, remarques…"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Département si accepté">
                <input
                  style={inputStyle}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Engineering"
                />
              </Field>
              <Field label="Type employé si accepté">
                <select style={inputStyle} value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}>
                  {EMPLOYEE_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <Btn variant="ghost" onClick={resetDecisionState} disabled={processingDecision}>
                Annuler
              </Btn>
              <Btn variant="danger" onClick={handleRefuse} disabled={processingDecision}>
                {processingDecision ? 'Traitement…' : 'Refuser + e-mail'}
              </Btn>
              <Btn onClick={handleAccept} disabled={processingDecision}>
                {processingDecision ? 'Traitement…' : 'Accepter + créer compte'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Rapport IA">
        {reportModal && (
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <p>
              <strong>Participant :</strong> {reportModal.participantName}
            </p>
            <p>
              <strong>Créneau :</strong> {fmtDate(reportModal.scheduledAt)}
            </p>
            <p>
              <strong>Décision IA :</strong> {buildAiSuggestion(reportModal)}
            </p>
            {reportModal.reportPreview?.participantOpinion && (
              <p>
                <strong>Avis IA :</strong> {reportModal.reportPreview.participantOpinion}
              </p>
            )}
            <Link to={`/rh/meetings/${reportModal.id}`} style={{ textDecoration: 'none' }}>
              <Btn>Ouvrir la réunion et le rapport complet</Btn>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
