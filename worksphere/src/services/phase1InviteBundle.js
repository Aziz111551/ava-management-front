const FN = '/.netlify/functions'

/**
 * Un seul e-mail au candidat : créneau Teams + lien test technique.
 * Nécessite Resend sur Netlify (RESEND_API_KEY, EMAIL_FROM).
 */
export async function sendPhase1AcceptanceBundle({
  email,
  candidateName,
  meetingAt,
  teamsUrl,
  inviteUrl,
  note,
}) {
  const res = await fetch(`${FN}/send-phase1-bundle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      candidateName,
      meetingAt,
      teamsUrl,
      inviteUrl,
      ...(note ? { note } : {}),
    }),
  })
  const text = await res.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`)
  }
  if (!res.ok && data.ok !== true) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data
}

/** Valeur pour un champ datetime-local (demain 10:00). */
export function defaultMeetingDatetimeLocal() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
