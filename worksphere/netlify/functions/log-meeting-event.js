import {
  appendMeetingEvent,
  cleanText,
  createMeetingEvent,
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
  meetingSecret,
  verifyMeetingJoinToken,
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
  const token = cleanText(body.token)
  const type = cleanText(body.type)
  const detail = cleanText(body.detail)
  const actorName = cleanText(body.actorName, 'Participant')
  const actorEmail = cleanText(body.actorEmail)
  const actorRole = cleanText(body.actorRole, 'participant')

  if (!meetingId || !type) {
    return meetingJson(400, { ok: false, error: 'meetingId et type requis.' })
  }

  if (token) {
    const payload = verifyMeetingJoinToken(token, meetingSecret())
    if (!payload || String(payload.mid || '') !== meetingId) {
      return meetingJson(401, { ok: false, error: 'Token de réunion invalide.' })
    }
  }

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    const saved = await appendMeetingEvent(
      store,
      meeting,
      createMeetingEvent(type, {
        actorName,
        actorEmail,
        actorRole,
        detail,
      }),
    )
    return meetingJson(200, { ok: true, eventCount: Array.isArray(saved.events) ? saved.events.length : 0 })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible d’enregistrer l’événement.' })
  }
}
