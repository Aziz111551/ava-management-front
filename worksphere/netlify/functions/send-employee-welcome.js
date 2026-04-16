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
  return s.split(/\s+/)[0] || 'Utilisateur'
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
  const name = String(body.name || '').trim()
  const temporaryPassword = String(body.temporaryPassword || '')
  const loginUrl = String(body.loginUrl || '').trim().replace(/\/$/, '')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'E-mail invalide' })
  }
  if (!temporaryPassword || temporaryPassword.length < 6) {
    return json(400, { ok: false, error: 'Mot de passe temporaire requis (min. 6 caractères).' })
  }

  const prenom = firstName(name)
  const subject = 'AVA Management — vos accès ont été créés'
  const loginBlock =
    loginUrl &&
    `<p style="margin:20px 0 0;font-size:13px;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 20px;background:#14b8a6;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:600;">Se connecter</a></p>`

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0b1220;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:#111827;border-radius:16px;padding:32px;border:1px solid #1e293b;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;margin:0 auto 12px;background:#14b8a6;border-radius:10px;line-height:48px;font-size:22px;font-weight:700;color:#0f172a;">A</div>
          <div style="color:#f8fafc;font-size:18px;font-weight:600;">AVA Management</div>
        </div>
        <h1 style="color:#f8fafc;font-size:18px;font-weight:600;margin:0 0 12px;">Vos accès ont été créés</h1>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">Bonjour ${escapeHtml(prenom)},</p>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 20px;">Votre compte AVA Management a été créé. Voici vos identifiants :</p>
        <div style="background:#0f172a;border-radius:12px;padding:20px;border:1px solid #334155;">
          <div style="color:#64748b;font-size:12px;margin-bottom:6px;">Email</div>
          <div style="color:#38bdf8;font-size:15px;word-break:break-all;margin-bottom:16px;">${escapeHtml(email)}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:6px;">Mot de passe temporaire</div>
          <div style="color:#14b8a6;font-size:22px;font-weight:700;letter-spacing:0.04em;font-family:ui-monospace,monospace;">${escapeHtml(temporaryPassword)}</div>
        </div>
        <p style="color:#64748b;font-size:12px;line-height:1.5;margin:16px 0 0;">Changez ce mot de passe après votre première connexion.</p>
        ${loginBlock || ''}
        <p style="color:#475569;font-size:12px;margin-top:28px;">— AVA Management / WorkSphere</p>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Bonjour ${prenom},\n\nVotre compte AVA Management a été créé.\n\nEmail : ${email}\nMot de passe temporaire : ${temporaryPassword}\n${loginUrl ? `\nConnexion : ${loginUrl}\n` : ''}\nChangez ce mot de passe après la première connexion.\n— AVA Management / WorkSphere`

  let sendResult = { ok: false, error: 'Envoi non tenté.' }
  try {
    sendResult = await sendResend({ to: email, subject, html, text })
  } catch (err) {
    sendResult = { ok: false, error: err?.message || 'Erreur Resend.' }
  }

  if (!sendResult.ok) {
    return json(200, {
      ok: true,
      emailSent: false,
      message: sendResult.error,
    })
  }

  return json(200, {
    ok: true,
    emailSent: true,
    message: 'E-mail de bienvenue envoyé.',
  })
}
