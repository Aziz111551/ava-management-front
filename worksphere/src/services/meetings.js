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

export async function createMeetingInvite(payload) {
  const res = await fetch(`${FN}/create-meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function fetchMeetings({ viewer = 'rh', email } = {}) {
  const qs = new URLSearchParams()
  if (viewer) qs.set('viewer', viewer)
  if (email) qs.set('email', email)
  const res = await fetch(`${FN}/get-meetings?${qs.toString()}`)
  return parseJson(res)
}

export async function fetchMeeting({ id, token } = {}) {
  const qs = new URLSearchParams()
  if (id) qs.set('id', id)
  if (token) qs.set('token', token)
  const res = await fetch(`${FN}/get-meeting?${qs.toString()}`)
  return parseJson(res)
}

export async function getMeetingToken(payload) {
  const res = await fetch(`${FN}/get-meeting-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function appendMeetingTranscript(payload) {
  const res = await fetch(`${FN}/append-meeting-transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function logMeetingEvent(payload) {
  const res = await fetch(`${FN}/log-meeting-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function finishMeeting(payload) {
  const res = await fetch(`${FN}/finish-meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function generateMeetingReport(payload) {
  const res = await fetch(`${FN}/generate-meeting-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJson(res)
}

export async function fetchMeetingReport(id) {
  const res = await fetch(`${FN}/get-meeting-report?id=${encodeURIComponent(id)}`)
  return parseJson(res)
}
