import { verifyJWT } from './lib/jwt.js'

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const secret = (process.env.TECH_TEST_JWT_SECRET || '').trim()
  if (!secret) return json(500, { ok: false, error: 'TECH_TEST_JWT_SECRET manquant sur Netlify.' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const token = String(body.token || '').trim()
  if (!token) return json(400, { ok: false, error: 'Token manquant' })

  const payload = verifyJWT(token, secret)
  if (!payload || payload.typ !== 'tech_test') {
    return json(401, { ok: false, error: 'Lien invalide ou expiré' })
  }

  return json(200, {
    ok: true,
    email: payload.email,
    name: payload.name,
    candidatId: payload.cid || null,
  })
}
