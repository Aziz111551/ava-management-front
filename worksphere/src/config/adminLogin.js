/**
 * Connexion administrateur locale (sans compte Nest).
 * En production : définir VITE_ADMIN_EMAIL et VITE_ADMIN_PASSWORD au build Netlify.
 * En dev : valeurs par défaut ci-dessous si les variables sont absentes.
 */
export function getAdminCredentials() {
  const email = import.meta.env.VITE_ADMIN_EMAIL?.trim()
  const password = import.meta.env.VITE_ADMIN_PASSWORD?.trim()
  if (email && password) return { email, password }
  if (import.meta.env.DEV) {
    return { email: 'admin@worksphere.local', password: 'AdminDev2026!' }
  }
  return null
}

export const ADMIN_SESSION_TOKEN = 'ws-admin-session'
