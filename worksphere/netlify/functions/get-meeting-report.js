import {
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
} from './lib/meetings.js'

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: meetingCors, body: '' }
  if (event.httpMethod !== 'GET') return meetingJson(405, { ok: false, error: 'Method not allowed' })

  const meetingId = String(event.queryStringParameters?.id || '').trim()
  if (!meetingId) return meetingJson(400, { ok: false, error: 'id requis.' })

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    return meetingJson(200, {
      ok: true,
      reportStatus: meeting.reportStatus || 'idle',
      report: meeting.summaryReport || null,
      reportError: meeting.reportError || null,
      transcriptCount: Array.isArray(meeting.transcript) ? meeting.transcript.length : 0,
    })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de charger le rapport.' })
  }
}
