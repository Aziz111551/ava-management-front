import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEmployees } from '../../services/api'
import { createMeetingInvite, fetchMeetings } from '../../services/meetings'
import { Btn, Empty, Field, Grid, Modal, Pill, SectionTitle, StatCard, Table, inputStyle } from '../../components/shared/UI'

function fmtDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR')
}

const EMPTY_FORM = {
  employeeId: '',
  scheduledAt: '',
  note: '',
}

export default function RHMeetings() {
  const [meetings, setMeetings] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reportModal, setReportModal] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [meetingRes, employeeRes] = await Promise.all([
        fetchMeetings({ viewer: 'rh' }),
        getEmployees().catch(() => ({ data: [] })),
      ])
      setMeetings(Array.isArray(meetingRes.meetings) ? meetingRes.meetings : [])
      setEmployees(Array.isArray(employeeRes.data) ? employeeRes.data.filter((item) => item.role === 'employee') : [])
    } catch (err) {
      setError(err.message || 'Impossible de charger les réunions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectedEmployee = useMemo(
    () => employees.find((item) => String(item._id) === form.employeeId),
    [employees, form.employeeId],
  )

  const stats = {
    upcoming: meetings.filter((item) => item.status === 'scheduled').length,
    live: meetings.filter((item) => item.status === 'live').length,
    reports: meetings.filter((item) => item.reportStatus === 'ready').length,
  }
  const readyReports = meetings.filter((item) => item.reportStatus === 'ready' && item.reportPreview)

  const createEmployeeMeeting = async () => {
    if (!selectedEmployee) {
      alert('Choisissez un employé.')
      return
    }
    if (!form.scheduledAt) {
      alert('Choisissez la date et l’heure.')
      return
    }
    setSending(true)
    try {
      await createMeetingInvite({
        type: 'employee_rh',
        participantRole: 'employee',
        participantId: selectedEmployee._id,
        participantName: selectedEmployee.name,
        participantEmail: selectedEmployee.email,
        rhName: JSON.parse(localStorage.getItem('ws_user') || '{}')?.name || 'Responsable RH',
        rhEmail: JSON.parse(localStorage.getItem('ws_user') || '{}')?.email || '',
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        note: form.note.trim() || undefined,
      })
      setForm(EMPTY_FORM)
      setOpenModal(false)
      await load()
    } catch (err) {
      alert(err.message || 'Impossible de créer la réunion.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Réunions planifiées" value={loading ? '…' : stats.upcoming} color="var(--cyan2)" />
        <StatCard label="En direct" value={loading ? '…' : stats.live} color="var(--amber)" />
        <StatCard label="Rapports IA prêts" value={loading ? '…' : stats.reports} color="var(--green)" />
      </Grid>

      <SectionTitle
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn small variant="ghost" onClick={load} disabled={loading}>
              Actualiser
            </Btn>
            <Btn small onClick={() => setOpenModal(true)}>
              Nouvelle réunion employé
            </Btn>
          </div>
        }
      >
        Réunions intégrées
      </SectionTitle>

      <p style={{ fontSize: '12px', color: 'var(--text3)', maxWidth: '860px', lineHeight: 1.55, marginBottom: '16px' }}>
        Cette vue centralise les réunions RH planifiées dans WorkSphere pour les candidats Phase 2 et les employés, avec accès à la salle intégrée et au rapport IA final.
      </p>

      {error && <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Chargement des réunions…</div>
      ) : meetings.length === 0 ? (
        <Empty message="Aucune réunion intégrée pour le moment." />
      ) : (
        <Table
          columns={[
            {
              key: 'participantName',
              label: 'Participant',
              render: (value, row) => (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{row.participantEmail}</div>
                </div>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              render: (value) => (
                <Pill type={value === 'employee_rh' ? 'blue' : 'cyan'}>
                  {value === 'employee_rh' ? 'RH ↔ Employé' : 'RH ↔ Candidat'}
                </Pill>
              ),
            },
            { key: 'scheduledAt', label: 'Créneau', render: (value) => fmtDate(value) },
            {
              key: 'status',
              label: 'Statut',
              render: (value) => (
                <Pill type={value === 'completed' ? 'green' : value === 'live' ? 'amber' : 'default'}>
                  {value === 'completed' ? 'Terminée' : value === 'live' ? 'En cours' : 'Planifiée'}
                </Pill>
              ),
            },
            {
              key: 'reportStatus',
              label: 'Rapport IA',
              render: (value) => (
                <Pill type={value === 'ready' ? 'green' : value === 'running' ? 'amber' : value === 'error' ? 'red' : 'default'}>
                  {value === 'ready' ? 'Prêt' : value === 'running' ? 'Génération' : value === 'error' ? 'Erreur' : '—'}
                </Pill>
              ),
            },
            {
              key: 'phase3Decision',
              label: 'Phase 3',
              render: (value) => (
                <Pill type={value === 'accepted' ? 'green' : value === 'refused' ? 'red' : 'default'}>
                  {value === 'accepted' ? 'Accepté' : value === 'refused' ? 'Refusé' : 'En attente'}
                </Pill>
              ),
            },
            {
              key: 'eventCount',
              label: 'Journal',
              render: (value) => <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{value || 0} événements</span>,
            },
            {
              key: 'id',
              label: 'Actions',
              width: '220px',
              render: (_, row) => (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link to={`/rh/meetings/${row.id}`} style={{ textDecoration: 'none' }}>
                    <Btn small>Ouvrir</Btn>
                  </Link>
                  {row.reportStatus === 'ready' && (
                    <Btn small variant="ghost" onClick={() => setReportModal(row)}>
                      Rapport
                    </Btn>
                  )}
                </div>
              ),
            },
          ]}
          rows={meetings}
        />
      )}

      {readyReports.length > 0 && (
        <div style={{ marginTop: '22px' }}>
          <SectionTitle>Rapports détaillés par réunion</SectionTitle>
          <div style={{ display: 'grid', gap: '12px' }}>
            {readyReports.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                      {item.participantName}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                      {item.type === 'employee_rh' ? 'Réunion RH ↔ employé' : 'Réunion RH ↔ candidat'} · {fmtDate(item.scheduledAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.reportPreview?.rating && <Pill type="blue">{item.reportPreview.rating}</Pill>}
                    <Link to={`/rh/meetings/${item.id}`} style={{ textDecoration: 'none' }}>
                      <Btn small>Voir détail</Btn>
                    </Link>
                  </div>
                </div>

                {item.reportPreview?.participantOpinion && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Avis sur le participant
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                      {item.reportPreview.participantOpinion}
                    </div>
                  </div>
                )}

                {item.reportPreview?.recommendation && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Recommandation RH
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                      {item.reportPreview.recommendation}
                    </div>
                  </div>
                )}

                {item.reportPreview?.conversationSummary && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Ce qui a été discuté
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
                      {item.reportPreview.conversationSummary}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={openModal} onClose={() => !sending && setOpenModal(false)} title="Nouvelle réunion RH ↔ employé">
        <Field label="Employé">
          <select
            style={inputStyle}
            value={form.employeeId}
            onChange={(e) => setForm((prev) => ({ ...prev, employeeId: e.target.value }))}
          >
            <option value="">Choisir un employé…</option>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>
                {employee.name} — {employee.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date et heure">
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.scheduledAt}
            onChange={(e) => setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
          />
        </Field>
        <Field label="Note RH (optionnel)">
          <textarea
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Objectifs, contexte, points à traiter…"
          />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Btn variant="ghost" onClick={() => setOpenModal(false)} disabled={sending}>
            Annuler
          </Btn>
          <Btn onClick={createEmployeeMeeting} disabled={sending}>
            {sending ? 'Création…' : 'Créer la réunion'}
          </Btn>
        </div>
      </Modal>

      <Modal open={!!reportModal} onClose={() => setReportModal(null)} title="Rapport IA">
        {reportModal && (
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
            <p>
              <strong>Participant :</strong> {reportModal.participantName}
            </p>
            <p>
              <strong>Créneau :</strong> {fmtDate(reportModal.scheduledAt)}
            </p>
            <Link to={`/rh/meetings/${reportModal.id}`} style={{ textDecoration: 'none' }}>
              <Btn>Ouvrir la réunion et le rapport complet</Btn>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
