/**
 * Icône Font Awesome alignée pour la sidebar (largeur fixe, accessibilité).
 */
export default function NavIcon({ className, active }) {
  return (
    <i
      className={className}
      aria-hidden="true"
      style={{
        width: '22px',
        textAlign: 'center',
        fontSize: '15px',
        lineHeight: 1,
        color: active ? 'var(--cyan2)' : 'var(--text3)',
        transition: 'color 0.15s ease',
      }}
    />
  )
}
