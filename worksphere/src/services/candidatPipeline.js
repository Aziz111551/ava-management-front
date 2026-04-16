/**
 * Pipeline RH : Phase 1 (test technique) → Phase 2 (test physique / Teams).
 * Stockage local (localStorage) — à remplacer par l’API si besoin.
 */
import { loadDecisionMap } from './candidatsPhase1'

const PIPELINE_KEY = 'ws_candidat_pipeline_v2'

function load() {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data) {
  try {
    localStorage.setItem(PIPELINE_KEY, JSON.stringify(data))
  } catch {
    /* quota */
  }
}

/** @param {string} id @param {'tech_sent' | 'tech_passed' | 'physical_sent'} stage */
export function setPipelineStage(id, stage, extra = {}) {
  const p = load()
  p[id] = { ...p[id], stage, ...extra, updatedAt: new Date().toISOString() }
  save(p)
}

/** Snapshot candidat (Phase 2 si la ligne disparaît du webhook). */
export function setTechPassedWithSnapshot(id, row) {
  const snap = {
    name: row.name,
    email: row.email,
    position: row.position,
    score: row.score,
    cv: row.cv,
  }
  const p = load()
  p[id] = {
    ...p[id],
    stage: 'tech_passed',
    snapshot: snap,
    updatedAt: new Date().toISOString(),
  }
  save(p)
}

export function markPhysicalSent(id, { meetingAt, teamsUrl }) {
  const p = load()
  p[id] = {
    ...p[id],
    stage: 'physical_sent',
    meetingAt,
    teamsUrl,
    updatedAt: new Date().toISOString(),
  }
  save(p)
}

/** Lignes webhook encore en Phase 1 (pas encore passées en Phase 2). */
export function getPhase1Rows(rows) {
  const pipe = load()
  const dec = loadDecisionMap()
  return rows.filter((r) => {
    if (dec[r._id] === 'declined') return false
    const st = pipe[r._id]?.stage
    if (st === 'tech_passed' || st === 'physical_sent') return false
    return true
  })
}

/** Candidats prêts pour le test physique (test technique validé par le RH). */
export function getPhase2Rows(rows) {
  const pipe = load()
  const dec = loadDecisionMap()
  const result = []
  const seen = new Set()

  for (const r of rows) {
    if (dec[r._id] === 'declined') continue
    if (pipe[r._id]?.stage === 'tech_passed') {
      result.push({ ...r, _phase2Status: 'awaiting_physical' })
      seen.add(r._id)
    }
  }

  for (const [id, entry] of Object.entries(pipe)) {
    if (entry.stage !== 'tech_passed') continue
    if (seen.has(id)) continue
    if (entry.snapshot) {
      result.push({
        _id: id,
        name: entry.snapshot.name,
        email: entry.snapshot.email,
        position: entry.snapshot.position ?? '—',
        score: entry.snapshot.score ?? 0,
        cv: entry.snapshot.cv ?? '#',
        date: entry.updatedAt,
        notes: '—',
        _phase2Status: 'awaiting_physical',
      })
    }
  }

  return result
}

/** Pour affichage badge sur Phase 1 */
export function getStageFor(id) {
  return load()[id]?.stage ?? null
}
