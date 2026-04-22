export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50'
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500',
    secondary:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
    ghost:
      'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }

  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}
