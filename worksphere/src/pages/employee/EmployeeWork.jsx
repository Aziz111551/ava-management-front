import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addProject, getMySprintProjects, getMySprintTasks, startSprintTask, markSprintTaskDone, getProjectWorkspace } from '../../services/api'
import { SectionTitle, Pill, Btn, StatCard, Grid, Modal, Field, inputStyle } from '../../components/shared/UI'

// ── PROJECTS ──────────────────────────────────────────────────
const MOCK = [
  { _id: '1', name: 'AVA Platform', description: 'AI Executive Assistant Flutter app', status: 'active', progress: 67, sprint: 'Sprint 4', team: 5, deadline: '2026-05-30', stack: ['Flutter', 'NestJS', 'MongoDB'] },
  { _id: '2', name: 'NEXO Mobile', description: 'Sports social matching app iOS/Android', status: 'active', progress: 45, sprint: 'Sprint 2', team: 3, deadline: '2026-06-15', stack: ['SwiftUI', 'Kotlin'] },
]
const EMPTY = { name: '', description: '', deadline: '', stack: '' }

export function MesProjets() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(MOCK)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    getMySprintProjects()
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map(p => ({
            _id: p.id,
            name: p.title,
            description: p.description,
            status: 'active',
            progress: 0,
            sprint: 'Sprint 1',
            team: 1,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stack: p.tags || []
          }))
          setProjects(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const handleAdd = async () => {
    const newP = { ...form, _id: Date.now().toString(), status: 'active', progress: 0, sprint: 'Sprint 1', team: 1, stack: form.stack.split(',').map(s => s.trim()) }
    await addProject(newP).catch(() => {})
    setProjects(prev => [...prev, newP])
    setModal(false)
    setForm(EMPTY)
  }

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Active" value={projects.filter(p => p.status === 'active').length} color="var(--cyan2)" />
        <StatCard label="Avg. completion" value={Math.round(projects.reduce((s, p) => s + p.progress, 0) / (projects.length || 1)) + '%'} color="var(--green)" />
        <StatCard label="Total projects" value={projects.length} color="var(--blue)" />
      </Grid>

      <SectionTitle action={
        <Btn onClick={() => setModal(true)}>
          <i className="fa-solid fa-plus" aria-hidden />
          New project
        </Btn>
      }>
        My projects
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {projects.map(p => (
          <div key={p._id} onClick={() => navigate(`/employee/workspace/${p._id}`)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '600', color: 'var(--text)', letterSpacing: '-0.3px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{p.description}</div>
              </div>
              <Pill type={p.status === 'active' ? 'green' : 'default'}>{p.status === 'active' ? 'Active' : 'Archived'}</Pill>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text3)', marginBottom: '6px' }}>
                <span>{p.sprint}</span>
                <span style={{ fontWeight: '500', color: 'var(--text)' }}>{p.progress}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${p.progress}%`, height: '100%', background: p.progress >= 75 ? 'var(--green)' : p.progress >= 40 ? 'var(--cyan)' : 'var(--amber)', borderRadius: '3px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {(Array.isArray(p.stack) ? p.stack : []).map(s => (
                <span key={s} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>{s}</span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-users" aria-hidden />
                {p.team} members
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-regular fa-calendar" aria-hidden />
                {new Date(p.deadline).toLocaleDateString('en-US')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New project">
        <Field label="Project name"><input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Project name" /></Field>
        <Field label="Short description"><input style={inputStyle} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description" /></Field>
        <Field label="Deadline"><input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} /></Field>
        <Field label="Stack (comma separated)"><input style={inputStyle} value={form.stack} onChange={e => setForm(p => ({ ...p, stack: e.target.value }))} placeholder="React, NestJS, MongoDB" /></Field>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={handleAdd}>Create</Btn>
        </div>
      </Modal>
    </div>
  )
}

// ── TRELLO TASKS ──────────────────────────────────────────────
const MOCK_TASKS = [
  { _id: '1', title: 'Setup OAuth endpoints', status: 'todo', tag: 'Backend', priority: 'high', project: 'AVA Platform' },
  { _id: '2', title: 'Meeting hub UI', status: 'in_progress', tag: 'Flutter', priority: 'high', project: 'AVA Platform' },
  { _id: '3', title: 'Finance N8N workflow', status: 'in_progress', tag: 'N8N', priority: 'medium', project: 'AVA Platform' },
  { _id: '4', title: 'Google OAuth flow', status: 'done', tag: 'Auth', priority: 'high', project: 'AVA Platform' },
  { _id: '5', title: 'API documentation', status: 'todo', tag: 'Docs', priority: 'low', project: 'AVA Platform' },
  { _id: '6', title: 'Map API migration iOS 17', status: 'in_progress', tag: 'iOS', priority: 'medium', project: 'NEXO Mobile' },
  { _id: '7', title: 'Profile API integration', status: 'done', tag: 'Backend', priority: 'high', project: 'NEXO Mobile' },
]
const priorityType = { high: 'red', medium: 'amber', low: 'default' }
const cols = ['todo', 'in_progress', 'done']
const colLabel = { todo: 'To do', in_progress: 'In Progress', done: 'Done' }

export function TachesTrello() {
  const storedUser = JSON.parse(localStorage.getItem('ws_user') || '{}')
  const employeeId = storedUser._id || storedUser.id

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const fetchTasks = () => {
    if (!employeeId) { setLoading(false); return }
    setLoading(true)
    getMySprintTasks(employeeId)
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [employeeId])

  const handleStart = async (task) => {
    if (actionId) return
    setActionId(task.id)
    try {
      await startSprintTask(task.id)
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'in_progress' } : t
      ))
    } catch(e) { console.error(e) }
    finally { setActionId(null) }
  }

  const handleDone = async (task) => {
    if (actionId) return
    setActionId(task.id)
    try {
      await markSprintTaskDone(task.id, employeeId)
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: 'done' } : t
      ))
    } catch(e) { console.error(e) }
    finally { setActionId(null) }
  }

  const priorityColor = { HIGH: 'red', MEDIUM: 'amber', LOW: 'default' }

  const cols = [
    {
      key: 'todo',
      label: 'To Do',
      color: 'var(--cyan)',
      gradient: 'var(--grad-cyan)',
      items: tasks.filter(t =>
        t.status === 'assigned' || t.status === 'TODO' || t.status === 'todo'
      )
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      color: 'var(--amber)',
      gradient: 'var(--grad-amber)',
      items: tasks.filter(t => t.status === 'in_progress')
    },
    {
      key: 'done',
      label: 'Done',
      color: 'var(--green)',
      gradient: 'var(--grad-green)',
      items: tasks.filter(t => t.status === 'done' || t.status === 'DONE')
    },
  ]

  const totalDone = tasks.filter(t => t.status === 'done' || t.status === 'DONE').length
  const pct = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
      Loading your workspace...
    </div>
  )

  if (!employeeId) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
      Session expired. Please log in again.
    </div>
  )

  return (
    <div>
      <Grid cols={4} gap={12} style={{ marginBottom: '24px' }}>
        <StatCard label="Total" value={tasks.length} gradient="var(--grad-cyan)" />
        <StatCard label="To Do" value={cols[0].items.length} gradient="var(--grad-blue)" />
        <StatCard label="In Progress" value={cols[1].items.length} gradient="var(--grad-amber)" />
        <StatCard label="Completed" value={`${pct}%`} gradient="var(--grad-green)" />
      </Grid>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Btn variant="ghost" onClick={fetchTasks}>
          <i className="fa-solid fa-rotate-right" aria-hidden />
          Refresh
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {cols.map(col => (
          <div key={col.key} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            minHeight: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: col.color, fontFamily: 'var(--font-display)' }}>
                {col.label}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>
                {col.items.length}
              </span>
            </div>

            {col.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text3)', fontSize: '12px' }}>
                No tasks
              </div>
            )}

            {col.items.map(task => (
              <div key={task.id} style={{
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '8px',
                transition: 'border-color 0.15s',
                opacity: task.status === 'done' || task.status === 'DONE' ? 0.7 : 1
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '4px' }}>
                  {task.sprintTitle || task.projectTitle || 'Sprint'}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500', lineHeight: 1.4, marginBottom: '6px' }}>
                  {task.title}
                </div>

                {task.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px', lineHeight: 1.4 }}>
                    {task.description.length > 80 ? task.description.slice(0, 80) + '...' : task.description}
                  </div>
                )}

                {task.deliverable && (
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text2)' }}>Deliverable: </span>{task.deliverable}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: col.key !== 'done' ? '10px' : '0' }}>
                  <Pill type={priorityColor[task.priority] || 'default'}>{task.priority}</Pill>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{task.estimatedHours}h</span>
                </div>

                {col.key === 'todo' && (
                  <button onClick={() => handleStart(task)} disabled={actionId === task.id}
                    style={{ width: '100%', padding: '7px', borderRadius: '7px', background: 'rgba(32,178,170,0.1)', border: '1px solid rgba(32,178,170,0.25)', color: 'var(--cyan2)', fontSize: '12px', fontWeight: '600', cursor: actionId === task.id ? 'not-allowed' : 'pointer' }}>
                    {actionId === task.id ? '...' : '▶ Start Working'}
                  </button>
                )}

                {col.key === 'in_progress' && (
                  <button onClick={() => handleDone(task)} disabled={actionId === task.id}
                    style={{ width: '100%', padding: '7px', borderRadius: '7px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'var(--green)', fontSize: '12px', fontWeight: '600', cursor: actionId === task.id ? 'not-allowed' : 'pointer' }}>
                    {actionId === task.id ? '...' : '✓ Mark as Done'}
                  </button>
                )}

                {col.key === 'done' && (
                  <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--green)', opacity: 0.8 }}>
                    ✓ Completed
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProjectWorkspace() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const storedUser = JSON.parse(localStorage.getItem('ws_user') || '{}')
  const myId = storedUser._id || storedUser.id

  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    getProjectWorkspace(projectId)
      .then(data => setWorkspace(data))
      .catch(() => setWorkspace(null))
      .finally(() => setLoading(false))
  }, [projectId])

  const handleStart = async (task) => {
    if (actionId) return
    setActionId(task.id)
    try {
      await startSprintTask(task.id)
      setWorkspace(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === task.id ? { ...t, status: 'in_progress' } : t
        )
      }))
    } catch(e) { console.error(e) }
    finally { setActionId(null) }
  }

  const handleDone = async (task) => {
    if (actionId) return
    setActionId(task.id)
    try {
      await markSprintTaskDone(task.id, myId)
      setWorkspace(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === task.id ? { ...t, status: 'done' } : t
        )
      }))
    } catch(e) { console.error(e) }
    finally { setActionId(null) }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
      Loading workspace...
    </div>
  )

  if (!workspace || workspace.error) return (
    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)' }}>
      Workspace not found.
      <br />
      <button onClick={() => navigate('/employee/projets')}
        style={{ marginTop: '16px', color: 'var(--cyan2)', background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Back to Projects
      </button>
    </div>
  )

  const tasks = workspace.tasks || []
  const members = workspace.members || []

  const cols = [
    {
      key: 'todo',
      label: 'To Do',
      color: 'var(--cyan)',
      items: tasks.filter(t =>
        t.status === 'assigned' || t.status === 'TODO' || t.status === 'todo'
      )
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      color: 'var(--amber)',
      items: tasks.filter(t => t.status === 'in_progress')
    },
    {
      key: 'done',
      label: 'Done',
      color: 'var(--green)',
      items: tasks.filter(t => t.status === 'done' || t.status === 'DONE')
    }
  ]

  const priorityColor = { HIGH: 'red', MEDIUM: 'amber', LOW: 'default' }

  const memberColors = [
    '#20b2aa', '#f59e0b', '#8b5cf6',
    '#ef4444', '#22c55e', '#3b82f6',
    '#ec4899', '#f97316'
  ]

  const getMemberColor = (memberId) => {
    const index = members.findIndex(m => m.id === memberId)
    return memberColors[index % memberColors.length] || '#64748b'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/employee/projets')}
          style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '13px' }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
            {workspace.project?.title}
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
            {workspace.totalTasks} tasks · {workspace.doneTasks} completed
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Team Members
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: getMemberColor(m.id),
                border: m.id === myId ? '2px solid var(--cyan)' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '600', color: '#fff'
              }}>
                {m.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: m.id === myId ? '600' : '400' }}>
                  {m.fullName} {m.id === myId ? '(you)' : ''}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
                  {m.doneTasks}/{m.totalTasks} done · {m.progress}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {cols.map(col => (
          <div key={col.key} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            minHeight: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: col.color, fontFamily: 'var(--font-display)' }}>
                {col.label}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>
                {col.items.length}
              </span>
            </div>

            {col.items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text3)', fontSize: '12px' }}>
                No tasks
              </div>
            )}

            {col.items.map(task => {
              const isMyTask = task.assignedEmployeeId === myId
              const owner = members.find(m => m.id === task.assignedEmployeeId)
              return (
                <div key={task.id} style={{
                  background: 'var(--bg3)',
                  border: isMyTask ? '1px solid rgba(32,178,170,0.3)' : '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                  opacity: task.status === 'done' || task.status === 'DONE' ? 0.7 : 1,
                  transition: 'border-color 0.15s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
                      {task.sprintTitle}
                    </div>
                    {owner && (
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: owner.id === myId ? 'var(--cyan2)' : 'var(--bg3)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: '600', color: owner.id === myId ? '#fff' : 'var(--text2)',
                        flexShrink: 0
                      }}>
                        {owner.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500', lineHeight: 1.4, marginBottom: '6px' }}>
                    {task.title}
                  </div>

                  {task.deliverable && (
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text2)' }}>Deliverable: </span>{task.deliverable}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMyTask && col.key !== 'done' ? '10px' : '0' }}>
                    <Pill type={priorityColor[task.priority] || 'default'}>{task.priority}</Pill>
                    <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{task.estimatedHours}h</span>
                  </div>

                  {isMyTask && col.key === 'todo' && (
                    <button onClick={() => handleStart(task)} disabled={actionId === task.id}
                      style={{ width: '100%', padding: '7px', borderRadius: '7px', background: 'rgba(32,178,170,0.1)', border: '1px solid rgba(32,178,170,0.25)', color: 'var(--cyan2)', fontSize: '12px', fontWeight: '600', cursor: actionId === task.id ? 'not-allowed' : 'pointer' }}>
                      {actionId === task.id ? '...' : '▶ Start Working'}
                    </button>
                  )}

                  {isMyTask && col.key === 'in_progress' && (
                    <button onClick={() => handleDone(task)} disabled={actionId === task.id}
                      style={{ width: '100%', padding: '7px', borderRadius: '7px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: 'var(--green)', fontSize: '12px', fontWeight: '600', cursor: actionId === task.id ? 'not-allowed' : 'pointer' }}>
                      {actionId === task.id ? '...' : '✓ Mark as Done'}
                    </button>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    padding: '4px 8px',
                    background: isMyTask ? 'rgba(32,178,170,0.08)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: getMemberColor(task.assignedEmployeeId),
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', fontWeight: '700',
                      color: isMyTask ? '#fff' : 'var(--text2)',
                      flexShrink: 0
                    }}>
                      {owner?.fullName?.charAt(0)?.toUpperCase() ||
                        members.find(m => m.id === task.assignedEmployeeId)
                          ?.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      color: getMemberColor(task.assignedEmployeeId),
                      fontWeight: isMyTask ? '600' : '400'
                    }}>
                      {isMyTask ? 'You' : (owner?.fullName || 'Unassigned')}
                    </span>
                  </div>

                  {col.key === 'done' && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--green)', opacity: 0.8, marginTop: '6px' }}>
                      ✓ Completed
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
