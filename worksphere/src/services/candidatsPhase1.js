/**
 * Persistance locale des décisions Phase 1 (la source JSON renvoie toujours les mêmes lignes).
 * Clé : id normalisé du candidat ({@link normalizeEvaluation}).
 */
const STORAGE_KEY = 'ws_phase1_candidat_decisions'

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Pour `candidatPipeline.js` — refus uniquement masque la ligne. */
export function loadDecisionMap() {
  return loadMap()
}

export function getCandidatDecision(id) {
  return loadMap()[id] ?? null
}

/** *******@param {'accepted' | 'declined'} action */
export function setCandidatDecision(id, action) {
  const m = loadMap()
  m[id] = action
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
  } catch {
    /* ignore quota */
  }
}

export function clearCandidatDecisions() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore quota/security */
  }
}

/** Exclut uniquement les **refus**. Les anciennes entrées `accepted` ne masquent plus la ligne. */
export function filterNotDeclined(rows) {
  const m = loadMap()
  return rows.filter((r) => m[r._id] !== 'declined')
}

/** @deprecated préférer {@link filterNotDeclined} + pipeline Phase 1/2 */
export function filterUnresolvedCandidats(rows) {
  const m = loadMap()
  return rows.filter((r) => !m[r._id])
}

/** Mappe poste / libellé → champs formulaire employé (aligné sur Employes.jsx). */
export function candidateToEmployeePayload(candidate) {
  const position = (candidate.position || '').trim()
  const p = position.toLowerCase()

  let employeeType = 'Developer'
  if (/marketing|market/.test(p)) employeeType = 'Marketing'
  else if (/rh\b|hr\b|ressource|human/.test(p)) employeeType = 'HR'
  else if (/commercial|sales|vente|business/.test(p)) employeeType = 'Sales'
  else if (/design|ux|ui/.test(p)) employeeType = 'Designer'
  else if (/compta|account|finance/.test(p)) employeeType = 'Accountant'
  else if (/manager|lead|chef|director|head/.test(p)) employeeType = 'Manager'

  const deptByType = {
    Developer: 'Engineering',
    Designer: 'Engineering',
    Marketing: 'Marketing',
    HR: 'HR',
    Sales: 'Commercial',
    Manager: 'Operations',
    Accountant: 'Finance',
  }
  const department = deptByType[employeeType] || 'Operations'

  const today = new Date().toISOString().slice(0, 10)

  return {
    name: candidate.name?.trim() || '—',
    email: (candidate.email || '').trim(),
    department,
    employeeType,
    role: 'employee',
    status: 'active',
    joinDate: today,
  }
}
