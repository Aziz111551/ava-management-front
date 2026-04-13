/**
 * GET JSON depuis le webhook n8n (équivalent logique à un parseur type ats_api).
 * Accepte un tableau racine ou un objet avec une liste sous evaluations, data, rows, etc.
 */

const DEFAULT_WEBHOOK =
  'https://n8n-production-1e13.up.railway.app/webhook/evaluations'

const LIST_KEYS = [
  'evaluations',
  'data',
  'rows',
  'results',
  'items',
  'records',
  'candidates',
]

export function extractEvaluationsArray(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  for (const k of LIST_KEYS) {
    const v = payload[k]
    if (Array.isArray(v)) return v
  }
  return []
}

/** Clés atypiques renvoyées par certains exports (ex. Google Sheets → n8n). */
function pickCreatedAt(raw) {
  return (
    raw['created_at (date traitement)'] ??
    raw.created_at ??
    raw.createdAt ??
    raw.date ??
    raw.timestamp ??
    null
  )
}

/**
 * @param {Record<string, unknown>} raw
 * @param {number} index
 * @returns {{ _id: string, name: string, email: string, position: string, score: number, date: string, notes: string, cv: string }}
 */
export function normalizeEvaluation(raw, index) {
  const scoreNum = Number(raw.score)
  const score = Number.isFinite(scoreNum) ? scoreNum : 0
  const strengths = raw.strengths != null ? String(raw.strengths) : ''
  const notesField = raw.notes != null ? String(raw.notes) : ''
  const notes =
    notesField.trim() ||
    (strengths ? strengths.slice(0, 220) + (strengths.length > 220 ? '…' : '') : '—')

  const name = String(raw.candidate_name ?? raw.name ?? '').trim() || '—'
  const email = String(raw.candidate_email ?? raw.email ?? '').trim()
  const position =
    String(raw.job_title ?? raw.position ?? raw.role ?? raw.jobTitle ?? '').trim() || '—'
  const cvRaw = String(raw.cv_url ?? raw.cv ?? raw.cvUrl ?? '').trim()
  const cv = cvRaw || '#'

  const created = pickCreatedAt(raw)
  const dateStr =
    created != null && String(created).trim() !== ''
      ? String(created)
      : new Date().toISOString()

  /**
   * Toujours suffixer par l’index : certains exports (Sheets / n8n) répètent le même
   * `row_number` ou `id` pour chaque ligne — sans ça, un Decline efface toute la liste.
   */
  const base =
    raw.evaluation_id ??
    raw.id ??
    raw._id ??
    raw.row_number
  const _id =
    base != null && String(base).trim() !== ''
      ? `${String(base).trim()}:${index}`
      : `idx-${index}`

  return {
    _id,
    name,
    email,
    position,
    score,
    date: dateStr,
    notes,
    cv,
  }
}

export async function fetchEvaluations() {
  const url = import.meta.env.VITE_EVALUATIONS_WEBHOOK_URL || DEFAULT_WEBHOOK
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Échec du chargement (${res.status})`)
  }
  const json = await res.json()
  const arr = extractEvaluationsArray(json)
  return arr.map((row, i) => normalizeEvaluation(row, i))
}
