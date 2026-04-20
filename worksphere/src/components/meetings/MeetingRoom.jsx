import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { JitsiMeeting } from '@jitsi/react-sdk'
import {
  appendMeetingTranscript,
  fetchMeetingReport,
  finishMeeting,
  generateMeetingReport,
} from '../../services/meetings'
import { Btn, Pill, StatCard, Grid, SectionTitle, inputStyle } from '../shared/UI'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function transcriptStatusLabel(reportStatus) {
  if (reportStatus === 'ready') return { text: 'Rapport prêt', type: 'green' }
  if (reportStatus === 'running') return { text: 'Rapport en génération', type: 'amber' }
  if (reportStatus === 'error') return { text: 'Rapport indisponible', type: 'red' }
  return { text: 'Réunion en cours', type: 'cyan' }
}

export default function MeetingRoom({
  meeting,
  actor,
  backHref,
  canFinish = false,
  onMeetingFinished,
  accessToken = '',
}) {
  const [api, setApi] = useState(null)
  const [joined, setJoined] = useState(false)
  const [participantCount, setParticipantCount] = useState(1)
  const [finishNote, setFinishNote] = useState('')
  const [finishing, setFinishing] = useState(false)
  const [report, setReport] = useState(meeting.summaryReport || null)
  const [reportStatus, setReportStatus] = useState(meeting.reportStatus || 'idle')
  const [reportError, setReportError] = useState(meeting.reportError || '')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [speechState, setSpeechState] = useState('inactive')
  const recognitionRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      recognitionRef.current?.stop?.()
    }
  }, [])

  useEffect(() => {
    setReport(meeting.summaryReport || null)
    setReportStatus(meeting.reportStatus || 'idle')
    setReportError(meeting.reportError || '')
  }, [meeting])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }
    setSpeechSupported(true)

    if (!joined || meeting.status === 'completed') {
      recognitionRef.current?.stop?.()
      setSpeechState('inactive')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => setSpeechState('listening')
    recognition.onresult = async (event) => {
      const finals = []
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result.isFinal) {
          finals.push(result[0]?.transcript || '')
        }
      }
      for (const line of finals.map((item) => item.trim()).filter(Boolean)) {
        try {
          await appendMeetingTranscript({
            meetingId: meeting.id,
            token: accessToken || undefined,
            speakerName: actor.name,
            speakerEmail: actor.email,
            speakerRole: actor.role,
            text: line,
          })
        } catch {
          /* ignore transient transcript failures */
        }
      }
    }
    recognition.onerror = () => setSpeechState('error')
    recognition.onend = () => {
      if (!mountedRef.current || meeting.status === 'completed' || !joined) return
      setSpeechState('restarting')
      try {
        recognition.start()
      } catch {
        setSpeechState('error')
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setSpeechState('error')
    }

    return () => {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      if (recognitionRef.current === recognition) recognitionRef.current = null
    }
  }, [accessToken, actor.email, actor.name, actor.role, joined, meeting.id, meeting.status])

  const reportBadge = transcriptStatusLabel(reportStatus)
  const canGenerateReport = meeting.status === 'completed' && !report && !finishing

  const rightSummary = useMemo(
    () => [
      {
        label: 'Participants détectés',
        value: participantCount,
        color: 'var(--cyan2)',
      },
      {
        label: 'Statut réunion',
        value: meeting.status === 'completed' ? 'Terminée' : joined ? 'En cours' : 'En attente',
        color: meeting.status === 'completed' ? 'var(--green)' : 'var(--amber)',
      },
      {
        label: 'Transcription locale',
        value: !speechSupported
          ? 'Navigateur non compatible'
          : speechState === 'listening'
            ? 'Active'
            : speechState === 'error'
              ? 'Erreur'
              : speechState === 'restarting'
                ? 'Reprise'
                : 'Inactive',
        color: speechState === 'error' ? 'var(--red)' : 'var(--cyan2)',
      },
    ],
    [joined, meeting.status, participantCount, speechState, speechSupported],
  )

  const handleFinishMeeting = async () => {
    setFinishing(true)
    setReportError('')
    try {
      const data = await finishMeeting({
        meetingId: meeting.id,
        closingNote: finishNote.trim() || undefined,
      })
      setReport(data.report || null)
      setReportStatus(data.meeting?.reportStatus || (data.report ? 'ready' : 'error'))
      if (typeof onMeetingFinished === 'function') onMeetingFinished(data.meeting)
    } catch (err) {
      setReportStatus('error')
      setReportError(err.message || 'Impossible de terminer la réunion.')
    } finally {
      setFinishing(false)
    }
  }

  const handleGenerateReport = async () => {
    setFinishing(true)
    setReportStatus('running')
    setReportError('')
    try {
      const data = await generateMeetingReport({ meetingId: meeting.id })
      setReport(data.report || null)
      setReportStatus('ready')
      const latest = await fetchMeetingReport(meeting.id).catch(() => null)
      if (latest?.report) setReport(latest.report)
    } catch (err) {
      setReportStatus('error')
      setReportError(err.message || 'Impossible de générer le rapport.')
    } finally {
      setFinishing(false)
    }
  }

  const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si'

  return (
    <div>
      <Grid cols={3} gap={12}>
        {rightSummary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} color={item.color} />
        ))}
      </Grid>

      <SectionTitle
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Pill type={reportBadge.type}>{reportBadge.text}</Pill>
            {backHref && (
              <Link to={backHref} style={{ textDecoration: 'none' }}>
                <Btn small variant="ghost">
                  Retour
                </Btn>
              </Link>
            )}
          </div>
        }
      >
        Salle intégrée WorkSphere
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '18px', alignItems: 'start' }}>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                {meeting.type === 'employee_rh' ? 'Réunion RH ↔ employé' : 'Réunion RH ↔ candidat'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                {formatDate(meeting.scheduledAt)}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'right' }}>
              <div>Salle: {meeting.roomName}</div>
              <div>
                {actor.name} · {actor.role}
              </div>
            </div>
          </div>

          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <JitsiMeeting
              domain={domain}
              roomName={meeting.roomName}
              userInfo={{ displayName: actor.name, email: actor.email }}
              configOverwrite={{
                prejoinPageEnabled: false,
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                disableModeratorIndicator: true,
                startScreenSharing: false,
                enableWelcomePage: false,
              }}
              interfaceConfigOverwrite={{
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                MOBILE_APP_PROMO: false,
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
              }}
              getIFrameRef={(node) => {
                node.style.height = '720px'
                node.style.background = '#05080d'
              }}
              onApiReady={(externalApi) => {
                setApi(externalApi)
                externalApi.addListener('videoConferenceJoined', () => {
                  setJoined(true)
                  setParticipantCount(1)
                })
                externalApi.addListener('participantJoined', () => {
                  setParticipantCount((count) => count + 1)
                })
                externalApi.addListener('participantLeft', () => {
                  setParticipantCount((count) => Math.max(1, count - 1))
                })
                externalApi.addListener('readyToClose', () => {
                  setJoined(false)
                })
              }}
              onReadyToClose={() => {
                setJoined(false)
              }}
              spinner={() => (
                <div style={{ minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                  Chargement de la réunion…
                </div>
              )}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
              Détails
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
              <div>
                <strong>RH:</strong> {meeting.rhName} ({meeting.rhEmail || '—'})
              </div>
              <div>
                <strong>Participant:</strong> {meeting.participantName} ({meeting.participantEmail || '—'})
              </div>
              <div>
                <strong>Note de départ:</strong> {meeting.note || '—'}
              </div>
            </div>
            {canFinish && meeting.status !== 'completed' && (
              <>
                <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Clôture RH
                </div>
                <textarea
                  style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', marginTop: '8px' }}
                  value={finishNote}
                  onChange={(e) => setFinishNote(e.target.value)}
                  placeholder="Décisions RH, points clés, prochain suivi…"
                />
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn onClick={handleFinishMeeting} disabled={finishing}>
                    {finishing ? 'Clôture…' : 'Terminer la réunion'}
                  </Btn>
                </div>
              </>
            )}
            {meeting.status === 'completed' && !report && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <Btn onClick={handleGenerateReport} disabled={!canGenerateReport || finishing}>
                  {finishing ? 'Génération…' : 'Générer le rapport IA'}
                </Btn>
              </div>
            )}
            {reportError && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--red)', lineHeight: 1.6 }}>
                {reportError}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border2)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
              Rapport IA
            </div>
            {!report ? (
              <div style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: 1.7 }}>
                {meeting.status === 'completed'
                  ? 'Le rapport sera disponible dès que la transcription audio aura été résumée.'
                  : 'Le rapport sera généré automatiquement à la fin de la réunion.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                  {report.title || 'Rapport de réunion'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                  {report.conciseReport || report.summary || '—'}
                </div>
                {Array.isArray(report.decisions) && report.decisions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Décisions
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text2)', fontSize: '13px', lineHeight: 1.7 }}>
                      {report.decisions.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {Array.isArray(report.nextSteps) && report.nextSteps.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Prochaines étapes
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text2)', fontSize: '13px', lineHeight: 1.7 }}>
                      {report.nextSteps.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
