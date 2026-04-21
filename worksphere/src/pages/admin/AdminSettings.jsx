/** Paramètres / documentation rapide pour l’administrateur (pas de secrets en dur). */
export default function AdminSettings() {
  return (
    <div style={{ padding: '24px 28px 40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{
        margin: '0 0 12px',
        fontFamily: 'var(--font-display)',
        fontSize: '22px',
        fontWeight: '800',
        color: 'var(--text)',
      }}>
        Paramètres & déploiement
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '24px' }}>
        Rappels pour connecter l’application à votre infrastructure. Les valeurs sensibles se configurent sur Netlify (variables d’environnement), jamais dans le dépôt Git.
      </p>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '16px',
      }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', marginBottom: '10px' }}>
          <i className="fa-solid fa-link" style={{ marginRight: '8px', opacity: 0.85 }} aria-hidden />
          API métier (Nest)
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.55, margin: 0 }}>
          <code style={{ color: 'var(--cyan2)' }}>VITE_API_URL</code> — URL HTTPS du backend (login RH / employé, employés, congés…). CORS côté Nest : autoriser l’origine Netlify.
        </p>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: '14px',
        padding: '20px 22px',
        marginBottom: '16px',
      }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', marginBottom: '10px' }}>
          <i className="fa-solid fa-shield-halved" style={{ marginRight: '8px', opacity: 0.85 }} aria-hidden />
          Connexion admin & fonctions protégées
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
          <li><code>VITE_ADMIN_EMAIL</code> / <code>VITE_ADMIN_PASSWORD</code> — accès <code>/admin</code> sans compte Nest.</li>
          <li><code>VITE_WS_ADMIN_API_KEY</code> = <code>WS_ADMIN_API_KEY</code> — e-mails admin, récap IA, etc.</li>
        </ul>
      </div>

      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border2)',
        borderRadius: '14px',
        padding: '20px 22px',
      }}>
        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', marginBottom: '10px' }}>
          <i className="fa-solid fa-brain" style={{ marginRight: '8px', opacity: 0.85 }} aria-hidden />
          OpenAI & e-mails
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7 }}>
          <li><code>OPENAI_API_KEY</code> — récap IA admin, rapports de réunion, tests techniques.</li>
          <li><code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code> — envoi des e-mails transactionnels.</li>
        </ul>
      </div>
    </div>
  )
}
