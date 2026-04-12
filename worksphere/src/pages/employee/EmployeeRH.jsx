import { useState, useEffect } from 'react'
import { submitConge, submitMaladie, getMyConges } from '../../services/api'
import { SectionTitle, Pill, Btn, StatCard, Grid, Field, inputStyle, Modal } from '../../components/shared/UI'

// ── CONGÉ REQUEST ──────────────────────────────────────────────
const MOCK_CONGES = [
  { _id: '1', type: 'Annuel', startDate: '2026-05-12', endDate: '2026-05-16', days: 5, status: 'pending', submittedAt: '2026-04-06' },
  { _id: '2', type: 'Maladie', startDate: '2026-04-03', endDate: '2026-04-03', days: 1, status: 'approved', submittedAt: '2026-04-03' },
  { _id: '3', type: 'Exceptionnel', startDate: '2026-02-14', endDate: '2026-02-14', days: 1, status: 'approved', submittedAt: '2026-02-10' },
]

const CONGE_TYPES = ['Annual', 'Exceptional', 'Unpaid', 'Maternity/Paternity']

export function DemandeConge() {
  const [conges, setConges] = useState(MOCK_CONGES)
  const [form, setForm] = useState({ type: 'Annual', startDate: '', endDate: '', reason: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getMyConges().then(r => setConges(r.data)).catch(() => {}) }, [])

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0
    const diff = new Date(form.endDate) - new Date(form.startDate)
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const payload = { ...form, days: calcDays() }
    await submitConge(payload).catch(() => {})
    setConges(prev => [{ ...payload, _id: Date.now().toString(), status: 'pending', submittedAt: new Date().toISOString().split('T')[0] }, ...prev])
    setForm({ type: 'Annual', startDate: '', endDate: '', reason: '' })
    setSubmitted(true)
    setLoading(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const soldeAnnuel = 21
  const pris = conges.filter(c => c.type === 'Annual' && c.status === 'approved').reduce((s, c) => s + c.days, 0)

  return (
    <div>
      <Grid cols={3} gap={12}>
        <StatCard label="Annual balance" value={`${soldeAnnuel - pris}d`} color="var(--green)" sub={`${pris}d used`} />
        <StatCard label="Pending" value={conges.filter(c => c.status === 'pending').length} color="var(--amber)" />
        <StatCard label="Approved" value={conges.filter(c => c.status === 'approved').length} color="var(--cyan2)" />
      </Grid>

      {submitted && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '20px', color: 'var(--green)', fontSize: '13px' }}>
          ✓ Request sent successfully. HR has been notified.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px' }}>
        {/* Form */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '18px' }}>New request</div>
          <Field label="Leave type">
            <select style={inputStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              {CONGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          </Field>
          <Field label="End date">
            <input type="date" style={inputStyle} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
          </Field>
          {form.startDate && form.endDate && (
            <div style={{ background: 'var(--cyan-dim)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--cyan2)' }}>
              Calculated duration: <strong>{calcDays()} days</strong>
            </div>
          )}
          <Field label="Reason (optional)">
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value })) } placeholder="Specify the reason..." />
          </Field>
          <Btn onClick={handleSubmit} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Sending...' : 'Submit request'}
          </Btn>
        </div>

        {/* History */}
        <div>
          <SectionTitle>My request history</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {conges.map(c => (
              <div key={c._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>{c.type}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                    {new Date(c.startDate).toLocaleDateString('en-US')} → {new Date(c.endDate).toLocaleDateString('en-US')} · {c.days}d
                  </div>
                </div>
                <Pill type={c.status === 'approved' ? 'green' : c.status === 'rejected' ? 'red' : 'amber'}>
                  {c.status === 'approved' ? 'Approved' : c.status === 'rejected' ? 'Rejected' : 'Pending'}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MALADIE ────────────────────────────────────────────────────
export function DeclarerMaladie() {
  const [form, setForm] = useState({ startDate: '', endDate: '', doctor: '', description: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    await submitMaladie(form).catch(() => {})
    setForm({ startDate: '', endDate: '', doctor: '', description: '' })
    setSubmitted(true)
    setLoading(false)
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div>
      <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: 'var(--red)' }}>
        ℹ️ Please submit your medical certificate within 48h.
      </div>

      {submitted && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(62,207,142,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '20px', color: 'var(--green)', fontSize: '13px' }}>
          ✓ Sick leave submitted. HR has been notified.
        </div>
      )}

      <div style={{ maxWidth: '480px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '20px' }}>Declare sick leave</div>
          <Field label="Start date">
            <input type="date" style={inputStyle} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          </Field>
          <Field label="End date">
            <input type="date" style={inputStyle} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
          </Field>
          <Field label="Treating doctor">
            <input style={inputStyle} value={form.doctor} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))} placeholder="Dr. First Last" />
          </Field>
          <Field label="Description / Diagnostic">
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Flu, fever, etc." />
          </Field>
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg3)', borderRadius: '8px', border: '2px dashed var(--border2)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>
              📎 Attach medical certificate (PDF/Photo)
              <br /><span style={{ fontSize: '11px' }}>Max 5MB — PDF, JPG, PNG</span>
            </div>
          </div>
          <Btn onClick={handleSubmit} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Sending...' : 'Submit sick leave'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
