import { motion, useReducedMotion } from 'framer-motion'

// One consistent route transition: quick fade with a small rise on enter,
// a shorter fade on exit. Instant when reduced motion is requested.
export default function PageFade({ children }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -8 }}
      transition={{ duration: reduce ? 0 : 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
