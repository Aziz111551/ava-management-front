import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import NavIcon from './NavIcon'
import { AnimatedPage } from '../react-bits'

export default function Layout({ navItems, pageTitle, children, adminMode = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const roleBadge =
    user?.role === 'admin'
      ? 'Admin'
      : user?.role === 'rh'
        ? 'HR'
        : (user?.employeeType || 'Employee')

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '256px', flexShrink: 0,
        background: adminMode
          ? 'linear-gradient(180deg, rgba(26, 58, 82, 0.98) 0%, rgba(15, 41, 64, 0.96) 100%)'
          : 'linear-gradient(180deg, rgba(10, 22, 38, 0.98) 0%, rgba(8, 18, 32, 0.96) 100%)',
        borderRight: '1px solid var(--border2)',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(24px)',
        position: 'relative', zIndex: 10,
        boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
      }}>

        {/* Logo — AVA style */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: adminMode
                ? 'var(--grad-blue)'
                : 'var(--grad-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: '800',
              fontSize: '15px', color: '#fff',
              boxShadow: adminMode
                ? '0 4px 16px rgba(59,130,246,0.42)'
                : '0 4px 16px rgba(6,182,212,0.4)',
            }}>A</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>AVA</div>
              <div style={{
                fontSize: '10px',
                color: adminMode ? 'var(--cyan2)' : 'var(--cyan)',
                fontWeight: '500', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{adminMode ? 'Administration' : 'Management'}</div>
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
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '11px 16px', margin: '2px 10px',
                      fontSize: '13px', fontWeight: active ? '600' : '500',
                      color: active ? 'var(--text)' : 'var(--text2)',
                      cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      background: active
                        ? (adminMode
                          ? 'linear-gradient(90deg, rgba(59,130,246,0.22) 0%, rgba(34,211,238,0.08) 100%)'
                          : 'linear-gradient(90deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.06) 100%)')
                        : 'transparent',
                      border: active
                        ? (adminMode ? '1px solid var(--border3)' : '1px solid rgba(6,182,212,0.35)')
                        : '1px solid transparent',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
                  >
                    <NavIcon className={item.icon} active={active} />
                    <span style={{ letterSpacing: '0.01em' }}>{item.label}</span>
                    {active && (
                      <div style={{
                        marginLeft: 'auto', width: '6px', height: '6px',
                        borderRadius: '50%',
                        background: adminMode ? 'var(--cyan2)' : 'var(--cyan)',
                        boxShadow: adminMode ? '0 0 8px var(--cyan2)' : '0 0 8px var(--cyan)',
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
            background: adminMode ? 'rgba(59,130,246,0.12)' : 'rgba(6,182,212,0.08)',
            border: '1px solid var(--border)',
            marginBottom: '10px',
          }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: adminMode ? 'var(--grad-blue)' : 'var(--grad-cyan)',
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
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text2)', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,82,82,0.45)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-bg)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" style={{ fontSize: '12px' }} aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{
          height: '64px', flexShrink: 0,
          borderBottom: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px',
          background: 'linear-gradient(180deg, rgba(26,58,82,0.42) 0%, rgba(15,41,64,0.35) 100%)',
          backdropFilter: 'blur(14px)',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '17px',
            fontWeight: '700', color: 'var(--text)', letterSpacing: '-0.4px',
          }}>{pageTitle}</span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '6px 12px', borderRadius: '999px',
            background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.2)',
          }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '14px', color: 'var(--green)' }} aria-hidden />
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', letterSpacing: '0.04em' }}>Session active</span>
          </div>
        </div>

        {/* Content — transitions type React Bits (Motion) */}
        <AnimatedPage>{children}</AnimatedPage>
      </main>
    </div>
  )
}
