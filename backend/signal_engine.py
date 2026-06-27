"""
London Open Range Strategy — ported from Pine Script indicator.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from instruments import Instrument, META, pip_size as _pip_size, round_price

Direction = Literal["BUY", "SELL"]
SignalType = Literal[
    "Breakout High",
    "Sweep High",
    "Breakout Low",
    "Sweep Low",
]


@dataclass
class Candle:
    time: datetime
    open: float
    high: float
    low: float
    close: float


@dataclass
class Signal:
    instrument: Instrument
    direction: Direction
    type: SignalType
    entry: float
    sl: float
    tp1: float
    tp2: float
    tp3: float
    time: str
    risk_pips: float


@dataclass
class EngineState:
    l_high: float | None = None
    l_low: float | None = None
    range_set: bool = False
    daily_trades: int = 0
    consec_loss: int = 0
    halted: bool = False
    in_trade: bool = False
    trade_dir: str | None = None
    entry_px: float | None = None
    last_long_entry: float | None = None
    last_short_entry: float | None = None
    signals: list[Signal] = field(default_factory=list)
    current_day: str | None = None


def _is_london_candle(c: Candle, london_hour: int = 7, london_minute: int = 0) -> bool:
    t = c.time.astimezone(timezone.utc)
    return t.hour == london_hour and t.minute == london_minute


def _day_key(c: Candle) -> str:
    return c.time.astimezone(timezone.utc).strftime("%Y-%m-%d")


def run_engine(
    candles: list[Candle],
    instrument: Instrument = "XAUUSD",
    risk_floor_pips: float = 50.0,
    max_trades: int = 6,
    max_consec: int = 4,
) -> tuple[list[Signal], EngineState]:
    meta = META[instrument]
    pip_sz = _pip_size(instrument)
    sl_buf = meta["sl_buffer_pips"] * pip_sz
    risk_cap = meta["risk_cap_pips"] * pip_sz
    risk_flr = risk_floor_pips * pip_sz

    state = EngineState()
    prev: Candle | None = None
    signals: list[Signal] = []

    for c in candles:
        day = _day_key(c)
        if state.current_day != day:
            state = EngineState(current_day=day)
            prev = None

        if _is_london_candle(c):
            state.l_high = c.high
            state.l_low = c.low
            state.range_set = True

        if not state.range_set or state.l_high is None or state.l_low is None:
            prev = c
            continue

        if _is_london_candle(c):
            prev = c
            continue

        close = c.close
        calc_risk_long = max(risk_flr, min(risk_cap, close - (state.l_low - sl_buf)))
        calc_risk_short = max(risk_flr, min(risk_cap, (state.l_high + sl_buf) - close))

        sl_long = close - calc_risk_long
        sl_short = close + calc_risk_short
        tp1_long = close + calc_risk_long
        tp2_long = close + calc_risk_long * 2
        tp3_long = close + calc_risk_long * 3
        tp1_short = close - calc_risk_short
        tp2_short = close - calc_risk_short * 2
        tp3_short = close - calc_risk_short * 3

        can_trade = (
            state.range_set
            and not state.halted
            and not state.in_trade
            and state.daily_trades < max_trades
            and state.consec_loss < max_consec
        )

        new_touch_high = prev is not None and c.high >= state.l_high and prev.low < state.l_high
        new_touch_low = prev is not None and c.low <= state.l_low and prev.high > state.l_low

        better_short = state.last_short_entry is None or close > state.last_short_entry
        better_long = state.last_long_entry is None or close < state.last_long_entry

        sig_long_break = can_trade and new_touch_high and close > state.l_high and better_long
        sig_short_sweep = (
            can_trade
            and new_touch_high
            and close <= state.l_high
            and close >= state.l_low
            and better_short
        )
        sig_short_break = can_trade and new_touch_low and close < state.l_low and better_short
        sig_long_sweep = (
            can_trade
            and new_touch_low
            and close >= state.l_low
            and close <= state.l_high
            and better_long
        )

        fired: tuple[Direction, SignalType] | None = None
        if sig_long_break:
            fired = ("BUY", "Breakout High")
            sl, tp1, tp2, tp3 = sl_long, tp1_long, tp2_long, tp3_long
            risk = calc_risk_long
        elif sig_short_sweep:
            fired = ("SELL", "Sweep High")
            sl, tp1, tp2, tp3 = sl_short, tp1_short, tp2_short, tp3_short
            risk = calc_risk_short
        elif sig_short_break:
            fired = ("SELL", "Breakout Low")
            sl, tp1, tp2, tp3 = sl_short, tp1_short, tp2_short, tp3_short
            risk = calc_risk_short
        elif sig_long_sweep:
            fired = ("BUY", "Sweep Low")
            sl, tp1, tp2, tp3 = sl_long, tp1_long, tp2_long, tp3_long
            risk = calc_risk_long

        if fired:
            direction, sig_type = fired
            sig = Signal(
                instrument=instrument,
                direction=direction,
                type=sig_type,
                entry=round_price(instrument, close),
                sl=round_price(instrument, sl),
                tp1=round_price(instrument, tp1),
                tp2=round_price(instrument, tp2),
                tp3=round_price(instrument, tp3),
                time=c.time.isoformat(),
                risk_pips=round(risk / pip_sz, 1),
            )
            signals.append(sig)
            state.in_trade = True
            state.trade_dir = "long" if direction == "BUY" else "short"
            state.entry_px = close
            state.daily_trades += 1
            if direction == "BUY":
                state.last_long_entry = close
                state.last_short_entry = None
            else:
                state.last_short_entry = close
                state.last_long_entry = None

            state.in_trade = False
            state.trade_dir = None

        prev = c

    state.signals = signals
    return signals, state


def signal_to_dict(s: Signal) -> dict:
    return {
        "instrument": s.instrument,
        "direction": s.direction,
        "type": s.type,
        "entry": s.entry,
        "sl": s.sl,
        "tp1": s.tp1,
        "tp2": s.tp2,
        "tp3": s.tp3,
        "time": s.time,
        "risk_pips": s.risk_pips,
    }
