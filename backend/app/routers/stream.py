"""Server-Sent Events (SSE) router for live agent telemetry and execution streaming."""
import asyncio
import json
import time
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AgentTrace, Goal

router = APIRouter(prefix="/stream", tags=["stream"])


async def event_generator(goal_id: int | None, db: Session) -> AsyncGenerator[str, None]:
    """Yield simulated real-time SSE events for live agent execution."""
    # Initial handshake
    yield f"event: connected\ndata: {json.dumps({'status': 'connected', 'timestamp': time.time()})}\n\n"
    await asyncio.sleep(0.3)

    steps = [
        {"agent": "orchestrator", "phase": "init", "message": "Neural Core activated. Loading user context and active goal parameters."},
        {"agent": "analyst", "phase": "skill_graph", "message": "Parsing role requirements. Identifying core and peripheral technical vectors."},
        {"agent": "analyst", "phase": "gap_matrix", "message": "Evaluating skill deficit against senior engineering benchmarks."},
        {"agent": "planner", "phase": "scheduling", "message": "Decomposing objectives into week-by-week actionable milestones."},
        {"agent": "planner", "phase": "task_graph", "message": "Synthesizing practice exercises, mini-projects, and review checkpoints."},
        {"agent": "validator", "phase": "rubrics", "message": "Establishing strict evaluation rubrics and remedial thresholds."},
        {"agent": "orchestrator", "phase": "complete", "message": "Autonomous deliberation complete. Plan persisted to database."},
    ]

    for i, step in enumerate(steps):
        event_payload = {
            "step": i + 1,
            "total_steps": len(steps),
            "agent": step["agent"],
            "phase": step["phase"],
            "message": step["message"],
            "timestamp": time.time(),
            "telemetry": {
                "active_agents": 4,
                "tokens_processed": (i + 1) * 342,
                "latency_ms": 45 + (i * 12),
                "memory_vectors": 128 + (i * 32),
            },
        }
        yield f"event: agent_event\ndata: {json.dumps(event_payload)}\n\n"
        await asyncio.sleep(0.7)

    yield f"event: done\ndata: {json.dumps({'status': 'done', 'timestamp': time.time()})}\n\n"


@router.get("/agent-events")
async def stream_agent_events(
    goal_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Stream real-time SSE agent deliberative events and telemetry."""
    return StreamingResponse(
        event_generator(goal_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
