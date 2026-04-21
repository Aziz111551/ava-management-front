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

function eventsToText(meeting) {
  if (!Array.isArray(meeting.events)) return ''
  return meeting.events
    .map((event) => {
      const actor = String(event.actorName || event.actorRole || '').trim()
      const detail = String(event.detail || event.text || '').trim()
      return `[${event.at || ''}] ${event.type}${actor ? ` · ${actor}` : ''}${detail ? ` · ${detail}` : ''}`
    })
    .filter(Boolean)
    .join('\n')
}

export async function generateMeetingReport(meeting) {
  const transcriptText = transcriptToText(meeting.transcript)
  const eventText = eventsToText(meeting)
  const noteInitial = String(meeting.note || '').trim()
  const noteClosing = String(meeting.closingNote || '').trim()
  const hasNotes = Boolean(noteInitial || noteClosing)

  if (!transcriptText && !eventText && !hasNotes) {
    throw new Error(
      'Pas assez de données pour le rapport : la transcription locale est vide (utilisez Chrome, autorisez le micro, et parlez après avoir rejoint la salle), et il n’y a ni journal d’événements ni note RH. Ajoutez une note de clôture puis relancez la génération.',
    )
  }

  const transcriptSection = transcriptText
    ? `Transcription (texte capté dans le navigateur du RH) :\n${transcriptText}`
    : `Transcription : NON DISPONIBLE. Ne pas inventer de dialogue. Rédige le rapport uniquement à partir du journal ci-dessous, des notes RH et des métadonnées ; indique explicitement dans conversationSummary et participantOpinion que la transcription audio n’a pas été captée.`

  const prompt = [
    {
      role: 'system',
      content:
        'Tu es un assistant RH senior. Réponds uniquement en JSON valide avec les clés: title, conversationSummary, discussedTopics (array), participantOpinion (string), strengths (array), concerns (array), recommendation (string), rating (string), keyMoments (array), hrDecisions (array), nextSteps (array), detailedReport (string), conciseReport (string). Appuie-toi strictement sur la conversation réelle et le journal des événements. Si une information n’est pas étayée, dis-le clairement sans inventer.',
    },
    {
      role: 'user',
      content: `Réunion WorkSphere\nType: ${meeting.type}\nRH: ${meeting.rhName} <${meeting.rhEmail}>\nParticipant: ${meeting.participantName} <${meeting.participantEmail}>\nCréneau: ${meeting.scheduledAt}\nNote RH initiale: ${noteInitial || '—'}\nNote RH de clôture: ${noteClosing || '—'}\n\nJournal:\n${eventText || '—'}\n\n${transcriptSection}\n\nConsignes de rapport:\n- résume ce qui est réellement documenté (journal / notes / transcription)\n- liste les sujets réellement abordés\n- donne un avis sur le participant en restant prudent si la transcription manque\n- donne une recommandation RH claire\n- mentionne les moments clés et décisions concrètes`,
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
    transcriptExcerpt: transcriptText ? transcriptText.slice(0, 4000) : '',
    transcriptMissing: !transcriptText,
    eventExcerpt: eventText.slice(0, 2000),
    ...report,
  }
}
