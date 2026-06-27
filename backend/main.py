import base64
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from market_data import (
    bars_to_candles,
    fetch_live_price,
    get_day_candles,
    prefetch_recent,
    recent_trading_dates,
    replay_date_default,
    REPLAY_DAYS,
)
from signal_engine import run_engine, signal_to_dict
from snwolley_client import SnwolleyClient
from instruments import INSTRUMENTS, instrument_label
from trade_outcomes import enrich_signal_dict
from telegram_notifier import is_configured as telegram_configured, notify_signal, send_message

load_dotenv()

logger = logging.getLogger("pipsense")

app = FastAPI(title="PipSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

snwolley = SnwolleyClient()


@app.on_event("startup")
def startup():
    from demo_data import ensure_demo_data

    ensure_demo_data()
    prefetch_recent()


def _load_candles(instrument: str, date: str) -> list:
    try:
        bars = get_day_candles(instrument, date)
        return bars_to_candles(bars)
    except Exception as exc:
        logger.error("Failed to load %s %s: %s", instrument, date, exc)
        raise HTTPException(404, f"No market data for {instrument} on {date}") from exc


def _fallback_explanation(signal: dict) -> str:
    t = signal.get("type", "")
    d = signal.get("direction", "")
    if "Sweep Low" in t:
        return (
            "Price swept below the London Low and closed back inside the range. "
            "Buyers defended the level — expect an upward move."
        )
    if "Sweep High" in t:
        return (
            "Price swept above the London High but closed back inside. "
            "This fake breakout often reverses downward."
        )
    if "Breakout High" in t:
        return (
            "Price broke and closed above the London High with momentum. "
            f"A {d} signal suggests continuation higher."
        )
    return (
        "Price broke below the London Low and closed outside the range. "
        f"A {d} signal suggests continuation lower."
    )


class ExplainRequest(BaseModel):
    instrument: str = "XAUUSD"
    direction: str = "BUY"
    type: str = "Sweep Low"
    entry: float = 0
    sl: float = 0
    tp1: float = 0
    tp2: float = 0
    tp3: float = 0


class VoiceRequest(BaseModel):
    text: str


class ReplayRequest(BaseModel):
    instrument: str = "XAUUSD"
    date: str | None = None


class TelegramNotifyRequest(BaseModel):
    instrument: str = "XAUUSD"
    direction: str = "BUY"
    type: str = "Sweep Low"
    entry: float = 0
    sl: float = 0
    tp1: float = 0
    tp2: float = 0
    tp3: float = 0
    time: str = ""
    risk_pips: float = 0
    explanation: str = ""
    demo: bool = False


def _explain_signal(signal: dict) -> str:
    if snwolley.agents_configured:
        try:
            explanation, _ = snwolley.explain_signal(signal)
            return explanation
        except Exception as exc:
            logger.warning("Snwolley Agents API failed: %s", exc)
    return _fallback_explanation(signal)


def _london_candle(candles):
    return next((c for c in candles if c.time.hour == 7 and c.time.minute == 0), None)


def _run_day(instrument: str, date: str) -> dict:
    candles = _load_candles(instrument, date)
    signals, state = run_engine(candles, instrument=instrument)
    london = _london_candle(candles)
    last = candles[-1]
    sig_dicts = [signal_to_dict(s) for s in signals]
    enriched = []
    for s in sig_dicts:
        s["explanation"] = _fallback_explanation(s)
        enriched.append(enrich_signal_dict(s, candles))
    sig_dicts = enriched

    perfect = sum(1 for s in sig_dicts if s.get("is_perfect"))
    wins = sum(1 for s in sig_dicts if s.get("grade") in ("perfect", "good", "partial"))
    losses = sum(1 for s in sig_dicts if s.get("grade") == "loss")

    return {
        "instrument": instrument,
        "date": date,
        "data_source": "twelve_data",
        "range": {
            "high": london.high if london else None,
            "low": london.low if london else None,
            "close": last.close,
        },
        "signals": sig_dicts,
        "stats": {
            "tradesToday": state.daily_trades,
            "maxTrades": 6,
            "consecLoss": state.consec_loss,
            "maxConsec": 4,
            "halted": state.halted,
            "perfectSignals": perfect,
            "wins": wins,
            "losses": losses,
            "winRate": round(wins / len(sig_dicts) * 100) if sig_dicts else 0,
        },
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "pipsense",
        "data_source": "twelve_data" if os.getenv("TWELVE_DATA_API_KEY") else "none",
        "replay_default": replay_date_default(),
        "snwolley": {
            "agents": snwolley.agents_configured,
            "tts": snwolley.tts_configured,
        },
        "telegram": telegram_configured(),
    }


@app.get("/signal/current")
def current_signal(instrument: str = Query("XAUUSD")):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        result = _run_day(instrument, today)
    except HTTPException:
        result = _run_day(instrument, replay_date_default())
        result["session_status"] = "Replay — today's data unavailable"
    else:
        result["session_status"] = (
            "Halted" if result["stats"]["halted"] else "London Session Active"
        )

    sig = result["signals"][-1] if result["signals"] else None
    explanation = _explain_signal(sig) if sig else None
    return {
        "signal": sig,
        "explanation": explanation,
        "session_status": result.get("session_status", "London Session Active"),
        "stats": result["stats"],
        "data_source": result["data_source"],
    }


@app.get("/signal/history")
def signal_history(instrument: str | None = None):
    all_sigs = []
    for inst in INSTRUMENTS:
        if instrument and inst != instrument:
            continue
        for date_str in recent_trading_dates(REPLAY_DAYS):
            try:
                result = _run_day(inst, date_str)
                for s in result["signals"]:
                    s["date"] = date_str
                    all_sigs.append(s)
            except HTTPException:
                continue
    return sorted(all_sigs, key=lambda x: x["time"], reverse=True)[:50]


@app.get("/range/today")
def today_range(instrument: str = Query("XAUUSD")):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        candles = _load_candles(instrument, today)
    except HTTPException:
        candles = _load_candles(instrument, replay_date_default())
    london = _london_candle(candles)
    last = candles[-1] if candles else None
    if not london:
        return {"high": None, "low": None, "close": last.close if last else None}
    return {"high": london.high, "low": london.low, "close": last.close if last else None}


@app.get("/price/live")
def live_price(instrument: str = Query("XAUUSD")):
    try:
        price = fetch_live_price(instrument)
        return {"instrument": instrument, "price": price, "source": "twelve_data"}
    except Exception as exc:
        logger.warning("Live price failed: %s", exc)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        try:
            candles = _load_candles(instrument, today)
        except HTTPException:
            candles = _load_candles(instrument, replay_date_default())
        return {
            "instrument": instrument,
            "price": candles[-1].close if candles else 0,
            "source": "cached",
        }


@app.post("/explain")
def explain(req: ExplainRequest):
    return {"explanation": _explain_signal(req.model_dump())}


@app.post("/voice")
def voice(req: VoiceRequest):
    if snwolley.tts_configured:
        try:
            audio = snwolley.text_to_speech(req.text)
            return {
                "audio_base64": base64.b64encode(audio).decode("ascii"),
                "content_type": "audio/wav",
                "fallback": False,
            }
        except Exception as exc:
            logger.warning("Snwolley TTS API failed: %s", exc)
    return {"fallback": True, "text": req.text}


@app.get("/demo/dates")
def demo_dates():
    dates = recent_trading_dates(REPLAY_DAYS)
    return {
        "dates": dates,
        "default": replay_date_default(),
        "count": REPLAY_DAYS,
    }


@app.get("/demo/candles")
def demo_candles(instrument: str = Query("XAUUSD"), date: str | None = None):
    date = date or replay_date_default()
    candles = _load_candles(instrument, date)
    return {
        "instrument": instrument,
        "date": date,
        "data_source": "twelve_data",
        "candles": [
            {
                "time": c.time.isoformat(),
                "open": c.open,
                "high": c.high,
                "low": c.low,
                "close": c.close,
            }
            for c in candles
        ],
    }


@app.post("/demo/replay")
def demo_replay(req: ReplayRequest):
    date = req.date or replay_date_default()
    return _run_day(req.instrument, date)


@app.post("/telegram/notify")
def telegram_notify(req: TelegramNotifyRequest):
    if not telegram_configured():
        raise HTTPException(503, "Telegram not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")
    try:
        signal = req.model_dump()
        explanation = signal.pop("explanation", "")
        demo = signal.pop("demo", False)
        result = notify_signal(signal, explanation, demo=demo)
        return {"ok": True, "message_id": result.get("result", {}).get("message_id")}
    except Exception as exc:
        logger.warning("Telegram notify failed: %s", exc)
        raise HTTPException(502, str(exc)) from exc


@app.post("/telegram/test")
def telegram_test():
    if not telegram_configured():
        raise HTTPException(503, "Telegram not configured")
    try:
        send_message("PipSense 🇬🇭 test — Telegram notifications are working!")
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(502, str(exc)) from exc
