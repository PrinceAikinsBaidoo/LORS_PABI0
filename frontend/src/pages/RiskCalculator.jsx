import { useMemo, useState } from 'react'
import { useUser } from '../context/UserContext'
import { INSTRUMENTS, META } from '../utils/instruments'
import {
  calcDollarRisk,
  calcLevels,
  calcRiskDistance,
  formatDollars,
  formatPrice,
  pipLabel,
} from '../utils/risk'

export default function RiskCalculator() {
  const user = useUser()
  const [instrument, setInstrument] = useState('XAUUSD')
  const meta = META[instrument]
  const [balance, setBalance] = useState(user.balance || 1000)
  const [lotSize, setLotSize] = useState(user.lotSize || 0.04)
  const [entry, setEntry] = useState(meta.defaultEntry)
  const [sl, setSl] = useState(meta.defaultSl)
  const direction = entry > sl ? 'BUY' : 'SELL'

  const result = useMemo(() => {
    const levels = calcLevels(instrument, direction, entry, sl)
    const riskDollars = calcDollarRisk(instrument, lotSize, entry, sl)
    const riskPct = balance > 0 ? ((riskDollars / balance) * 100).toFixed(1) : 0
    const partialLot = lotSize * 0.35
    const partialPrice = entry + (direction === 'BUY' ? 1 : -1) * 50 * meta.pipSize
    const partialReward = calcDollarRisk(instrument, partialLot, entry, partialPrice)
    const tp1Reward = calcDollarRisk(instrument, lotSize * 0.3, entry, levels.tp1)
    const tp2Reward = calcDollarRisk(instrument, lotSize * 0.2, entry, levels.tp2)
    const tp3Reward = calcDollarRisk(instrument, lotSize * 0.15, entry, levels.tp3)
    return { ...levels, riskDollars, riskPct, partialPrice, partialReward, tp1Reward, tp2Reward, tp3Reward }
  }, [instrument, direction, entry, sl, lotSize, balance, meta.pipSize])

  const onInstrumentChange = (inst) => {
    setInstrument(inst)
    setEntry(META[inst].defaultEntry)
    setSl(META[inst].defaultSl)
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Risk Calculator</h1>
      <p className="text-text-muted text-sm mb-4">Updates live as you type</p>

      <div className="glass-card p-4 space-y-4 mb-4">
        <div>
          <label className="text-xs text-text-muted block mb-2">Instrument</label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst}
                type="button"
                onClick={() => onInstrumentChange(inst)}
                className={`flex-1 min-w-[90px] py-2 rounded-lg text-sm border ${
                  instrument === inst
                    ? 'bg-brand-blue/20 border-brand-blue text-primary'
                    : 'bg-surface border-border text-text-muted'
                }`}
              >
                {META[inst].label}
              </button>
            ))}
          </div>
        </div>

        {[
          { label: 'Account balance ($)', value: balance, set: setBalance },
          { label: 'Lot size', value: lotSize, set: setLotSize, step: 0.01 },
          { label: 'Entry price', value: entry, set: setEntry },
          { label: 'Stop loss', value: sl, set: setSl },
        ].map(({ label, value, set, step }) => (
          <div key={label}>
            <label className="text-xs text-text-muted block mb-1">{label}</label>
            <input
              type="number"
              step={step || meta.inputStep}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 font-mono focus:border-teal-accent outline-none"
            />
          </div>
        ))}
      </div>

      <div className="glass-card p-4 border border-teal-accent/30">
        <div className="flex justify-between items-center mb-3">
          <span className={`font-bold ${direction === 'BUY' ? 'text-buy' : 'text-sell'}`}>
            {direction}
          </span>
          <span className="text-text-muted text-sm">
            {calcRiskDistance(instrument, entry, sl).toFixed(1)} {pipLabel(instrument)} risk
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Risk ($)</span>
            <span className="font-mono text-sell">{formatDollars(-result.riskDollars)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">% of account</span>
            <span className="font-mono">{result.riskPct}%</span>
          </div>
          <hr className="border-divider" />
          <div className="flex justify-between">
            <span className="text-teal-accent italic">Partial 35% @ 50 pips → SL to BE</span>
            <span>
              <span className="font-mono">{formatPrice(instrument, result.partialPrice)}</span>
              <span className="text-buy text-xs ml-2">+{formatDollars(result.partialReward)}</span>
            </span>
          </div>
          {[
            { label: 'TP1 (30% @ 1:1)', price: result.tp1, reward: result.tp1Reward },
            { label: 'TP2 (20% @ 1:2)', price: result.tp2, reward: result.tp2Reward },
            { label: 'TP3 (15% @ 1:3)', price: result.tp3, reward: result.tp3Reward },
          ].map(({ label, price, reward }) => (
            <div key={label} className="flex justify-between">
              <span className="text-text-secondary">{label}</span>
              <span>
                <span className="font-mono">{formatPrice(instrument, price)}</span>
                <span className="text-buy text-xs ml-2">+{formatDollars(reward)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
