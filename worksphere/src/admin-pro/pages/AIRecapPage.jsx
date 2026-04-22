import { useState } from 'react'
import { motion } from 'framer-motion'
import { getEmployees } from '../../services/api'
import { fetchMeetings } from '../../services/meetings'
import { requestAdminAiRecap } from '../../services/adminAiRecap'

function recapToHtmlLines(text) {
  return String(text || '')
    .split('\n')
    .map((line, idx) => {
      const l = line.trim()
      if (!l) return <div key={`e-${idx}`} className="h-3" />
      if (l === '---') {
        return <hr key={`hr-${idx}`} className="my-4 border-slate-700/70" />
      }
      if (l.startsWith('# ')) {
        return (
          <h1 key={idx} className="mt-2 text-xl font-bold text-white">
            {l.replace(/^#\s*/, '')}
          </h1>
        )
      }
      if (l.startsWith('###')) {
        return (
          <h3 key={idx} className="mt-4 text-sm font-semibold text-slate-100">
            {l.replace(/^###\s*/, '')}
          </h3>
        )
      }
      if (l.startsWith('##')) {
        return (
          <h2 key={idx} className="mt-5 text-base font-semibold text-white">
            {l.replace(/^##\s*/, '')}
          </h2>
        )
      }
      if (l.startsWith('-')) {
        return (
          <div key={idx} className="pl-3 text-sm text-slate-300">
            • {l.replace(/^-+\s*/, '')}
          </div>
        )
      }
      return (
        <p key={idx} className="text-sm leading-7 text-slate-300">
          {line}
        </p>
      )
    })
}

export default function AIRecapPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [recap, setRecap] = useState('')

  const hasKey = Boolean(import.meta.env.VITE_WS_ADMIN_API_KEY?.trim())

  const buildContextPayload = async () => {
    const [mRes, eRes] = await Promise.allSettled([
      fetchMeetings({ viewer: 'rh' }),
      getEmployees(),
    ])
    const meetings = mRes.status === 'fulfilled' && Array.isArray(mRes.value?.meetings) ? mRes.value.meetings : []
    const employees =
      eRes.status === 'fulfilled' && Array.isArray(eRes.value?.data) ? eRes.value.data : []

    const byStatus = {}
    const byType = {}
    meetings.forEach((m) => {
      const st = m.status || 'unknown'
      const ty = m.type || '—'
      byStatus[st] = (byStatus[st] || 0) + 1
      byType[ty] = (byType[ty] || 0) + 1
    })

    return JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          meetingsTotal: meetings.length,
          meetingsByStatus: byStatus,
          meetingsByType: byType,
          employeesCount: employees.length,
        },
        meetingsSample: meetings
          .slice(0, 50)
          .map((m) => ({
            id: m.id,
            type: m.type,
            status: m.status,
            scheduledAt: m.scheduledAt,
            rh: m.rhName || m.rhEmail,
            participant: m.participantName || m.participantEmail,
          })),
      },
      null,
      2,
    )
  }

  const generateRecap = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    setRecap('')
    try {
      const context = await buildContextPayload()
      const res = await requestAdminAiRecap(context)
      if (res?.recap) {
        setRecap(res.recap)
        if (res.model) setInfo(`Modèle IA: ${res.model}`)
      } else {
        setInfo(res?.message || 'Aucun récapitulatif généré.')
      }
    } catch (e) {
      setError(e?.message || 'Erreur de génération IA.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="ap-panel p-6">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-300">
              Intelligence artificielle
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Récapitulatif global</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Génère un récap exécutif à partir des réunions, des statuts et des données RH. Le rendu est dynamique et peut être relancé à la demande.
            </p>
          </div>

          {!hasKey && (
            <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-xs text-amber-200">
              Définissez <code>VITE_WS_ADMIN_API_KEY</code> et <code>WS_ADMIN_API_KEY</code> (même valeur) pour autoriser la génération.
            </div>
          )}

          <button
            type="button"
            disabled={!hasKey || loading}
            onClick={generateRecap}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} aria-hidden />
            {loading ? 'Génération…' : 'Générer le récap IA'}
          </button>

          {info && <p className="mt-3 text-xs text-slate-400">{info}</p>}
          {error && (
            <p className="mt-3 rounded-lg border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}
        </section>

        {recap && (
          <article className="ap-panel p-6">
            <div className="space-y-1">{recapToHtmlLines(recap)}</div>
          </article>
        )}
      </div>
    </motion.div>
  )
}
