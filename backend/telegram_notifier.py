"""Telegram Bot API — signal alerts to channel/group."""
from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

from instruments import instrument_label

logger = logging.getLogger("pipsense")

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
_ENV_PATH = Path(__file__).parent / ".env"


def _reload_env() -> None:
    load_dotenv(_ENV_PATH, override=True)


def _chat_id() -> str:
    _reload_env()
    raw = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not raw:
        raise ValueError("TELEGRAM_CHAT_ID is not set")
    if raw.lstrip("-").isdigit():
        return raw
    if not raw.startswith("@"):
        raw = f"@{raw}"
    if raw.lower().endswith("bot"):
        raise ValueError(
            f"TELEGRAM_CHAT_ID is {raw} (a bot). Use your channel @pipsensei0 instead."
        )
    return raw


def _bot_token() -> str:
    _reload_env()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set")
    return token


def is_configured() -> bool:
    try:
        _bot_token()
        _chat_id()
        return True
    except ValueError:
        return False


def format_signal_message(signal: dict[str, Any], explanation: str = "", demo: bool = False) -> str:
    direction = signal.get("direction", "BUY")
    instrument = signal.get("instrument", "XAUUSD")
    emoji = "🟢" if direction == "BUY" else "🔴"
    label = instrument_label(instrument).upper()
    prefix = "🧪 DEMO — " if demo else ""

    time_str = ""
    if signal.get("time"):
        try:
            dt = datetime.fromisoformat(signal["time"])
            h = dt.hour % 12 or 12
            ampm = "AM" if dt.hour < 12 else "PM"
            time_str = f"{h}:{dt.minute:02d} {ampm} GMT"
        except ValueError:
            time_str = signal["time"]

    risk = signal.get("risk_pips", "—")
    lines = [
        f"{prefix}{emoji} {direction} {label} ({instrument})",
        "━━━━━━━━━━━━━━━",
        f"📍 Entry     : {signal.get('entry', '—')}",
        f"🛑 Stop Loss : {signal.get('sl', '—')}",
        f"🎯 TP1       : {signal.get('tp1', '—')}",
        f"🎯 TP2       : {signal.get('tp2', '—')}",
        f"🎯 TP3       : {signal.get('tp3', '—')}",
        "━━━━━━━━━━━━━━━",
        f"📊 Type      : {signal.get('type', '—')}",
        f"⚡ Risk      : {risk} pips",
        f"🕖 Time      : {time_str or '—'}",
    ]

    if explanation:
        lines.extend([
            "━━━━━━━━━━━━━━━",
            f"💡 {explanation.strip()}",
        ])

    lines.extend([
        "━━━━━━━━━━━━━━━",
        "PipSense 🇬🇭 | Trade Smart",
    ])
    return "\n".join(lines)


def send_message(text: str, parse_mode: str | None = None) -> dict[str, Any]:
    token = _bot_token()
    chat_id = _chat_id()

    payload: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode

    url = TELEGRAM_API.format(token=token)
    with httpx.Client(timeout=20.0) as client:
        res = client.post(url, json=payload)
        data = res.json()

    if not data.get("ok"):
        desc = data.get("description", res.text)
        logger.error("Telegram send failed (chat=%s): %s", chat_id, desc)
        raise RuntimeError(desc)

    logger.info("Telegram message sent to %s", chat_id)
    return data


def notify_signal(signal: dict[str, Any], explanation: str = "", demo: bool = False) -> dict[str, Any]:
    text = format_signal_message(signal, explanation, demo=demo)
    return send_message(text)
