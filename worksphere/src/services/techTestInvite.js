const FN = '/.netlify/functions'

/**
 * Crée un lien signé + envoie l’e-mail (si Resend configuré sur Netlify).
 * Nécessite les fonctions Netlify déployées (ou `netlify dev`).
 */
function bodyToMessage(text, status) {
  try {
    const j = JSON.parse(text)
    if (j.error) {
      return j.inviteUrl ? `${j.error}\n\nLien de secours:\n${j.inviteUrl}` : j.error
    }
  } catch {
    /* ignore */
  }
  if (status === 404) {
    return 'Fonction Netlify introuvable (404). Vérifiez que netlify/functions est déployé (repo racine + base worksphere) et redéployez.'
  }
  return text?.slice(0, 220) || `HTTP ${status}`
}

/**
 * @param {{ email: string, name: string, skipResendEmail?: boolean, candidatId?: string }} opts
 * candidatId : id ligne évaluations (webhook) — inclus dans le JWT pour sync Phase 2 auto après le test.
 * skipResendEmail : ne pas envoyer le mail « test seul » (utilisé avec send-phase1-bundle).
 */
export async function issueTechnicalTestInvite({ email, name, skipResendEmail = false, candidatId }) {
  const res = await fetch(`${FN}/issue-tech-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name,
      ...(candidatId != null && String(candidatId).trim() !== '' ? { candidatId: String(candidatId).trim() } : {}),
      ...(skipResendEmail ? { skipResendEmail: true } : {}),
    }),
  })
  const text = await res.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(bodyToMessage(text, res.status))
  }
  if (!res.ok || !data.ok) {
    throw new Error(data.error || bodyToMessage(text, res.status))
  }
  return data
}

export async function verifyTechToken(token) {
  const res = await fetch(`${FN}/verify-tech-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return res.json()
}

export async function techTestAI(body) {
  const res = await fetch(`${FN}/tech-test-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}
