import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchMeetings } from '../../services/meetings'
import { Empty, Pill, SectionTitle, StatCard, Grid, Table, Btn } from '../../components/shared/UI'

function fmtDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

export default function EmployeeMeetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchMeetings({ viewer: 'employee', email: user?.email || '' })
      setMeetings(Array.isArray(data.meetings) ? data.meetings : [])
    } catch (err) {
      setError(err.message || 'Impossible de charger vos réunions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.email) return
    load()
  }, [user?.email])

  const upcoming = meetings.filter((item) => item.status !== 'completed').length

  return (
    <div>
      <Grid cols={1} gap={12}>
        <StatCard label="Mes réunions à venir" value={loading ? '…' : upcoming} color="var(--cyan2)" />
      </Grid>

      <SectionTitle action={<Btn small variant="ghost" onClick={load} disabled={loading}>Actualiser</Btn>}>
        Réunions RH
      </SectionTitle>

      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '820px', lineHeight: 1.55, marginBottom: '16px' }}>
        Retrouvez ici vos réunions RH intégrées dans WorkSphere. Le lien de jointure ouvre directement la salle intégrée de l’application.
      </p>

      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Chargement de vos réunions…</div>
      ) : meetings.length === 0 ? (
        <Empty message="Aucune réunion RH planifiée pour le moment." />
      ) : (
        <Table
          columns={[
            {
              key: 'rhName',
              label: 'Responsable RH',
              render: (value, row) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value || 'Responsable RH'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.rhEmail || '—'}</div>
                </div>
              ),
            },
            { key: 'scheduledAt', label: 'Créneau', render: (value) => fmtDate(value) },
            {
              key: 'status',
              label: 'Statut',
              render: (value) => (
                <Pill type={value === 'completed' ? 'green' : value === 'live' ? 'amber' : 'blue'}>
                  {value === 'completed' ? 'Terminée' : value === 'live' ? 'En cours' : 'Planifiée'}
                </Pill>
              ),
            },
            {
              key: 'id',
              label: 'Action',
              width: '160px',
              render: (_, row) => (
                <Link to={`/employee/meetings/${row.id}`} style={{ textDecoration: 'none' }}>
                  <Btn small>Rejoindre</Btn>
                </Link>
              ),
            },
          ]}
          rows={meetings}
        />
      )}
    </div>
  )
}
