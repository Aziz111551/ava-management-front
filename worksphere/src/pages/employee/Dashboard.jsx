import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyProjects, getTrelloTasks, getMyConges } from '../../services/api'
import { StatCard, Grid, SectionTitle, Pill, Btn, FeatureCard } from '../../components/shared/UI'

const MOCK_PROJ = [
  { _id: '1', name: 'AVA Platform', status: 'active', progress: 67, sprint: 'Sprint 4', team: 5, deadline: '2026-05-30' },
  { _id: '2', name: 'NEXO Mobile',  status: 'active', progress: 45, sprint: 'Sprint 2', team: 3, deadline: '2026-06-15' },
]
const MOCK_TASKS = [
  { _id: '1', title: 'Setup OAuth endpoints',   status: 'todo',        tag: 'Backend', priority: 'high' },
  { _id: '2', title: 'Meeting hub UI',           status: 'in_progress', tag: 'Flutter', priority: 'high' },
  { _id: '3', title: 'Finance N8N workflow',     status: 'in_progress', tag: 'N8N',     priority: 'medium' },
  { _id: '4', title: 'Google OAuth flow',        status: 'done',        tag: 'Auth',    priority: 'high' },
  { _id: '5', title: 'API documentation',        status: 'todo',        tag: 'Docs',    priority: 'low' },
]
const MOCK_CONGES = [
  { _id: '1', type: 'Annuel',  startDate: '2026-05-12', endDate: '2026-05-16', days: 5, status: 'pending' },
  { _id: '2', type: 'Maladie', startDate: '2026-04-03', endDate: '2026-04-03', days: 1, status: 'approved' },
]

const priorityType = { high: 'red', medium: 'amber', low: 'default' }
const taskCols = ['todo', 'in_progress', 'done']
const colLabel  = { todo: 'To do', in_progress: 'In Progress', done: 'Done' }

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [projects, setProjects] = useState(MOCK_PROJ)
  const [tasks,    setTasks]    = useState(MOCK_TASKS)
  const [conges,   setConges]   = useState(MOCK_CONGES)

  useEffect(() => {
    getMyProjects().then(r => setProjects(r.data)).catch(() => {})
    getTrelloTasks().then(r => setTasks(r.data)).catch(() => {})
    getMyConges().then(r => setConges(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text)', letterSpacing: '-0.5px',
        }}>
          <span>Hello, {user?.name?.split(' ')[0] || 'Employee'}</span>
          <i className="fa-regular fa-face-smile" style={{ fontSize: '22px', color: 'var(--cyan)', opacity: 0.9 }} aria-hidden title="Welcome" />
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '5px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Quick access — AVA feature cards */}
      <SectionTitle>Quick access</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
        <FeatureCard title="My Projects" description="Manage and track your active projects" gradient="var(--grad-cyan)" icon={<i className="fa-solid fa-folder-open" aria-hidden />} onClick={() => navigate('/employee/projets')} />
        <FeatureCard title="Trello Tasks" description="Your ongoing sprint tasks" gradient="var(--grad-blue)" icon={<i className="fa-solid fa-list-check" aria-hidden />} onClick={() => navigate('/employee/taches')} />
        <FeatureCard title="Leave Request" description="Submit a new request" gradient="var(--grad-pink)" icon={<i className="fa-solid fa-umbrella-beach" aria-hidden />} onClick={() => navigate('/employee/conges')} />
        <FeatureCard title="Sick Leave" description="Declare a medical leave" gradient="var(--grad-amber)" icon={<i className="fa-solid fa-notes-medical" aria-hidden />} onClick={() => navigate('/employee/maladie')} />
      </div>

      {/* Stats */}
      <Grid cols={4} gap={12}>
        <StatCard label="Ongoing projects"   value={projects.filter(p => p.status === 'active').length} gradient="var(--grad-cyan)" />
        <StatCard label="Trello Tasks"  value={tasks.filter(t => t.status === 'in_progress').length} gradient="var(--grad-blue)" />
        <StatCard label="Done"        value={tasks.filter(t => t.status === 'done').length} gradient="var(--grad-pink)" />
        <StatCard label="Pending leave requests" value={conges.filter(c => c.status === 'pending').length} gradient="var(--grad-amber)" />
      </Grid>

      {/* Projects */}
      <SectionTitle action={
        <Btn small variant="ghost" onClick={() => navigate('/employee/projets')}>
          View all
          <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }} aria-hidden />
        </Btn>
      }>
        Ongoing projects
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
        {projects.map(p => (
          <div key={p._id} style={{
            background: 'var(--card)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '20px',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{p.sprint} · {p.team} members</div>
              </div>
              <Pill type="green">Active</Pill>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>
                <span>Progress</span>
                <span style={{ color: 'var(--cyan)', fontWeight: '600' }}>{p.progress}%</span>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${p.progress}%`, height: '100%', borderRadius: '3px',
                  background: p.progress >= 75 ? 'var(--grad-cyan)' : p.progress >= 40 ? 'var(--grad-blue)' : 'var(--grad-amber)',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text3)' }}>
              <i className="fa-regular fa-calendar" aria-hidden />
              <span>Deadline: {new Date(p.deadline).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Trello kanban preview */}
      <SectionTitle action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn small variant="ghost" onClick={() => window.open('https://trello.com', '_blank')}>
            <i className="fa-brands fa-trello" aria-hidden />
            Open Trello
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.85 }} aria-hidden />
          </Btn>
          <Btn small onClick={() => navigate('/employee/taches')}>
            View all
            <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }} aria-hidden />
          </Btn>
        </div>
      }>Trello Tasks</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {taskCols.map(col => (
          <div key={col} style={{
            background: 'var(--card)', border: '1px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '16px', backdropFilter: 'blur(10px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text2)', fontFamily: 'var(--font-display)' }}>{colLabel[col]}</span>
              <span style={{
                background: 'rgba(32,178,170,0.12)', color: 'var(--cyan)',
                borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: '600',
              }}>{tasks.filter(t => t.status === col).length}</span>
            </div>
            {tasks.filter(t => t.status === col).map(t => (
              <div key={t._id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '10px', marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '10px', background: 'var(--cyan-dim)', color: 'var(--cyan2)', display: 'inline-block', marginBottom: '6px' }}>{t.tag}</div>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '500' }}>{t.title}</div>
                <div style={{ marginTop: '6px' }}><Pill type={priorityType[t.priority]}>{t.priority}</Pill></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* My HR Requests */}
      <SectionTitle action={
        <Btn small onClick={() => navigate('/employee/conges')}>
          New request
          <i className="fa-solid fa-arrow-right" style={{ fontSize: '11px' }} aria-hidden />
        </Btn>
      }>
        My HR Requests
      </SectionTitle>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
        {conges.map((c, i) => (
          <div key={c._id} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 120px',
            padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--border)' : 'none', alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500' }}>{c.type}</span>
            <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{new Date(c.startDate).toLocaleDateString('en-US')} → {new Date(c.endDate).toLocaleDateString('en-US')}</span>
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{c.days} days</span>
            <Pill type={c.status === 'approved' ? 'green' : c.status === 'rejected' ? 'red' : 'amber'}>
              {c.status === 'approved' ? 'Approved' : c.status === 'rejected' ? 'Rejected' : 'Pending'}
            </Pill>
          </div>
        ))}
      </div>
    </div>
  )
}
