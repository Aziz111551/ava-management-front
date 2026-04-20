import {
  appendMeetingEvent,
  buildRoomName,
  buildSiteUrl,
  cleanEmail,
  cleanText,
  createMeetingEvent,
  createMeetingLinks,
  getMeetingStore,
  isValidMeetingType,
  makeMeetingId,
  meetingCors,
  meetingJson,
  meetingSecret,
  nowIso,
  saveMeeting,
  signMeetingJoinToken,
  toMeetingSummary,
} from './lib/meetings.js'

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendResend({ to, subject, html, text }) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) return { ok: false, error: 'RESEND_API_KEY manquante.' }

  const from = (process.env.EMAIL_FROM || 'WorkSphere <onboarding@resend.dev>').trim()
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    return {
      ok: false,
      error: data?.message || data?.error?.message || data?.error || `Erreur Resend HTTP ${res.status}`,
    }
  }
  return { ok: true }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: meetingCors, body: '' }
  if (event.httpMethod !== 'POST') return meetingJson(405, { ok: false, error: 'Method not allowed' })

  const secret = meetingSecret()
  if (!secret) {
    return meetingJson(500, { ok: false, error: 'MEETING_JWT_SECRET ou TECH_TEST_JWT_SECRET requis.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return meetingJson(400, { ok: false, error: 'JSON invalide' })
  }

  const type = cleanText(body.type)
  const scheduledAt = cleanText(body.scheduledAt)
  const note = cleanText(body.note)
  const rhName = cleanText(body.rhName, 'Responsable RH')
  const rhEmail = cleanEmail(body.rhEmail)
  const participantName = cleanText(body.participantName, 'Participant')
  const participantEmail = cleanEmail(body.participantEmail)
  const participantRole = cleanText(body.participantRole, type === 'employee_rh' ? 'employee' : 'candidate')
  const participantId = cleanText(body.participantId)
  const candidateId = cleanText(body.candidateId)

  if (!isValidMeetingType(type)) {
    return meetingJson(400, { ok: false, error: 'type invalide.' })
  }
  if (!participantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
    return meetingJson(400, { ok: false, error: 'participantEmail invalide.' })
  }
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
    return meetingJson(400, { ok: false, error: 'scheduledAt (ISO) requis.' })
  }

  const store = getMeetingStore(event)
  const id = makeMeetingId()
  const roomName = buildRoomName(id)
  const createdAt = nowIso()
  const guestToken = signMeetingJoinToken(
    {
      mid: id,
      role: participantRole,
      email: participantEmail,
      name: participantName,
      type,
    },
    secret,
  )

  const record = {
    id,
    type,
    roomName,
    status: 'scheduled',
    reportStatus: 'idle',
    transcriptStatus: 'idle',
    scheduledAt,
    note,
    rhName,
    rhEmail,
    participantName,
    participantEmail,
    participantRole,
    participantId: participantId || null,
    candidateId: candidateId || null,
    transcript: [],
    events: [
      createMeetingEvent('meeting_created', {
        actorName: rhName,
        actorEmail: rhEmail,
        actorRole: 'rh',
        detail: `Réunion créée pour ${participantName}`,
      }),
    ],
    summaryReport: null,
    reportGeneratedAt: null,
    createdAt,
    updatedAt: createdAt,
  }

  const siteUrl = buildSiteUrl(event)
  const links = createMeetingLinks(siteUrl, record, { guestToken })
  const saved = await saveMeeting(store, {
    ...record,
    links,
  })

  const dateLabel = new Date(scheduledAt).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const subject =
    type === 'employee_rh'
      ? 'WorkSphere — Réunion RH dans l’application'
      : 'AVA Management — Phase 2 : réunion intégrée WorkSphere'

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111827;border-radius:18px;border:1px solid #1f2937;">
<tr><td style="padding:28px 26px 8px;">
  <p style="margin:0;font-size:20px;font-weight:bold;color:#f8fafc;font-family:Arial,sans-serif;">${escapeHtml(subject)}</p>
  <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;font-family:Arial,sans-serif;">
    Bonjour ${escapeHtml(participantName)}, votre réunion est planifiée directement dans l’application WorkSphere.
  </p>
</td></tr>
<tr><td style="padding:14px 26px;">
  <div style="background:#0f172a;border:1px solid #334155;border-radius:14px;padding:16px;">
    <div style="color:#94a3b8;font-size:12px;font-family:Arial,sans-serif;">Créneau</div>
    <div style="color:#f8fafc;font-size:15px;font-weight:bold;margin-top:6px;font-family:Arial,sans-serif;">${escapeHtml(dateLabel)}</div>
    ${note ? `<p style="margin:12px 0 0;font-size:13px;color:#cbd5e1;line-height:1.55;font-family:Arial,sans-serif;"><strong>Note RH :</strong> ${escapeHtml(note)}</p>` : ''}
  </div>
</td></tr>
<tr><td style="padding:10px 26px 4px;">
  <a href="${escapeHtml(links.guestRoom)}" style="display:inline-block;padding:13px 18px;background:#20b2aa;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">Rejoindre la réunion dans WorkSphere</a>
</td></tr>
<tr><td style="padding:10px 26px 26px;">
  <p style="margin:0;font-size:11px;color:#64748b;word-break:break-all;font-family:Arial,sans-serif;">${escapeHtml(links.guestRoom)}</p>
</td></tr>
</table>
</body></html>`

  const text = `Bonjour ${participantName},\n\nVotre réunion WorkSphere est planifiée pour ${dateLabel}.\nLien de jointure : ${links.guestRoom}\n${note ? `\nNote RH : ${note}\n` : '\n'}`

  let emailResult = { ok: false, error: 'Envoi non tenté.' }
  try {
    emailResult = await sendResend({
      to: participantEmail,
      subject,
      html,
      text,
    })
  } catch (err) {
    emailResult = { ok: false, error: err?.message || 'Erreur Resend.' }
  }

  const finalMeeting = await appendMeetingEvent(
    store,
    saved,
    createMeetingEvent(emailResult.ok ? 'invitation_sent' : 'invitation_failed', {
      actorName: rhName,
      actorEmail: rhEmail,
      actorRole: 'rh',
      detail: emailResult.ok
        ? `Invitation envoyée à ${participantEmail}`
        : `Échec d’envoi à ${participantEmail}: ${emailResult.error || 'erreur inconnue'}`,
    }),
  )

  return meetingJson(200, {
    ok: true,
    meeting: toMeetingSummary(finalMeeting),
    links,
    guestToken,
    emailSent: emailResult.ok,
    message: emailResult.ok ? 'Réunion créée et invitation envoyée.' : emailResult.error,
  })
}
