-- ==============================================================================
-- AGENT OS — DATABASE SEED DATA
-- Default Agent Templates, System Tools, and Starter Configurations
-- ==============================================================================

-- 1. Insert Production Agent Templates into public.templates
INSERT INTO public.templates (id, title, description, role, category, difficulty, skills, workflow_graph, is_public)
VALUES
(
    'ai-fullstack',
    'Full-Stack AI Application Architect',
    'Autonomous pipeline specializing in LLM tool calling, streaming RAG architectures, and reactive frontend engineering.',
    'Full-Stack AI Engineer',
    'Engineering',
    'Advanced',
    ARRAY['react', 'fastapi', 'vector-rag', 'langchain', 'typescript', 'tailwind'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Analyst Agent", "role": "ANALYST", "model": "claude-3-5-sonnet", "systemPrompt": "Analyze requirement specs and decompose into core architectural constraints."}},
            {"id": "node-2", "type": "agent", "position": {"x": 350, "y": 150}, "data": {"label": "Planner Agent", "role": "PLANNER", "model": "gpt-4o", "systemPrompt": "Generate step-by-step implementation milestones with test coverage gates."}},
            {"id": "node-3", "type": "agent", "position": {"x": 600, "y": 150}, "data": {"label": "Validator Agent", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Verify types, error boundaries, and security vulnerabilities."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true},
            {"id": "edge-2-3", "source": "node-2", "target": "node-3", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'dist-systems',
    'Distributed Systems & Backend Lead',
    'High-throughput system architecture with rigorous focus on CAP theorem trade-offs, raft consensus, and partitioned streaming.',
    'Staff Backend Engineer',
    'Infrastructure',
    'Expert',
    ARRAY['go', 'distributed-consensus', 'kafka', 'kubernetes', 'postgresql-tuning'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "System Architect", "role": "ARCHITECT", "model": "claude-3-5-sonnet", "systemPrompt": "Design data replication, partition tolerance, and load balancing topologies."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "Concurrency Validator", "role": "VALIDATOR", "model": "gpt-4o", "systemPrompt": "Analyze race conditions, deadlocks, and connection pool saturation."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'algo-master',
    'Algorithmic Rigor & Interview Specialist',
    'Focused 3-week sprint dedicated to mastering top 75 FAANG-style algorithmic patterns and spaced-repetition edge cases.',
    'Competitive Programmer & Algorithmic Specialist',
    'Education',
    'Challenging',
    ARRAY['dynamic-programming', 'graph-theory', 'sliding-window', 'trees-and-tries', 'complexity-analysis'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Pattern Analyst", "role": "ANALYST", "model": "claude-3-5-sonnet", "systemPrompt": "Identify algorithmic pattern category, invariant rules, and space-time boundaries."}},
            {"id": "node-2", "type": "agent", "position": {"x": 380, "y": 150}, "data": {"label": "Mock Interviewer", "role": "INTERVIEWER", "model": "gpt-4o", "systemPrompt": "Conduct interactive coding problem probing with edge cases."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'cloud-sre',
    'Cloud Infrastructure & SRE Architect',
    'Production-ready cloud reliability engineering, zero-downtime rolling deployments, and container orchestration.',
    'DevOps & Cloud SRE',
    'DevOps',
    'Advanced',
    ARRAY['terraform', 'kubernetes', 'aws-well-architected', 'prometheus-grafana', 'ci-cd'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Infra Auditor", "role": "AUDITOR", "model": "claude-3-5-sonnet", "systemPrompt": "Review Terraform plans and Kubernetes manifests for security & cost leaks."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "SLO Engine", "role": "PLANNER", "model": "claude-3-5-sonnet", "systemPrompt": "Compute error budgets and define Prometheus alert thresholds."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'mlops-ai',
    'MLOps & LLM Fine-Tuning Engineer',
    'Practical open-source LLM customization, parameter-efficient fine-tuning (PEFT), and high-throughput vLLM inference.',
    'Machine Learning Engineer',
    'AI & Data',
    'Advanced',
    ARRAY['pytorch', 'huggingface', 'lora-finetuning', 'vllm-serving', 'model-quantization'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Dataset Curating Agent", "role": "ANALYST", "model": "gpt-4o", "systemPrompt": "Format and validate conversational pairs for QLoRA instruction tuning."}},
            {"id": "node-2", "type": "agent", "position": {"x": 420, "y": 150}, "data": {"label": "Benchmark Validator", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Evaluate perplexity, MT-Bench scores, and catastrophic forgetting."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
),
(
    'cyber-security',
    'Application Security & Pen-Tester',
    'Deep security posture analysis, JWT/OAuth hardening, and automated vulnerability scanning protocols.',
    'Security Engineer',
    'Security',
    'Advanced',
    ARRAY['owasp-top-10', 'cryptography', 'auth-protocols', 'threat-modeling', 'container-security'],
    '{
        "nodes": [
            {"id": "node-1", "type": "agent", "position": {"x": 100, "y": 150}, "data": {"label": "Threat Modeler", "role": "AUDITOR", "model": "claude-3-5-sonnet", "systemPrompt": "Perform STRIDE analysis across all network ingresses and RPC handlers."}},
            {"id": "node-2", "type": "agent", "position": {"x": 400, "y": 150}, "data": {"label": "Security Auditor", "role": "VALIDATOR", "model": "claude-3-5-sonnet", "systemPrompt": "Scan dependencies, CORS policies, and rate limits for CVE exposures."}}
        ],
        "edges": [
            {"id": "edge-1-2", "source": "node-1", "target": "node-2", "animated": true}
        ]
    }'::jsonb,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    role = EXCLUDED.role,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    skills = EXCLUDED.skills,
    workflow_graph = EXCLUDED.workflow_graph,
    is_public = EXCLUDED.is_public;
