const FN = '/.netlify/functions'

/** Mot de passe lisible (style « PhffXzop ») pour la première connexion. */
export function generateTemporaryPassword(length = 8) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  const buf = new Uint8Array(Math.max(length, 8))
  crypto.getRandomValues(buf)
  let out = ''
  out += upper[buf[0] % upper.length]
  out += lower[buf[1] % lower.length]
  out += digits[buf[2] % digits.length]
  for (let i = 3; i < length; i++) {
    out += all[buf[i] % all.length]
  }
  return out
}

/**
 * Envoie l’e-mail « vos accès » (Resend via Netlify). Ne crée pas le compte.
 */
export async function sendEmployeeWelcomeEmail({ email, name, temporaryPassword, loginUrl }) {
  const res = await fetch(`${FN}/send-employee-welcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name,
      temporaryPassword,
      ...(loginUrl ? { loginUrl } : {}),
    }),
  })
  const text = await res.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`)
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}
