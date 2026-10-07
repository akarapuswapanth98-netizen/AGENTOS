"""Groq provider tests: offline, USE_MOCK_LLM toggling, fake OpenAI client (no network)."""
import httpx
import openai

import app.agents.llm as llm


class _Msg:
    def __init__(self, content: str):
        self.content = content


class _Choice:
    def __init__(self, content: str):
        self.message = _Msg(content)


class _Resp:
    def __init__(self, content: str):
        self.choices = [_Choice(content)]


class _FakeCompletions:
    """Scripted create(): each item is returned text or a raised exception."""

    def __init__(self, script: list, seen: list):
        self._script = list(script)
        self._seen = seen

    def create(self, **kwargs):
        self._seen.append(kwargs)
        item = self._script.pop(0)
        if isinstance(item, Exception):
            raise item
        return _Resp(item)


class _FakeOpenAI:
    def __init__(self, script: list, seen: list, inits: list, **kwargs):
        inits.append(kwargs)
        self.chat = type("Chat", (), {"completions": _FakeCompletions(script, seen)})()


def _rate_limit() -> openai.RateLimitError:
    """Build a real 429 error object without touching the network."""
    req = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    return openai.RateLimitError("rate limited", response=httpx.Response(429, request=req), body={})


def _patch(monkeypatch, script: list, seen: list, inits: list, provider: str = "groq"):
    """Route llm.py at the fake client with real (non-mock) mode on."""
    monkeypatch.setattr(llm, "USE_MOCK_LLM", False)
    monkeypatch.setattr(llm, "LLM_PROVIDER", provider)
    monkeypatch.setattr(llm, "OpenAI", lambda **kw: _FakeOpenAI(script, seen, inits, **kw))
    monkeypatch.setattr(llm.time, "sleep", lambda s: seen.append(("slept", s)))


def test_groq_mock_mode_needs_no_client(monkeypatch):
    """With USE_MOCK_LLM=true the Groq client is never constructed."""
    monkeypatch.setattr(llm, "USE_MOCK_LLM", True)
    monkeypatch.setattr(llm, "LLM_PROVIDER", "groq")
    out = llm.call_llm_json("sys", "user", agent="analyst", fallback_context={"skills": ["python"]})
    assert out["current_level"] == {"python": 50}


def test_groq_success_uses_json_mode(monkeypatch):
    """Groq path sends response_format json_object to the Groq base URL."""
    seen, inits = [], []
    _patch(monkeypatch, ['{"score": 90}'], seen, inits)
    assert llm.call_llm_json("sys", "user", agent="generic") == {"score": 90}
    assert inits[0]["base_url"] == "https://api.groq.com/openai/v1"
    assert seen[0]["response_format"] == {"type": "json_object"}
    assert seen[0]["model"] == llm.GROQ_MODEL_NAME
    assert seen[0]["max_tokens"] == llm.GROQ_MAX_TOKENS


def test_groq_repair_retry_strips_fences(monkeypatch):
    """Bad JSON triggers one repair call; fenced JSON still parses."""
    seen, inits = [], []
    _patch(monkeypatch, ["not json at all", '```json\n{"ok": true}\n```'], seen, inits)
    assert llm.call_llm_json("sys", "user", agent="generic") == {"ok": True}
    assert len([s for s in seen if isinstance(s, dict)]) == 2


def test_groq_429_retries_once_then_mock(monkeypatch):
    """Persistent 429s: one short wait, one retry, then the per-agent mock."""
    seen, inits = [], []
    _patch(monkeypatch, [_rate_limit(), _rate_limit()], seen, inits)
    out = llm.call_llm_json("sys", "user", agent="validator", fallback_context={"answer_text": "hi"})
    assert out["score"] == 10  # short-answer mock fallback
    assert ("slept", llm.GROQ_RETRY_DELAY_S) in seen
    assert len([s for s in seen if isinstance(s, dict)]) == 2
