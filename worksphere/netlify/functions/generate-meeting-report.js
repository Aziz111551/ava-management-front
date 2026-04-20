import { generateMeetingReport } from './lib/meetingReport.js'
import {
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

  const meetingId = String(body.meetingId || '').trim()
  if (!meetingId) return meetingJson(400, { ok: false, error: 'meetingId requis.' })

  try {
    const store = getMeetingStore(event)
    const meeting = await getMeetingById(store, meetingId)
    if (!meeting) return meetingJson(404, { ok: false, error: 'Réunion introuvable.' })

    const savedPreparing = await saveMeeting(store, {
      ...meeting,
      reportStatus: 'running',
    })

    const report = await generateMeetingReport(savedPreparing)
    const saved = await saveMeeting(store, {
      ...savedPreparing,
      reportStatus: 'ready',
      transcriptStatus: savedPreparing.transcriptStatus || 'capturing',
      summaryReport: report,
      reportGeneratedAt: report.generatedAt,
    })

    return meetingJson(200, { ok: true, report: saved.summaryReport })
  } catch (err) {
    try {
      const store = getMeetingStore(event)
      const meeting = await getMeetingById(store, meetingId)
      if (meeting) {
        await saveMeeting(store, {
          ...meeting,
          reportStatus: 'error',
        })
      }
    } catch {
      /* ignore secondary save errors */
    }
    return meetingJson(500, { ok: false, error: err?.message || 'Impossible de générer le rapport.' })
  }
}
