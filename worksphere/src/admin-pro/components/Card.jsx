import { motion } from 'framer-motion'

export default function Card({ title, subtitle, children, className = '' }) {
  return (
    <motion.section
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`ap-panel p-5 ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </header>
      )}
      {children}
    </motion.section>
  )
}
