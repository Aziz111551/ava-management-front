const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendResend({ to, subject, html, text }) {
  const key = (process.env.RESEND_API_KEY || '').trim()
  if (!key) {
    return { ok: false, error: 'RESEND_API_KEY manquante.' }
  }
  const from = (process.env.EMAIL_FROM || 'WorkSphere <onboarding@resend.dev>').trim()
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const apiError =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      `Erreur Resend HTTP ${res.status}`
    return { ok: false, error: apiError }
  }
  return { ok: true }
}

function firstName(full) {
  const s = String(full || '').trim()
  return s.split(/\s+/)[0] || 'Candidat'
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const candidateName = String(body.candidateName || body.name || '').trim()
  const teamsUrl = String(body.teamsUrl || '').trim()
  const meetingAt = String(body.meetingAt || '').trim()
  const note = String(body.note || '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'E-mail invalide' })
  }
  if (!teamsUrl.startsWith('http')) {
    return json(400, { ok: false, error: 'teamsUrl requis.' })
  }
  let meetingDate = null
  try {
    meetingDate = meetingAt ? new Date(meetingAt) : null
  } catch {
    meetingDate = null
  }
  if (!meetingDate || Number.isNaN(meetingDate.getTime())) {
    return json(400, { ok: false, error: 'meetingAt (ISO) requis.' })
  }

  const prenom = firstName(candidateName)
  const dateLabel = meetingDate.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const subject = 'AVA Management — Phase 2 : entretien (Teams)'
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;border:1px solid #1e293b;">
<tr><td style="padding:28px 24px 8px;text-align:center;">
  <div style="width:48px;height:48px;background:#6264A7;border-radius:10px;margin:0 auto;line-height:48px;font-size:22px;color:#fff;font-family:Arial,sans-serif;">▶</div>
  <p style="margin:12px 0 0;font-size:18px;font-weight:bold;color:#f8fafc;font-family:Arial,sans-serif;">AVA Management — Phase 2</p>
</td></tr>
<tr><td style="padding:16px 24px 8px;">
  <p style="margin:0;font-size:15px;line-height:1.5;color:#94a3b8;font-family:Arial,sans-serif;">Bonjour ${escapeHtml(prenom)},</p>
</td></tr>
<tr><td style="padding:8px 24px 16px;">
  <p style="margin:0;font-size:14px;line-height:1.55;color:#e2e8f0;font-family:Arial,sans-serif;">
    Vous avez <strong>réussi la phase test technique</strong>. Prochaine étape : <strong>entretien</strong> (présentiel ou Teams selon l’organisation).
  </p>
</td></tr>
<tr><td style="padding:12px 24px;">
  <div style="background:#0f172a;border-radius:12px;padding:18px;border:1px solid #334155;">
    <div style="color:#94a3b8;font-size:12px;margin-bottom:8px;">Créneau</div>
    <div style="color:#f8fafc;font-size:15px;margin-bottom:14px;font-family:Arial,sans-serif;"><strong>${escapeHtml(dateLabel)}</strong></div>
    <a href="${escapeHtml(teamsUrl)}" style="display:inline-block;padding:12px 18px;background:#6264A7;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;font-family:Arial,sans-serif;">Rejoindre sur Teams</a>
    <p style="margin:12px 0 0;font-size:11px;color:#64748b;word-break:break-all;">${escapeHtml(teamsUrl)}</p>
  </div>
</td></tr>
${note ? `<tr><td style="padding:8px 24px 16px;"><p style="margin:0;font-size:13px;color:#94a3b8;"><strong>RH :</strong> ${escapeHtml(note)}</p></td></tr>` : ''}
<tr><td style="padding:16px 24px 28px;"><p style="margin:0;font-size:12px;color:#64748b;">— AVA Management / WorkSphere</p></td></tr>
</table>
</body></html>`

  const text = `Bonjour ${prenom},\n\nPhase 2 — entretien Teams\n\nDate : ${dateLabel}\nLien : ${teamsUrl}\n\n${note ? `Message RH : ${note}\n` : ''}— AVA Management / WorkSphere`

  let sendResult = { ok: false, error: 'Envoi non tenté.' }
  try {
    sendResult = await sendResend({ to: email, subject, html, text })
  } catch (err) {
    sendResult = { ok: false, error: err?.message || 'Erreur Resend.' }
  }

  if (!sendResult.ok) {
    return json(200, { ok: true, emailSent: false, message: sendResult.error })
  }
  return json(200, { ok: true, emailSent: true, message: 'Convocation Phase 2 envoyée.' })
}
