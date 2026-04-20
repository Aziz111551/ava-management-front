import { TECH_AUTO_PASS_MIN } from './candidatPipeline'

/**
 * Convertit la réponse de get-tech-pipeline-state en index par id candidat.
 * En contexte n8n, on évite le fallback par e-mail pour ne pas mélanger
 * plusieurs candidatures d'une même adresse.
 */
export function buildRemoteLookup(entries) {
  const byId = {}
  if (!entries || typeof entries !== 'object') return { byId }

  for (const [key, val] of Object.entries(entries)) {
    if (!val || typeof val !== 'object') continue
    const n = Number(val.techTestScore)
    if (!Number.isFinite(n) || n <= TECH_AUTO_PASS_MIN) continue

    if (key.startsWith('cand-')) {
      byId[key.slice(5)] = val
    }
  }
  return { byId }
}

export async function fetchRemoteTechPipeline() {
  try {
    const res = await fetch('/.netlify/functions/get-tech-pipeline-state')
    if (!res.ok) return { byId: {} }
    const data = await res.json()
    if (!data.ok) return { byId: {} }
    return buildRemoteLookup(data.entries || {})
  } catch {
    return { byId: {} }
  }
}
