import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MeetingRoom from '../../components/meetings/MeetingRoom'
import { fetchMeeting } from '../../services/meetings'

export default function PublicMeetingRoom() {
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') || '').trim()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setError('Lien de réunion invalide.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    fetchMeeting({ token })
      .then((data) => {
        if (!cancelled) setMeeting(data.meeting || null)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Impossible de charger la réunion.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Chargement de la réunion…
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '560px', color: 'var(--red)' }}>{error || 'Réunion introuvable.'}</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px', color: 'var(--text)' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        <MeetingRoom
          meeting={meeting}
          actor={{
            name: meeting.participantName || 'Participant',
            email: meeting.participantEmail || '',
            role: meeting.participantRole || 'guest',
          }}
          accessToken={token}
          showReport={false}
          onMeetingFinished={setMeeting}
        />
      </div>
    </div>
  )
}
