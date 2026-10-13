import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MiniMap,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  BrainCircuit,
  Play,
  Plus,
  Settings,
  Sparkles,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Clock,
  Sliders,
  Zap,
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'

// Custom Agent Node for React Flow
function AgentNodeComponent({ data, selected }) {
  return (
    <div
      className={`rounded-2xl border bg-[#0d1424] p-4 text-slate-100 shadow-2xl transition-all min-w-[220px] ${
        selected
          ? 'border-cyan-400 shadow-glow-cyan'
          : 'border-indigo-500/30 hover:border-indigo-400/60'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !bg-indigo-400 !border-2 !border-[#0d1424]"
      />
      <div className="flex items-center justify-between gap-2 border-b border-indigo-500/15 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: data.color || '#6366f1' }}
          >
            <BrainCircuit className="h-4 w-4" />
          </div>
          <span className="font-display font-bold text-sm text-white">{data.label}</span>
        </div>
        <span className="rounded-full border border-indigo-500/30 bg-indigo-950/40 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
          {data.role || 'AGENT'}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400 leading-relaxed">{data.description}</p>
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-indigo-500/10">
        <span>Model: <b className="text-cyan-300">{data.model || 'claude-3-5'}</b></span>
        <span>Temp: <b className="text-violet-300">{data.temp || '0.2'}</b></span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !bg-cyan-400 !border-2 !border-[#0d1424]"
      />
    </div>
  )
}

const nodeTypes = {
  agentNode: AgentNodeComponent,
}

const INITIAL_NODES = [
  {
    id: 'trigger',
    type: 'agentNode',
    position: { x: 300, y: 40 },
    data: {
      label: 'Goal Ingestion',
      role: 'TRIGGER',
      color: '#06b6d4',
      description: 'Accepts technical goal statement and initializes execution scope.',
      model: 'system-event',
      temp: '0.0',
    },
  },
  {
    id: 'analyst',
    type: 'agentNode',
    position: { x: 120, y: 200 },
    data: {
      label: 'Analyst Agent',
      role: 'ANALYST',
      color: '#8b5cf6',
      description: 'Decomposes skill requirements, gap matrix, and difficulty benchmark.',
      model: 'claude-3-5-sonnet',
      temp: '0.2',
    },
  },
  {
    id: 'planner',
    type: 'agentNode',
    position: { x: 480, y: 200 },
    data: {
      label: 'Planner Agent',
      role: 'PLANNER',
      color: '#3b82f6',
      description: 'Synthesizes chronological multi-week task graphs with remedial buffers.',
      model: 'gpt-4o',
      temp: '0.3',
    },
  },
  {
    id: 'validator',
    type: 'agentNode',
    position: { x: 300, y: 380 },
    data: {
      label: 'Validator Agent',
      role: 'EVALUATOR',
      color: '#10b981',
      description: 'Scores technical solutions (0-100) and triggers Leitner review schedules.',
      model: 'gemini-2.5-flash',
      temp: '0.1',
    },
  },
]

const INITIAL_EDGES = [
  { id: 'e1', source: 'trigger', target: 'analyst', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e2', source: 'trigger', target: 'planner', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e3', source: 'analyst', target: 'validator', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
  { id: 'e4', source: 'planner', target: 'validator', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
]

export default function AgentBuilder() {
  const toast = useToast()
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState(null)
  const [simulating, setSimulating] = useState(false)

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  )

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node)
  }, [])

  function addCustomAgent() {
    const newId = `agent-${Date.now()}`
    const newNode = {
      id: newId,
      type: 'agentNode',
      position: { x: 300 + Math.random() * 80, y: 260 + Math.random() * 80 },
      data: {
        label: 'Custom Copilot',
        role: 'SPECIALIST',
        color: '#f59e0b',
        description: 'Autonomous tool-augmented agent specialized in system design.',
        model: 'gemini-2.5-flash',
        temp: '0.4',
      },
    }
    setNodes((nds) => [...nds, newNode])
    toast.success('Agent node spawned on canvas')
  }

  function simulatePipeline() {
    setSimulating(true)
    toast.success('Simulating neural execution flow along connected vectors...')
    setTimeout(() => {
      setSimulating(false)
      toast.success('Pipeline simulated: All agent dependencies verified')
    }, 2400)
  }

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <BrainCircuit className="h-7 w-7 text-cyan-400" />
            Visual Agent Workflow Builder
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Design, chain, and configure multi-agent deliberative graphs using drag-and-drop workflow topology.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={addCustomAgent}
            className="btn-cyber-cyan rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Agent Node
          </button>
          <button
            onClick={simulatePipeline}
            disabled={simulating}
            className="btn-cyber-primary rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${simulating ? 'animate-spin' : ''}`} />
            {simulating ? 'Deliberating…' : 'Simulate Pipeline'}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas & Inspector Split View */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* React Flow Canvas */}
        <div className="relative h-[620px] rounded-3xl cyber-glass border border-indigo-500/25 overflow-hidden shadow-2xl">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#060810]"
          >
            <Background color="#4f46e5" gap={24} size={1} />
            <Controls className="!bg-[#0c1222] !border-indigo-500/30 !rounded-xl overflow-hidden [&>button]:!border-indigo-500/20 [&>button]:!text-slate-300" />
            <MiniMap
              nodeColor={(n) => n.data?.color || '#6366f1'}
              maskColor="rgba(4, 6, 12, 0.75)"
              className="!bg-[#090d18] !border !border-indigo-500/30 !rounded-xl"
            />
          </ReactFlow>

          {/* Floating Instructions Pill */}
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-indigo-500/30 bg-[#090d18]/80 px-3.5 py-1.5 text-[11px] font-mono text-slate-400 backdrop-blur-md">
            Drag nodes to rearrange • Drag from bottom handle to link agents
          </div>
        </div>

        {/* Node Parameter Inspector Panel */}
        <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 shadow-glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-indigo-500/15 pb-3">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Node Configuration
              </h2>
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Agent Name</span>
                  <input
                    value={selectedNode.data.label}
                    onChange={(e) => {
                      const newLabel = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, label: newLabel } }
                            : n
                        )
                      )
                      setSelectedNode((s) => ({ ...s, data: { ...s.data, label: newLabel } }))
                    }}
                    className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Model Provider</span>
                  <select
                    value={selectedNode.data.model}
                    onChange={(e) => {
                      const newModel = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, model: newModel } }
                            : n
                        )
                      )
                      setSelectedNode((s) => ({ ...s, data: { ...s.data, model: newModel } }))
                    }}
                    className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
                  >
                    <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                    <option value="llama-3-3-70b">Groq Llama 3.3 70B</option>
                  </select>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Temperature ({selectedNode.data.temp})</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedNode.data.temp}
                    onChange={(e) => {
                      const newTemp = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, temp: newTemp } }
                            : n
                        )
                      )
                      setSelectedNode((s) => ({ ...s, data: { ...s.data, temp: newTemp } }))
                    }}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Agent Purpose</span>
                  <textarea
                    rows={3}
                    value={selectedNode.data.description}
                    onChange={(e) => {
                      const newDesc = e.target.value
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, description: newDesc } }
                            : n
                        )
                      )
                      setSelectedNode((s) => ({ ...s, data: { ...s.data, description: newDesc } }))
                    }}
                    className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] p-2.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Click any agent node on the canvas to inspect and tune its model hyperparameters.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-indigo-500/15">
            <span className="text-[10px] text-indigo-400 font-mono">
              WORKFLOW ENGINE: REACT FLOW v12 • CYBERNETIC PIPELINE
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
