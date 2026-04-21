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

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              'Tu es un analyste produit / RH pour AVA / WorkSphere. Rédige un récapitulatif exécutif en français, structuré avec des titres courts (## ou puces), à partir des données fournies. Mets en avant volumes, tendances, anomalies et recommandations pratiques. Pas de formules de politesse inutiles.',
          },
          {
            role: 'user',
            content: `Données agrégées (JSON ou texte) :\n\n${context}\n\n---\nProduis un récap synthétique (environ 400 à 900 mots selon la richesse des données).`,
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
