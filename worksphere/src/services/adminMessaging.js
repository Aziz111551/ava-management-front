const FN = '/.netlify/functions'

async function parseJson(res) {
  const text = await res.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text?.slice(0, 220) || `HTTP ${res.status}`)
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`)
  }
  return data
}

/**
 * Envoie un e-mail via la fonction Netlify (Resend).
 * Netlify : WS_ADMIN_API_KEY doit égaler VITE_WS_ADMIN_API_KEY (côté client).
 */
export async function sendAdminEmail({ to, subject, html, text }) {
  const key = import.meta.env.VITE_WS_ADMIN_API_KEY?.trim() || ''
  const res = await fetch(`${FN}/admin-send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'x-ws-admin-key': key } : {}),
    },
    body: JSON.stringify({ to, subject, html, text: text || undefined }),
  })
  return parseJson(res)
}
