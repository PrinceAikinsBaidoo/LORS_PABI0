import { formatDollars, formatPrice } from '../utils/risk'
import { instrumentShort } from '../utils/instruments'
import { GRADE_STYLES } from '../utils/profitManagement'

function LevelRow({ label, price, dollars, accent, hit, isRule }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-divider last:border-0">
      <span className={`text-sm flex items-center gap-1.5 ${isRule ? 'text-teal-accent italic' : 'text-text-secondary'}`}>
        {hit && <span className="text-buy text-xs not-italic">✓</span>}
        {isRule ? '→' : ''} {label}
      </span>
      <div className="text-right">
        {!isRule && (
          <>
            <span className={`font-mono font-medium ${accent || 'text-text-primary'}`}>{price}</span>
            {dollars != null && (
              <span className="text-text-muted text-xs ml-2">+{formatDollars(dollars)}</span>
            )}
          </>
        )}
        {isRule && hit && (
          <span className="text-xs text-buy font-medium">Active</span>
        )}
        {isRule && !hit && (
          <span className="font-mono text-xs text-text-muted">{price}</span>
        )}
      </div>
    </div>
  )
}

export default function SignalCard({
  signal,
  explanation,
  loading,
  onVoice,
  onCopy,
  onLogTrade,
  voiceLoading,
}) {
  if (loading) {
    return (
      <div className="glass-card p-6 mb-4">
        <div className="shimmer h-8 w-48 rounded mb-4" />
        <div className="shimmer h-4 w-full rounded mb-2" />
        <div className="shimmer h-4 w-3/4 rounded" />
      </div>
    )
  }

  if (!signal) {
    return (
      <div className="glass-card p-6 mb-4 text-center">
        <div className="w-16 h-16 rounded-full bg-teal-light/10 border border-teal-accent/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👁</span>
        </div>
        <p className="text-text-secondary text-sm">
          PipSense is watching the London session for you...
        </p>
      </div>
    )
  }

  const isBuy = signal.direction === 'BUY'
  const instLabel = instrumentShort(signal.instrument)
  const hitSet = new Set(signal.partials_hit || [])
  const levels = signal.profit_management || []
  const gradeStyle = GRADE_STYLES[signal.grade] || GRADE_STYLES.open

  return (
    <div
      className={`glass-card p-5 mb-4 border-2 ${
        isBuy ? 'border-buy/40 shadow-[0_0_24px_rgba(0,255,136,0.08)]' : 'border-sell/40 shadow-[0_0_24px_rgba(255,59,92,0.08)]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span
            className={`inline-block px-4 py-2 rounded-lg text-lg font-bold ${
              isBuy ? 'bg-buy/15 text-buy' : 'bg-sell/15 text-sell'
            }`}
          >
            {isBuy ? '🟢' : '🔴'} {signal.direction} {instLabel}
          </span>
          <p className="text-text-secondary text-sm mt-2">{signal.type}</p>
        </div>
        <div className="text-right">
          {signal.grade && signal.grade !== 'open' && (
            <span className={`inline-block text-xs px-2 py-1 rounded border font-medium mb-1 ${gradeStyle}`}>
              {signal.is_perfect ? '★ Perfect' : signal.grade_label}
            </span>
          )}
          <p className="text-xs text-text-muted font-mono">
            {signal.time ? new Date(signal.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : ''} GMT
          </p>
        </div>
      </div>

      <div className="bg-surface/50 rounded-lg p-3 mb-3">
        <LevelRow label="Entry" price={formatPrice(signal.instrument, signal.entry)} />
        <LevelRow label="Stop Loss" price={formatPrice(signal.instrument, signal.sl)} dollars={signal.slDollars} accent="text-sell" />
      </div>

      <div className="bg-teal-muted/10 border border-teal-accent/20 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-teal-accent mb-2">Profit management</p>
        {levels.length > 0 ? levels.map((lvl) => (
          <LevelRow
            key={lvl.id}
            label={lvl.label}
            price={formatPrice(signal.instrument, lvl.price)}
            dollars={lvl.dollars}
            accent="text-buy"
            hit={hitSet.has(lvl.id)}
            isRule={lvl.action === 'move_sl_be' || lvl.id === 'be'}
          />
        )) : (
          <>
            <LevelRow label="Partial (35% @ 50 pips)" price="—" accent="text-buy" />
            <LevelRow label="TP1 (30% @ 1:1)" price={formatPrice(signal.instrument, signal.tp1)} dollars={signal.tp1Dollars} accent="text-buy" />
            <LevelRow label="TP2 (20% @ 1:2)" price={formatPrice(signal.instrument, signal.tp2)} dollars={signal.tp2Dollars} accent="text-buy" />
            <LevelRow label="TP3 (15% @ 1:3)" price={formatPrice(signal.instrument, signal.tp3)} dollars={signal.tp3Dollars} accent="text-buy" />
          </>
        )}
      </div>

      {signal.grade && signal.grade !== 'open' && (
        <div className="flex gap-3 text-xs text-text-muted mb-4 px-1">
          <span>Max +{signal.max_favorable_pips} pips</span>
          <span>Max −{signal.max_adverse_pips} pips</span>
          {signal.pnl_r != null && <span className="ml-auto font-mono">{signal.pnl_r >= 0 ? '+' : ''}{signal.pnl_r}R</span>}
        </div>
      )}

      {explanation && (
        <div className="bg-teal-muted/30 border border-teal-accent/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-text-secondary leading-relaxed">{explanation}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onVoice}
          disabled={voiceLoading}
          className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {voiceLoading ? 'Loading...' : '🔊 Voice'}
        </button>
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-surface border border-border text-sm font-medium hover:border-teal-accent"
        >
          Copy MT5
        </button>
        <button
          type="button"
          onClick={onLogTrade}
          className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-teal-accent/20 border border-teal-accent/40 text-teal-accent text-sm font-medium"
        >
          I took this
        </button>
      </div>
    </div>
  )
}
