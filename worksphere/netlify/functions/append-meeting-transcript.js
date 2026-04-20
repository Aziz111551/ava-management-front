import {
  appendMeetingEvent,
  cleanText,
  createMeetingEvent,
  getMeetingById,
  getMeetingStore,
  meetingCors,
  meetingJson,
  meetingSecret,
  saveMeeting,
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
  const speakerName = cleanText(body.speakerName, 'Participant')
  const speakerEmail = cleanText(body.speakerEmail)
  const speakerRole = cleanText(body.speakerRole, 'participant')
  const text = cleanText(body.text)
  if (!meetingId || !text) {
    return meetingJson(400, { ok: false, error: 'meetingId et text requis.' })
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

    const line = {
      id: `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      speakerName,
      speakerEmail,
      speakerRole,
      text,
    }
    const transcript = [...(Array.isArray(meeting.transcript) ? meeting.transcript : []), line].slice(-400)
    const saved = await saveMeeting(store, {
      ...meeting,
      status: meeting.status === 'scheduled' ? 'live' : meeting.status,
      transcriptStatus: 'capturing',
      transcript,
    })
    const logged = await appendMeetingEvent(
      store,
      saved,
      createMeetingEvent('transcript_line', {
        actorName: speakerName,
        actorEmail: speakerEmail,
        actorRole: speakerRole,
        text,
      }),
    )
    return meetingJson(200, { ok: true, transcriptCount: logged.transcript.length })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible d’ajouter la transcription.' })
  }
}
