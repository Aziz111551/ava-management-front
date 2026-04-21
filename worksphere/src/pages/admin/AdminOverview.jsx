import { useEffect, useMemo, useState } from 'react'
import { getEmployees } from '../../services/api'
import { fetchMeetings } from '../../services/meetings'

function StatCard({ label, value, hint, icon }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border2)',
      borderRadius: 'var(--radius-lg)',
      padding: '22px 22px 20px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    }}>
      <div style={{
        position: 'absolute', top: '-20px', right: '-10px',
        fontSize: '64px', opacity: 0.07, color: '#a78bfa',
      }} aria-hidden>
        <i className={icon} />
      </div>
      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--text3)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        marginTop: '10px',
        fontFamily: 'var(--font-display)',
        fontSize: '32px',
        fontWeight: '800',
        color: 'var(--text)',
        letterSpacing: '-0.5px',
      }}>
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  )
}

function BarChart({ rows, max }) {
  const m = max || Math.max(1, ...rows.map((r) => r.v))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text2)' }}>{r.label}</span>
            <span style={{ color: 'var(--text)', fontWeight: '600' }}>{r.v}</span>
          </div>
          <div style={{
            height: '8px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, (r.v / m) * 100)}%`,
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminOverview() {
  const [meetings, setMeetings] = useState([])
  const [empCount, setEmpCount] = useState(null)
  const [loadErr, setLoadErr] = useState('')

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
    for (const x of list) {
      const st = x.status || 'unknown'
      byStatus[st] = (byStatus[st] || 0) + 1
      const ty = x.type || '—'
      byType[ty] = (byType[ty] || 0) + 1
      if (x.rhEmail) emails.add(String(x.rhEmail).toLowerCase())
      if (x.participantEmail) emails.add(String(x.participantEmail).toLowerCase())
      for (const p of x.coParticipants || []) {
        if (p?.email) emails.add(String(p.email).toLowerCase())
      }
    }
    return { byStatus, byType, participantEmails: emails.size, total: list.length }
  }, [meetings])

  const statusRows = useMemo(() => {
    const o = stats.byStatus
    return Object.keys(o).sort((a, b) => o[b] - o[a]).map((k) => ({ label: k, v: o[k] }))
  }, [stats.byStatus])

  const typeRows = useMemo(() => {
    const o = stats.byType
    return Object.keys(o).sort((a, b) => o[b] - o[a]).slice(0, 6).map((k) => ({ label: k, v: o[k] }))
  }, [stats.byType])

  return (
    <div style={{ padding: '28px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: '800',
          color: 'var(--text)',
          letterSpacing: '-0.4px',
        }}>
          Pilotage produit
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text2)', lineHeight: 1.55, maxWidth: '720px' }}>
          Vue consolidée des réunions intégrées (web / mobile), des profils visibles dans les flux Meet et,
          lorsque l’API est joignable avec un jeton valide, du nombre d’employés synchronisés.
        </p>
      </div>

      {loadErr && (
        <div style={{
          marginBottom: '20px', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
          color: '#fbbf24', fontSize: '13px',
        }}>
          {loadErr}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '18px',
        marginBottom: '28px',
      }}>
        <StatCard
          label="Réunions (total)"
          value={stats.total}
          hint="Toutes les salles enregistrées côté WorkSphere Meet."
          icon="fa-solid fa-video"
        />
        <StatCard
          label="Acteurs uniques (e-mail)"
          value={stats.participantEmails}
          hint="RH, candidats, employés vus dans les métadonnées des réunions."
          icon="fa-solid fa-users"
        />
        <StatCard
          label="Employés (API RH)"
          value={empCount != null ? empCount : '—'}
          hint={empCount == null ? 'Non disponible avec la session admin locale (sans jeton Nest).' : 'Liste /rh/employees.'}
          icon="fa-solid fa-id-badge"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
      }}>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
            Réunions par statut
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Répartition opérationnelle</div>
          {statusRows.length ? (
            <BarChart rows={statusRows} />
          ) : (
            <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '16px' }}>Aucune donnée pour l’instant.</p>
          )}
        </div>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-lg)',
          padding: '22px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
            Réunions par type
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>Flux RH, candidat, employé…</div>
          {typeRows.length ? (
            <BarChart rows={typeRows} />
          ) : (
            <p style={{ color: 'var(--text3)', fontSize: '13px', marginTop: '16px' }}>Aucune donnée pour l’instant.</p>
          )}
        </div>
      </div>
    </div>
  )
}
