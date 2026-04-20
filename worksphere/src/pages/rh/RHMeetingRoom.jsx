import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { addEmployee } from '../../services/api'
import { sendEmployeeWelcomeEmail } from '../../services/employeeWelcome'
import { fetchMeeting } from '../../services/meetings'
import { saveMeetingDecision } from '../../services/meetings'
import MeetingRoom from '../../components/meetings/MeetingRoom'
import { Btn, Field, Pill, SectionTitle, inputStyle } from '../../components/shared/UI'

const EMPLOYEE_TYPES = ['Developer', 'Sales', 'Marketing', 'Manager', 'HR', 'Designer', 'Accountant']

export default function RHMeetingRoom() {
  const { id } = useParams()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [employeeType, setEmployeeType] = useState('Developer')
  const [processingDecision, setProcessingDecision] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchMeeting({ id })
      .then((data) => {
        if (!cancelled) setMeeting(data.meeting || null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Impossible de charger la réunion.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const report = meeting?.summaryReport || null
  const aiSuggestion = useMemo(() => {
    if (!report) return 'Rapport IA en attente.'
    const rating = String(report.rating || '').toLowerCase()
    const recommendation = String(report.recommendation || '').trim()
    if (rating.includes('fort') || rating.includes('excellent') || recommendation.toLowerCase().includes('favorable')) {
      return `Suggestion IA: favorable. ${recommendation}`.trim()
    }
    if (rating.includes('réserve') || rating.includes('mitig')) {
      return `Suggestion IA: à discuter. ${recommendation}`.trim()
    }
    if (rating.includes('faible') || recommendation.toLowerCase().includes('défavorable') || recommendation.toLowerCase().includes('refus')) {
      return `Suggestion IA: défavorable. ${recommendation}`.trim()
    }
    return recommendation || 'Suggestion IA disponible dans le rapport.'
  }, [report])

  const handleRefuse = async () => {
    if (!meeting) return
    setProcessingDecision(true)
    try {
      const res = await saveMeetingDecision({
        meetingId: meeting.id,
        decision: 'refused',
        decisionReason: decisionReason.trim() || 'Candidature refusée après Phase 3.',
        actorName: user?.name || 'Responsable RH',
        actorEmail: user?.email || '',
        actorRole: 'rh',
      })
      setMeeting(res.meeting)
      alert('Décision refus enregistrée.')
    } catch (err) {
      alert(err.message || 'Impossible d’enregistrer le refus.')
    } finally {
      setProcessingDecision(false)
    }
  }

  const handleAccept = async () => {
    if (!meeting) return
    setProcessingDecision(true)
    try {
      const payload = {
        name: meeting.participantName,
        email: meeting.participantEmail,
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

      const loginUrl = `${window.location.origin}/login?email=${encodeURIComponent(meeting.participantEmail || '')}`
      let emailSent = false
      let emailMessage = ''
      try {
        const mail = await sendEmployeeWelcomeEmail({
          email: meeting.participantEmail,
          name: meeting.participantName,
          ...(tempPassword ? { temporaryPassword: String(tempPassword) } : {}),
          loginUrl,
        })
        emailSent = !!mail.emailSent
        emailMessage = mail.message || ''
      } catch (err) {
        emailMessage = err.message || 'Erreur lors de l’envoi de l’e-mail.'
      }

      const decisionRes = await saveMeetingDecision({
        meetingId: meeting.id,
        decision: 'accepted',
        decisionReason: decisionReason.trim() || 'Candidat accepté après Phase 3.',
        actorName: user?.name || 'Responsable RH',
        actorEmail: user?.email || '',
        actorRole: 'rh',
        employeeAccount: {
          id: created?._id || created?.id || null,
          email: meeting.participantEmail,
          department: payload.department,
          employeeType: payload.employeeType,
          temporaryPassword: tempPassword ? String(tempPassword) : '',
          emailSent,
          emailMessage,
        },
      })
      setMeeting(decisionRes.meeting)
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

  if (loading) return <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Chargement de la réunion…</div>
  if (error) return <div style={{ fontSize: '13px', color: 'var(--red)' }}>{error}</div>
  if (!meeting) return <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Réunion introuvable.</div>

  return (
    <div>
      <MeetingRoom
        meeting={meeting}
        actor={{
          name: user?.name || 'Responsable RH',
          email: user?.email || '',
          role: 'rh',
        }}
        backHref="/rh/meetings"
        canFinish
        onMeetingFinished={setMeeting}
      />

      {meeting.type === 'candidate_phase2' && (
        <div
          style={{
            marginTop: '18px',
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
          }}
        >
          <SectionTitle
            action={
              meeting.phase3Decision ? (
                <Pill type={meeting.phase3Decision === 'accepted' ? 'green' : 'red'}>
                  {meeting.phase3Decision === 'accepted' ? 'Accepté' : 'Refusé'}
                </Pill>
              ) : null
            }
          >
            Phase 3 — Décision finale
          </SectionTitle>

          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
            <strong>Suggestion IA:</strong> {aiSuggestion}
          </div>

          {report?.participantOpinion && (
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
              <strong>Avis IA sur le candidat:</strong> {report.participantOpinion}
            </div>
          )}

          {meeting.phase3Decision ? (
            <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <div>
                <strong>Décision RH:</strong> {meeting.phase3Decision === 'accepted' ? 'Accepté' : 'Refusé'}
              </div>
              <div>
                <strong>Motif:</strong> {meeting.phase3DecisionReason || '—'}
              </div>
              {meeting.employeeAccount && (
                <>
                  <div>
                    <strong>Compte créé:</strong> {meeting.employeeAccount.email || '—'}
                  </div>
                  <div>
                    <strong>E-mail d’accès:</strong> {meeting.employeeAccount.emailSent ? 'Envoyé' : 'Non envoyé'}
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <Btn variant="danger" onClick={handleRefuse} disabled={processingDecision}>
                  {processingDecision ? 'Traitement…' : 'Refuser'}
                </Btn>
                <Btn onClick={handleAccept} disabled={processingDecision}>
                  {processingDecision ? 'Traitement…' : 'Accepter et créer le compte'}
                </Btn>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
