const FN = '/.netlify/functions'

export async function requestAdminAiRecap(contextText) {
  const key = import.meta.env.VITE_WS_ADMIN_API_KEY?.trim() || ''
  const res = await fetch(`${FN}/admin-ai-recap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'x-ws-admin-key': key } : {}),
    },
    body: JSON.stringify({ context: contextText }),
  })
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
