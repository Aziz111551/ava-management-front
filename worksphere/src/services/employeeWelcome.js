const FN = '/.netlify/functions'

/**
 * Envoie l’e-mail de bienvenue (Resend via Netlify). Ne crée pas le compte.
 * Si `temporaryPassword` est fourni (ex. renvoyé par l’API), le mail inclut les identifiants.
 * Sinon : e-mail avec lien de connexion + consigne « mot de passe oublié ».
 */
export async function sendEmployeeWelcomeEmail({ email, name, temporaryPassword, loginUrl }) {
  const body = {
    email,
    name,
    ...(temporaryPassword ? { temporaryPassword } : {}),
    ...(loginUrl ? { loginUrl } : {}),
  }
  const res = await fetch(`${FN}/send-employee-welcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
