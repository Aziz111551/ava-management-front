import { createHmac } from 'crypto'

function base64urlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const h = base64urlEncode(JSON.stringify(header))
  const p = base64urlEncode(JSON.stringify(payload))
  const sig = createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${h}.${p}.${sig}`
}

export function verifyJWT(token, secret) {
  const parts = String(token).split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const expected = createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  if (s !== expected) return null
  const json = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  let payload
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  if (payload.exp && Date.now() / 1000 > payload.exp) return null
  return payload
}
