"""Validator score-schema tests (offline: monkeypatched LLM, no network)."""
import pytest

import app.agents.validator as validator_mod
from app.agents.validator import ScoreSchemaError, run_validator
from app.models import Task

LONG_ANSWER = ("This is a sufficiently long answer with more than five words "
               "and well over thirty characters for the validator to score.")


def _task() -> Task:
    """Unsaved task with the fields run_validator reads."""
    return Task(id=1, goal_id=1, title="Loop basics", description="Write a loop.",
                skill="python", week=1, order=1)


def _fake(responses: list, calls: list):
    """Fake call_llm_json popping one scripted response per call."""
    def _call(system, user, agent="validator", fallback_context=None, user_id=None):
        calls.append(user)
        return dict(responses.pop(0))
    return _call


def _good(score):
    return {"score": score, "breakdown": {}, "missing": [], "strengths": [], "recommendation": ""}


def test_hundred_scale_score_accepted(monkeypatch):
    """A proper 0-100 integer score passes through with a single LLM call."""
    calls = []
    monkeypatch.setattr(validator_mod, "call_llm_json", _fake([_good(85)], calls))
    assert run_validator(_task(), LONG_ANSWER)["score"] == 85
    assert len(calls) == 1


def test_out_of_range_score_triggers_retry(monkeypatch):
    """150 is rejected, the correction retry runs, and 80 is accepted."""
    calls = []
    monkeypatch.setattr(validator_mod, "call_llm_json", _fake([_good(150), _good(80)], calls))
    assert run_validator(_task(), LONG_ANSWER)["score"] == 80
    assert len(calls) == 2
    assert "Correction" in calls[1]


def test_persistent_bad_score_raises_schema_error(monkeypatch):
    """Two off-scale scores raise instead of being silently rescaled."""
    calls = []
    monkeypatch.setattr(validator_mod, "call_llm_json",
                        _fake([_good(150), {"score": "excellent"}], calls))
    with pytest.raises(ScoreSchemaError):
        run_validator(_task(), LONG_ANSWER)
    assert len(calls) == 2


def test_bool_and_fraction_rejected_then_recovered(monkeypatch):
    """True and 8.5 are not valid scores; a good retry value is accepted."""
    calls = []
    monkeypatch.setattr(validator_mod, "call_llm_json", _fake([_good(True), _good(90)], calls))
    assert run_validator(_task(), LONG_ANSWER)["score"] == 90
    assert len(calls) == 2


def test_short_answer_fast_path_scores_ten_without_llm(monkeypatch):
    """Answers under 30 chars score 10 via the fast path (no LLM call)."""
    def _boom(*args, **kwargs):
        raise AssertionError("LLM must not be called for short answers")

    monkeypatch.setattr(validator_mod, "call_llm_json", _boom)
    out = run_validator(_task(), "idk")
    assert out["score"] == 10
