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
  const eventText = Array.isArray(meeting.events)
    ? meeting.events
        .map((event) => {
          const actor = String(event.actorName || event.actorRole || '').trim()
          const detail = String(event.detail || event.text || '').trim()
          return `[${event.at || ''}] ${event.type}${actor ? ` · ${actor}` : ''}${detail ? ` · ${detail}` : ''}`
        })
        .filter(Boolean)
        .join('\n')
    : ''

  const prompt = [
    {
      role: 'system',
      content:
        'Tu es un assistant RH senior. Réponds uniquement en JSON valide avec les clés: title, conversationSummary, discussedTopics (array), participantOpinion (string), strengths (array), concerns (array), recommendation (string), rating (string), keyMoments (array), hrDecisions (array), nextSteps (array), detailedReport (string), conciseReport (string). Appuie-toi strictement sur la conversation réelle et le journal des événements. Si une information n’est pas étayée, dis-le clairement sans inventer.',
    },
    {
      role: 'user',
      content: `Réunion WorkSphere\nType: ${meeting.type}\nRH: ${meeting.rhName} <${meeting.rhEmail}>\nParticipant: ${meeting.participantName} <${meeting.participantEmail}>\nCréneau: ${meeting.scheduledAt}\nNote RH initiale: ${meeting.note || '—'}\nNote RH de clôture: ${meeting.closingNote || '—'}\n\nJournal:\n${eventText || '—'}\n\nTranscription complète:\n${transcriptText}\n\nConsignes de rapport:\n- résume précisément ce qui a été dit\n- liste les sujets réellement abordés\n- donne un avis argumenté sur le participant (employé ou candidat) basé sur la conversation\n- donne une recommandation RH claire\n- mentionne les moments clés et décisions concrètes`,
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
    eventExcerpt: eventText.slice(0, 2000),
    ...report,
  }
}
