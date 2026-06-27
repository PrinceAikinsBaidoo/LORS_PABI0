import { useEffect, useState } from 'react'
import { loadTradeHistory } from '../utils/storage'
import { api } from '../utils/api'
import { formatPrice } from '../utils/risk'
import { INSTRUMENTS, instrumentLabel, instrumentShort } from '../utils/instruments'
import { GRADE_STYLES } from '../utils/profitManagement'

export default function SignalHistory() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [backendHistory, setBackendHistory] = useState([])

  useEffect(() => {
    setItems(loadTradeHistory())
    api.signalHistory().then(setBackendHistory).catch(() => {})
  }, [])

  const all = [
    ...items.map((i) => ({ ...i, source: 'logged' })),
    ...backendHistory.map((i) => ({ ...i, source: 'engine' })),
  ].sort((a, b) => new Date(b.loggedAt || b.time) - new Date(a.loggedAt || a.time))

  const filtered = filter === 'all' ? all : all.filter((i) => i.instrument === filter)

  const graded = all.filter((i) => i.grade && i.grade !== 'open')
  const perfect = graded.filter((i) => i.is_perfect).length
  const wins = graded.filter((i) => ['perfect', 'good', 'partial'].includes(i.grade)).length
  const losses = graded.filter((i) => i.grade === 'loss').length
  const total = wins + losses
  const winRate = total ? Math.round((wins / total) * 100) : 0

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Signal History</h1>
      <p className="text-text-muted text-sm mb-4">Graded from real price action after each signal</p>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="glass-card p-3 text-center">
          <p className="text-text-muted text-xs">Trades</p>
          <p className="font-bold text-lg">{graded.length || all.length}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-text-muted text-xs">Perfect</p>
          <p className="font-bold text-lg text-buy">{perfect}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-text-muted text-xs">Win rate</p>
          <p className="font-bold text-lg text-buy">{winRate}%</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-text-muted text-xs">W / L</p>
          <p className="font-bold text-lg">{wins} / {losses}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', ...INSTRUMENTS].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border ${
              filter === f
                ? 'bg-brand-black text-white border-brand-black'
                : 'bg-surface border-border text-text-muted'
            }`}
          >
            {f === 'all' ? 'All' : instrumentShort(f)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-text-muted text-sm text-center py-8">No trades yet. Replay a date on the Signals screen.</p>
        )}
        {filtered.map((item, i) => {
          const gradeStyle = GRADE_STYLES[item.grade] || GRADE_STYLES.open
          return (
            <div key={item.id || i} className="glass-card p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-bold ${item.direction === 'BUY' ? 'text-buy' : 'text-sell'}`}>
                  {item.direction} {instrumentShort(item.instrument)}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(item.loggedAt || item.time).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{item.type}</p>
              <div className="grid grid-cols-2 gap-1 text-xs font-mono mb-2">
                <span className="text-text-muted">Entry: {formatPrice(item.instrument, item.entry)}</span>
                <span className="text-text-muted">SL: {formatPrice(item.instrument, item.sl)}</span>
              </div>
              {item.grade && item.grade !== 'open' && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded border ${gradeStyle}`}>
                    {item.is_perfect ? '★ Perfect' : item.grade_label}
                  </span>
                  {item.partials_hit?.length > 0 && (
                    <span className="text-xs text-text-muted">
                      Hit: {item.partials_hit.join(', ').toUpperCase()}
                    </span>
                  )}
                  {item.pnl_r != null && (
                    <span className="text-xs font-mono text-text-secondary ml-auto">
                      {item.pnl_r >= 0 ? '+' : ''}{item.pnl_r}R
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
