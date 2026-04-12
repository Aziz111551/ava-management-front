import { useGoogleLogin } from '@react-oauth/google'
import { WS_GOOGLE_CAL_TOKEN_KEY } from '../../services/googleCalendar'

/**
 * OAuth Google (lecture calendrier). Nécessite {@link GoogleOAuthProvider} et `VITE_GOOGLE_CLIENT_ID`.
 */
export default function CalendrierGoogleConnect({ onConnected, onDisconnected, connected }) {
  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    onSuccess: (res) => {
      sessionStorage.setItem(WS_GOOGLE_CAL_TOKEN_KEY, res.access_token)
      onConnected()
    },
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        padding: '14px 18px',
        borderRadius: 'var(--radius)',
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
    >
      {!connected ? (
        <button
          type="button"
          onClick={() => login()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, rgba(32,178,170,0.2) 0%, rgba(0,188,212,0.12) 100%)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--cyan)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(32,178,170,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border2)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <i className="fa-brands fa-google" style={{ fontSize: '16px' }} aria-hidden />
          Connecter Google Calendar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(WS_GOOGLE_CAL_TOKEN_KEY)
            onDisconnected()
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg3)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text2)',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)' }}
        >
          <i className="fa-solid fa-link-slash" aria-hidden />
          Déconnecter Google
        </button>
      )}
      <span style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.5, maxWidth: '520px' }}>
        <i className="fa-regular fa-circle-check" style={{ marginRight: '6px', color: 'var(--cyan)' }} aria-hidden />
        {connected
          ? 'Agendas synchronisés : tous vos calendriers Google visibles sont fusionnés pour le mois affiché.'
          : 'Connectez-vous pour afficher vos événements réels. Sinon : données API RH ou démonstration.'}
      </span>
    </div>
  )
}
