import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { getEmployees } from '../../services/api'
import { fetchMeetings } from '../../services/meetings'
import { requestAdminAiRecap } from '../../services/adminAiRecap'

function formatLabel(raw) {
  const value = String(raw || '').trim()
  if (!value) return '—'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

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
          <h2 key={idx} className="mt-6 text-base font-semibold text-slate-900 dark:text-white">
            {l.replace(/^##\s*/, '')}
          </h2>
        )
      }
      if (/^\d+\.\s/.test(l)) {
        return (
          <div key={idx} className="pl-3 text-sm text-slate-700 dark:text-slate-300">
            {l}
          </div>
        )
      }
      if (l.startsWith('-')) {
        return (
          <div key={idx} className="pl-3 text-sm text-slate-700 dark:text-slate-300">
            • {l.replace(/^-+\s*/, '')}
          </div>
        )
      }
      return (
        <p key={idx} className="text-sm leading-7 text-slate-700 dark:text-slate-300">
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
  const [generatedAt, setGeneratedAt] = useState('')
  const [stats, setStats] = useState({
    meetingsTotal: 0,
    employeesCount: 0,
    completedMeetings: 0,
    scheduledMeetings: 0,
    topStatuses: [],
    topTypes: [],
  })

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

    const summary = {
      meetingsTotal: meetings.length,
      meetingsByStatus: byStatus,
      meetingsByType: byType,
      employeesCount: employees.length,
    }
    const meetingsSample = meetings.slice(0, 50).map((m) => ({
      id: m.id,
      type: m.type,
      status: m.status,
      scheduledAt: m.scheduledAt,
      rh: m.rhName || m.rhEmail,
      participant: m.participantName || m.participantEmail,
    }))
    const context = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        meetingsSample,
      },
      null,
      2,
    )

    const completedMeetings = Number(byStatus.completed || 0)
    const scheduledMeetings = Number(byStatus.scheduled || 0) + Number(byStatus.programmed || 0)
    const topStatuses = Object.entries(byStatus)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
    const topTypes = Object.entries(byType)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)

    return {
      context,
      stats: {
        meetingsTotal: meetings.length,
        employeesCount: employees.length,
        completedMeetings,
        scheduledMeetings,
        topStatuses,
        topTypes,
      },
    }
  }

  const generateRecap = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    setRecap('')
    try {
      const { context, stats: nextStats } = await buildContextPayload()
      const res = await requestAdminAiRecap(context)
      setStats(nextStats)
      setGeneratedAt(new Date().toISOString())
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

  const statusPreview = useMemo(
    () =>
      stats.topStatuses.map(([k, v]) => (
        <span key={k} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">
          {formatLabel(k)}: {v}
        </span>
      )),
    [stats.topStatuses],
  )

  const typePreview = useMemo(
    () =>
      stats.topTypes.map(([k, v]) => (
        <span key={k} className="rounded-full border border-slate-200 px-2 py-0.5 text-xs dark:border-slate-700">
          {formatLabel(k)}: {v}
        </span>
      )),
    [stats.topTypes],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="ap-panel overflow-hidden p-0">
          <div className="relative grid gap-4 border-b border-slate-200 p-6 dark:border-slate-800 lg:grid-cols-[1.4fr_1fr]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-violet-500/10" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500 dark:text-primary-300">
                Intelligence artificielle
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Insights IA - Récapitulatif global</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Rapport exécutif dynamique basé sur les réunions RH et l'activité des équipes. Génération instantanée avec recommandations actionnables.
              </p>
            </div>
            <div className="relative flex items-start justify-start lg:justify-end">
              <button
                type="button"
                disabled={!hasKey || loading}
                onClick={generateRecap}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-primary-900/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`} aria-hidden />
                {loading ? 'Génération en cours...' : 'Générer le récap IA'}
              </button>
            </div>
          </div>

          {!hasKey && (
            <div className="mx-6 mt-5 rounded-xl border border-amber-500/30 bg-amber-100/60 px-4 py-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              Définissez <code>VITE_WS_ADMIN_API_KEY</code> et <code>WS_ADMIN_API_KEY</code> (même valeur) pour autoriser la génération.
            </div>
          )}

          <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total réunions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.meetingsTotal}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Réunions complétées</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedMeetings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Réunions planifiées</p>
              <p className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">{stats.scheduledMeetings}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs text-slate-500 dark:text-slate-400">Employés</p>
              <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.employeesCount}</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 px-6 pb-5 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Statuts dominants:</span>
              {statusPreview.length ? statusPreview : <span>Non disponible</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Types dominants:</span>
              {typePreview.length ? typePreview : <span>Non disponible</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {generatedAt && <span>Dernière génération: {new Date(generatedAt).toLocaleString('fr-FR')}</span>}
              {info && <span>{info}</span>}
            </div>
          </div>

          {error && (
            <p className="mx-6 mb-6 rounded-lg border border-rose-500/30 bg-rose-100/70 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">
              {error}
            </p>
          )}
        </section>

        <article className="ap-panel p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Rapport IA</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Synthèse détaillée avec tendances et recommandations.</p>
            </div>
            <div className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {loading ? 'Analyse en cours' : recap ? 'Disponible' : 'En attente'}
            </div>
          </div>

          {loading && (
            <div className="space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-10/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          )}

          {!loading && !recap && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              Aucun rapport généré pour le moment. Cliquez sur <strong>Générer le récap IA</strong> pour obtenir une synthèse professionnelle.
            </div>
          )}

          {!loading && recap && <div className="space-y-1">{recapToHtmlLines(recap)}</div>}
        </article>
      </div>
    </motion.div>
  )
}
