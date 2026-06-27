import {
  calcDollarRisk,
  calcRiskDistance,
  formatPrice,
  mt5Symbol,
  pipSize,
} from './instruments'

export { formatPrice, calcDollarRisk, calcRiskDistance, pipSize, pipLabel } from './instruments'

export function calcTPs(direction, entry, riskDistance) {
  const sign = direction === 'BUY' ? 1 : -1
  return {
    tp1: entry + sign * riskDistance,
    tp2: entry + sign * riskDistance * 2,
    tp3: entry + sign * riskDistance * 3,
  }
}

export function calcLevels(instrument, direction, entry, sl) {
  const pip = pipSize(instrument)
  const riskDistance = Math.abs(entry - sl)
  const riskPips = riskDistance / pip
  const tps = calcTPs(direction, entry, riskDistance)
  return { riskPips, riskDistance, ...tps }
}

export function formatDollars(amount) {
  if (amount == null || Number.isNaN(amount)) return '—'
  const sign = amount >= 0 ? '' : '-'
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

export function mt5CopyString(signal) {
  return `${mt5Symbol(signal.instrument)} ${signal.direction} @ ${signal.entry} SL ${signal.sl} TP ${signal.tp1}`
}
