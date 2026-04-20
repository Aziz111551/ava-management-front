import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchMeeting } from '../../services/meetings'
import MeetingRoom from '../../components/meetings/MeetingRoom'

export default function EmployeeMeetingRoom() {
  const { id } = useParams()
  const { user } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchMeeting({ id })
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
  }, [id])

  if (loading) return <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Chargement de la réunion…</div>
  if (error) return <div style={{ fontSize: '13px', color: 'var(--red)' }}>{error}</div>
  if (!meeting) return <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Réunion introuvable.</div>

  return (
    <MeetingRoom
      meeting={meeting}
      actor={{
        name: user?.name || meeting.participantName || 'Employé',
        email: user?.email || meeting.participantEmail || '',
        role: 'employee',
      }}
      backHref="/employee/meetings"
      onMeetingFinished={setMeeting}
    />
  )
}
