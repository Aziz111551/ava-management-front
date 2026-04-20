import { generateMeetingReport } from './lib/meetingReport.js'
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
  const closingNote = cleanText(body.closingNote)
  if (!meetingId) return meetingJson(400, { ok: false, error: 'meetingId requis.' })

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    let saved = await saveMeeting(store, {
      ...meeting,
      status: 'completed',
      endedAt: new Date().toISOString(),
      closingNote: closingNote || meeting.closingNote || '',
      reportStatus: 'running',
      transcriptStatus: meeting.transcript?.length ? 'captured' : meeting.transcriptStatus || 'idle',
    })
    saved = await appendMeetingEvent(
      store,
      saved,
      createMeetingEvent('meeting_completed', {
        actorRole: 'rh',
        actorName: meeting.rhName,
        actorEmail: meeting.rhEmail,
        detail: closingNote || 'Réunion terminée par le RH.',
      }),
    )

    try {
      const report = await generateMeetingReport(saved)
      saved = await saveMeeting(store, {
        ...saved,
        reportStatus: 'ready',
        summaryReport: report,
        reportGeneratedAt: report.generatedAt,
      })
      saved = await appendMeetingEvent(
        store,
        saved,
        createMeetingEvent('report_generated', {
          actorRole: 'system',
          actorName: 'WorkSphere AI',
          detail: 'Rapport IA généré à partir de la transcription et du journal.',
        }),
      )
    } catch (err) {
      saved = await saveMeeting(store, {
        ...saved,
        reportStatus: 'error',
        reportError: err?.message || 'Génération du rapport impossible.',
      })
      saved = await appendMeetingEvent(
        store,
        saved,
        createMeetingEvent('report_generation_failed', {
          actorRole: 'system',
          actorName: 'WorkSphere AI',
          detail: err?.message || 'Génération du rapport impossible.',
        }),
      )
    }

    return meetingJson(200, {
      ok: true,
      meeting: saved,
      report: saved.summaryReport || null,
    })
  } catch (err) {
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de terminer la réunion.' })
  }
}
