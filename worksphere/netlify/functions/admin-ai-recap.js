const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-ws-admin-key, X-Ws-Admin-Key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  }
}

function safeParseContext(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const expected = (process.env.WS_ADMIN_API_KEY || '').trim()
  const provided =
    event.headers['x-ws-admin-key'] ||
    event.headers['X-Ws-Admin-Key'] ||
    ''
  if (!expected || String(provided).trim() !== expected) {
    return json(403, { ok: false, error: 'Clé administrateur invalide ou WS_ADMIN_API_KEY non configurée.' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const context = String(body.context || '').trim()
  if (!context) {
    return json(400, { ok: false, error: 'Contexte requis (champ « context »).' })
  }
  if (context.length > 120000) {
    return json(400, { ok: false, error: 'Contexte trop volumineux (max ~120 ko).' })
  }

  const key = (process.env.OPENAI_API_KEY || '').trim()
  if (!key) {
    return json(200, {
      ok: true,
      recap: null,
      skipped: true,
      message: 'OPENAI_API_KEY non défini sur Netlify — impossible de générer le récap IA.',
    })
  }

  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim()
  const parsed = safeParseContext(context)
  const summaryFacts = parsed?.summary
    ? JSON.stringify(parsed.summary, null, 2)
    : 'Résumé non structuré (texte brut).'
  const sampleFacts = parsed?.meetingsSample
    ? JSON.stringify(parsed.meetingsSample.slice(0, 20), null, 2)
    : 'Aucun échantillon de réunions.'

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              "Tu es un analyste produit / RH pour AVA / WorkSphere. Tu dois STRICTEMENT résumer les données fournies, sans inventer de modules, d'APIs, de sécurité, de paiements, de mobile, ni de fonctionnalités non présentes dans le contexte. Interdiction d'utiliser des templates génériques du type 'Fiche Résumé - Application Mobile'. Si une donnée manque, écris explicitement 'Non disponible dans les données'. Réponds uniquement en français, en Markdown court et lisible.",
          },
          {
            role: 'user',
            content: `Contexte brut:\n${context}\n\nFaits structurés:\n${summaryFacts}\n\nÉchantillon réunions:\n${sampleFacts}\n\nFormat de réponse obligatoire:\n# Récap IA WorkSphere\n## Vue globale\n- 4 à 6 points factuels\n## Tendances observées\n- 3 à 5 points factuels avec chiffres si disponibles\n## Risques / anomalies\n- 2 à 4 points (ou "Aucun signal fort")\n## Actions recommandées\n- 3 à 5 actions concrètes liées aux données\n\nRègles strictes:\n- Ne mentionner AUCUNE route API (ex: /api/...)\n- Ne pas parler d'application mobile sauf si explicitement présent dans le contexte\n- Ne pas dépasser 350 mots`,
          },
        ],
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = data.error?.message || data.error || res.statusText
      return json(200, { ok: true, recap: null, message: err || 'Erreur OpenAI' })
    }

    const recap = data.choices?.[0]?.message?.content?.trim() || ''
    return json(200, { ok: true, recap, model })
  } catch (err) {
    return json(200, { ok: true, recap: null, message: err?.message || 'Erreur lors de l’appel OpenAI.' })
  }
}
