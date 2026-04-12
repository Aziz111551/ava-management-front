import { motion } from 'motion/react'
import { easeOutExpo } from './easing'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOutExpo },
  },
}

/**
 * Révèle les enfants l’un après l’autre (liste, sections empilées).
 * Chaque enfant direct doit être un <StaggerItem> ou utiliser variants={item}.
 */
export function StaggerReveal({ children, style, className }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style, className }) {
  return (
    <motion.div variants={item} style={style} className={className}>
      {children}
    </motion.div>
  )
}
