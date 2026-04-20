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

function firstName(full) {
  const s = String(full || '').trim()
  return s.split(/\s+/)[0] || 'Candidat'
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
    body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const name = String(body.name || '').trim()
  const reason = String(body.reason || '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'E-mail invalide' })
  }

  const prenom = firstName(name)
  const subject = 'AVA Management — retour sur votre candidature'
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;border:1px solid #1e293b;">
<tr><td style="padding:28px 24px 8px;text-align:center;">
  <p style="margin:0;font-size:18px;font-weight:bold;color:#f8fafc;font-family:Arial,sans-serif;">AVA Management</p>
</td></tr>
<tr><td style="padding:12px 24px 8px;">
  <p style="margin:0;font-size:15px;line-height:1.55;color:#cbd5e1;font-family:Arial,sans-serif;">Bonjour ${escapeHtml(prenom)},</p>
</td></tr>
<tr><td style="padding:8px 24px 10px;">
  <p style="margin:0;font-size:14px;line-height:1.6;color:#e2e8f0;font-family:Arial,sans-serif;">
    Merci pour le temps consacré à nos échanges. Après étude de votre entretien et de votre parcours, nous ne poursuivons pas votre candidature pour cette étape.
  </p>
</td></tr>
${reason ? `<tr><td style="padding:8px 24px 10px;"><p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;font-family:Arial,sans-serif;"><strong>Retour RH :</strong> ${escapeHtml(reason)}</p></td></tr>` : ''}
<tr><td style="padding:18px 24px 28px;"><p style="margin:0;font-size:12px;color:#64748b;font-family:Arial,sans-serif;">Nous vous remercions pour votre intérêt et vous souhaitons une bonne continuation. — AVA Management / WorkSphere</p></td></tr>
</table>
</body></html>`

  const text = `Bonjour ${prenom},\n\nMerci pour le temps consacré à nos échanges. Après étude de votre entretien et de votre parcours, nous ne poursuivons pas votre candidature pour cette étape.\n${reason ? `\nRetour RH : ${reason}\n` : '\n'}\nNous vous souhaitons une bonne continuation.\n— AVA Management / WorkSphere`

  const result = await sendResend({ to: email, subject, html, text })
  if (!result.ok) {
    return json(200, { ok: true, emailSent: false, message: result.error })
  }
  return json(200, { ok: true, emailSent: true, message: 'E-mail de refus envoyé.' })
}
