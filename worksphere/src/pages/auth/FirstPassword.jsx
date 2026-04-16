import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { changePasswordFirst } from '../../services/api'
import { AuroraBackdrop, StaggerReveal, StaggerItem } from '../../components/react-bits'

/**
 * Affiché quand l’API renvoie user.mustChangePassword === true (voir docs/BACKEND_EMPLOYEE_WELCOME.md).
 * Appelle POST /auth/change-password — adapter le chemin côté Nest si besoin.
 */
export default function FirstPassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      navigate(user.role === 'rh' ? '/rh/calendrier' : '/employee/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (newPassword !== confirm) {
      setError('La confirmation ne correspond pas.')
      return
    }
    setLoading(true)
    try {
      await changePasswordFirst({ currentPassword, newPassword })
      updateUser({ mustChangePassword: false })
      navigate(user?.role === 'rh' ? '/rh/calendrier' : '/employee/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Impossible de mettre à jour le mot de passe.')
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
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'var(--grad-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', color: '#fff', margin: '0 auto 14px',
            }}><i className="fa-solid fa-key" aria-hidden /></div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '22px', color: 'var(--text)' }}>
              Nouveau mot de passe
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '8px', lineHeight: 1.5 }}>
              Votre compte exige un changement de mot de passe avant de continuer (première connexion).
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
          }}>
            {error && (
              <div style={{
                background: 'var(--red-bg)', border: '1px solid rgba(255,82,82,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '12px', color: 'var(--red)', fontSize: '13px', marginBottom: '18px',
              }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px' }}>
                MOT DE PASSE ACTUEL (temporaire)
              </label>
              <input
                type="password"
                name="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: '16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '14px',
                }}
              />
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px' }}>
                NOUVEAU MOT DE PASSE
              </label>
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: '16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '14px',
                }}
              />
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', marginBottom: '8px' }}>
                CONFIRMER
              </label>
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: '22px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border2)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '14px',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'var(--grad-cyan)', border: 'none', borderRadius: 'var(--radius-sm)',
                  color: '#fff', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? 'Enregistrement…' : 'Enregistrer et continuer'}
              </button>
            </form>
          </div>
        </StaggerItem>
      </StaggerReveal>
    </div>
  )
}
