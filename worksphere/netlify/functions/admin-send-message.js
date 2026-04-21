const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-ws-admin-key, X-Ws-Admin-Key',
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
  if (!key) return { ok: false, error: 'RESEND_API_KEY manquante sur Netlify.' }
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

  const expected = (process.env.WS_ADMIN_API_KEY || '').trim()
  const provided =
    event.headers['x-ws-admin-key'] ||
    event.headers['X-Ws-Admin-Key'] ||
    event.headers['X-WS-Admin-Key'] ||
    ''
  if (!expected || String(provided).trim() !== expected) {
    return json(403, { ok: false, error: 'Clé administrateur invalide ou WS_ADMIN_API_KEY non configurée.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const to = String(body.to || '').trim().toLowerCase()
  const subject = String(body.subject || '').trim().slice(0, 200)
  let html = String(body.html || '').trim()
  const text = body.text != null ? String(body.text) : ''

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json(400, { ok: false, error: 'E-mail destinataire invalide' })
  }
  if (!subject) {
    return json(400, { ok: false, error: 'Objet requis' })
  }

  if (!html) {
    const plain = text || '(message vide)'
    html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;border:1px solid #1e293b;">
<tr><td style="padding:24px;">
<p style="margin:0;font-size:14px;line-height:1.6;color:#e2e8f0;font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(plain)}</p>
</td></tr>
<tr><td style="padding:12px 24px 24px;"><p style="margin:0;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">Message envoyé depuis l’espace administrateur AVA / WorkSphere.</p></td></tr>
</table>
</body></html>`
  }

  const result = await sendResend({ to, subject, html, text: text || undefined })
  if (!result.ok) {
    return json(200, { ok: true, emailSent: false, message: result.error })
  }
  return json(200, { ok: true, emailSent: true, message: 'E-mail envoyé.' })
}
