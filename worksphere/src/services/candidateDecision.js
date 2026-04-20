const FN = '/.netlify/functions'

export async function sendCandidateRefusalEmail({ email, name, reason }) {
  const res = await fetch(`${FN}/send-candidate-refusal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, reason }),
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
