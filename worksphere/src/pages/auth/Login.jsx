import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { login as loginAPI, API_BASE_URL } from '../../services/api'
import { AuroraBackdrop, StaggerReveal, StaggerItem } from '../../components/react-bits'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await loginAPI(email, password)
      login(data.user, data.token)
      if (data.user.role === 'rh') navigate('/rh')
      else navigate('/employee')
    } catch (err) {
      if (!err.response) {
        const isProd = import.meta.env.PROD
        const apiHint =
          API_BASE_URL ||
          (isProd
            ? 'VITE_API_URL non définie au build Netlify'
            : 'http://localhost:3001')
        setError(
          isProd
            ? `Connexion impossible : l’API n’est pas joignable (${apiHint}). Netlify → Environment variables → VITE_API_URL = URL HTTPS du backend, puis redéploiement complet.`
            : `Serveur injoignable (${apiHint}). Démarrez le backend ou corrigez VITE_API_URL dans .env.`,
        )
      } else {
        setError(err.response?.data?.message || 'Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <AuroraBackdrop />

      <StaggerReveal style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>

        <StaggerItem>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'var(--grad-cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: '800',
            fontSize: '28px', color: '#fff', margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(32,178,170,0.4)',
          }}>A</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.5px' }}>AVA Management</div>
          <div style={{ fontSize: '14px', color: 'var(--text3)', marginTop: '6px' }}>Sign in to your workspace</div>
        </div>
        </StaggerItem>

        <StaggerItem>
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(32,178,170,0.08)',
        }}>
          {error && (
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              background: 'var(--red-bg)', border: '1px solid rgba(255,82,82,0.2)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              color: 'var(--red)', fontSize: '13px', marginBottom: '20px', lineHeight: 1.45,
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginTop: '2px', flexShrink: 0 }} aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-regular fa-envelope" aria-hidden style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '14px', color: 'var(--text3)', pointerEvents: 'none',
                }} />
                <input
                  type="email" value={email} required
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@company.com"
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '12px 16px 12px 42px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border2)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-lock" aria-hidden style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '13px', color: 'var(--text3)', pointerEvents: 'none',
                }} />
                <input
                  type="password" value={password} required
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '12px 16px 12px 42px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border2)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)', fontSize: '14px', outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cyan)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                background: 'var(--grad-cyan)',
                border: 'none', borderRadius: 'var(--radius-sm)',
                color: '#fff', fontFamily: 'var(--font-display)',
                fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 6px 20px rgba(32,178,170,0.4)',
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden />
                </>
              )}
            </button>
          </form>
        </div>
        </StaggerItem>

        <StaggerItem>
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text3)' }}>
          AVA Management · Powered by AI
        </div>
        </StaggerItem>
      </StaggerReveal>
    </div>
  )
}
