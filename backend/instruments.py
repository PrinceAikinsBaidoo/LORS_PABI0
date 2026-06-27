"""Instrument metadata shared across engine, market data, and outcomes."""
from __future__ import annotations

from typing import Literal

Instrument = Literal["XAUUSD", "BTCUSD", "NZDUSD"]

INSTRUMENTS: list[Instrument] = ["XAUUSD", "BTCUSD", "NZDUSD"]

META: dict[str, dict] = {
    "XAUUSD": {
        "label": "Gold",
        "symbol": "XAU/USD",
        "mintick": 0.01,
        "pip_mult": 10.0,
        "decimals": 2,
        "sl_buffer_pips": 20.0,
        "risk_cap_pips": 150.0,
        "dollar_per_pip_per_lot": 10.0,
    },
    "BTCUSD": {
        "label": "Bitcoin",
        "symbol": "BTC/USD",
        "mintick": 1.0,
        "pip_mult": 1.0,
        "decimals": 0,
        "sl_buffer_pips": 0.0,
        "risk_cap_pips": 234.0,
        "dollar_per_pip_per_lot": 0.01,
    },
    "NZDUSD": {
        "label": "NZD/USD",
        "symbol": "NZD/USD",
        "mintick": 0.00001,
        "pip_mult": 10.0,
        "decimals": 5,
        "sl_buffer_pips": 0.0,
        "risk_cap_pips": 80.0,
        "dollar_per_pip_per_lot": 10.0,
    },
}


def pip_size(instrument: str) -> float:
    m = META[instrument]
    return m["mintick"] * m["pip_mult"]


def round_price(instrument: str, price: float) -> float:
    return round(price, META[instrument]["decimals"])


def instrument_label(instrument: str) -> str:
    return META.get(instrument, {}).get("label", instrument)
