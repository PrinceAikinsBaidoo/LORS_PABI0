"""Snwolley Hackathon 2026 API client — Agents + TTS."""
from __future__ import annotations

import os
from typing import Any

import httpx

AGENTS_URL = "https://v1.snwolley.ai/v1/chat/completions"
TTS_URL = "https://v1.snwolley.ai/api/v1/hackathon/tts"


def _signal_prompt(signal: dict[str, Any]) -> str:
    inst = signal.get("instrument", "XAUUSD")
    labels = {"XAUUSD": "Gold", "BTCUSD": "Bitcoin", "NZDUSD": "NZD/USD"}
    label = labels.get(inst, inst)
    return (
        "You are PipSense, a trading assistant for beginner Ghanaian traders.\n"
        f"A signal just fired on {label} ({inst}).\n"
        f"Signal type: {signal.get('type', '')}\n"
        f"Direction: {signal.get('direction', '')}\n"
        f"Entry: {signal.get('entry', '')}\n"
        f"Stop Loss: {signal.get('sl', '')}\n"
        f"TP1: {signal.get('tp1', '')}, TP2: {signal.get('tp2', '')}, "
        f"TP3: {signal.get('tp3', '')}\n\n"
        "Explain in 2-3 simple sentences why this signal fired and what it means. "
        "Use plain English. No jargon. The reader is a complete beginner."
    )


class SnwolleyClient:
    def __init__(
        self,
        hackathon_api_key: str | None = None,
        agent_api_key: str | None = None,
        agent_id: str | None = None,
    ):
        self.hackathon_key = hackathon_api_key or os.getenv("SNWOLLEY_HACKATHON_API_KEY", "")
        self.agent_key = agent_api_key or os.getenv("SNWOLLEY_AGENT_API_KEY", "")
        self.agent_id = agent_id or os.getenv("SNWOLLEY_AGENT_ID", "107")

    @property
    def agents_configured(self) -> bool:
        return bool(self.agent_key)

    @property
    def tts_configured(self) -> bool:
        return bool(self.hackathon_key)

    def chat_with_agent(
        self,
        message: str,
        chat_id: str | None = None,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        if not self.agent_key:
            raise ValueError("SNWOLLEY_AGENT_API_KEY is not set")

        payload = {
            "message": message,
            "agent": str(self.agent_id),
            "stream": False,
            "chat_id": chat_id,
        }
        with httpx.Client(timeout=timeout) as client:
            res = client.post(
                AGENTS_URL,
                headers={"X-API-Key": self.agent_key, "Content-Type": "application/json"},
                json=payload,
            )
            res.raise_for_status()
            data = res.json()

        if data.get("error"):
            raise RuntimeError(data["error"])
        return data

    def explain_signal(
        self,
        signal: dict[str, Any],
        chat_id: str | None = None,
    ) -> tuple[str, str | None]:
        data = self.chat_with_agent(_signal_prompt(signal), chat_id=chat_id)
        content = (data.get("content") or "").strip()
        if not content:
            raise RuntimeError("Empty response from Agents API")
        return content, data.get("chat_id")

    def text_to_speech(self, text: str, timeout: float = 45.0) -> bytes:
        if not self.hackathon_key:
            raise ValueError("SNWOLLEY_HACKATHON_API_KEY is not set")

        with httpx.Client(timeout=timeout) as client:
            res = client.post(
                TTS_URL,
                headers={"X-API-Key": self.hackathon_key, "Content-Type": "application/json"},
                json={"text": text},
            )
            res.raise_for_status()

        content_type = res.headers.get("content-type", "")
        if "json" in content_type:
            data = res.json()
            if data.get("error"):
                raise RuntimeError(data["error"])
            raise RuntimeError("Unexpected JSON response from TTS endpoint")

        return res.content
