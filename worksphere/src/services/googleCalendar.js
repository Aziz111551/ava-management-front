import endOfMonth from 'date-fns/endOfMonth'
import format from 'date-fns/format'
import parseISO from 'date-fns/parseISO'
import startOfMonth from 'date-fns/startOfMonth'

/** Clé sessionStorage pour le jeton d’accès lecture calendrier (durée ~1 h). */
export const WS_GOOGLE_CAL_TOKEN_KEY = 'ws_google_cal_token'

const CAL_LIST = 'https://www.googleapis.com/calendar/v3/calendars'

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
  const time = item.start?.dateTime ? format(d, 'HH:mm') : '00:00'
  const title = item.summary || '(Sans titre)'
  const attendees = Array.isArray(item.attendees) ? item.attendees.length : 0
  return {
    id: String(item.id),
    title,
    date,
    time,
    attendees: Math.max(attendees, 1),
    type: guessType(title),
  }
}

/**
 * @param {string} accessToken
 * @param {string} timeMin ISO
 * @param {string} timeMax ISO
 * @param {string} [calendarId] défaut: primary
 */
export async function fetchGoogleCalendarEvents(accessToken, timeMin, timeMax, calendarId = 'primary') {
  const url = new URL(`${CAL_LIST}/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Google Calendar ${res.status}`)
  }
  const data = await res.json()
  const items = Array.isArray(data.items) ? data.items : []
  return items.map(mapGoogleEventToMeeting).filter(Boolean)
}
