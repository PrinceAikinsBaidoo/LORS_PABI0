export const INSTRUMENTS = ['XAUUSD', 'BTCUSD', 'NZDUSD']

export const META = {
  XAUUSD: {
    label: 'Gold',
    short: 'GOLD',
    pipSize: 0.1,
    pipLabel: 'pips',
    decimals: 2,
    dollarPerPipPerLot: 10,
    defaultEntry: 2350,
    defaultSl: 2340,
    inputStep: 0.01,
  },
  BTCUSD: {
    label: 'Bitcoin',
    short: 'BTC',
    pipSize: 1,
    pipLabel: 'points',
    decimals: 0,
    dollarPerPipPerLot: 0.01,
    defaultEntry: 105000,
    defaultSl: 104500,
    inputStep: 1,
  },
  NZDUSD: {
    label: 'NZD/USD',
    short: 'NZD',
    pipSize: 0.0001,
    pipLabel: 'pips',
    decimals: 5,
    dollarPerPipPerLot: 10,
    defaultEntry: 0.61250,
    defaultSl: 0.61150,
    inputStep: 0.00001,
  },
}

export function instrumentLabel(id) {
  return META[id]?.label ?? id
}

export function instrumentShort(id) {
  return META[id]?.short ?? id
}

export function pipSize(instrument) {
  return META[instrument]?.pipSize ?? 0.0001
}

export function pipLabel(instrument) {
  return META[instrument]?.pipLabel ?? 'pips'
}

export function formatPrice(instrument, price) {
  if (price == null || Number.isNaN(price)) return '—'
  const dec = META[instrument]?.decimals ?? 2
  return price.toFixed(dec)
}

export function calcDollarRisk(instrument, lotSize, entry, target) {
  const distance = Math.abs(entry - target) / pipSize(instrument)
  return distance * lotSize * (META[instrument]?.dollarPerPipPerLot ?? 10)
}

export function calcRiskDistance(instrument, entry, sl) {
  return Math.abs(entry - sl) / pipSize(instrument)
}

export function mt5Symbol(instrument) {
  return instrument
}
