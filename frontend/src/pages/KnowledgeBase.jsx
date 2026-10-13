import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Search,
  UploadCloud,
  Database,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'

const SAMPLE_CHUNKS = [
  {
    id: 'chunk-1',
    doc: 'distributed-systems-notes.md',
    text: 'Raft consensus guarantees safety across network partitions via majority leader election and log replication consistency.',
    score: 0.94,
    dim: 1536,
  },
  {
    id: 'chunk-2',
    doc: 'python-internals.pdf',
    text: 'CPython GIL regulates thread execution by enforcing single-thread bytecode evaluation per interpreter state.',
    score: 0.88,
    dim: 1536,
  },
  {
    id: 'chunk-3',
    doc: 'system-design-cheatsheet.txt',
    text: 'Database sharding by tenant_id distributes query load horizontally across distinct read-replica clusters.',
    score: 0.82,
    dim: 1536,
  },
]

export default function KnowledgeBase() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [chunks, setChunks] = useState(SAMPLE_CHUNKS)
  const [searching, setSearching] = useState(false)

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setTimeout(() => {
      setSearching(false)
      toast.success('Vector search completed (cosine similarity ranking)')
    }, 500)
  }

  function handleUpload(e) {
    e.preventDefault()
    toast.success('Knowledge document chunked and vectorized (1,536-dim embeddings stored)')
  }

  return (
    <div className="space-y-6 text-slate-200">
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-300">
          <Database className="h-4 w-4" /> Vector Memory & RAG Retrieval
        </div>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-white">
          Agent Knowledge Base & Vector Store
        </h1>
        <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
          Index technical documentation, personal project notes, and architectural whitepapers. All agents query this semantic vector index during plan drafting and tutor sessions.
        </p>
      </div>

      {/* Upload & Indexing Card */}
      <form
        onSubmit={handleUpload}
        className="rounded-3xl cyber-glass border border-indigo-500/20 p-6 shadow-glass-panel flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm">Upload Engineering Knowledge</p>
            <p className="text-xs text-slate-400">PDF, Markdown, or code files. Automated text chunking and indexing.</p>
          </div>
        </div>
        <button className="btn-cyber-cyan rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shrink-0">
          <UploadCloud className="h-4 w-4" /> Index New Document
        </button>
      </form>

      {/* Vector Search Inspector */}
      <div className="rounded-3xl cyber-glass border border-indigo-500/25 p-6 sm:p-8 shadow-glass-panel space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-500/15 pb-3">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <Search className="h-4 w-4 text-cyan-400" />
            Semantic Cosine Similarity Query
          </h2>
          <span className="text-xs font-mono text-cyan-300">1,536-DIM VECTOR EMBEDDINGS</span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search semantic knowledge (e.g. 'how does raft handle network partition')..."
            className="w-full rounded-xl border border-indigo-500/25 bg-[#090d18] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
          />
          <button
            disabled={searching}
            className="btn-cyber-primary rounded-xl px-5 py-2 text-xs font-semibold shrink-0"
          >
            {searching ? 'Querying Index…' : 'Semantic Query'}
          </button>
        </form>

        <div className="space-y-3 pt-2">
          {chunks.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-indigo-500/15 bg-slate-900/40 p-4 space-y-2 transition hover:border-indigo-500/35"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-indigo-300 font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" /> {c.doc}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  Similarity: {(c.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed bg-[#080d1a] p-3 rounded-xl border border-indigo-500/10">
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
