import { useState } from 'react'
import { getEmployees } from '../../services/api'
import { fetchMeetings } from '../../services/meetings'
import { requestAdminAiRecap } from '../../services/adminAiRecap'

const panel = {
  background: 'linear-gradient(165deg, rgba(22,24,42,0.95) 0%, rgba(14,17,32,0.92) 100%)',
  border: '1px solid rgba(99,102,241,0.14)',
  borderRadius: '16px',
  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 48px rgba(0,0,0,0.45)',
}

export default function AdminAIInsights() {
  const [loading, setLoading] = useState(false)
  const [recap, setRecap] = useState('')
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')

  const hasKey = Boolean(import.meta.env.VITE_WS_ADMIN_API_KEY?.trim())

  async function buildContextPayload() {
    const [mRes, eRes] = await Promise.allSettled([
      fetchMeetings({ viewer: 'rh' }),
      getEmployees(),
    ])
    const meetings = mRes.status === 'fulfilled' && Array.isArray(mRes.value?.meetings) ? mRes.value.meetings : []
    let employees = []
    if (eRes.status === 'fulfilled') {
      const d = eRes.value?.data
      employees = Array.isArray(d) ? d : []
    }

    const byStatus = {}
    const byType = {}
    for (const m of meetings) {
      const st = m.status || 'unknown'
      byStatus[st] = (byStatus[st] || 0) + 1
      const ty = m.type || '—'
      byType[ty] = (byType[ty] || 0) + 1
    }

    const samples = [...meetings]
      .sort((a, b) => new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0))
      .slice(0, 40)
      .map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        scheduledAt: m.scheduledAt,
        rh: m.rhName || m.rhEmail,
        invite: m.participantName || m.participantEmail,
        coPart: (m.coParticipants || []).length,
        rapport: m.reportStatus || (m.reportPreview ? 'preview' : null),
      }))

    return JSON.stringify(
      {
        genereLe: new Date().toISOString(),
        resume: {
          totalReunions: meetings.length,
          parStatut: byStatus,
          parType: byType,
          employesApiCount: employees.length,
          employesApiDisponible: employees.length > 0 || eRes.status === 'fulfilled',
        },
        echantillonReunions: samples,
        employesApercu: employees.slice(0, 80).map((e) => ({
          name: e.name,
          email: e.email,
          department: e.department,
          employeeType: e.employeeType,
          status: e.status,
          role: e.role,
        })),
      },
      null,
      2,
    )
  }

  const handleGenerate = async () => {
    setErr('')
    setInfo(null)
    setRecap('')
    setLoading(true)
    try {
      const context = await buildContextPayload()
      const data = await requestAdminAiRecap(context)
      if (data.skipped || !data.recap) {
        setInfo(data.message || 'Récap non généré.')
        setRecap('')
      } else {
        setRecap(data.recap || '')
        setInfo(data.model ? `Modèle : ${data.model}` : null)
      }
    } catch (e) {
      setErr(e?.message || 'Échec')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px 28px 40px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a5b4fc', marginBottom: '8px' }}>
          Intelligence artificielle
        </div>
        <h1 style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: '24px',
          fontWeight: '800',
          color: 'var(--text)',
          letterSpacing: '-0.4px',
        }}>
          Récapitulatif global
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--text2)' }}>
          Agrège les réunions Meet (Netlify), un échantillon récent et la liste employés si l’API Nest répond avec un jeton valide.
          Le texte est produit par OpenAI côté serveur (même clé que les autres fonctions IA).
        </p>
      </div>

      {!hasKey && (
        <div style={{
          marginBottom: '18px', padding: '14px 16px', borderRadius: '12px',
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontSize: '13px', lineHeight: 1.5,
        }}>
          Définissez <code style={{ color: '#fde68a' }}>VITE_WS_ADMIN_API_KEY</code> et <code style={{ color: '#fde68a' }}>WS_ADMIN_API_KEY</code> (identiques) pour autoriser cette action.
        </div>
      )}

      {err && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'var(--red-bg)', color: 'var(--red)', fontSize: '13px' }}>
          {err}
        </div>
      )}

      <div style={{ ...panel, padding: '22px 24px', marginBottom: '20px' }}>
        <button
          type="button"
          disabled={loading || !hasKey}
          onClick={handleGenerate}
          style={{
            padding: '14px 22px',
            borderRadius: '12px',
            border: 'none',
            cursor: loading || !hasKey ? 'not-allowed' : 'pointer',
            opacity: loading || !hasKey ? 0.55 : 1,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #a855f7 100%)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: '700',
            fontSize: '14px',
            boxShadow: '0 10px 28px rgba(99,102,241,0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" aria-hidden />
              Génération en cours…
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden />
              Générer le récap IA
            </>
          )}
        </button>
        {info && !recap && (
          <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text3)', lineHeight: 1.55 }}>{info}</p>
        )}
        {info && recap && (
          <p style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text3)' }}>{info}</p>
        )}
      </div>

      {recap && (
        <article style={{
          ...panel,
          padding: '28px 30px',
          fontSize: '14px',
          lineHeight: 1.75,
          color: 'var(--text2)',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-body)',
        }}>
          {recap}
        </article>
      )}
    </div>
  )
}
