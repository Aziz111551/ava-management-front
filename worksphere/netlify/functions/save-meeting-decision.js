import {
  appendMeetingEvent,
  cleanText,
  createMeetingEvent,
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
  saveMeeting,
} from './lib/meetings.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: meetingCors, body: '' }
  if (event.httpMethod !== 'POST') return meetingJson(405, { ok: false, error: 'Method not allowed' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return meetingJson(400, { ok: false, error: 'JSON invalide' })
  }

  const meetingId = cleanText(body.meetingId)
  const decision = cleanText(body.decision)
  const decisionReason = cleanText(body.decisionReason)
  const actorName = cleanText(body.actorName, 'Responsable RH')
  const actorEmail = cleanText(body.actorEmail)
  const actorRole = cleanText(body.actorRole, 'rh')
  const employeeAccount =
    body.employeeAccount && typeof body.employeeAccount === 'object'
      ? body.employeeAccount
      : null

  if (!meetingId) return meetingJson(400, { ok: false, error: 'meetingId requis.' })
  if (!['accepted', 'refused'].includes(decision)) {
    return meetingJson(400, { ok: false, error: 'decision invalide.' })
  }

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    let saved = await saveMeeting(store, {
      ...meeting,
      phase3Decision: decision,
      phase3DecisionAt: new Date().toISOString(),
      phase3DecisionReason: decisionReason,
      ...(employeeAccount ? { employeeAccount } : {}),
    })

    saved = await appendMeetingEvent(
      store,
      saved,
      createMeetingEvent(decision === 'accepted' ? 'phase3_accepted' : 'phase3_refused', {
        actorName,
        actorEmail,
        actorRole,
        detail: decisionReason || (decision === 'accepted' ? 'Candidat accepté.' : 'Candidat refusé.'),
      }),
    )

    if (employeeAccount) {
      saved = await appendMeetingEvent(
        store,
        saved,
        createMeetingEvent('employee_account_created', {
          actorName,
          actorEmail,
          actorRole,
          detail: `Compte employé créé pour ${employeeAccount.email || meeting.participantEmail}.`,
        }),
      )
    }

    return meetingJson(200, { ok: true, meeting: saved })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible d’enregistrer la décision.' })
  }
}
