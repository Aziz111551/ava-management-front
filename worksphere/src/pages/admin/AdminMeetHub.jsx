import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { fetchMeetings } from '../../services/meetings'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function meetingTypeLabel(type) {
  if (type === 'employee_rh') return 'Réunion RH ↔ employé(s)'
  if (type === 'employee_candidate_rh') return 'Réunion RH · candidat + employé(s)'
  if (type === 'candidate_phase2') return 'Réunion RH ↔ candidat'
  return type || 'Réunion'
}

function reportBadge(meeting) {
  const hasReport = meeting.reportStatus === 'ready' || (meeting.reportPreview && Object.keys(meeting.reportPreview).length > 0)
  if (hasReport) {
    return {
      label: 'Prêt',
      bg: 'rgba(59,130,246,0.18)',
      color: '#60a5fa',
      border: '1px solid rgba(96,165,250,0.35)',
    }
  }
  return {
    label: 'Non évalué en raison de l’absence de transcription',
    bg: 'rgba(30,58,138,0.2)',
    color: '#93c5fd',
    border: '1px solid rgba(96,165,250,0.28)',
  }
}

function sanitizeFileNameChunk(value) {
  return String(value || 'reunion')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export default function AdminMeetHub() {
  const [meetings, setMeetings] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [opened, setOpened] = useState({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr('')
      setLoading(true)
      try {
        const data = await fetchMeetings({ viewer: 'rh' })
        if (!cancelled) setMeetings(Array.isArray(data.meetings) ? data.meetings : [])
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Impossible de charger les réunions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const summary = useMemo(() => {
    const list = meetings
    const reports = list.filter((m) => m.reportStatus === 'ready' || (m.reportPreview && Object.keys(m.reportPreview).length > 0)).length
    const live = list.filter((m) => m.status === 'live' || m.status === 'in_progress').length
    return { total: list.length, reports, live }
  }, [meetings])

  const rows = useMemo(() => {
    return [...meetings].sort((a, b) => {
      const ta = new Date(a.scheduledAt || 0).getTime()
      const tb = new Date(b.scheduledAt || 0).getTime()
      return tb - ta
    })
  }, [meetings])

  const downloadMeetingPdf = (item) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginX = 48
    const pageH = doc.internal.pageSize.getHeight()
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2
    let y = 56

    const ensureSpace = (needed = 24) => {
      if (y + needed > pageH - 48) {
        doc.addPage()
        y = 56
      }
    }

    const writeSection = (label, content) => {
      ensureSpace(40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(90, 103, 123)
      doc.text(label.toUpperCase(), marginX, y)
      y += 16

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.setTextColor(34, 44, 62)
      const lines = doc.splitTextToSize(content, maxWidth)
      const height = lines.length * 14 + 8
      ensureSpace(height)
      doc.text(lines, marginX, y)
      y += height
    }

    const participantName = item.participantName || 'Réunion'
    const report = item.reportPreview || {}

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(15, 23, 42)
    doc.text('Rapport de réunion intégrée', marginX, y)
    y += 24

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(71, 85, 105)
    doc.text(`Participant: ${participantName}`, marginX, y)
    y += 16
    doc.text(`Type: ${meetingTypeLabel(item.type)}`, marginX, y)
    y += 16
    doc.text(`Date: ${formatWhen(item.scheduledAt)}`, marginX, y)
    y += 22

    writeSection(
      'Avis sur le participant',
      report.participantOpinion || 'Sans transcription, il est difficile de formuler un avis précis.',
    )
    writeSection(
      'Recommandation RH',
      report.recommendation || 'Planifier une nouvelle réunion pour obtenir plus de détails.',
    )
    writeSection(
      'Ce qui a été discuté',
      report.conversationSummary || 'Résumé non disponible pour cette réunion.',
    )

    const dateChunk = (item.scheduledAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
    const fileName = `rapport-reunion-${sanitizeFileNameChunk(participantName)}-${dateChunk}.pdf`
    doc.save(fileName)
  }

  return (
    <div style={{ padding: '24px 26px 36px', maxWidth: '1300px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
        Réunions intégrées
      </h1>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, maxWidth: 860 }}>
        Vue admin centralisée des réunions RH avec aperçu des rapports IA. Utilisez “Voir détail” pour déplier le contenu du compte rendu.
      </p>

      {err && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--red)' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border2)', background: 'var(--card)' }}>
          {loading ? '…' : summary.total} réunions
        </span>
        <span style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border2)', background: 'var(--card)' }}>
          {loading ? '…' : summary.live} en direct
        </span>
        <span style={{ fontSize: 12, color: 'var(--text2)', padding: '6px 10px', borderRadius: 999, border: '1px solid var(--border2)', background: 'var(--card)' }}>
          {loading ? '…' : summary.reports} rapports prêts
        </span>
      </div>

      <div style={{ marginBottom: 14, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
        Rapports détaillés par réunion
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Chargement des réunions…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Aucune réunion enregistrée.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((item) => {
            const badge = reportBadge(item)
            const expanded = !!opened[item.id]
            return (
              <div
                key={item.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                      {(item.participantName || 'Réunion').toLowerCase()}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                      {meetingTypeLabel(item.type)} · {formatWhen(item.scheduledAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 999, ...badge }}>
                      {badge.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => downloadMeetingPdf(item)}
                        style={{
                          border: '1px solid rgba(125,211,252,0.55)',
                          borderRadius: 999,
                          background: 'rgba(14,116,144,0.25)',
                          color: '#bae6fd',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '7px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        Télécharger PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpened((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                        style={{
                          border: 'none',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '7px 14px',
                          cursor: 'pointer',
                        }}
                      >
                        {expanded ? 'Masquer' : 'Voir détail'}
                      </button>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Avis sur le participant
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {item.reportPreview?.participantOpinion || 'Sans transcription, il est difficile de formuler un avis précis.'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Recommandation RH
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {item.reportPreview?.recommendation || 'Planifier une nouvelle réunion pour obtenir plus de détails.'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        Ce qui a été discuté
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                        {item.reportPreview?.conversationSummary || 'Résumé non disponible pour cette réunion.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
