import {
  cleanEmail,
  cleanText,
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
  meetingSecret,
  signMeetingJoinToken,
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
  const role = cleanText(body.role, 'participant')
  const name = cleanText(body.name, 'Participant')
  const email = cleanEmail(body.email)
  if (!meetingId) return meetingJson(400, { ok: false, error: 'meetingId requis.' })

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    const token = signMeetingJoinToken(
      {
        mid: meetingId,
        role,
        name,
        email,
        type: meeting.type,
      },
      meetingSecret(),
    )

    return meetingJson(200, { ok: true, token })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de générer le token.' })
  }
}
