from typing import Any

import numpy as np

from .base import BaseGenerator

# ---------------------------------------------------------------------------
# Static name/domain pools
# ---------------------------------------------------------------------------

_FIRST_NAMES = [
    "alice", "bob", "carol", "david", "eve", "frank", "grace", "henry",
    "iris", "jack", "karen", "liam", "mia", "noah", "olivia", "peter",
    "quinn", "rachel", "sam", "tara", "uma", "victor", "wendy", "xander",
    "yara", "zoe",
]

_LAST_NAMES = [
    "smith", "jones", "williams", "brown", "davis", "miller", "wilson",
    "moore", "taylor", "anderson", "thomas", "jackson", "white", "harris",
    "martin", "thompson", "garcia", "martinez", "robinson", "clark",
]

_DOMAINS = [
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "example.com",
    "mail.com", "protonmail.com", "icloud.com", "company.io", "work.net",
]


class EmailGenerator(BaseGenerator):
    """Generates emails in firstname.lastname@domain pattern."""

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[str]:
        rng = np.random.default_rng(seed)
        first_idx = rng.integers(0, len(_FIRST_NAMES), n_rows)
        last_idx = rng.integers(0, len(_LAST_NAMES), n_rows)
        domain_idx = rng.integers(0, len(_DOMAINS), n_rows)
        return [
            f"{_FIRST_NAMES[fi]}.{_LAST_NAMES[li]}@{_DOMAINS[di]}"
            for fi, li, di in zip(first_idx, last_idx, domain_idx)
        ]


class PhoneGenerator(BaseGenerator):
    """Generates US phone numbers in (555) NXX-XXXX format."""

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def generate(self, n_rows: int, seed: int | None = None) -> list[str]:
        rng = np.random.default_rng(seed)
        # area codes: 200-999 (avoid 0xx / 1xx)
        area = rng.integers(200, 1000, n_rows)
        # exchange: 200-999
        exchange = rng.integers(200, 1000, n_rows)
        # subscriber: 0000-9999
        subscriber = rng.integers(0, 10000, n_rows)
        return [
            f"({a:03d}) {e:03d}-{s:04d}"
            for a, e, s in zip(area, exchange, subscriber)
        ]


class OllamaGenerator(BaseGenerator):
    """
    Calls Ollama's local API (http://localhost:11434/api/generate) with
    model=llama3.2 and a prompt taken from constraints["prompt"].

    Falls back to "AI_GENERATED_TEXT_{i}" if Ollama is unreachable or
    any connection error occurs.

    Constraints:
        prompt (str) — the prompt template to send to Ollama (required)
        model  (str) — Ollama model name, default "llama3.2"
    """

    _OLLAMA_URL = "http://localhost:11434/api/generate"

    def __init__(self, constraints: dict[str, Any] | None = None) -> None:
        self.constraints = constraints or {}

    def _call_ollama(self, prompt: str, model: str) -> str:
        import json
        import urllib.request

        payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode()
        req = urllib.request.Request(
            self._OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
            return body.get("response", "").strip()

    def generate(self, n_rows: int, seed: int | None = None) -> list[str]:
        prompt_template = self.constraints.get("prompt", "Generate a short text.")
        model = self.constraints.get("model", "llama3.2")
        results: list[str] = []

        for i in range(n_rows):
            try:
                text = self._call_ollama(prompt_template, model)
                results.append(text if text else f"AI_GENERATED_TEXT_{i}")
            except Exception:
                results.append(f"AI_GENERATED_TEXT_{i}")

        return results
