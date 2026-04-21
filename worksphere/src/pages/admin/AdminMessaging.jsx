import { useEffect, useState } from 'react'
import { getEmployees } from '../../services/api'
import { sendAdminEmail } from '../../services/adminMessaging'

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function AdminMessaging() {
  const [targetKind, setTargetKind] = useState('employee')
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [employees, setEmployees] = useState([])
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getEmployees()
      .then((r) => setEmployees(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEmployees([]))
  }, [])

  const onPickEmployee = (id) => {
    const e = employees.find((x) => x._id === id || x.id === id)
    if (e?.email) setToEmail(e.email)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setStatus(null)
    setSending(true)
    try {
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#0b1220;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111827;border-radius:16px;border:1px solid #1e293b;">
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:12px;color:#94a3b8;font-family:Arial,sans-serif;">Message administrateur — ${escapeHtml(targetKind === 'rh' ? 'RH' : 'Employé')}</p>
<div style="font-size:14px;line-height:1.65;color:#e2e8f0;font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(body)}</div>
</td></tr>
<tr><td style="padding:12px 24px 24px;"><p style="margin:0;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">Envoyé depuis l’espace admin AVA / WorkSphere.</p></td></tr>
</table>
</body></html>`
      const data = await sendAdminEmail({
        to: toEmail.trim(),
        subject: subject.trim(),
        html,
        text: body,
      })
      setStatus({
        ok: true,
        msg: data.emailSent ? 'E-mail envoyé avec succès.' : (data.message || 'E-mail non envoyé (voir message).'),
      })
    } catch (e) {
      setStatus({ ok: false, msg: e?.message || 'Échec d’envoi.' })
    } finally {
      setSending(false)
    }
  }

  const hasKey = Boolean(import.meta.env.VITE_WS_ADMIN_API_KEY?.trim())

  return (
    <div style={{ padding: '28px', maxWidth: '720px' }}>
      <h1 style={{
        margin: '0 0 8px',
        fontFamily: 'var(--font-display)',
        fontSize: '22px',
        fontWeight: '800',
        color: 'var(--text)',
      }}>
        Messages RH / employés
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--text2)', lineHeight: 1.55 }}>
        Envoi d’un e-mail professionnel via Resend (même canal que les notifications candidats). Indiquez le destinataire :
        la liste des employés est chargée si votre session peut joindre l’API ; sinon saisissez l’adresse manuellement.
      </p>

      {!hasKey && (
        <div style={{
          marginBottom: '20px', padding: '14px 16px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: '13px', lineHeight: 1.5,
        }}>
          <strong>Configuration requise :</strong> définissez <code style={{ color: '#fde68a' }}>VITE_WS_ADMIN_API_KEY</code> au build
          et la même valeur dans <code style={{ color: '#fde68a' }}>WS_ADMIN_API_KEY</code> sur Netlify, puis redéployez.
        </div>
      )}

      {status && (
        <div style={{
          marginBottom: '20px', padding: '12px 14px', borderRadius: 'var(--radius-sm)',
          background: status.ok ? 'rgba(34,197,94,0.12)' : 'var(--red-bg)',
          border: `1px solid ${status.ok ? 'rgba(34,197,94,0.25)' : 'rgba(255,82,82,0.2)'}`,
          color: status.ok ? '#4ade80' : 'var(--red)',
          fontSize: '13px',
        }}>
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      }}>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Cible
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { id: 'employee', label: 'Employé' },
              { id: 'rh', label: 'RH' },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setTargetKind(o.id)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: targetKind === o.id ? '1px solid rgba(129,140,248,0.6)' : '1px solid var(--border2)',
                  background: targetKind === o.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {targetKind === 'employee' && employees.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '8px' }}>
              Raccourci — choisir un employé
            </label>
            <select
              onChange={(e) => onPickEmployee(e.target.value)}
              defaultValue=""
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border2)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--text)',
                fontSize: '14px',
              }}
            >
              <option value="" disabled>Sélectionner…</option>
              {employees.map((emp) => (
                <option key={emp._id || emp.id} value={emp._id || emp.id}>
                  {emp.name} — {emp.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            E-mail destinataire
          </label>
          <input
            type="email"
            required
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="rh@entreprise.com ou employé"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Objet
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text)',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Message
          </label>
          <textarea
            required
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text)',
              fontSize: '14px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={sending || !hasKey}
          style={{
            padding: '14px 24px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontWeight: '700',
            fontSize: '14px',
            cursor: sending || !hasKey ? 'not-allowed' : 'pointer',
            opacity: sending || !hasKey ? 0.65 : 1,
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}
        >
          {sending ? 'Envoi…' : 'Envoyer l’e-mail'}
        </button>
      </form>
    </div>
  )
}
