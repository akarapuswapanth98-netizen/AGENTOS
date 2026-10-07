"""LLM robustness tests: 404 guidance message + Groq max_tokens (offline, no network)."""
import logging

import httpx
import openai
import pytest

import app.agents.llm as llm


class _Resp:
    def __init__(self, content: str):
        self.choices = [type("C", (), {"message": type("M", (), {"content": content})()})()]


class _FakeCompletions:
    def __init__(self, script: list, seen: list):
        self._script = list(script)
        self._seen = seen

    def create(self, **kwargs):
        self._seen.append(kwargs)
        item = self._script.pop(0)
        if isinstance(item, Exception):
            raise item
        return _Resp(item)


def _fake_openai(script: list, seen: list, **kwargs):
    return type("Fake", (), {"chat": type("Chat", (), {"completions": _FakeCompletions(script, seen)})()})()


def _make_fake(script: list):
    """Build an OpenAI replacement consuming the given script (late binding safe)."""
    def _factory(**kwargs):
        return _fake_openai(list(script), [])
    return _factory


def _not_found() -> openai.NotFoundError:
    """Build a real 404 error object without touching the network."""
    req = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    return openai.NotFoundError("model not found", response=httpx.Response(404, request=req), body={})


@pytest.fixture
def groq_mode(monkeypatch):
    """Real (non-mock) Groq mode with a fake client and a sentinel key value."""
    monkeypatch.setattr(llm, "USE_MOCK_LLM", False)
    monkeypatch.setattr(llm, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(llm, "GROQ_API_KEY", "sk-sentinel-secret-never-logged")
    return monkeypatch


def test_groq_404_logs_guidance_and_falls_back_to_mock(groq_mode, monkeypatch, caplog):
    """A 404 logs the model-fix message (no secrets) and the app still gets a mock."""
    seen = []
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai([_not_found()], seen))
    with caplog.at_level(logging.WARNING, logger="app.agents.llm"):
        out = llm.call_llm_json("sys", "user", agent="analyst", fallback_context={"skills": ["python"]})
    assert out["current_level"] == {"python": 50}  # normal path keeps mock fallback
    text = caplog.text
    assert "Model not found" in text
    assert "GROQ_MODEL_NAME" in text
    assert "sk-sentinel-secret-never-logged" not in text


def test_groq_live_raises_404_without_mock(groq_mode, monkeypatch):
    """The live-only path raises the 404 instead of hiding it behind a mock."""
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai([_not_found()], []))
    with pytest.raises(openai.NotFoundError):
        llm.call_llm_json_live("sys", "user", agent="generic")


def test_groq_uses_configured_max_tokens(groq_mode, monkeypatch):
    """Groq requests carry GROQ_MAX_TOKENS, independent of the Anthropic limit."""
    monkeypatch.setattr(llm, "GROQ_MAX_TOKENS", 4321)
    seen = []
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai(['{"ok": true}'], seen))
    assert llm.call_llm_json("sys", "user", agent="generic") == {"ok": True}
    assert seen[0]["max_tokens"] == 4321
    assert llm.MAX_TOKENS == 2000  # Anthropic path untouched


def _api_error(status: int, cls_name: str = "InternalServerError"):
    """Build a real openai API error object without touching the network."""
    req = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    cls = getattr(openai, cls_name)
    return cls("boom", response=httpx.Response(status, request=req), body={})


def _timeout_error() -> openai.APITimeoutError:
    """Build a real timeout error object without touching the network."""
    return openai.APITimeoutError(httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"))


def test_failure_reason_categories(groq_mode, monkeypatch):
    """Fallbacks store category/type/status for timeouts, 429s, bad JSON, HTTP, junk."""
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)  # no real waiting on 429 retry
    cases = [
        ([_timeout_error()], "timeout", "APITimeoutError", None),
        ([_api_error(429, "RateLimitError"), _api_error(429, "RateLimitError")], "rate_limit", "RateLimitError", 429),
        (["garbage", "still garbage"], "invalid_json", "ValueError", None),
        ([_api_error(500)], "http_error", "InternalServerError", 500),
        ([RuntimeError("weird")], "schema", "RuntimeError", None),
    ]
    for script, category, exc_type, status in cases:
        monkeypatch.setattr(llm, "OpenAI", _make_fake(script))
        out = llm.call_llm_json("sys", "user", agent="generic")
        assert out == {"ok": True}  # fallback still works
        reason = llm.last_llm_failure
        assert reason == {"category": category, "type": exc_type, "status": status}, script


def test_groq_timeout_setting_reaches_client(groq_mode, monkeypatch):
    """The Groq client is built with GROQ_TIMEOUT_SECONDS, not the shared 30s."""
    monkeypatch.setattr(llm, "GROQ_TIMEOUT_SECONDS", 91)
    inits = []
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: (inits.append(kw), _fake_openai(['{"ok": true}'], []))[1])
    llm.call_llm_json("sys", "user", agent="generic")
    assert inits[0]["timeout"] == 91


def test_groq_reasoning_effort_sent_when_configured(groq_mode, monkeypatch):
    """reasoning_effort rides along when set, and is omitted when blank."""
    seen = []
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai(['{"ok": true}'] * 2, seen))
    monkeypatch.setattr(llm, "GROQ_REASONING_EFFORT", "low")
    llm.call_llm_json("sys", "user", agent="generic")
    assert seen[0]["reasoning_effort"] == "low"
    monkeypatch.setattr(llm, "GROQ_REASONING_EFFORT", "")
    llm.call_llm_json("sys", "user", agent="generic")
    assert "reasoning_effort" not in seen[1]


def _deltas():
    """Snapshot both counters."""
    return llm.live_call_success_count, llm.mock_fallback_count


def test_counters_track_real_calls(groq_mode, monkeypatch):
    """A successful real call bumps live successes only."""
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai(['{"ok": true}'], []))
    before = _deltas()
    assert llm.call_llm_json_live("sys", "user", agent="generic") == {"ok": True}
    live, mock = _deltas()
    assert (live - before[0], mock - before[1]) == (1, 0)


def test_counters_track_mock_mode(monkeypatch):
    """Mock mode bumps mock fallbacks only (no provider touched)."""
    monkeypatch.setattr(llm, "USE_MOCK_LLM", True)
    before = _deltas()
    out = llm.call_llm_json("sys", "user", agent="analyst", fallback_context={"skills": ["python"]})
    assert out["current_level"] == {"python": 50}
    live, mock = _deltas()
    assert (live - before[0], mock - before[1]) == (0, 1)


def test_counters_track_fallback_on_error(groq_mode, monkeypatch):
    """A failed real call bumps mock fallbacks only, and records a reason."""
    monkeypatch.setattr(llm.time, "sleep", lambda s: None)
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _fake_openai([_timeout_error()], []))
    before = _deltas()
    assert llm.call_llm_json("sys", "user", agent="generic") == {"ok": True}
    live, mock = _deltas()
    assert (live - before[0], mock - before[1]) == (0, 1)
    assert llm.last_llm_failure["category"] == "timeout"
