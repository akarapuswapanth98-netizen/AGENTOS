import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

// Slow starfield shell. Pure decoration: no app data, no interaction.
function Stars({ count = 350 }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.random() * 3.4
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(p) * Math.cos(t)
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      arr[i * 3 + 2] = r * Math.cos(p)
    }
    return arr
  }, [count])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#c7d2fe" transparent opacity={0.8} sizeAttenuation depthWrite={false} />
    </points>
  )
}

// Floating crystal: solid core + larger wireframe shell, mouse parallax tilt.
function Core() {
  const group = useRef()
  const shell = useRef()

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y += dt * 0.25
      group.current.rotation.x = Math.sin(t * 0.3) * 0.25
      group.current.rotation.z = state.pointer.x * 0.15
      group.current.position.y = Math.sin(t * 0.8) * 0.15
    }
    if (shell.current) shell.current.rotation.y -= dt * 0.12
  })

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#4f46e5" transparent opacity={0.55} roughness={0.35} metalness={0.45} flatShading />
      </mesh>
      <mesh ref={shell} scale={1.35}>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshBasicMaterial color="#a5b4fc" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

// Decorative 3D hero. Reduced-motion users get a static gradient instead.
export default function Hero3D({ className = '' }) {
  const reduce =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduce) {
    return <div aria-hidden className={`bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-900 ${className}`} />
  }

  return (
    <div aria-hidden className={className}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 5.2], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 5, 6]} intensity={1.4} />
        <pointLight position={[-5, -3, 2]} intensity={12} color="#818cf8" />
        <Core />
        <Stars />
      </Canvas>
    </div>
  )
}
