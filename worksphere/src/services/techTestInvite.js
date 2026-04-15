const FN = '/.netlify/functions'

/**
 * Crée un lien signé + envoie l’e-mail (si Resend configuré sur Netlify).
 * Nécessite les fonctions Netlify déployées (ou `netlify dev`).
 */
export async function issueTechnicalTestInvite({ email, name }) {
  const res = await fetch(`${FN}/issue-tech-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok) throw new Error(data.error || 'Échec de la création du lien de test')
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
