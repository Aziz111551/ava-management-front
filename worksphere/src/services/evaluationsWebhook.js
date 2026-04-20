/**
 * GET JSON (tableau ou objet avec evaluations, data, rows, etc.).
 * Surcharge : VITE_EVALUATIONS_WEBHOOK_URL dans l’environnement de build.
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

const ID_KEYS = [
  'evaluation_id',
  'id',
  '_id',
  'row_number',
  'job_id',
  'jobId',
  'application_id',
  'applicationId',
  'candidate_id',
  'candidateId',
  'submission_id',
  'submissionId',
  'response_id',
  'responseId',
  'uuid',
  'reference',
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

/** Clés atypiques renvoyées par certains exports (ex. Google Sheets). */
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

function firstNonEmpty(raw, keys) {
  for (const k of keys) {
    const v = raw?.[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function hashText(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function fallbackStableId(raw) {
  const seed = [
    firstNonEmpty(raw, ['created_at (date traitement)', 'created_at', 'createdAt', 'date', 'timestamp']),
    firstNonEmpty(raw, ['candidate_email', 'email']),
    firstNonEmpty(raw, ['candidate_name', 'name']),
    firstNonEmpty(raw, ['job_title', 'position', 'role', 'jobTitle']),
    firstNonEmpty(raw, ['cv_url', 'cv', 'cvUrl']),
  ]
    .map((v) => v.toLowerCase())
    .join('|')

  return `fp-${hashText(seed || JSON.stringify(raw || {}))}`
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
   * n8n / Sheets : garder un id stable entre refreshs.
   * On privilégie un id explicite du workflow, sinon un fingerprint déterministe.
   */
  const base = firstNonEmpty(raw, ID_KEYS)
  const _id = base || fallbackStableId(raw)

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
  const url = (
    import.meta.env.VITE_EVALUATIONS_WEBHOOK_URL || DEFAULT_WEBHOOK
  ).trim()
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
