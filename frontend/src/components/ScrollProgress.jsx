import { useEffect, useRef } from 'react'

export default function ScrollProgress() {
  const barRef = useRef(null)

  useEffect(() => {
    let frameId = 0
    function update() {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        const doc = document.documentElement
        const total = doc.scrollHeight - doc.clientHeight
        const progress = total > 0 ? Math.min(1, Math.max(0, doc.scrollTop / total)) : 0
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${progress})`
        }
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none bg-transparent">
      <div
        ref={barRef}
        className="h-full w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-indigo-600 origin-left transition-transform duration-75"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
