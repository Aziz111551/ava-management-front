import { verifyJWT } from './lib/jwt.js'
import { connectLambda, getStore } from '@netlify/blobs'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  }
}

/** Seuil strict RH : score > 80 → Phase 2 (test physique) synchronisé via Netlify Blobs. */
const AUTO_PHASE2_MIN = 80

async function persistAutoPhase2(event, payload, score) {
  const n = Number(score)
  if (!Number.isFinite(n) || n <= AUTO_PHASE2_MIN) return
  try {
    connectLambda(event)
    const store = getStore({ name: 'ws-tech-pipeline' })
    const record = {
      techTestScore: n,
      stage: 'tech_passed',
      email: payload.email,
      name: payload.name,
      cid: payload.cid || null,
      updatedAt: new Date().toISOString(),
    }
    if (payload.cid) {
      await store.setJSON(`cand-${payload.cid}`, record)
    }
    const em = String(payload.email || '')
      .trim()
      .toLowerCase()
    const emKey = `email-${Buffer.from(em, 'utf8').toString('base64url')}`
    await store.setJSON(emKey, record)
  } catch (err) {
    console.warn('[tech-test-ai] Netlify Blobs (sync RH)', err)
  }
}

async function openaiChat(messages, jsonMode = true) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY manquant côté serveur (Netlify env).')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = data.error?.message || res.statusText
    throw new Error(err || 'OpenAI error')
  }
  return data.choices?.[0]?.message?.content || ''
}

function normalizeSampleTests(input) {
  if (!Array.isArray(input)) return []
  return input
    .map((test, index) => {
      const t = test && typeof test === 'object' ? test : {}
      const args = Array.isArray(t.args) ? t.args : t.args != null ? [t.args] : []
      return {
        label: String(t.label || `Exemple ${index + 1}`).trim(),
        args,
        expected: t.expected,
      }
    })
    .filter((test) => test.args.length > 0)
    .slice(0, 5)
}

function normalizeExercise(exercise) {
  const ex = exercise && typeof exercise === 'object' ? exercise : {}
  const functionName = String(ex.functionName || '').trim() || 'solve'
  const durationNum = Number(ex.durationMinutes)
  const durationMinutes =
    Number.isFinite(durationNum) && durationNum >= 30 && durationNum <= 60
      ? Math.round(durationNum)
      : 45

  const starterCode =
    typeof ex.starterCode === 'string' && ex.starterCode.trim()
      ? ex.starterCode
      : `function ${functionName}() {\n  // Votre code ici\n}\n`

  return {
    title: String(ex.title || 'Exercice JavaScript').trim(),
    instructionsFr: String(ex.instructionsFr || '').trim(),
    starterCode,
    durationMinutes,
    functionName,
    sampleTests: normalizeSampleTests(ex.sampleTests),
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' })

  const secret = (process.env.TECH_TEST_JWT_SECRET || '').trim()
  if (!secret) return json(500, { ok: false, error: 'TECH_TEST_JWT_SECRET manquant sur Netlify.' })

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return json(400, { ok: false, error: 'JSON invalide' })
  }

  const token = String(body.token || '').trim()
  const action = String(body.action || '')

  const payload = verifyJWT(token, secret)
  if (!payload || payload.typ !== 'tech_test') {
    return json(401, { ok: false, error: 'Session invalide' })
  }

  const ctx = { email: payload.email, name: payload.name }

  try {
    if (action === 'generate') {
      const content = await openaiChat(
        [
          {
            role: 'system',
            content:
              'Tu es un recruteur technique. Réponds UNIQUEMENT en JSON valide avec les clés: title (string), instructionsFr (string détaillée), starterCode (string JavaScript exécutable), durationMinutes (number 30-60), functionName (string, nom exact de la fonction attendue), sampleTests (array de 2 à 4 objets { label, args, expected }). Les args doivent être 100% JSON sérialisables et fournis sous forme de tableau. Exercice: problème JavaScript (tableaux/objets/async léger), niveau intermédiaire, sans accès réseau.',
          },
          {
            role: 'user',
            content: `Génère un exercice pour le candidat "${ctx.name}" (${ctx.email}).`,
          },
        ],
        true,
      )

      let exercise
      try {
        exercise = JSON.parse(content)
      } catch {
        return json(502, { ok: false, error: 'Réponse IA illisible' })
      }

      return json(200, { ok: true, exercise: normalizeExercise(exercise) })
    }

    if (action === 'evaluate') {
      const code = String(body.code || '')
      const exercise = body.exercise || {}

      const content = await openaiChat(
        [
          {
            role: 'system',
            content:
              'Tu es correcteur de code. Réponds en JSON: score (0-100), feedbackFr (string), passed (boolean si score>=60).',
          },
          {
            role: 'user',
            content: `Exercice:\n${JSON.stringify(exercise, null, 2)}\n\nCode candidat:\n${code}`,
          },
        ],
        true,
      )

      let result
      try {
        result = JSON.parse(content)
      } catch {
        return json(502, { ok: false, error: 'Évaluation IA illisible' })
      }

      await persistAutoPhase2(event, payload, result.score)

      const scoreNum = Number(result.score)
      const autoPhase2 = Number.isFinite(scoreNum) && scoreNum > AUTO_PHASE2_MIN

      return json(200, { ok: true, result, autoPhase2 })
    }

    return json(400, { ok: false, error: 'action inconnue' })
  } catch (e) {
    return json(500, { ok: false, error: e.message || 'Erreur serveur' })
  }
}
