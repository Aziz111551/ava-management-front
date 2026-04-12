import { useGoogleLogin } from '@react-oauth/google'
import { WS_GOOGLE_CAL_TOKEN_KEY } from '../../services/googleCalendar'

/**
 * Boutons OAuth Google (lecture seule calendrier). Nécessite {@link GoogleOAuthProvider} et `VITE_GOOGLE_CLIENT_ID`.
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
        gap: '10px',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}
    >
      {!connected ? (
        <button
          type="button"
          onClick={() => login()}
          style={{
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan)',
            borderRadius: '8px',
            color: 'var(--cyan2)',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
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
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text2)',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Déconnecter Google
        </button>
      )}
      <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
        {connected
          ? 'Événements du mois : tous vos agendas Google (avec pagination API).'
          : 'Cliquez pour charger vos vrais événements Google. Sans connexion : API RH ou démo.'}
      </span>
    </div>
  )
}
