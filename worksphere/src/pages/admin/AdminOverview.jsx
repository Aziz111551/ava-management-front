import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getEmployees } from '../../services/api'
import { fetchMeetings } from '../../services/meetings'

const surface = {
  panel: {
    background: 'linear-gradient(165deg, rgba(22,24,42,0.95) 0%, rgba(14,17,32,0.92) 100%)',
    border: '1px solid rgba(99,102,241,0.14)',
    borderRadius: '16px',
    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 28px 56px rgba(0,0,0,0.45)',
  },
  th: {
    padding: '11px 14px',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.11em',
    textTransform: 'uppercase',
    color: 'var(--text3)',
    borderBottom: '1px solid rgba(148,163,184,0.12)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 14px',
    fontSize: '13px',
    color: 'var(--text2)',
    borderBottom: '1px solid rgba(148,163,184,0.08)',
    verticalAlign: 'middle',
  },
}

const TYPE_COLORS = ['#6366f1', '#22d3ee', '#4ade80', '#f472b6', '#fbbf24', '#94a3b8']

function formatDt(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function Sparkline({ data, color = '#4ade80', height = 36 }) {
  const w = 108
  const h = height
  if (!data?.length || data.length < 2) {
    return <div style={{ width: w, height: h }} />
  }
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const rng = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / rng) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
        opacity="0.95"
      />
    </svg>
  )
}

function MiniBars({ data, color = '#ec4899' }) {
  const w = 108
  const h = 36
  const max = Math.max(...data, 1)
  const barW = w / data.length - 3
  return (
    <svg width={w} height={h} aria-hidden>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * (h - 4))
        return (
          <rect
            key={i}
            x={i * (w / data.length) + 1}
            y={h - bh}
            width={Math.max(3, barW)}
            height={bh}
            rx={2}
            fill={color}
            opacity={0.75 + (i / data.length) * 0.25}
          />
        )
      })}
    </svg>
  )
}

function GaugeSemi({ pct }) {
  const p = Math.min(100, Math.max(0, pct))
  const deg = (p / 100) * 180
  return (
    <div style={{ position: 'relative', width: 72, height: 38 }}>
      <div style={{
        width: 72,
        height: 36,
        borderRadius: '72px 72px 0 0',
        background: `conic-gradient(from 180deg at 50% 100%, #4ade80 ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
        WebkitMask: 'radial-gradient(farthest-side at 50% 100%, transparent 56%, #000 57%)',
        mask: 'radial-gradient(farthest-side at 50% 100%, transparent 56%, #000 57%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 2,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '11px',
        fontWeight: '800',
        color: '#4ade80',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {Math.round(p)}%
      </div>
    </div>
  )
}

function MonthlyBarChart({ months }) {
  const max = Math.max(1, ...months.map((m) => m.v))
  const barMaxH = 132
  return (
    <div style={{ padding: '8px 0 0' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 8,
        height: barMaxH + 28,
        padding: '0 4px',
      }}>
        {months.map((m) => (
          <div
            key={m.key}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              title={`${m.v} réunion(s)`}
              style={{
                width: '100%',
                maxWidth: 40,
                height: Math.max(m.v ? 6 : 0, (m.v / max) * barMaxH),
                borderRadius: 8,
                background: 'linear-gradient(180deg, #22d3ee 0%, #6366f1 55%, #4c1d95 100%)',
                boxShadow: m.v ? '0 0 24px rgba(34,211,238,0.25)' : 'none',
                transition: 'height 0.35s ease',
              }}
            />
            <span style={{
              fontSize: 9,
              fontWeight: '600',
              color: 'var(--text3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutTypes({ segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1
  let acc = 0
  const stops = segments.map((s) => {
    const start = (acc / total) * 360
    acc += s.value
    const end = (acc / total) * 360
    return `${s.color} ${start}deg ${end}deg`
  })
  const gradient = stops.length ? `conic-gradient(from -90deg, ${stops.join(', ')})` : 'conic-gradient(#334155 0deg 360deg)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 168, height: 168 }}>
        <div style={{
          width: 168,
          height: 168,
          borderRadius: '50%',
          background: gradient,
          boxShadow: '0 0 40px rgba(99,102,241,0.25)',
        }} />
        <div style={{
          position: 'absolute',
          inset: '22%',
          borderRadius: '50%',
          background: 'linear-gradient(160deg, #141628 0%, #0f111a 100%)',
          border: '1px solid rgba(148,163,184,0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: '800', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {total}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Réunions
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            </span>
            <span style={{ fontWeight: '700', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AreaTrend({ points, color = '#4ade80' }) {
  const w = 320
  const h = 72
  if (points.length < 2) {
    return <div style={{ height: h }} />
  }
  const max = Math.max(...points.map((p) => p.v), 1)
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w
    const y = h - 8 - (p.v / max) * (h - 16)
    return [x, y]
  })
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#areaG)" points={area} />
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={line} />
    </svg>
  )
}

function StatusCell({ status }) {
  const s = String(status || '').toLowerCase()
  const map = {
    completed: { bg: 'rgba(34,197,94,0.14)', color: '#4ade80', label: 'Terminée' },
    ended: { bg: 'rgba(34,197,94,0.14)', color: '#4ade80', label: 'Clôturée' },
    scheduled: { bg: 'rgba(59,130,246,0.14)', color: '#93c5fd', label: 'Planifiée' },
    live: { bg: 'rgba(251,191,36,0.14)', color: '#fcd34d', label: 'En direct' },
    in_progress: { bg: 'rgba(251,191,36,0.14)', color: '#fcd34d', label: 'En cours' },
  }
  const x = map[s] || { bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1', label: status || '—' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.02em',
      background: x.bg,
      color: x.color,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {x.label}
    </span>
  )
}

function ReportCell({ m }) {
  const st = m.reportStatus || ''
  if (st === 'ready' || (m.reportPreview && Object.keys(m.reportPreview).length)) {
    return <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '12px' }}>Disponible</span>
  }
  if (st === 'error' || m.reportError) {
    return <span style={{ color: '#f87171', fontSize: '12px' }}>Erreur</span>
  }
  if (st === 'pending' || st === 'generating') {
    return <span style={{ color: '#fcd34d', fontSize: '12px' }}>Génération…</span>
  }
  return <span style={{ color: 'var(--text3)', fontSize: '12px' }}>—</span>
}

function WidgetCard({ title, subtitle, children, noPadding }) {
  return (
    <div style={{ ...surface.panel, padding: noPadding ? 0 : '20px 22px', overflow: 'hidden' }}>
      {(title || subtitle) && (
        <div style={{ padding: noPadding ? '20px 22px 0' : '0 0 12px' }}>
          {title && (
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '5px', lineHeight: 1.45 }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      {noPadding ? children : <div style={{ marginTop: 4 }}>{children}</div>}
    </div>
  )
}

function MiniKpi({ label, value, hint, spark, gauge, bars, accent = '#22d3ee' }) {
  const showMiniViz = Boolean(bars) || (Array.isArray(spark) && spark.length >= 2)
  return (
    <div style={{
      ...surface.panel,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: gauge != null && !showMiniViz ? 108 : 128,
      background: 'linear-gradient(145deg, rgba(26,28,48,0.98) 0%, rgba(18,20,36,0.95) 100%)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }}>
          {label}
        </div>
        {gauge != null && <GaugeSemi pct={gauge} />}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '26px',
        fontWeight: '800',
        color: 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.03em',
      }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text3)', lineHeight: 1.35 }}>{hint}</div>}
      {showMiniViz && (
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', opacity: 0.95 }}>
          {bars ? <MiniBars data={bars} color="#f472b6" /> : <Sparkline data={spark} color={accent} />}
        </div>
      )}
    </div>
  )
}

function BreakdownTable({ title, subtitle, rows, total }) {
  return (
    <div style={{ ...surface.panel, padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>
          {title}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', letterSpacing: '0.02em' }}>
          {subtitle}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...surface.th, paddingLeft: '20px' }}>Indicateur</th>
            <th style={{ ...surface.th, textAlign: 'right' }}>Volume</th>
            <th style={{ ...surface.th, textAlign: 'right', paddingRight: '20px' }}>Part</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} style={{ ...surface.td, padding: '28px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                Aucune donnée agrégée.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.label} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                <td style={{ ...surface.td, paddingLeft: '20px', color: 'var(--text)', fontWeight: '500' }}>
                  {r.label}
                </td>
                <td style={{ ...surface.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: '600', color: 'var(--text)' }}>
                  {r.v}
                </td>
                <td style={{ ...surface.td, textAlign: 'right', paddingRight: '20px', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>
                  {total ? `${Math.round((r.v / total) * 100)} %` : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function buildMonthBuckets(meetings, nMonths) {
  const now = new Date()
  const buckets = []
  for (let i = nMonths - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    buckets.push({ key, label, v: 0, d })
  }
  const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]))
  for (const m of meetings) {
    if (!m.scheduledAt) continue
    const dt = new Date(m.scheduledAt)
    const key = `${dt.getFullYear()}-${dt.getMonth()}`
    if (idx[key] != null) buckets[idx[key]].v += 1
  }
  return buckets
}

function buildWeekBuckets(meetings, nWeeks) {
  const now = new Date()
  const startMonday = new Date(now)
  const day = startMonday.getDay()
  const diff = day === 0 ? -6 : 1 - day
  startMonday.setDate(startMonday.getDate() + diff)
  startMonday.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: nWeeks }, (_, i) => {
    const wStart = new Date(startMonday)
    wStart.setDate(wStart.getDate() - (nWeeks - 1 - i) * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 7)
    return { v: 0, wStart, wEnd }
  })
  for (const m of meetings) {
    if (!m.scheduledAt) continue
    const t = new Date(m.scheduledAt).getTime()
    for (const b of buckets) {
      if (t >= b.wStart.getTime() && t < b.wEnd.getTime()) {
        b.v += 1
        break
      }
    }
  }
  return buckets.map((b) => b.v)
}

export default function AdminOverview() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [empCount, setEmpCount] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  const firstName = (user?.name || 'Administrateur').trim().split(/\s+/)[0]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadErr('')
      try {
        const [mRes, empRes] = await Promise.allSettled([
          fetchMeetings({ viewer: 'rh' }),
          getEmployees(),
        ])
        if (cancelled) return
        if (mRes.status === 'fulfilled' && Array.isArray(mRes.value?.meetings)) {
          setMeetings(mRes.value.meetings)
          setUpdatedAt(new Date())
        } else if (mRes.status === 'rejected' && !cancelled) {
          setLoadErr(mRes.reason?.message || 'Réunions indisponibles.')
        }
        if (empRes.status === 'fulfilled') {
          const d = empRes.value?.data
          if (Array.isArray(d)) setEmpCount(d.length)
        }
      } catch (e) {
        if (!cancelled) setLoadErr(e?.message || 'Chargement partiel')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const list = meetings || []
    const byStatus = {}
    const byType = {}
    const emails = new Set()
    let completedLike = 0
    let scheduledLike = 0
    let reportsReady = 0
    for (const x of list) {
      const st = (x.status || 'unknown').toLowerCase()
      byStatus[x.status || 'unknown'] = (byStatus[x.status || 'unknown'] || 0) + 1
      const ty = x.type || '—'
      byType[ty] = (byType[ty] || 0) + 1
      if (x.rhEmail) emails.add(String(x.rhEmail).toLowerCase())
      if (x.participantEmail) emails.add(String(x.participantEmail).toLowerCase())
      for (const p of x.coParticipants || []) {
        if (p?.email) emails.add(String(p.email).toLowerCase())
      }
      if (st === 'completed' || st === 'ended') completedLike += 1
      else if (st === 'scheduled') scheduledLike += 1
      const rs = x.reportStatus || ''
      if (rs === 'ready' || (x.reportPreview && Object.keys(x.reportPreview).length)) reportsReady += 1
    }
    return {
      byStatus,
      byType,
      participantEmails: emails.size,
      total: list.length,
      completedLike,
      scheduledLike,
      reportsReady,
    }
  }, [meetings])

  const statusRows = useMemo(() => {
    const o = stats.byStatus
    return Object.keys(o).sort((a, b) => o[b] - o[a]).map((k) => ({ label: k, v: o[k] }))
  }, [stats.byStatus])

  const typeRows = useMemo(() => {
    const o = stats.byType
    return Object.keys(o).sort((a, b) => o[b] - o[a]).map((k) => ({ label: k, v: o[k] }))
  }, [stats.byType])

  const donutSegments = useMemo(() => {
    return typeRows.slice(0, 6).map((r, i) => ({
      label: r.label,
      value: r.v,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    }))
  }, [typeRows])

  const monthBuckets = useMemo(() => buildMonthBuckets(meetings, 9), [meetings])
  const weeklySeries = useMemo(() => buildWeekBuckets(meetings, 10), [meetings])
  const areaPoints = useMemo(() => monthBuckets.map((b) => ({ v: b.v })), [monthBuckets])

  const completionRate = stats.total ? (stats.completedLike / stats.total) * 100 : 0
  const reportRate = stats.total ? (stats.reportsReady / stats.total) * 100 : 0

  const tableRows = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const ta = new Date(a.scheduledAt || 0).getTime()
      const tb = new Date(b.scheduledAt || 0).getTime()
      return tb - ta
    })
  }, [meetings])

  const refreshed = updatedAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(updatedAt)
    : null

  const mtgThisMonth = monthBuckets[monthBuckets.length - 1]?.v ?? 0
  const mtgPrevMonth = monthBuckets[monthBuckets.length - 2]?.v ?? 0
  const growthHint = mtgPrevMonth
    ? `${mtgThisMonth >= mtgPrevMonth ? '+' : ''}${Math.round(((mtgThisMonth - mtgPrevMonth) / mtgPrevMonth) * 100)} % vs mois préc.`
    : 'Premier mois de la fenêtre'

  return (
    <div style={{ padding: '22px 26px 44px', maxWidth: '1480px', margin: '0 auto' }}>
      {/* Carte bienvenue — style template admin */}
      <div style={{
        ...surface.panel,
        marginBottom: 20,
        padding: '26px 28px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(200px, 0.75fr)',
        gap: 24,
        alignItems: 'center',
        background: 'linear-gradient(125deg, rgba(99,102,241,0.22) 0%, rgba(15,23,42,0.92) 42%, rgba(14,17,32,0.96) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          right: '-8%',
          top: '-40%',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: 10 }}>
            Vue exécutive
          </div>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(22px, 2.4vw, 28px)',
            fontWeight: '800',
            color: 'var(--text)',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}>
            Bon retour, {firstName}
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--text2)', maxWidth: 520 }}>
            Tableau de bord Meet &amp; RH : volumes, répartition des flux et registre des séances. Actualisé automatiquement à l’ouverture de la page.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid rgba(34,211,238,0.25)',
              minWidth: 140,
            }}>
              <div style={{ fontSize: 10, color: '#67e8f9', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Ce mois-ci
              </div>
              <div style={{ fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: 'var(--font-display)', marginTop: 6 }}>
                {mtgThisMonth} <span style={{ fontSize: 13, fontWeight: '600', color: 'var(--text3)' }}>réunions</span>
              </div>
            </div>
            <div style={{
              padding: '12px 18px',
              borderRadius: 12,
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid rgba(74,222,128,0.28)',
              minWidth: 140,
            }}>
              <div style={{ fontSize: 10, color: '#86efac', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Dynamique
              </div>
              <div style={{ fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: 'var(--font-display)', marginTop: 6 }}>
                {growthHint}
              </div>
            </div>
          </div>
        </div>
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 160,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 280,
            height: 140,
            borderRadius: 16,
            background: 'linear-gradient(160deg, rgba(30,32,54,0.9) 0%, rgba(20,22,40,0.95) 100%)',
            border: '1px solid rgba(148,163,184,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 16,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#fff',
              boxShadow: '0 12px 32px rgba(99,102,241,0.4)',
            }}>
              <i className="fa-solid fa-chart-line" aria-hidden />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: '700', color: 'var(--text)' }}>WorkSphere Analytics</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, lineHeight: 1.45 }}>
                {refreshed ? <>Dernière synchro · {refreshed}</> : <>Chargement des métriques…</>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loadErr && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)',
          color: '#fbbf24', fontSize: '13px',
        }}>
          {loadErr}
        </div>
      )}

      {/* Grille principale : graphiques + mini KPI */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: 16,
        marginBottom: 18,
        alignItems: 'stretch',
      }}
      >
        <WidgetCard
          title="Volume mensuel"
          subtitle="Réunions planifiées par mois (fenêtre glissante 9 mois)"
          noPadding
        >
          <div style={{ padding: '8px 22px 22px' }}>
            <MonthlyBarChart months={monthBuckets} />
            <div style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(148,163,184,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Pic sur la période</span>
              <span style={{ fontSize: 18, fontWeight: '800', color: '#22d3ee', fontFamily: 'var(--font-display)' }}>
                {Math.max(0, ...monthBuckets.map((b) => b.v))} <span style={{ fontSize: 12, fontWeight: '600', color: 'var(--text2)' }}>max / mois</span>
              </span>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard
          title="Mix des flux"
          subtitle="Répartition par type de réunion"
          noPadding
        >
          <div style={{ padding: '12px 22px 24px' }}>
            {donutSegments.length ? (
              <DonutTypes segments={donutSegments} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Pas assez de données pour le camembert.</div>
            )}
          </div>
        </WidgetCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380, width: '100%', justifySelf: 'stretch' }}>
          <MiniKpi
            label="Réunions (stock)"
            value={stats.total}
            hint="Toutes les salles enregistrées"
            spark={weeklySeries}
            accent="#22d3ee"
          />
          <MiniKpi
            label="Taux de clôture"
            value={`${Math.round(completionRate)}%`}
            hint="Sessions terminées / total"
            gauge={completionRate}
          />
          <MiniKpi
            label="Rapports prêts"
            value={stats.reportsReady}
            hint={`${Math.round(reportRate)} % du parc avec rapport`}
            bars={weeklySeries.map((v, i) => Math.max(0, v + (i % 3) - 1))}
          />
          <MiniKpi
            label="Acteurs distincts"
            value={stats.participantEmails}
            hint="E-mails uniques (flux Meet)"
            spark={[...weeklySeries].reverse()}
            accent="#f472b6"
          />
        </div>
      </div>

      {/* Tendance + effectif */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 320px)',
        gap: 16,
        marginBottom: 18,
      }}
      >
        <div style={{ ...surface.panel, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
                Tendance cumulée
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: 4 }}>
                Profil d’activité sur la fenêtre affichée (aire + courbe)
              </div>
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#4ade80',
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(74,222,128,0.12)',
              border: '1px solid rgba(74,222,128,0.22)',
            }}>
              Live data
            </div>
          </div>
          <AreaTrend points={areaPoints} color="#4ade80" />
        </div>
        <div style={{
          ...surface.panel,
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 12,
          background: 'linear-gradient(160deg, rgba(236,72,153,0.12) 0%, rgba(15,23,42,0.92) 55%)',
        }}>
          <div style={{ fontSize: 10, fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f9a8d4' }}>
            Ressources humaines
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: '800', color: '#fff' }}>
            {empCount != null ? empCount : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            {empCount == null
              ? 'Effectif non synchronisé (session admin sans jeton API Nest). Connectez un compte RH pour agréger cette tuile.'
              : 'Employés renvoyés par l’API `/rh/employees`.'}
          </div>
        </div>
      </div>

      {/* Registre */}
      <div style={{ ...surface.panel, padding: '0', marginBottom: 18, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
              Registre des réunions
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              Tri par date décroissante · consultation
            </div>
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: 'var(--text3)',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.22)',
          }}>
            {tableRows.length} ligne{tableRows.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 'min(480px, 62vh)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(8px)' }}>
              <tr>
                <th style={{ ...surface.th, paddingLeft: '22px' }}>Date & heure</th>
                <th style={surface.th}>Type de flux</th>
                <th style={surface.th}>Statut</th>
                <th style={surface.th}>Responsable RH</th>
                <th style={surface.th}>Invité principal</th>
                <th style={{ ...surface.th, textAlign: 'center' }}>Co-part.</th>
                <th style={{ ...surface.th, paddingRight: '22px' }}>Rapport</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...surface.td, padding: '40px 22px', textAlign: 'center', color: 'var(--text3)' }}>
                    Aucune réunion à afficher.
                  </td>
                </tr>
              ) : (
                tableRows.map((m) => (
                  <tr
                    key={m.id}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ ...surface.td, paddingLeft: '22px', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                      {formatDt(m.scheduledAt)}
                    </td>
                    <td style={{ ...surface.td, color: 'var(--text)', fontWeight: '500', fontSize: '12px' }}>
                      {m.type || '—'}
                    </td>
                    <td style={surface.td}>
                      <StatusCell status={m.status} />
                    </td>
                    <td style={surface.td}>
                      <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px' }}>{m.rhName || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{m.rhEmail || ''}</div>
                    </td>
                    <td style={surface.td}>
                      <div style={{ fontWeight: '600', color: 'var(--text)', fontSize: '13px' }}>{m.participantName || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{m.participantEmail || ''}</div>
                    </td>
                    <td style={{ ...surface.td, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {(m.coParticipants || []).length}
                    </td>
                    <td style={{ ...surface.td, paddingRight: '22px' }}>
                      <ReportCell m={m} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 16,
      }}>
        <BreakdownTable
          title="Répartition par statut"
          subtitle="Volumes et parts du parc de réunions"
          rows={statusRows}
          total={stats.total}
        />
        <BreakdownTable
          title="Répartition par type de flux"
          subtitle="Segmentation fonctionnelle"
          rows={typeRows}
          total={stats.total}
        />
      </div>
    </div>
  )
}
