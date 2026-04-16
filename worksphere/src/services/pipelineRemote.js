import { TECH_AUTO_PASS_MIN } from './candidatPipeline'

/**
 * Convertit la réponse de get-tech-pipeline-state en index par id candidat / e-mail.
 */
export function buildRemoteLookup(entries) {
  const byId = {}
  const byEmail = {}
  if (!entries || typeof entries !== 'object') return { byId, byEmail }

  for (const [key, val] of Object.entries(entries)) {
    if (!val || typeof val !== 'object') continue
    const n = Number(val.techTestScore)
    if (!Number.isFinite(n) || n <= TECH_AUTO_PASS_MIN) continue

    if (key.startsWith('cand-')) {
      byId[key.slice(5)] = val
    }
    if (key.startsWith('email-')) {
      const em = String(val.email || '')
        .trim()
        .toLowerCase()
      if (em) byEmail[em] = val
    }
  }
  return { byId, byEmail }
}

export async function fetchRemoteTechPipeline() {
  try {
    const res = await fetch('/.netlify/functions/get-tech-pipeline-state')
    if (!res.ok) return { byId: {}, byEmail: {} }
    const data = await res.json()
    if (!data.ok) return { byId: {}, byEmail: {} }
    return buildRemoteLookup(data.entries || {})
  } catch {
    return { byId: {}, byEmail: {} }
  }
}
