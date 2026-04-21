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

function normalizeInvitees(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const item of list) {
    const name = cleanText(item?.name, '')
    const email = cleanEmail(item?.email)
    const participantId = cleanText(item?.participantId)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    out.push({
      name: name || email.split('@')[0],
      email,
      participantId: participantId || null,
      role: cleanText(item?.role, 'employee'),
    })
  }
  return out
}

function dedupeInvitees(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const k = row.email.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(row)
  }
  return out
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
  let participantName = cleanText(body.participantName, 'Participant')
  let participantEmail = cleanEmail(body.participantEmail)
  let participantRole = cleanText(body.participantRole, type === 'employee_rh' ? 'employee' : 'candidate')
  const participantId = cleanText(body.participantId)
  const candidateId = cleanText(body.candidateId)
  const employeesPayload = normalizeInvitees(body.employees)
  const additionalEmployeesPayload = normalizeInvitees(body.additionalEmployees)

  if (!isValidMeetingType(type)) {
    return meetingJson(400, { ok: false, error: 'type invalide.' })
  }
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
    return meetingJson(400, { ok: false, error: 'scheduledAt (ISO) requis.' })
  }

  let coParticipants = []

  if (type === 'employee_candidate_rh') {
    if (!participantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
      return meetingJson(400, { ok: false, error: 'E-mail du candidat invalide.' })
    }
    if (!employeesPayload.length) {
      return meetingJson(400, { ok: false, error: 'Au moins un employé est requis pour cette réunion.' })
    }
    participantRole = 'candidate'
    coParticipants = employeesPayload.map((e) => ({ ...e, role: 'employee' }))
  } else if (type === 'employee_rh') {
    if (!participantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
      return meetingJson(400, { ok: false, error: 'participantEmail invalide.' })
    }
    participantRole = cleanText(body.participantRole, 'employee')
    coParticipants = additionalEmployeesPayload.map((e) => ({ ...e, role: 'employee' }))
    const primaryLower = participantEmail.toLowerCase()
    coParticipants = coParticipants.filter((e) => e.email.toLowerCase() !== primaryLower)
  } else {
    if (!participantEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail)) {
      return meetingJson(400, { ok: false, error: 'participantEmail invalide.' })
    }
    participantRole = cleanText(body.participantRole, 'candidate')
    const panelEmployees = employeesPayload.map((e) => ({ ...e, role: 'employee' }))
    const primaryLower = participantEmail.toLowerCase()
    coParticipants = panelEmployees.filter((e) => e.email.toLowerCase() !== primaryLower)
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

  const coNames = coParticipants.map((c) => c.name).filter(Boolean)
  const createdDetail =
    type === 'employee_candidate_rh'
      ? `Réunion candidat + employé(s) : ${participantName}${coNames.length ? ` · Employés : ${coNames.join(', ')}` : ''}`
      : type === 'candidate_phase2' && coNames.length
        ? `Phase 2 : ${participantName} · Employés invités : ${coNames.join(', ')}`
        : coNames.length
          ? `Réunion créée pour ${participantName} + ${coNames.length} autre(s) participant(s)`
          : `Réunion créée pour ${participantName}`

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
    coParticipants,
    transcript: [],
    events: [
      createMeetingEvent('meeting_created', {
        actorName: rhName,
        actorEmail: rhEmail,
        actorRole: 'rh',
        detail: createdDetail,
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

  const invitees = dedupeInvitees([
    { email: participantEmail, name: participantName, role: participantRole },
    ...coParticipants.map((c) => ({ email: c.email, name: c.name, role: c.role || 'employee' })),
  ])

  const subject =
    type === 'employee_candidate_rh'
      ? 'WorkSphere — Réunion : RH, candidat et employé(s)'
      : type === 'employee_rh'
        ? 'WorkSphere — Réunion RH dans l’application'
        : 'AVA Management — Phase 2 : réunion intégrée WorkSphere'

  function buildInviteEmail(invName, guestLink) {
    const intro =
      type === 'employee_candidate_rh'
        ? 'Cette réunion réunit le responsable RH, le candidat et le(s) employé(s) dans la même salle WorkSphere. Votre lien personnel est ci-dessous.'
        : type === 'candidate_phase2' && coParticipants.length > 0
          ? 'Réunion Phase 2 (test physique) : le RH, le candidat et des membres de l’équipe sont conviés dans la même salle WorkSphere. Votre lien personnel est ci-dessous.'
          : type === 'candidate_phase2'
            ? 'Réunion Phase 2 (test physique) planifiée dans WorkSphere.'
            : coParticipants.length > 0
              ? 'Vous êtes invité(e) avec d’autres participants dans la même salle WorkSphere.'
              : 'Votre réunion est planifiée directement dans l’application WorkSphere.'
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#111827;border-radius:18px;border:1px solid #1f2937;">
<tr><td style="padding:28px 26px 8px;">
  <p style="margin:0;font-size:20px;font-weight:bold;color:#f8fafc;font-family:Arial,sans-serif;">${escapeHtml(subject)}</p>
  <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;font-family:Arial,sans-serif;">
    Bonjour ${escapeHtml(invName)}, ${escapeHtml(intro)}
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
  <a href="${escapeHtml(guestLink)}" style="display:inline-block;padding:13px 18px;background:#20b2aa;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">Rejoindre la réunion dans WorkSphere</a>
</td></tr>
<tr><td style="padding:10px 26px 26px;">
  <p style="margin:0;font-size:11px;color:#64748b;word-break:break-all;font-family:Arial,sans-serif;">${escapeHtml(guestLink)}</p>
</td></tr>
</table>
</body></html>`
    const text = `Bonjour ${invName},\n\n${intro}\n\nCréneau : ${dateLabel}\nLien personnel : ${guestLink}\n${note ? `\nNote RH : ${note}\n` : '\n'}`
    return { html, text }
  }

  let finalMeeting = saved
  let allEmailsOk = true
  let lastEmailError = ''

  for (const inv of invitees) {
    const tokenInv = signMeetingJoinToken(
      { mid: id, role: inv.role, email: inv.email, name: inv.name, type },
      secret,
    )
    const guestLink = `${siteUrl}/meeting/join?token=${encodeURIComponent(tokenInv)}`
    const { html, text } = buildInviteEmail(inv.name, guestLink)
    let emailResult = { ok: false, error: 'Envoi non tenté.' }
    try {
      emailResult = await sendResend({ to: inv.email, subject, html, text })
    } catch (err) {
      emailResult = { ok: false, error: err?.message || 'Erreur Resend.' }
    }
    if (!emailResult.ok) {
      allEmailsOk = false
      lastEmailError = emailResult.error || 'Erreur envoi'
    }
    finalMeeting = await appendMeetingEvent(
      store,
      finalMeeting,
      createMeetingEvent(emailResult.ok ? 'invitation_sent' : 'invitation_failed', {
        actorName: rhName,
        actorEmail: rhEmail,
        actorRole: 'rh',
        detail: emailResult.ok
          ? `Invitation envoyée à ${inv.email} (${inv.name})`
          : `Échec d’envoi à ${inv.email}: ${emailResult.error || 'erreur inconnue'}`,
      }),
    )
  }

  return meetingJson(200, {
    ok: true,
    meeting: toMeetingSummary(finalMeeting),
    links,
    guestToken,
    emailSent: allEmailsOk,
    message: allEmailsOk ? 'Réunion créée et invitations envoyées.' : lastEmailError,
  })
}
