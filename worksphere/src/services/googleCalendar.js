import endOfMonth from 'date-fns/endOfMonth'
import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import startOfMonth from 'date-fns/startOfMonth'

/** Clé sessionStorage pour le jeton d’accès lecture calendrier (durée ~1 h). */
export const WS_GOOGLE_CAL_TOKEN_KEY = 'ws_google_cal_token'

const API_BASE = 'https://www.googleapis.com/calendar/v3'

function guessType(title) {
  const t = (title || '').toLowerCase()
  if (/interview|entretien/i.test(t)) return 'interview'
  if (/all-?hands|townhall|company|global/i.test(t)) return 'company'
  if (/onboarding|welcome|rh\b|hr\b/i.test(t)) return 'hr'
  return 'team'
}

/**
 * @param {number} year
 * @param {number} monthIndex
 */
export function monthRangeISO(year, monthIndex) {
  const start = startOfMonth(new Date(year, monthIndex, 1))
  const end = endOfMonth(new Date(year, monthIndex, 1))
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  }
}

/**
 * Mappe un événement Google Calendar API v3 vers le format attendu par l’UI RH.
 * @param {Record<string, unknown>} item
 */
export function mapGoogleEventToMeeting(item) {
  const startRaw = item.start?.dateTime || item.start?.date
  if (!startRaw) return null
  const d = item.start?.dateTime ? parseISO(item.start.dateTime) : parseISO(`${item.start.date}T00:00:00`)
  const date = format(d, 'yyyy-MM-dd')
  const allDay = Boolean(item.start?.date && !item.start?.dateTime)
  const time = item.start?.dateTime ? format(d, 'HH:mm') : '00:00'
  let endTime = ''
  const endRaw = item.end?.dateTime || item.end?.date
  if (endRaw) {
    const de = item.end?.dateTime ? parseISO(item.end.dateTime) : parseISO(`${item.end.date}T00:00:00`)
    endTime = item.end?.dateTime ? format(de, 'HH:mm') : ''
  }
  const title = item.summary || '(Sans titre)'
  const rawAtt = Array.isArray(item.attendees) ? item.attendees : []
  const attendees = rawAtt.length
  const attendeeNames = rawAtt
    .map((a) => a.displayName || a.email || '')
    .filter(Boolean)
  const description = (item.description && String(item.description).trim()) || ''
  const location = (item.location && String(item.location).trim()) || ''
  const htmlLink = typeof item.htmlLink === 'string' ? item.htmlLink : ''
  const hangoutLink =
    typeof item.hangoutLink === 'string'
      ? item.hangoutLink
      : typeof item.conferenceData?.entryPoints?.[0]?.uri === 'string'
        ? item.conferenceData.entryPoints[0].uri
        : ''

  return {
    id: String(item.id),
    title,
    date,
    time,
    endTime,
    allDay,
    attendees: Math.max(attendees, 1),
    attendeeNames,
    type: guessType(title),
    location,
    description,
    htmlLink,
    hangoutLink,
  }
}

async function fetchGoogleJson(url, accessToken) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Google Calendar ${res.status}`)
  }
  return res.json()
}

/**
 * Tous les IDs de calendriers visibles (pagination calendarList).
 * @param {string} accessToken
 */
export async function listUserCalendarIds(accessToken) {
  const ids = []
  let pageToken
  do {
    const u = new URL(`${API_BASE}/users/me/calendarList`)
    u.searchParams.set('maxResults', '250')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const data = await fetchGoogleJson(u.toString(), accessToken)
    for (const item of data.items || []) {
      if (item.id) ids.push(item.id)
    }
    pageToken = data.nextPageToken
  } while (pageToken)
  return [...new Set(ids)]
}

/**
 * Événements d’un calendrier sur la plage, avec pagination nextPageToken.
 * @param {string} accessToken
 * @param {string} calendarId
 * @param {string} timeMin ISO
 * @param {string} timeMax ISO
 */
async function fetchAllEventsForCalendar(accessToken, calendarId, timeMin, timeMax) {
  const items = []
  let pageToken
  do {
    const u = new URL(`${API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
    u.searchParams.set('singleEvents', 'true')
    u.searchParams.set('orderBy', 'startTime')
    u.searchParams.set('timeMin', timeMin)
    u.searchParams.set('timeMax', timeMax)
    u.searchParams.set('maxResults', '250')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const data = await fetchGoogleJson(u.toString(), accessToken)
    if (Array.isArray(data.items)) items.push(...data.items)
    pageToken = data.nextPageToken
  } while (pageToken)
  return items
}

function dedupeEvents(rawItems) {
  const seen = new Set()
  const out = []
  for (const item of rawItems) {
    const key = `${item.id}|${item.start?.dateTime || item.start?.date || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/**
 * Charge les événements Google Calendar pour le mois affiché.
 *
 * - Si `calendarId` est un ID précis (ex. `primary`, email d’un agenda) : cet agenda uniquement, toutes les pages.
 * - Si absent, vide, ou `all` : tous les agendas listés par calendarList, fusionnés (avec dédoublonnage léger).
 *
 * @param {string} accessToken
 * @param {string} timeMin ISO
 * @param {string} timeMax ISO
 * @param {string} [calendarId] défaut depuis env ou mode « tous les agendas »
 */
export async function fetchGoogleCalendarEvents(accessToken, timeMin, timeMax, calendarId) {
  const envId = import.meta.env.VITE_GOOGLE_CALENDAR_ID
  const explicit = calendarId ?? envId
  const useAll =
    explicit === undefined ||
    explicit === null ||
    String(explicit).trim() === '' ||
    String(explicit).toLowerCase() === 'all'

  let rawItems = []

  if (!useAll) {
    rawItems = await fetchAllEventsForCalendar(accessToken, String(explicit).trim(), timeMin, timeMax)
  } else {
    let calendarIds
    try {
      calendarIds = await listUserCalendarIds(accessToken)
    } catch {
      calendarIds = ['primary']
    }
    for (const calId of calendarIds) {
      try {
        const part = await fetchAllEventsForCalendar(accessToken, calId, timeMin, timeMax)
        rawItems.push(...part)
      } catch {
        /* agenda inaccessible (partagé retiré, etc.) */
      }
    }
    rawItems = dedupeEvents(rawItems)
  }

  return rawItems.map(mapGoogleEventToMeeting).filter(Boolean)
}
