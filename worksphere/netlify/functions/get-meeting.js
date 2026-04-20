import {
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
  meetingSecret,
  toMeetingSummary,
  verifyMeetingJoinToken,
} from './lib/meetings.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: meetingCors, body: '' }
  if (event.httpMethod !== 'GET') return meetingJson(405, { ok: false, error: 'Method not allowed' })

  const id = String(event.queryStringParameters?.id || '').trim()
  const token = String(event.queryStringParameters?.token || '').trim()
  if (!id && !token) return meetingJson(400, { ok: false, error: 'id ou token requis.' })

  try {
    let meetingId = id
    if (token) {
      const payload = verifyMeetingJoinToken(token, meetingSecret())
      if (!payload) return meetingJson(401, { ok: false, error: 'Token de réunion invalide.' })
      meetingId = String(payload.mid || '').trim()
    }

    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    return meetingJson(200, {
      ok: true,
      meeting: {
        ...meeting,
        summary: toMeetingSummary(meeting),
      },
    })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de charger la réunion.' })
  }
}
