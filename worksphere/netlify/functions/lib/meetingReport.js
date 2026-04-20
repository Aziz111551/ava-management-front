async function openaiChat(messages) {
  const key = (process.env.OPENAI_API_KEY || '').trim()
  if (!key) throw new Error('OPENAI_API_KEY manquant côté serveur.')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || 'Erreur OpenAI')
  }
  return data.choices?.[0]?.message?.content || ''
}

function transcriptToText(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  return lines
    .map((line) => {
      const at = String(line.at || '').trim()
      const speaker = String(line.speakerName || line.speakerRole || 'Participant').trim()
      const text = String(line.text || '').trim()
      return text ? `[${at}] ${speaker}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

export async function generateMeetingReport(meeting) {
  const transcriptText = transcriptToText(meeting.transcript)
  if (!transcriptText) {
    throw new Error('Aucune transcription audio disponible pour générer le rapport.')
  }

  const prompt = [
    {
      role: 'system',
      content:
        'Tu es un assistant RH. Réponds uniquement en JSON valide avec les clés: title, summary, participants (array de strings), technicalPoints (array), hrPoints (array), decisions (array), risks (array), nextSteps (array), conciseReport (string). Rédige en français clair et professionnel.',
    },
    {
      role: 'user',
      content: `Réunion WorkSphere\nType: ${meeting.type}\nRH: ${meeting.rhName} <${meeting.rhEmail}>\nParticipant: ${meeting.participantName} <${meeting.participantEmail}>\nCréneau: ${meeting.scheduledAt}\nNote RH initiale: ${meeting.note || '—'}\n\nTranscription:\n${transcriptText}`,
    },
  ]

  const content = await openaiChat(prompt)
  let report
  try {
    report = JSON.parse(content)
  } catch {
    throw new Error('Rapport IA illisible.')
  }

  return {
    generatedAt: new Date().toISOString(),
    transcriptExcerpt: transcriptText.slice(0, 4000),
    ...report,
  }
}
