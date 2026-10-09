import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// Animated integer. Counts up once on mount; later value changes snap silently
// so background refreshes never replay the animation.
export default function CountUp({ value, duration = 0.9 }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? value : 0)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      if (reduce) {
        setN(value)
        return undefined
      }
      const controls = animate(0, value, {
        duration,
        ease: 'easeOut',
        onUpdate: (v) => setN(Math.round(v)),
      })
      return () => controls.stop()
    }
    setN(value)
    return undefined
  }, [value, duration, reduce])

  return <>{n}</>
}
