import { motion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { easeOutExpo } from './easing'

/**
 * Transition de contenu à chaque changement de route (pattern React Bits + Motion).
 */
export default function AnimatedPage({ children, style, className }) {
  const { pathname } = useLocation()
  return (
    <motion.div
      key={pathname}
      role="presentation"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutExpo }}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '28px',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
