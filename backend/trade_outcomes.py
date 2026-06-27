"""Evaluate signal outcomes and profit-management levels using subsequent candles."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal

from instruments import round_price
from signal_engine import Candle, Signal
from instruments import pip_size as _pip_size

Grade = Literal["perfect", "good", "partial", "loss", "open"]

PARTIAL_PIPS = 50.0
PARTIAL_PCT = 35.0
TP1_PCT = 30.0
TP2_PCT = 20.0
TP3_PCT = 15.0


@dataclass
class ProfitLevel:
    id: str
    label: str
    price: float
    close_pct: float
    pips: float
    action: str | None = None  # e.g. "move_sl_be"


def profit_levels(signal: Signal) -> list[ProfitLevel]:
    pip = _pip_size(signal.instrument)
    sign = 1 if signal.direction == "BUY" else -1
    p50_price = round_price(signal.instrument, signal.entry + sign * PARTIAL_PIPS * pip)
    risk_dist = abs(signal.entry - signal.sl)

    return [
        ProfitLevel("p50", f"Partial ({PARTIAL_PCT:.0f}% @ 50 pips)", p50_price, PARTIAL_PCT, PARTIAL_PIPS),
        ProfitLevel(
            "be",
            "Move SL to Break Even",
            signal.entry,
            0,
            0,
            action="move_sl_be",
        ),
        ProfitLevel("tp1", f"TP1 ({TP1_PCT:.0f}% @ 1:1)", signal.tp1, TP1_PCT, round(risk_dist / pip, 1)),
        ProfitLevel("tp2", f"TP2 ({TP2_PCT:.0f}% @ 1:2)", signal.tp2, TP2_PCT, round(risk_dist * 2 / pip, 1)),
        ProfitLevel("tp3", f"TP3 ({TP3_PCT:.0f}% @ 1:3)", signal.tp3, TP3_PCT, round(risk_dist * 3 / pip, 1)),
    ]


def _trade_levels(signal: Signal) -> list[ProfitLevel]:
    """Only price targets used in outcome simulation (excludes BE row)."""
    return [l for l in profit_levels(signal) if l.close_pct > 0]


def _levels_for_signal(signal: Signal) -> list[ProfitLevel]:
    levels = _trade_levels(signal)
    if signal.direction == "BUY":
        return sorted(levels, key=lambda l: l.price)
    return sorted(levels, key=lambda l: l.price, reverse=True)


def _sl_hit(candle: Candle, direction: str, sl: float) -> bool:
    if direction == "BUY":
        return candle.low <= sl
    return candle.high >= sl


def _level_hit(candle: Candle, direction: str, price: float) -> bool:
    if direction == "BUY":
        return candle.high >= price
    return candle.low <= price


def evaluate_outcome(signal: Signal, candles: list[Candle]) -> dict[str, Any]:
    signal_time = datetime.fromisoformat(signal.time)
    future = [c for c in candles if c.time > signal_time]
    if not future:
        return _open_outcome(signal)

    levels = _levels_for_signal(signal)
    hit_ids: list[str] = []
    current_sl = signal.sl
    be_active = False
    sl_hit = False
    be_hit = False
    max_fav_pips = 0.0
    max_adv_pips = 0.0
    pip = _pip_size(signal.instrument)

    for candle in future:
        if signal.direction == "BUY":
            max_fav_pips = max(max_fav_pips, (candle.high - signal.entry) / pip)
            max_adv_pips = max(max_adv_pips, (signal.entry - candle.low) / pip)
        else:
            max_fav_pips = max(max_fav_pips, (signal.entry - candle.low) / pip)
            max_adv_pips = max(max_adv_pips, (candle.high - signal.entry) / pip)

        # Targets first — partial triggers break-even SL move
        for level in levels:
            if level.id not in hit_ids and _level_hit(candle, signal.direction, level.price):
                hit_ids.append(level.id)
                if level.id == "p50":
                    current_sl = signal.entry
                    be_active = True
                    if "be" not in hit_ids:
                        hit_ids.append("be")

        if _sl_hit(candle, signal.direction, current_sl):
            if be_active and current_sl == signal.entry:
                be_hit = True
            else:
                sl_hit = True
            break

        trade_hits = [i for i in hit_ids if i in ("p50", "tp1", "tp2", "tp3")]
        if len(trade_hits) == len(levels):
            break

    return _build_result(signal, hit_ids, sl_hit, be_hit, max_fav_pips, max_adv_pips)


def _open_outcome(signal: Signal) -> dict[str, Any]:
    return {
        "outcome": "OPEN",
        "grade": "open",
        "grade_label": "In progress",
        "partials_hit": [],
        "be_activated": False,
        "pnl_r": 0.0,
        "max_favorable_pips": 0.0,
        "max_adverse_pips": 0.0,
        "is_perfect": False,
        "profit_management": [_level_dict(l) for l in profit_levels(signal)],
    }


def _build_result(
    signal: Signal,
    hit_ids: list[str],
    sl_hit: bool,
    be_hit: bool,
    max_fav_pips: float,
    max_adv_pips: float,
) -> dict[str, Any]:
    levels = profit_levels(signal)
    trade_levels = _trade_levels(signal)
    risk_pips = signal.risk_pips or 1.0

    pnl_r = 0.0
    for level in trade_levels:
        if level.id in hit_ids:
            pnl_r += (level.close_pct / 100) * (level.pips / risk_pips)

    if sl_hit:
        closed_pct = sum(l.close_pct for l in trade_levels if l.id in hit_ids)
        pnl_r -= (100 - closed_pct) / 100
    # be_hit: remainder closes at 0R — no extra deduction

    trade_hit_ids = [i for i in hit_ids if i in ("p50", "tp1", "tp2", "tp3")]
    is_perfect = not sl_hit and not be_hit and len(trade_hit_ids) == len(trade_levels)

    if sl_hit and not trade_hit_ids:
        grade, grade_label, outcome = "loss", "Stopped out", "SL"
    elif sl_hit and trade_hit_ids:
        grade, grade_label = "partial", "Partial win — then SL"
        outcome = f"PARTIAL+SL ({', '.join(trade_hit_ids).upper()})"
    elif be_hit:
        grade, grade_label = "partial", "Partial win — BE protected"
        outcome = f"PARTIAL+BE ({', '.join(trade_hit_ids).upper()})"
    elif is_perfect:
        grade, grade_label, outcome = "perfect", "Perfect — all targets hit", "TP3+"
    elif "tp3" in hit_ids:
        grade, grade_label, outcome = "good", "Strong win — TP3 reached", "TP3"
    elif "tp2" in hit_ids:
        grade, grade_label, outcome = "good", "Good win — TP2 reached", "TP2"
    elif "tp1" in hit_ids:
        grade, grade_label, outcome = "good", "Win — TP1 reached", "TP1"
    elif "p50" in hit_ids:
        grade, grade_label, outcome = "partial", "Partial banked @ 50 pips", "P50"
    else:
        grade, grade_label, outcome = "open", "No target hit yet", "OPEN"

    return {
        "outcome": outcome,
        "grade": grade,
        "grade_label": grade_label,
        "partials_hit": hit_ids,
        "be_activated": "be" in hit_ids or "p50" in hit_ids,
        "pnl_r": round(pnl_r, 2),
        "max_favorable_pips": round(max_fav_pips, 1),
        "max_adverse_pips": round(max_adv_pips, 1),
        "is_perfect": is_perfect,
        "profit_management": [_level_dict(l) for l in levels],
    }


def _level_dict(level: ProfitLevel) -> dict[str, Any]:
    d = {
        "id": level.id,
        "label": level.label,
        "price": level.price,
        "close_pct": level.close_pct,
        "pips": level.pips,
    }
    if level.action:
        d["action"] = level.action
    return d


def enrich_signal_dict(signal_dict: dict, candles: list[Candle]) -> dict:
    sig = Signal(
        instrument=signal_dict["instrument"],
        direction=signal_dict["direction"],
        type=signal_dict["type"],
        entry=signal_dict["entry"],
        sl=signal_dict["sl"],
        tp1=signal_dict["tp1"],
        tp2=signal_dict["tp2"],
        tp3=signal_dict["tp3"],
        time=signal_dict["time"],
        risk_pips=signal_dict.get("risk_pips", 50),
    )
    outcome = evaluate_outcome(sig, candles)
    return {**signal_dict, **outcome}
