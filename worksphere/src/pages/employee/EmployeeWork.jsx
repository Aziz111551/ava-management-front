import { useState, useEffect } from 'react'
import { getMyProjects, addProject, getTrelloTasks } from '../../services/api'
import { SectionTitle, Pill, Btn, StatCard, Grid, Modal, Field, inputStyle } from '../../components/shared/UI'

// ── PROJECTS ──────────────────────────────────────────────────
const MOCK = [
  { _id: '1', name: 'AVA Platform', description: 'AI Executive Assistant Flutter app', status: 'active', progress: 67, sprint: 'Sprint 4', team: 5, deadline: '2026-05-30', stack: ['Flutter', 'NestJS', 'MongoDB'] },
  { _id: '2', name: 'NEXO Mobile', description: 'Sports social matching app iOS/Android', status: 'active', progress: 45, sprint: 'Sprint 2', team: 3, deadline: '2026-06-15', stack: ['SwiftUI', 'Kotlin'] },
]
const EMPTY = { name: '', description: '', deadline: '', stack: '' }

export function MesProjets() {
  const [projects, setProjects] = useState(MOCK)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  useEffect(() => { getMyProjects().then(r => setProjects(r.data)).catch(() => {}) }, [])

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

      <SectionTitle action={<Btn onClick={() => setModal(true)}>+ New project</Btn>}>
        My projects
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {projects.map(p => (
          <div key={p._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
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
              <span>👥 {p.team} members</span>
              <span>🗓 {new Date(p.deadline).toLocaleDateString('en-US')}</span>
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
  const [tasks, setTasks] = useState(MOCK_TASKS)
  const [filterProject, setFilterProject] = useState('all')

  useEffect(() => { getTrelloTasks().then(r => setTasks(r.data)).catch(() => {}) }, [])

  const projects = ['all', ...new Set(tasks.map(t => t.project))]
  const filtered = filterProject === 'all' ? tasks : tasks.filter(t => t.project === filterProject)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {projects.map(p => (
            <button key={p} onClick={() => setFilterProject(p)} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer',
              background: filterProject === p ? 'var(--cyan)' : 'var(--card)',
              color: filterProject === p ? '#fff' : 'var(--text2)',
              border: `1px solid ${filterProject === p ? 'var(--cyan)' : 'var(--border)'}`,
            }}>
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
        <Btn variant="ghost" onClick={() => window.open('https://trello.com', '_blank')}>Open Trello ↗</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {cols.map(col => (
          <div key={col} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', minHeight: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text2)', fontFamily: 'var(--font-display)' }}>{colLabel[col]}</span>
              <span style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>
                {filtered.filter(t => t.status === col).length}
              </span>
            </div>
            {filtered.filter(t => t.status === col).map(t => (
              <div key={t._id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '8px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border2)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '10px', background: 'var(--cyan-dim)', color: 'var(--cyan2)' }}>{t.tag}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '500', lineHeight: 1.4 }}>{t.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <Pill type={priorityType[t.priority]}>{t.priority}</Pill>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{t.project}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
