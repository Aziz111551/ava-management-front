import { motion } from 'motion/react'
import { easeOutExpo } from './easing'

/** Apparition au montage (pages hors layout, modales, etc.). */
export function FadeMount({ children, style, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: easeOutExpo }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
