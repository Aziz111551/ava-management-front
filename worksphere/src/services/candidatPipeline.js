/**
 * Pipeline RH : Phase 1 (test technique) → Phase 2 (test physique / Teams).
 * Stockage local (localStorage) — à remplacer par l’API si besoin.
 */
import { loadDecisionMap } from './candidatsPhase1'

const PIPELINE_KEY = 'ws_candidat_pipeline_v2'

/** Score au test technique en ligne requis pour passage auto Phase 2 (strictement supérieur). */
export const TECH_AUTO_PASS_MIN = 80

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

/**
 * Snapshot candidat (Phase 2 si la ligne disparaît du webhook).
 * @param {{ techTestScore?: number }} [opts]
 */
export function setTechPassedWithSnapshot(id, row, opts = {}) {
  const snap = {
    name: row.name,
    email: row.email,
    position: row.position,
    score: row.score,
    cv: row.cv,
  }
  const techScore = opts.techTestScore
  const p = load()
  p[id] = {
    ...p[id],
    stage: 'tech_passed',
    snapshot: snap,
    ...(techScore != null && Number.isFinite(Number(techScore))
      ? { techTestScore: Number(techScore) }
      : {}),
    updatedAt: new Date().toISOString(),
  }
  save(p)
}

function remoteEntryFor(remoteLookup, id, email) {
  if (!remoteLookup) return null
  const byId = remoteLookup.byId?.[id]
  if (byId && Number(byId.techTestScore) > TECH_AUTO_PASS_MIN) return byId
  const em = (email || '').trim().toLowerCase()
  if (!em) return null
  const byE = remoteLookup.byEmail?.[em]
  if (byE && Number(byE.techTestScore) > TECH_AUTO_PASS_MIN) return byE
  return null
}

function isPhysicalDone(pipe, id) {
  return pipe[id]?.stage === 'physical_sent'
}

function isPromotedToPhase2(pipe, id, email, remoteLookup) {
  if (isPhysicalDone(pipe, id)) return false
  const st = pipe[id]?.stage
  if (st === 'tech_passed') return true
  return Boolean(remoteEntryFor(remoteLookup, id, email))
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

/**
 * Lignes webhook encore en Phase 1 (test technique pas validé / score auto insuffisant).
 * @param {unknown} [remoteLookup] retour de buildRemoteLookup
 */
export function getPhase1Rows(rows, remoteLookup) {
  const pipe = load()
  const dec = loadDecisionMap()
  return rows.filter((r) => {
    if (dec[r._id] === 'declined') return false
    const st = pipe[r._id]?.stage
    if (st === 'tech_passed' || st === 'physical_sent') return false
    if (isPromotedToPhase2(pipe, r._id, r.email, remoteLookup)) return false
    return true
  })
}

/**
 * Candidats prêts pour le test physique (score test tech > 80 côté serveur, ou passage manuel RH).
 * @param {unknown} [remoteLookup]
 */
export function getPhase2Rows(rows, remoteLookup) {
  const pipe = load()
  const dec = loadDecisionMap()
  const result = []
  const seen = new Set()

  for (const r of rows) {
    if (dec[r._id] === 'declined') continue
    if (isPhysicalDone(pipe, r._id)) continue
    if (!isPromotedToPhase2(pipe, r._id, r.email, remoteLookup)) continue
    const remote = remoteEntryFor(remoteLookup, r._id, r.email)
    const tech =
      pipe[r._id]?.techTestScore ??
      (remote?.techTestScore != null ? Number(remote.techTestScore) : undefined)
    result.push({
      ...r,
      _phase2Status: 'awaiting_physical',
      ...(tech != null && Number.isFinite(tech) ? { _techTestScore: tech } : {}),
    })
    seen.add(r._id)
  }

  for (const [id, entry] of Object.entries(pipe)) {
    if (dec[id] === 'declined') continue
    if (isPhysicalDone(pipe, id)) continue
    if (!isPromotedToPhase2(pipe, id, entry.snapshot?.email, remoteLookup)) continue
    if (seen.has(id)) continue
    if (entry.snapshot) {
      const remote = remoteEntryFor(remoteLookup, id, entry.snapshot.email)
      const tech =
        entry.techTestScore ??
        (remote?.techTestScore != null ? Number(remote.techTestScore) : undefined)
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
        ...(tech != null && Number.isFinite(tech) ? { _techTestScore: tech } : {}),
      })
    }
  }

  if (remoteLookup?.byId) {
    for (const [id, rem] of Object.entries(remoteLookup.byId)) {
      if (dec[id] === 'declined') continue
      if (seen.has(id)) continue
      if (isPhysicalDone(pipe, id)) continue
      if (Number(rem.techTestScore) <= TECH_AUTO_PASS_MIN) continue
      result.push({
        _id: id,
        name: rem.name || '—',
        email: rem.email || '—',
        position: '—',
        score: 0,
        cv: '#',
        date: rem.updatedAt || new Date().toISOString(),
        notes: '—',
        _phase2Status: 'awaiting_physical',
        _techTestScore: Number(rem.techTestScore),
      })
      seen.add(id)
    }
  }

  return result
}

/** Pour affichage badge sur Phase 1 */
export function getStageFor(id) {
  return load()[id]?.stage ?? null
}
