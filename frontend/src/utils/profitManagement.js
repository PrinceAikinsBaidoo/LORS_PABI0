import { calcDollarRisk, pipSize } from './instruments'

export const PARTIAL_PIPS = 50
export const PARTIAL_PCT = 35
export const TP1_PCT = 30
export const TP2_PCT = 20
export const TP3_PCT = 15

export function profitManagementLevels(instrument, direction, entry, sl, tp1, tp2, tp3) {
  const pip = pipSize(instrument)
  const sign = direction === 'BUY' ? 1 : -1
  const riskPips = Math.abs(entry - sl) / pip
  const p50 = entry + sign * PARTIAL_PIPS * pip

  return [
    { id: 'p50', label: `Partial (${PARTIAL_PCT}% @ 50 pips)`, price: p50, closePct: PARTIAL_PCT, pips: PARTIAL_PIPS },
    { id: 'be', label: 'Move SL to Break Even', price: entry, closePct: 0, pips: 0, action: 'move_sl_be' },
    { id: 'tp1', label: `TP1 (${TP1_PCT}% @ 1:1)`, price: tp1, closePct: TP1_PCT, pips: riskPips },
    { id: 'tp2', label: `TP2 (${TP2_PCT}% @ 1:2)`, price: tp2, closePct: TP2_PCT, pips: riskPips * 2 },
    { id: 'tp3', label: `TP3 (${TP3_PCT}% @ 1:3)`, price: tp3, closePct: TP3_PCT, pips: riskPips * 3 },
  ]
}

export function enrichWithProfitDollars(signal, lotSize) {
  if (!signal?.entry) return signal
  const levels = signal.profit_management
    || profitManagementLevels(signal.instrument, signal.direction, signal.entry, signal.sl, signal.tp1, signal.tp2, signal.tp3)

  const partials = levels.map((lvl) => ({
    ...lvl,
    dollars: lvl.closePct > 0
      ? calcDollarRisk(signal.instrument, lotSize * (lvl.closePct / 100), signal.entry, lvl.price)
      : null,
  }))

  return { ...signal, profit_management: partials }
}

export const GRADE_STYLES = {
  perfect: 'bg-buy/20 text-buy border-buy/40',
  good: 'bg-success/20 text-buy border-success/40',
  partial: 'bg-teal-accent/20 text-teal-accent border-teal-accent/40',
  loss: 'bg-sell/20 text-sell border-sell/40',
  open: 'bg-surface text-text-muted border-border',
}
