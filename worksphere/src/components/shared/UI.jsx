// ─── STAT CARD ────────────────────────────────────────────────
export function StatCard({ label, value, sub, gradient = 'var(--grad-cyan)', icon }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: gradient,
      }} />
      {icon && <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>}
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '5px' }}>{sub}</div>}
    </div>
  )
}

// ─── PILL ─────────────────────────────────────────────────────
export function Pill({ children, type = 'default' }) {
  const colors = {
    green:   { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'rgba(0,230,118,0.2)' },
    amber:   { bg: 'var(--amber-bg)',  color: 'var(--amber)',  border: 'rgba(255,179,0,0.2)' },
    red:     { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'rgba(255,82,82,0.2)' },
    blue:    { bg: 'var(--blue-bg)',   color: 'var(--blue)',   border: 'rgba(64,196,255,0.2)' },
    cyan:    { bg: 'var(--cyan-dim)',   color: 'var(--cyan2)', border: 'var(--border2)' },
    default: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text2)', border: 'var(--border)' },
  }
  const c = colors[type] || colors.default
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '500',
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
    }}>{children}</span>
  )
}

// ─── SECTION TITLE ────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: '700',
        color: 'var(--text)', letterSpacing: '-0.2px',
      }}>{children}</h2>
      {action}
    </div>
  )
}

// ─── BUTTON ───────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', small, style: extra, disabled }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: small ? '6px 14px' : '10px 18px',
    borderRadius: small ? 'var(--radius-sm)' : 'var(--radius-sm)',
    fontSize: small ? '12px' : '13px', fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', border: 'none',
    fontFamily: 'var(--font-body)', opacity: disabled ? 0.5 : 1,
  }
  const variants = {
    primary: { background: 'var(--grad-cyan)', color: '#fff', boxShadow: '0 4px 15px rgba(32,178,170,0.3)' },
    ghost:   { background: 'rgba(255,255,255,0.05)', color: 'var(--text2)', border: '1px solid var(--border2)' },
    danger:  { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(255,82,82,0.2)' },
    pink:    { background: 'var(--grad-pink)', color: '#fff', boxShadow: '0 4px 15px rgba(233,30,140,0.3)' },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...extra }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ─── AVA FEATURE CARD (matches Flutter home cards) ────────────
export function FeatureCard({ title, description, gradient, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--card)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: '16px',
      cursor: 'pointer', transition: 'all 0.2s',
      backdropFilter: 'blur(12px)',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: gradient, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '20px', flexShrink: 0,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)', color: '#fff',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.4 }}>{description}</div>
      </div>
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: gradient, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '12px', color: '#fff', flexShrink: 0,
      }} aria-hidden>
        <i className="fa-solid fa-chevron-right" />
      </div>
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────
export function Table({ columns, rows }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border2)',
      borderRadius: 'var(--radius)', overflow: 'hidden', backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
        padding: '10px 18px', background: 'rgba(32,178,170,0.08)',
        borderBottom: '1px solid var(--border)',
      }}>
        {columns.map(c => (
          <span key={c.key} style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{c.label}</span>
        ))}
      </div>
      {rows.map((row, i) => {
        const rowKey = row?._id ?? row?.id ?? `row-${i}`
        return (
          <div key={rowKey} style={{
            display: 'grid',
            gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
            padding: '13px 18px', borderTop: '1px solid var(--border)',
            alignItems: 'center', transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(32,178,170,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {columns.map(c => (
              <span key={c.key} style={{ fontSize: '13px', color: 'var(--text)' }}>
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </span>
            ))}
          </div>
        )
      })}
      {rows.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
          No data
        </div>
      )}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius-xl)', padding: '28px',
        width: '100%', maxWidth: '500px', animation: 'fadeIn 0.25s ease',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(32,178,170,0.1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: '700', color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text2)', width: '30px', height: '30px',
            cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── FORM FIELD ───────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text3)', marginBottom: '7px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  )
}

export const inputStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border2)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)', fontSize: '13px', outline: 'none',
  transition: 'border-color 0.2s',
}

// ─── GRID ─────────────────────────────────────────────────────
export function Grid({ cols = 3, gap = 14, children, style: extra }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap}px`, marginBottom: '24px', ...extra }}>
      {children}
    </div>
  )
}

// ─── EMPTY ────────────────────────────────────────────────────
export function Empty({ message = 'No data' }) {
  return (
    <div style={{
      padding: '48px', textAlign: 'center', color: 'var(--text3)',
      fontSize: '13px', background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    }}>
      {message}
    </div>
  )
}
