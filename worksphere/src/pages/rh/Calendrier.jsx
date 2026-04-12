import { useState, useEffect, useCallback } from 'react'
import format from 'date-fns/format'
import isThisWeek from 'date-fns/isThisWeek'
import parseISO from 'date-fns/parseISO'
import { getCalendarMeetings } from '../../services/api'
import {
  fetchGoogleCalendarEvents,
  monthRangeISO,
  WS_GOOGLE_CAL_TOKEN_KEY,
} from '../../services/googleCalendar'
import CalendrierGoogleConnect from './CalendrierGoogleConnect'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const MOCK_MEETINGS = [
  { id: 1, title: 'Stand-up Dev', date: '2026-04-08', time: '09:00', attendees: 8, type: 'team' },
  { id: 2, title: 'HR interview — Sara', date: '2026-04-09', time: '10:30', attendees: 2, type: 'interview' },
  { id: 3, title: 'Sprint Review', date: '2026-04-10', time: '14:00', attendees: 12, type: 'team' },
  { id: 4, title: 'Onboarding Karim', date: '2026-04-14', time: '09:00', attendees: 3, type: 'hr' },
  { id: 5, title: '1:1 Manager', date: '2026-04-15', time: '11:00', attendees: 2, type: 'team' },
  { id: 6, title: 'Interview — Nour', date: '2026-04-16', time: '15:00', attendees: 2, type: 'interview' },
  { id: 7, title: 'All-hands Q2', date: '2026-04-22', time: '10:00', attendees: 45, type: 'company' },
]

const typeColors = {
  team: { bg: 'var(--blue-bg)', color: 'var(--blue)' },
  interview: { bg: 'var(--cyan-dim)', color: 'var(--cyan2)' },
  hr: { bg: 'var(--green-bg)', color: 'var(--green)' },
  company: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
}

function normalizeMeetings(data) {
  if (!data) return []
  const raw = Array.isArray(data) ? data : Array.isArray(data.meetings) ? data.meetings : []
  return raw.map((m, i) => ({
    id: m.id ?? m._id ?? String(i),
    title: m.title ?? '(Sans titre)',
    date: m.date,
    time: (m.time || '09:00').toString().slice(0, 5),
    attendees: typeof m.attendees === 'number' ? m.attendees : 1,
    type: m.type && typeColors[m.type] ? m.type : 'team',
  })).filter((m) => Boolean(m.date))
}

function meetingThisWeek(m) {
  try {
    const t = (m.time || '12:00').toString().slice(0, 5)
    const d = parseISO(`${m.date}T${t}:00`)
    return isThisWeek(d, { weekStartsOn: 1 })
  } catch {
    return false
  }
}

function upcomingFromToday(meetings, limit = 4) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  return [...meetings]
    .filter((m) => m.date >= todayStr)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, limit)
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const hasGoogleOAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

export default function Calendrier() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [meetings, setMeetings] = useState(MOCK_MEETINGS)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [googleConnected, setGoogleConnected] = useState(
    () => Boolean(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(WS_GOOGLE_CAL_TOKEN_KEY)),
  )

  const refreshCalendar = useCallback(() => {
    setGoogleConnected(Boolean(sessionStorage.getItem(WS_GOOGLE_CAL_TOKEN_KEY)))
  }, [])

  useEffect(() => {
    let cancelled = false
    const range = monthRangeISO(year, month)
    const token = sessionStorage.getItem(WS_GOOGLE_CAL_TOKEN_KEY)

    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (token) {
          /* Sans VITE_GOOGLE_CALENDAR_ID (ou valeur `all`) → tous les agendas Google listés. Sinon → ID précis (ex. primary). */
          const calId = import.meta.env.VITE_GOOGLE_CALENDAR_ID
          const list = await fetchGoogleCalendarEvents(token, range.timeMin, range.timeMax, calId)
          if (!cancelled) setMeetings(list)
        } else {
          const { data } = await getCalendarMeetings({
            timeMin: range.timeMin,
            timeMax: range.timeMax,
          })
          const list = normalizeMeetings(data)
          if (!cancelled) setMeetings(list.length > 0 ? list : [])
        }
      } catch {
        if (token) {
          sessionStorage.removeItem(WS_GOOGLE_CAL_TOKEN_KEY)
          if (!cancelled) {
            setGoogleConnected(false)
            setLoadError('Connexion Google expirée ou refusée. Reconnectez-vous.')
            setMeetings(MOCK_MEETINGS)
          }
        }
        /* Sans jeton : échec API → conserver les réunions déjà affichées (souvent la démo). */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [year, month, googleConnected])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const meetingsOnDay = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return meetings.filter((m) => m.date === dateStr)
  }

  const selectedMeetings = selected ? meetingsOnDay(selected) : []
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const thisMonthCount = meetings.filter((m) => m.date.startsWith(monthPrefix)).length
  const thisWeekCount = meetings.filter(meetingThisWeek).length

  const prev = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div>
      {hasGoogleOAuth && (
        <CalendrierGoogleConnect
          connected={googleConnected}
          onConnected={() => {
            refreshCalendar()
          }}
          onDisconnected={() => {
            setMeetings(MOCK_MEETINGS)
            refreshCalendar()
          }}
        />
      )}

      {loadError && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: 'var(--radius)',
            background: 'var(--amber-bg)',
            color: 'var(--amber)',
            fontSize: '13px',
          }}
        >
          {loadError}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'This month', value: thisMonthCount, color: 'var(--cyan2)' },
          { label: 'This week', value: thisWeekCount, color: 'var(--blue)' },
          { label: 'Interviews', value: meetings.filter((m) => m.type === 'interview').length, color: 'var(--green)' },
          { label: 'All-hands', value: meetings.filter((m) => m.type === 'company').length, color: 'var(--amber)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Calendar */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: '12px', right: '16px', fontSize: '12px', color: 'var(--text3)' }}>
              Chargement…
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button type="button" onClick={prev} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', padding: '6px 12px', cursor: 'pointer' }}>‹</button>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '16px', color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
            <button type="button" onClick={next} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', padding: '6px 12px', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {DAYS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', padding: '4px', letterSpacing: '0.03em' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {cells.map((day, i) => {
              const dayMeetings = meetingsOnDay(day)
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const isSelected = day === selected
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={day ? 0 : -1}
                  onClick={() => day && setSelected(day === selected ? null : day)}
                  onKeyDown={(e) => {
                    if (day && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      setSelected(day === selected ? null : day)
                    }
                  }}
                  style={{
                    minHeight: '64px',
                    padding: '6px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--cyan-dim)' : day ? 'var(--bg3)' : 'transparent',
                    border: isToday ? '1px solid var(--cyan)' : '1px solid transparent',
                    cursor: day ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => day && !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => day && !isSelected && (e.currentTarget.style.background = 'var(--bg3)')}
                >
                  {day && (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: isToday ? '700' : '400', color: isToday ? 'var(--cyan2)' : 'var(--text2)', marginBottom: '4px' }}>{day}</div>
                      {dayMeetings.slice(0, 2).map((m) => {
                        const c = typeColors[m.type] || typeColors.team
                        return (
                          <div key={m.id} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: c.bg, color: c.color, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.title}
                          </div>
                        )
                      })}
                      {dayMeetings.length > 2 && <div style={{ fontSize: '9px', color: 'var(--text3)' }}>+{dayMeetings.length - 2}</div>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            {selected ? `${selected} ${MONTHS[month]}` : 'Select a day'}
          </div>
          {selected && selectedMeetings.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>No meetings this day</div>
          )}
          {selectedMeetings.map((m) => {
            const c = typeColors[m.type] || typeColors.team
            return (
              <div key={m.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', marginBottom: '6px' }}>{m.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>🕐 {m.time} · {m.attendees} participants</div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: c.bg, color: c.color }}>{m.type}</span>
              </div>
            )
          })}
          {!selected && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>Upcoming meetings</div>
              {upcomingFromToday(meetings, 4).map((m) => {
                const c = typeColors[m.type] || typeColors.team
                return (
                  <div key={m.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', padding: '10px', background: 'var(--bg3)', borderRadius: '8px' }}>
                    <div style={{ width: '3px', height: '100%', minHeight: '32px', borderRadius: '2px', background: c.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.date} · {m.time}</div>
                    </div>
                  </div>
                )
              })}
              {upcomingFromToday(meetings, 4).length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>Aucun événement à venir</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
