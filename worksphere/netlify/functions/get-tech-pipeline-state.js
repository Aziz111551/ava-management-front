import { connectLambda, getStore } from '@netlify/blobs'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  }
}

/**
 * Liste les résultats test technique sync (Phase 2 auto) pour fusion côté app RH.
 * Nécessite Netlify Blobs (déploiement Netlify).
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'GET') return json(405, { ok: false, error: 'Method not allowed' })

  try {
    connectLambda(event)
    const store = getStore({ name: 'ws-tech-pipeline' })
    const { blobs } = await store.list()
    const entries = {}
    for (const { key } of blobs) {
      const data = await store.get(key, { type: 'json' })
      if (data != null) entries[key] = data
    }
    return json(200, { ok: true, entries })
  } catch (e) {
    return json(200, { ok: true, entries: {}, error: e?.message || String(e) })
  }
}
