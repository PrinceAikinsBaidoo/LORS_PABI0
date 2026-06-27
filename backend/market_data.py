"""Fetch and cache real 15-min OHLC from Twelve Data."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

from signal_engine import Candle

logger = logging.getLogger("pipsense")

DATA_DIR = Path(__file__).parent / "data"
TWELVE_DATA_BASE = "https://api.twelvedata.com"

from instruments import INSTRUMENTS, META, instrument_label

SYMBOL_MAP = {k: v["symbol"] for k, v in META.items()}
DECIMALS = {k: v["decimals"] for k, v in META.items()}


def _api_key() -> str:
    return os.getenv("TWELVE_DATA_API_KEY", "")


def _cache_path(instrument: str) -> Path:
    return DATA_DIR / f"{instrument}_market.json"


def _load_cache(instrument: str) -> dict[str, list[dict]]:
    path = _cache_path(instrument)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


def _save_cache(instrument: str, cache: dict[str, list[dict]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _cache_path(instrument).write_text(json.dumps(cache, indent=2))


def _parse_bar(instrument: str, bar: dict) -> dict:
    dec = DECIMALS[instrument]
    dt = datetime.strptime(bar["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return {
        "time": dt.isoformat(),
        "open": round(float(bar["open"]), dec),
        "high": round(float(bar["high"]), dec),
        "low": round(float(bar["low"]), dec),
        "close": round(float(bar["close"]), dec),
    }


def fetch_day_from_api(instrument: str, date_str: str) -> list[dict]:
    api_key = _api_key()
    if not api_key:
        raise ValueError("TWELVE_DATA_API_KEY is not set")

    symbol = SYMBOL_MAP[instrument]
    params = {
        "symbol": symbol,
        "interval": "15min",
        "apikey": api_key,
        "timezone": "UTC",
        "start_date": f"{date_str} 00:00:00",
        "end_date": f"{date_str} 23:59:59",
        "outputsize": 5000,
    }

    with httpx.Client(timeout=45.0) as client:
        res = client.get(f"{TWELVE_DATA_BASE}/time_series", params=params)
        res.raise_for_status()
        data = res.json()

    if data.get("status") == "error":
        raise RuntimeError(data.get("message", "Twelve Data error"))

    values = data.get("values") or []
    if not values:
        raise RuntimeError(f"No candles returned for {instrument} on {date_str}")

    bars = [_parse_bar(instrument, v) for v in values]
    bars.sort(key=lambda b: b["time"])
    return bars


def get_day_candles(instrument: str, date_str: str, force_refresh: bool = False) -> list[dict]:
    cache = _load_cache(instrument)
    if not force_refresh and date_str in cache and len(cache[date_str]) >= 90:
        return cache[date_str]

    bars = fetch_day_from_api(instrument, date_str)
    cache[date_str] = bars
    _save_cache(instrument, cache)
    logger.info("Cached %d bars for %s on %s", len(bars), instrument, date_str)
    return bars


def bars_to_candles(bars: list[dict]) -> list[Candle]:
    return [
        Candle(
            time=datetime.fromisoformat(b["time"]),
            open=b["open"],
            high=b["high"],
            low=b["low"],
            close=b["close"],
        )
        for b in bars
    ]


def fetch_live_price(instrument: str) -> float:
    api_key = _api_key()
    if not api_key:
        raise ValueError("TWELVE_DATA_API_KEY is not set")

    symbol = SYMBOL_MAP[instrument]
    with httpx.Client(timeout=15.0) as client:
        res = client.get(
            f"{TWELVE_DATA_BASE}/price",
            params={"symbol": symbol, "apikey": api_key},
        )
        res.raise_for_status()
        data = res.json()

    if data.get("status") == "error":
        raise RuntimeError(data.get("message", "Twelve Data price error"))

    dec = DECIMALS[instrument]
    return round(float(data["price"]), dec)


REPLAY_DAYS = 5


def recent_trading_dates(count: int = REPLAY_DAYS) -> list[str]:
    """Return recent weekdays (Mon–Fri) for replay picker."""
    dates: list[str] = []
    day = datetime.now(timezone.utc).date()
    while len(dates) < count:
        day -= timedelta(days=1)
        if day.weekday() < 5:  # skip weekends — forex/gold thin on Sat/Sun
            dates.append(day.isoformat())
    return list(reversed(dates))


def replay_date_default() -> str:
    """Two calendar days ago (or nearest prior weekday with data)."""
    target = datetime.now(timezone.utc).date() - timedelta(days=2)
    while target.weekday() >= 5:
        target -= timedelta(days=1)
    return target.isoformat()


def prefetch_recent(instruments: list[str] | None = None, days: int = REPLAY_DAYS) -> None:
    if not _api_key():
        logger.warning("No TWELVE_DATA_API_KEY — skipping market data prefetch")
        return

    instruments = instruments or INSTRUMENTS
    dates = recent_trading_dates(days)
    default = replay_date_default()
    if default not in dates:
        dates.append(default)
        dates.sort()

    for instrument in instruments:
        for date_str in dates:
            try:
                get_day_candles(instrument, date_str)
            except Exception as exc:
                logger.warning("Prefetch failed %s %s: %s", instrument, date_str, exc)
