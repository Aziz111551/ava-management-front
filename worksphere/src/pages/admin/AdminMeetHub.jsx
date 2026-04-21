import { useEffect, useMemo, useState } from 'react'
import { fetchMeetings } from '../../services/meetings'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

export default function AdminMeetHub() {
  const [meetings, setMeetings] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr('')
      setLoading(true)
      try {
        const data = await fetchMeetings({ viewer: 'rh' })
        if (!cancelled) setMeetings(Array.isArray(data.meetings) ? data.meetings : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Impossible de charger les réunions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const summary = useMemo(() => {
    const list = meetings
    const withReport = list.filter((m) => m.reportStatus === 'ready' || (m.reportPreview && Object.keys(m.reportPreview).length)).length
    const live = list.filter((m) => m.status === 'live' || m.status === 'in_progress').length
    const done = list.filter((m) => m.status === 'ended' || m.status === 'completed').length
    return { total: list.length, withReport, live, done }
  }, [meetings])

  const recent = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const ta = new Date(a.scheduledAt || 0).getTime()
      const tb = new Date(b.scheduledAt || 0).getTime()
      return tb - ta
    }).slice(0, 25)
  }, [meetings])

  return (
    <div style={{ padding: '28px', maxWidth: '1280px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          fontWeight: '800',
          color: 'var(--text)',
        }}>
          Meet — synthèse
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text2)', lineHeight: 1.55, maxWidth: '800px' }}>
          Résumé orienté « ce qui se passe » : les réunions intégrées sont utilisées depuis le portail web et les parcours
          invités (liens de jointure). Les noms et e-mails ci-dessous proviennent des métadonnées enregistrées à la création de la salle.
        </p>
      </div>

      {err && (
        <div style={{
          marginBottom: '16px', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--red-bg)', border: '1px solid rgba(255,82,82,0.2)', color: 'var(--red)', fontSize: '13px',
        }}>
          {err}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        {[
          { k: 'Total', v: loading ? '…' : summary.total, sub: 'réunions' },
          { k: 'En direct / actives', v: loading ? '…' : summary.live, sub: 'sessions' },
          { k: 'Terminées', v: loading ? '…' : summary.done, sub: 'statuts clos' },
          { k: 'Avec rapport', v: loading ? '…' : summary.withReport, sub: 'aperçu ou rapport' },
        ].map((x) => (
          <div
            key={x.k}
            style={{
              background: 'linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(15,23,42,0.85) 100%)',
              border: '1px solid rgba(129,140,248,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {x.k}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', color: 'var(--text)', marginTop: '6px' }}>
              {x.v}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>{x.sub}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--text)' }}>
            Dernières réunions
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Tri par date planifiée</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>Quand</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>Type</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>Statut</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>RH</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>Principal invité</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>Co-participants</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '28px 16px', color: 'var(--text3)', textAlign: 'center' }}>Chargement…</td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '28px 16px', color: 'var(--text3)', textAlign: 'center' }}>
                    Aucune réunion enregistrée.
                  </td>
                </tr>
              ) : (
                recent.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{formatWhen(m.scheduledAt)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{m.type || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: 'rgba(99,102,241,0.15)',
                        color: '#c4b5fd',
                      }}>
                        {m.status || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', maxWidth: '200px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>{m.rhName || '—'}</div>
                      <div style={{ fontSize: '11px', opacity: 0.85 }}>{m.rhEmail || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)', maxWidth: '200px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text)' }}>{m.participantName || '—'}</div>
                      <div style={{ fontSize: '11px', opacity: 0.85 }}>{m.participantEmail || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: '12px' }}>
                      {(m.coParticipants || []).length
                        ? (m.coParticipants || []).map((p) => p.name || p.email).filter(Boolean).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
