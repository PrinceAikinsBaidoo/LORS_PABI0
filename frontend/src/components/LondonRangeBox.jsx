import { formatPrice } from '../utils/risk'

export default function LondonRangeBox({ range, price, instrument }) {
  if (!range?.high && !range?.low) {
    return (
      <div className="glass-card p-4 mb-4">
        <h3 className="text-sm font-semibold text-text-secondary mb-2">London Range</h3>
        <p className="text-text-muted text-sm">Waiting for 7:00 AM GMT candle...</p>
      </div>
    )
  }

  const { high, low } = range
  let zone = 'inside'
  let zoneLabel = 'Inside range'
  let zoneColor = 'text-teal-accent'

  if (price != null) {
    if (price > high) {
      zone = 'above'
      zoneLabel = 'Above range'
      zoneColor = 'text-buy'
    } else if (price < low) {
      zone = 'below'
      zoneLabel = 'Below range'
      zoneColor = 'text-sell'
    }
  }

  const span = high - low || 1
  const pct = price != null ? Math.max(0, Math.min(100, ((price - low) / span) * 100)) : 50

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-text-secondary">London Range</h3>
        <span className={`text-xs font-medium ${zoneColor}`}>{zoneLabel}</span>
      </div>

      <div className="relative h-8 neo-inset overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 bg-brand-blue/20 border-r border-brand-blue/40"
          style={{ width: '100%' }}
        />
        {price != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-teal-accent z-10"
            style={{ left: `${pct}%` }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <p className="text-text-muted text-xs">London Low</p>
          <p className="font-mono font-medium text-sell">{formatPrice(instrument, low)}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Current</p>
          <p className="font-mono font-medium text-teal-accent">
            {price != null ? formatPrice(instrument, price) : '—'}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">London High</p>
          <p className="font-mono font-medium text-buy">{formatPrice(instrument, high)}</p>
        </div>
      </div>
    </div>
  )
}
