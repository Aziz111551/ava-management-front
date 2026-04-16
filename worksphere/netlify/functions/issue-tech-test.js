import { signHS256 } from './lib/jwt.js'

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

function siteBase(event) {
  const fromEnv = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.NETLIFY_SITE_URL ||
    process.env.SITE_URL ||
    ''
  )
    .trim()
    .replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const h = event.headers || {}
  const host = (h['x-forwarded-host'] || h.Host || h.host || '').split(',')[0].trim()
  const proto = (h['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https'
  if (host && !/^localhost(:\d+)?$/i.test(host)) {
    return `${proto}://${host}`.replace(/\/$/, '')
  }
  return ''
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
  return { ok: true, id: data?.id || null }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const secret = (process.env.TECH_TEST_JWT_SECRET || '').trim()
  if (!secret || secret.length < 16) {
    return json(500, {
      ok: false,
      error: 'TECH_TEST_JWT_SECRET manquant (min. 16 caractères) dans Netlify → Environment variables.',
    })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase()
  const name = String(body.name || '').trim() || 'Candidat'
  /** Si true : ne pas envoyer l’e-mail « test seul » — utilisé avec send-phase1-bundle (Teams + test dans un seul mail). */
  const skipResendEmail = Boolean(body.skipResendEmail)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, error: 'E-mail invalide' })
  }

  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
  const token = signHS256({ sub: email, email, name, typ: 'tech_test', exp }, secret)

  const base = siteBase(event)
  if (!base) {
    return json(500, {
      ok: false,
      error:
        'Impossible de déterminer l’URL du site. Ajoutez SITE_URL=https://votre-site.netlify.app dans Environment variables, ou redéployez après mise à jour.',
    })
  }

  const inviteUrl = `${base}/technical-test?t=${encodeURIComponent(token)}`

  if (skipResendEmail) {
    return json(200, {
      ok: true,
      token,
      inviteUrl,
      emailSent: false,
      message: 'Lien test technique généré (e-mail regroupé Phase 1).',
    })
  }

  const subject = 'AVA Management — test technique (prochaine étape)'
  const html = `
    <p>Bonjour ${escapeHtml(name)},</p>
    <p>Félicitations : votre candidature est <strong>acceptée</strong> pour la suite du processus.</p>
    <p>Vous devez maintenant passer un <strong>test technique JavaScript</strong> en ligne (éditeur de code, caméra et micro requis, plein écran).</p>
    <p><a href="${inviteUrl}" style="color:#20b2aa;font-weight:bold;">Ouvrir le test technique</a></p>
    <p style="word-break:break-all;font-size:12px;color:#666;">Si le bouton ne marche pas, copiez ce lien :<br>${escapeHtml(inviteUrl)}</p>
    <p>Ce lien est personnel et expire sous 7 jours.</p>
    <p>— AVA Management / WorkSphere</p>
  `
  const text = `Bonjour ${name},\n\nVoici votre lien pour le test technique (à ouvrir dans le navigateur) :\n\n${inviteUrl}\n\nCe lien est personnel et expire sous 7 jours.\n— AVA Management / WorkSphere`

  const resendConfigured = Boolean((process.env.RESEND_API_KEY || '').trim())
  let sendResult = { ok: false, error: 'Envoi non tenté.' }
  try {
    sendResult = await sendResend({ to: email, subject, html, text })
  } catch (err) {
    sendResult = { ok: false, error: err?.message || 'Erreur inconnue lors de l’envoi Resend.' }
  }

  if (resendConfigured && !sendResult.ok) {
    return json(502, {
      ok: false,
      inviteUrl,
      error: `E-mail non envoyé : ${sendResult.error}`,
    })
  }

  return json(200, {
    ok: true,
    token,
    inviteUrl,
    emailSent: sendResult.ok,
    message: sendResult.ok
      ? 'E-mail envoyé au candidat.'
      : 'E-mail non envoyé : ajoutez RESEND_API_KEY et EMAIL_FROM dans Netlify. Le lien reste valide ci-dessous.',
  })
}
