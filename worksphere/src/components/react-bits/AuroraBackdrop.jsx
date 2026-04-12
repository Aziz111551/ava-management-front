import { motion } from 'motion/react'

/** Halos animés en arrière-plan (ambiance type React Bits). */
export default function AuroraBackdrop() {
  return (
    <>
      <motion.div
        aria-hidden
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.14, 0.22, 0.14],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,178,170,0.35) 0%, transparent 70%)',
          top: '-100px',
          left: '-100px',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        aria-hidden
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.16, 0.1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,188,212,0.3) 0%, transparent 70%)',
          bottom: '-80px',
          right: '-80px',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
