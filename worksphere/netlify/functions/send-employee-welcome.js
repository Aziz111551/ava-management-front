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
  const temporaryPassword = String(body.temporaryPassword || '').trim()
  const loginUrl = String(body.loginUrl || '').trim().replace(/\/$/, '')
  const hasPassword = temporaryPassword.length >= 6

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'E-mail invalide' })
  }

  const prenom = firstName(name)
  const subject = hasPassword
    ? 'AVA Management — vos accès ont été créés'
    : 'AVA Management — votre compte a été créé'

  const loginHref = loginUrl ? escapeHtml(loginUrl) : ''

  /** HTML compatible clients / aperçus (Messenger, etc.) : table + texte lisible, pas que des divs. */
  const coreRows = hasPassword
    ? `<tr><td style="padding:0 0 14px;font-size:15px;line-height:1.55;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
          Votre compte AVA Management est prêt. Identifiants :
        </td></tr>
        <tr><td style="padding:0 0 8px;font-size:14px;line-height:1.5;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">Email</td></tr>
        <tr><td style="padding:0 0 16px;font-size:16px;line-height:1.45;color:#38bdf8;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
          ${escapeHtml(email)}
        </td></tr>
        <tr><td style="padding:0 0 8px;font-size:14px;line-height:1.5;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">Mot de passe temporaire</td></tr>
        <tr><td style="padding:0 0 18px;font-size:22px;line-height:1.3;color:#14b8a6;font-weight:bold;font-family:ui-monospace,Consolas,monospace;">
          ${escapeHtml(temporaryPassword)}
        </td></tr>
        <tr><td style="padding:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;font-family:Arial,Helvetica,sans-serif;">
          Changez ce mot de passe après la première connexion.
        </td></tr>`
    : `<tr><td style="padding:0 0 14px;font-size:15px;line-height:1.55;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;">
          Votre compte AVA Management a été créé.
        </td></tr>
        <tr><td style="padding:0 0 8px;font-size:14px;line-height:1.5;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">Email de connexion</td></tr>
        <tr><td style="padding:0 0 16px;font-size:16px;line-height:1.45;color:#38bdf8;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
          ${escapeHtml(email)}
        </td></tr>
        <tr><td style="padding:0 0 18px;font-size:14px;line-height:1.55;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;">
          Première connexion : ouvrez le lien ci-dessous, puis utilisez « Mot de passe oublié » avec cette adresse e-mail pour définir votre mot de passe.
        </td></tr>`

  const loginRow =
    loginHref &&
    `<tr><td style="padding:8px 0 0;">
        <a href="${loginHref}" style="display:inline-block;padding:14px 22px;background:#14b8a6;color:#0f172a;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Ouvrir la page de connexion</a>
      </td></tr>
      <tr><td style="padding:12px 0 0;font-size:12px;line-height:1.45;color:#64748b;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">
        ${loginHref}
      </td></tr>`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;border:1px solid #1e293b;">
<tr><td style="padding:28px 24px 8px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
    <td style="width:48px;height:48px;background:#14b8a6;border-radius:10px;text-align:center;vertical-align:middle;font-size:22px;font-weight:bold;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">A</td>
  </tr></table>
  <p style="margin:12px 0 0;font-size:18px;font-weight:bold;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">AVA Management</p>
</td></tr>
<tr><td style="padding:8px 24px 4px;">
  <p style="margin:0;font-size:18px;font-weight:bold;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">${hasPassword ? 'Vos accès ont été créés' : 'Votre compte a été créé'}</p>
</td></tr>
<tr><td style="padding:12px 24px 8px;">
  <p style="margin:0;font-size:15px;line-height:1.5;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">Bonjour ${escapeHtml(prenom)},</p>
</td></tr>
${coreRows}
${loginRow || ''}
<tr><td style="padding:20px 24px 28px;">
  <p style="margin:0;font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">— AVA Management / WorkSphere</p>
</td></tr>
</table>
</body>
</html>`

  const text = hasPassword
    ? `Bonjour ${prenom},\n\nVotre compte AVA Management a été créé.\n\nEmail : ${email}\nMot de passe temporaire : ${temporaryPassword}\n${loginUrl ? `\nConnexion : ${loginUrl}\n` : ''}\nChangez ce mot de passe après la première connexion.\n— AVA Management / WorkSphere`
    : `Bonjour ${prenom},\n\nVotre compte AVA Management a été créé.\n\nEmail de connexion : ${email}\n\nPremière connexion : ouvrez ${loginUrl || 'la page de connexion'}, puis utilisez « Mot de passe oublié » avec cette adresse e-mail pour définir votre mot de passe.\n\n— AVA Management / WorkSphere`

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
