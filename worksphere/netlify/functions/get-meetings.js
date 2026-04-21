import {
  cleanEmail,
  getMeetingStore,
  listMeetings,
  meetingCors,
  meetingJson,
  toMeetingSummary,
} from './lib/meetings.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: meetingCors, body: '' }
  if (event.httpMethod !== 'GET') return meetingJson(405, { ok: false, error: 'Method not allowed' })

  try {
    const store = getMeetingStore(event)
    const viewer = String(event.queryStringParameters?.viewer || '').trim()
    const email = cleanEmail(event.queryStringParameters?.email)
    const rows = await listMeetings(store)

    const filtered = rows.filter((meeting) => {
      if (viewer === 'rh') return true
      if (!email) return false
      if (cleanEmail(meeting.participantEmail) === email || cleanEmail(meeting.rhEmail) === email) return true
      const co = Array.isArray(meeting.coParticipants) ? meeting.coParticipants : []
      return co.some((p) => cleanEmail(p.email) === email)
    })

    return meetingJson(200, {
      ok: true,
      meetings: filtered.map((meeting) => ({
        ...toMeetingSummary(meeting),
        links: meeting.links || null,
      })),
    })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de charger les réunions.' })
  }
}
