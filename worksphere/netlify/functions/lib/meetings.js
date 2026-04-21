import { connectLambda, getStore } from '@netlify/blobs'
import { signHS256, verifyJWT } from './jwt.js'

export const meetingCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function meetingJson(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...meetingCors },
    body: JSON.stringify(body),
  }
}

export function getMeetingStore(event) {
  connectLambda(event)
  return getStore({ name: 'ws-meetings' })
}

export function cleanEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function cleanText(value, fallback = '') {
  const s = String(value ?? '').trim()
  return s || fallback
}

export function buildSiteUrl(event) {
  const host =
    event.headers['x-forwarded-host'] ||
    event.headers.host ||
    (process.env.URL || '').replace(/^https?:\/\//, '')
  const proto = event.headers['x-forwarded-proto'] || 'https'
  if (!host) return 'http://localhost:8888'
  return `${proto}://${host}`
}

export function meetingSecret() {
  return cleanText(process.env.MEETING_JWT_SECRET || process.env.TECH_TEST_JWT_SECRET)
}

export function meetingKey(id) {
  return `meeting-${id}`
}

export function makeMeetingId() {
  return `mtg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildRoomName(id) {
  return `worksphere-${String(id || '').replace(/[^a-z0-9-]/gi, '').toLowerCase()}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function createMeetingEvent(type, payload = {}) {
  return {
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    at: nowIso(),
    ...payload,
  }
}

export function signMeetingJoinToken(payload, secret, expiresInSeconds = 60 * 60 * 24 * 14) {
  return signHS256(
    {
      typ: 'meeting_join',
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    },
    secret,
  )
}

export function verifyMeetingJoinToken(token, secret) {
  const payload = verifyJWT(token, secret)
  if (!payload || payload.typ !== 'meeting_join') return null
  return payload
}

export async function getMeetingById(store, id) {
  return store.get(meetingKey(id), { type: 'json' })
}

export async function saveMeeting(store, record) {
  const next = {
    ...record,
    updatedAt: nowIso(),
  }
  await store.setJSON(meetingKey(record.id), next)
  return next
}

export async function appendMeetingEvent(store, meeting, event) {
  const events = [...(Array.isArray(meeting.events) ? meeting.events : []), event].slice(-500)
  return saveMeeting(store, {
    ...meeting,
    events,
  })
}

export async function listMeetings(store) {
  const { blobs } = await store.list({ prefix: 'meeting-' })
  const rows = []
  for (const { key } of blobs) {
    const data = await store.get(key, { type: 'json' })
    if (data && typeof data === 'object') rows.push(data)
  }
  return rows.sort((a, b) => {
    const aTime = new Date(a.scheduledAt || a.createdAt || 0).getTime()
    const bTime = new Date(b.scheduledAt || b.createdAt || 0).getTime()
    return bTime - aTime
  })
}

export function isValidMeetingType(type) {
  return type === 'candidate_phase2' || type === 'employee_rh' || type === 'employee_candidate_rh'
}

export function createMeetingLinks(siteUrl, meeting, tokens) {
  return {
    rhRoom: `${siteUrl}/rh/meetings/${meeting.id}`,
    employeeRoom: `${siteUrl}/employee/meetings/${meeting.id}`,
    guestRoom: `${siteUrl}/meeting/join?token=${encodeURIComponent(tokens.guestToken)}`,
  }
}

export function toMeetingSummary(record) {
  const transcriptCount = Array.isArray(record.transcript) ? record.transcript.length : 0
  const eventCount = Array.isArray(record.events) ? record.events.length : 0
  const preview = record.summaryReport || null
  const coParticipants = Array.isArray(record.coParticipants)
    ? record.coParticipants.map((p) => ({
        name: p.name || '',
        email: p.email || '',
        participantId: p.participantId || null,
        role: p.role || 'employee',
      }))
    : []
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    scheduledAt: record.scheduledAt,
    roomName: record.roomName,
    note: record.note || '',
    rhName: record.rhName,
    rhEmail: record.rhEmail,
    participantName: record.participantName,
    participantEmail: record.participantEmail,
    participantRole: record.participantRole,
    coParticipants,
    coParticipantCount: coParticipants.length,
    reportStatus: record.reportStatus || 'idle',
    reportError: record.reportError || null,
    transcriptStatus: record.transcriptStatus || 'idle',
    transcriptCount,
    eventCount,
    reportGeneratedAt: record.reportGeneratedAt || null,
    phase3Decision: record.phase3Decision || null,
    phase3DecisionAt: record.phase3DecisionAt || null,
    phase3DecisionReason: record.phase3DecisionReason || '',
    employeeAccount: record.employeeAccount || null,
    reportPreview: preview
      ? {
          title: preview.title || 'Rapport de réunion',
          participantOpinion: preview.participantOpinion || preview.employeeOpinion || '',
          recommendation: preview.recommendation || '',
          rating: preview.rating || '',
          conversationSummary: preview.conversationSummary || preview.summary || '',
        }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
