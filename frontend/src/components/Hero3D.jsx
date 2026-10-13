import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Agent nodes configuration for the 3D neural cluster
const AGENT_NODES = [
  { id: 'analyst', label: 'Analyst', pos: [-1.8, 1.1, 0.4], color: '#8b5cf6' },
  { id: 'planner', label: 'Planner', pos: [1.7, 1.2, -0.3], color: '#06b6d4' },
  { id: 'validator', label: 'Validator', pos: [2.0, -1.0, 0.5], color: '#10b981' },
  { id: 'interviewer', label: 'Interviewer', pos: [-1.9, -1.1, -0.4], color: '#f43f5e' },
  { id: 'tutor', label: 'Tutor', pos: [0.0, 1.9, 0.6], color: '#f59e0b' },
]

// Animated connection lines between agent nodes and the central core
function NeuralConnections({ hoveredId }) {
  const lineRef = useRef()
  const geometry = useMemo(() => {
    const points = []
    // Central core is at [0, 0, 0]
    AGENT_NODES.forEach((node) => {
      points.push(new THREE.Vector3(0, 0, 0))
      points.push(new THREE.Vector3(...node.pos))
    })
    // Inter-node connection loops
    for (let i = 0; i < AGENT_NODES.length; i++) {
      const next = AGENT_NODES[(i + 1) % AGENT_NODES.length]
      points.push(new THREE.Vector3(...AGENT_NODES[i].pos))
      points.push(new THREE.Vector3(...next.pos))
    }
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [])

  useFrame((state) => {
    if (lineRef.current) {
      const t = state.clock.elapsedTime
      lineRef.current.material.opacity = 0.35 + Math.sin(t * 3) * 0.15
    }
  })

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={hoveredId ? '#22d3ee' : '#818cf8'}
        transparent
        opacity={0.4}
        linewidth={1}
      />
    </lineSegments>
  )
}

// Single floating Agent Node
function AgentNodeMesh({ node, isHovered, onHover }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const [initialPos] = useState(() => new THREE.Vector3(...node.pos))

  useFrame((state) => {
    const t = state.clock.elapsedTime + node.pos[0] * 2
    if (meshRef.current) {
      meshRef.current.position.y = initialPos.y + Math.sin(t * 1.5) * 0.12
      meshRef.current.position.x = initialPos.x + Math.cos(t * 1.2) * 0.08
      meshRef.current.rotation.y += 0.015
    }
    if (glowRef.current) {
      glowRef.current.rotation.z += 0.02
    }
  })

  return (
    <group
      ref={meshRef}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(node.id)
      }}
      onPointerOut={() => onHover(null)}
    >
      {/* Outer energy halo */}
      <mesh ref={glowRef} scale={isHovered ? 1.5 : 1.25}>
        <ringGeometry args={[0.22, 0.28, 24]} />
        <meshBasicMaterial
          color={node.color}
          transparent
          opacity={isHovered ? 0.9 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main node sphere */}
      <mesh scale={isHovered ? 1.3 : 1.0}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={isHovered ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Orbiting mini spark */}
      <mesh position={[0.28, 0, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

// Central Quantum Core with gyro rings
function CentralCore({ hoveredId }) {
  const group = useRef()
  const innerMesh = useRef()
  const ring1 = useRef()
  const ring2 = useRef()

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.rotation.y += dt * 0.2
      group.current.rotation.x = Math.sin(t * 0.4) * 0.15
      group.current.position.y = Math.sin(t * 0.8) * 0.1
    }
    if (innerMesh.current) {
      innerMesh.current.rotation.x += dt * 0.4
      innerMesh.current.rotation.z += dt * 0.3
    }
    if (ring1.current) ring1.current.rotation.z -= dt * 0.35
    if (ring2.current) ring2.current.rotation.x += dt * 0.28
  })

  return (
    <group ref={group}>
      {/* Central crystalline icosahedron */}
      <mesh ref={innerMesh}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#4338ca"
          emissiveIntensity={hoveredId ? 0.9 : 0.5}
          roughness={0.25}
          metalness={0.85}
          wireframe={false}
          flatShading
        />
      </mesh>

      {/* Wireframe shell */}
      <mesh scale={1.25}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshBasicMaterial
          color="#a5b4fc"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Gyroscope Ring 1 */}
      <mesh ref={ring1} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[1.15, 0.02, 16, 64]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#0891b2"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Gyroscope Ring 2 */}
      <mesh ref={ring2} rotation={[-Math.PI / 3, Math.PI / 6, 0]}>
        <torusGeometry args={[1.35, 0.018, 16, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#7c3aed"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// Particle field
function CosmicField({ count = 380 }) {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 2.2 + Math.random() * 4.2
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(p) * Math.cos(t)
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      arr[i * 3 + 2] = r * Math.cos(p)
    }
    return arr
  }, [count])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.025
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.032}
        color="#c7d2fe"
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

// Scene Root with mouse tracking parallax
function SceneContainer({ hoveredId, onHover }) {
  const group = useRef()

  useFrame((state) => {
    if (group.current) {
      const targetX = state.pointer.x * 0.4
      const targetY = state.pointer.y * 0.3
      group.current.rotation.y += (targetX - group.current.rotation.y) * 0.05
      group.current.rotation.x += (-targetY - group.current.rotation.x) * 0.05
    }
  })

  return (
    <group ref={group}>
      <CentralCore hoveredId={hoveredId} />
      <NeuralConnections hoveredId={hoveredId} />
      {AGENT_NODES.map((node) => (
        <AgentNodeMesh
          key={node.id}
          node={node}
          isHovered={hoveredId === node.id}
          onHover={onHover}
        />
      ))}
      <CosmicField />
    </group>
  )
}

// Exported 3D Hero Component with reduced-motion fallback
export default function Hero3D({ className = '' }) {
  const [hoveredId, setHoveredId] = useState(null)

  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduceMotion) {
    return (
      <div
        aria-hidden
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 ${className}`}
      >
        <div className="h-28 w-28 rounded-full border border-neon-violet/40 bg-neon-violet/10 shadow-glow-violet animate-pulse" />
      </div>
    )
  }

  return (
    <div aria-hidden className={`relative select-none ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5.2], fov: 48 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 6, 6]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-4, -3, 3]} intensity={14} color="#8b5cf6" />
        <pointLight position={[4, -2, 2]} intensity={12} color="#06b6d4" />
        <SceneContainer hoveredId={hoveredId} onHover={setHoveredId} />
      </Canvas>

      {/* Interactive node indicator chip at bottom right */}
      {hoveredId && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-full border border-neon-cyan/40 bg-cyber-glass px-3 py-1 text-xs font-semibold text-cyan-300 shadow-glow-sm">
          Node: {AGENT_NODES.find((n) => n.id === hoveredId)?.label}
        </div>
      )}
    </div>
  )
}
