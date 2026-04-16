const FN = '/.netlify/functions'

export async function sendPhase2PhysicalInvite({
  email,
  candidateName,
  meetingAt,
  teamsUrl,
  note,
}) {
  const res = await fetch(`${FN}/send-phase2-physical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      candidateName,
      meetingAt,
      teamsUrl,
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

export { defaultMeetingDatetimeLocal } from './phase1InviteBundle'
