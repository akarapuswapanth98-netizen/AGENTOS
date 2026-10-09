import { motion, useReducedMotion } from 'framer-motion'

// Fade-and-rise on scroll into view. Fires once; background refreshes keep content visible.
export default function Reveal({ children, delay = 0, y = 16, className }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: reduce ? 0 : 0.45, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
