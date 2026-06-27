"""Generate demo candle data for replay mode."""
import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def _gen_day_candles(date_str: str, instrument: str, base: float) -> list[dict]:
    random.seed(hash(date_str + instrument) % 2**32)
    day = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    candles = []
    price = base
    spread = 2.0 if instrument == "XAUUSD" else 200.0

    for i in range(96):  # 15-min bars for 24h
        t = day + timedelta(minutes=15 * i)
        drift = random.uniform(-spread, spread)
        o = price
        h = o + abs(random.uniform(0, spread * 0.8))
        l = o - abs(random.uniform(0, spread * 0.8))
        c = o + drift
        h = max(h, o, c)
        l = min(l, o, c)

        # London open candle at 7:00 — set distinct range
        if t.hour == 7 and t.minute == 0:
            mid = base + random.uniform(-spread, spread)
            l = mid - spread * 0.5
            h = mid + spread * 0.5
            o = mid - spread * 0.1
            c = mid + spread * 0.2

        # Afternoon sweep/breakout patterns for demo signals
        if t.hour == 8 and t.minute == 15 and instrument == "XAUUSD":
            lh = candles[-1]["high"] if candles else h
            l = lh - spread * 0.3
            c = lh + spread * 0.4
            h = c + 1

        if t.hour == 9 and t.minute == 0 and instrument == "XAUUSD":
            ll = min(c["low"] for c in candles[-4:]) if len(candles) >= 4 else l
            h = ll + spread * 0.2
            l = ll - spread * 0.1
            c = ll + spread * 0.15

        candles.append({
            "time": t.isoformat(),
            "open": round(o, 2 if instrument == "XAUUSD" else 0),
            "high": round(h, 2 if instrument == "XAUUSD" else 0),
            "low": round(l, 2 if instrument == "XAUUSD" else 0),
            "close": round(c, 2 if instrument == "XAUUSD" else 0),
        })
        price = c

    return candles


def ensure_demo_data():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dates = [f"2025-06-{d:02d}" for d in range(1, 16)]
    for instrument, base in [("XAUUSD", 2350.0), ("BTCUSD", 105000.0)]:
        path = DATA_DIR / f"{instrument}_demo.json"
        if path.exists():
            continue
        data = {d: _gen_day_candles(d, instrument, base) for d in dates}
        path.write_text(json.dumps(data, indent=2))


if __name__ == "__main__":
    ensure_demo_data()
    print("Demo data generated.")
