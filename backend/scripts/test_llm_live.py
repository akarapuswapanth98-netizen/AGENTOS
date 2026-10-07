"""Live LLM smoke test for AGENTOS. The runner executes this, not pytest.

Usage (from backend/):  python scripts/test_llm_live.py

Reads config only through app.config. Makes REAL provider calls (no mocks),
so it needs a valid key and USE_MOCK_LLM=false. Never prints the API key,
any part of it, or request headers -- only exception types and statuses.
Exit code 0 means ALL PASS, 1 means something failed.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.config as config  # noqa: E402  (after sys.path bootstrap)
import app.agents.llm as llm_mod  # noqa: E402  (counters + failure reason)
from app.agents.llm import call_llm_json_live  # noqa: E402
from app.agents.planner import run_planner  # noqa: E402
from app.agents.validator import run_validator  # noqa: E402
from app.database import Base  # noqa: E402

WEAK_VAGUE_ANSWER = "It is when the model is bad and does not work well, I think."

FIXED_TASK_TITLE = "Learn supervised learning fundamentals"
FIXED_TASK_DESCRIPTION = (
    "Study linear regression, classification, and evaluation metrics "
    "such as MAE, RMSE, and F1-score."
)
STRONG_ANSWER = (
    "Supervised learning trains a model on labeled examples, meaning inputs X with known targets y, "
    "so it can predict y for new data. "
    "Regression predicts a continuous value such as house price and is evaluated with MAE or RMSE. "
    "Classification predicts a category such as spam or not spam and is evaluated with accuracy, precision, "
    "recall and F1-score. "
    "For example, on imbalanced fraud data 99% accuracy can be meaningless, so recall or F1 on the fraud class "
    "is more informative. "
    "I split the data into train and test sets, or use cross-validation, because a large gap between training "
    "and test error signals overfitting, and regularization or a simpler model helps reduce it."
)


def _fixed_task():
    """Hand-written task so all three validator scores are comparable."""
    import app.models

    return app.models.Task(
        id=1, goal_id=1, title=FIXED_TASK_TITLE, description=FIXED_TASK_DESCRIPTION,
        skill="machine learning", week=1, order=1,
    )


def main() -> int:
    """Run every check, print each result plus a final summary line."""
    results: dict[str, str] = {}
    if not check_config():
        print("FAILED: config (fix .env first; other checks skipped)")
        return 1
    results["raw-call"] = "PASS" if check_raw_call() else "FAIL"
    plan_ok, _ = check_plan()
    results["plan"] = "PASS" if plan_ok else "FAIL"
    results["validator"] = "PASS" if check_validator() else "FAIL"

    for name, status in results.items():
        print(f"result: {name}={status}")
    failed = [name for name, status in results.items() if status == "FAIL"]
    if failed:
        print(f"FAILED: {', '.join(failed)}")
        return 1
    print("ALL PASS")
    return 0


def check_config() -> bool:
    """Check 1: provider, mock flag, model name, key presence (boolean only)."""
    provider = (config.LLM_PROVIDER or "anthropic").strip().lower()
    model = config.GROQ_MODEL_NAME if provider == "groq" else config.MODEL_NAME
    key = config.GROQ_API_KEY if provider == "groq" else config.ANTHROPIC_API_KEY
    print(f"[config] provider={provider} mock={config.USE_MOCK_LLM} model={model} key={'set' if key else 'missing'}")
    if config.USE_MOCK_LLM or not key:
        print("FAIL: mock mode or missing key")
        return False
    print("PASS: config")
    return True


def check_raw_call() -> bool:
    """Check 2: real provider call (no mock fallback) returning parseable JSON."""
    try:
        out = call_llm_json_live(
            "You are a test helper.",
            'Reply with exactly this JSON object: {"ok": true}',
            agent="smoke",
        )
    except Exception as exc:  # noqa: BLE001 - report type/status only, never secrets
        print(f"FAIL: raw call raised {type(exc).__name__} status={getattr(exc, 'status_code', None)}")
        return False
    if isinstance(out, dict):
        print(f"PASS: raw call keys={sorted(out)}")
        return True
    print("FAIL: raw call did not return a JSON object")
    return False


def check_plan():
    """Check 3: real Planner run for a sample goal. Returns (ok, first task or None)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    import app.models  # noqa: F401 - register tables on Base

    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()
    live_before, mock_before = llm_mod.live_call_success_count, llm_mod.mock_fallback_count
    try:
        user = app.models.User(name="Smoke", email="smoke@test.dev", password_hash="x")
        db.add(user)
        db.commit()
        goal = app.models.Goal(user_id=user.id, title="AI/ML Intern prep", target_role="AI/ML Intern",
                               timeline_days=30, current_skills=["Python"], status="active")
        db.add(goal)
        db.commit()
        db.refresh(goal)
        tasks = run_planner(db, goal, {"gaps": ["ML fundamentals", "statistics"]})
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: planner raised {type(exc).__name__} status={getattr(exc, 'status_code', None)}")
        return False, None
    # Counter-based verdict: real iff live successes grew and no mock was served.
    real = (llm_mod.live_call_success_count > live_before
            and llm_mod.mock_fallback_count == mock_before)
    n = len(tasks)
    ok = 10 <= n <= 16 and real
    print(f"PASS: planner tasks={n} source={'real' if real else 'mock fallback'}" if ok
          else f"FAIL: planner tasks={n} source={'real' if real else 'mock fallback'}")
    for t in tasks:
        print(f"  - {t.title}")
    if not real:
        reason = llm_mod.last_llm_failure or {}
        print(f"fallback reason: {reason.get('category', 'none recorded')} "
              f"({reason.get('type', 'none recorded')}, status {reason.get('status', 'none')})")
    return ok, (tasks[0] if ok else None)


def check_validator() -> bool:
    """Check 4: strong answer scores >=25 above the best weak score (all live)."""
    task = _fixed_task()
    print(f"task: {task.title}")
    print(f"description: {task.description}")
    print(f"strong answer: {STRONG_ANSWER}")
    try:
        weak_fast = run_validator(task, "idk")
        weak = run_validator(task, WEAK_VAGUE_ANSWER)
        live_before, mock_before = llm_mod.live_call_success_count, llm_mod.mock_fallback_count
        strong = run_validator(task, STRONG_ANSWER)
        live_after, mock_after = llm_mod.live_call_success_count, llm_mod.mock_fallback_count
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: validator raised {type(exc).__name__} status={getattr(exc, 'status_code', None)}")
        return False
    wf, wv, ss = (int(weak_fast.get("score", 0)), int(weak.get("score", 0)), int(strong.get("score", 0)))
    print(f"validator weak_fast={wf} weak_vague={wv} strong={ss}")
    print(f"strong call: live_calls_increased={live_after > live_before} "
          f"mock_unchanged={mock_after == mock_before}")
    best_weak = max(wf, wv)
    if ss - best_weak >= 25:
        print("PASS: validator spread")
        return True
    print("FAIL: strong answer not at least 25 points above the best weak answer")
    return False


if __name__ == "__main__":
    raise SystemExit(main())
