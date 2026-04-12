import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Layout({ navItems, pageTitle, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const roleBadge = user?.role === 'rh' ? 'HR' : (user?.employeeType || 'Employee')

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: 'rgba(8, 18, 32, 0.95)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(20px)',
        position: 'relative', zIndex: 10,
      }}>

        {/* Logo — AVA style */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--grad-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: '800',
              fontSize: '15px', color: '#fff',
              boxShadow: '0 4px 16px rgba(32,178,170,0.4)',
            }}>A</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>AVA</div>
              <div style={{ fontSize: '10px', color: 'var(--cyan)', fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {navItems.map((section, si) => (
            <div key={si} style={{ marginBottom: '4px' }}>
              {section.label && (
                <div style={{
                  fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em',
                  color: 'var(--text3)', padding: '10px 20px 5px',
                  textTransform: 'uppercase',
                }}>
                  {section.label}
                </div>
              )}
              {section.items.map(item => {
                const active = location.pathname === item.path
                return (
                  <div
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 20px', margin: '1px 8px',
                      fontSize: '13px', fontWeight: active ? '600' : '400',
                      color: active ? 'var(--text)' : 'var(--text2)',
                      cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      background: active ? 'rgba(32,178,170,0.15)' : 'transparent',
                      border: active ? '1px solid var(--border2)' : '1px solid transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {active && (
                      <div style={{
                        marginLeft: 'auto', width: '6px', height: '6px',
                        borderRadius: '50%', background: 'var(--cyan)',
                        boxShadow: '0 0 8px var(--cyan)',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User area */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(32,178,170,0.06)', border: '1px solid var(--border)',
            marginBottom: '10px',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'var(--grad-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0,
            }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{
                fontSize: '10px', color: 'var(--cyan)', fontWeight: '500',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{roleBadge}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text2)', fontSize: '12px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--red)'; e.target.style.color = 'var(--red)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text2)' }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: '60px', flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          background: 'rgba(8,18,32,0.8)', backdropFilter: 'blur(12px)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '18px',
            fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.3px',
          }}>{pageTitle}</span>
          {/* Cyan dot indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'glow 2s infinite' }} />
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Connected</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
