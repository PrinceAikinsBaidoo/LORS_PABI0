import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { saveUser, defaultUser } from '../utils/storage'

const BROKERS = ['XM', 'Exness', 'Headway', 'Other']

export default function Onboarding() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...defaultUser })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const toggleInstrument = (inst) => {
    setForm((f) => {
      const has = f.instruments.includes(inst)
      let next = has ? f.instruments.filter((i) => i !== inst) : [...f.instruments, inst]
      if (next.length === 0) next = [inst]
      return { ...f, instruments: next }
    })
  }

  const submit = (skip = false) => {
    const data = skip
      ? { ...defaultUser, onboarded: true }
      : { ...form, onboarded: true }
    saveUser(data)
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="glass-header px-4 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl neo-surface flex items-center justify-center mx-auto mb-4">
          <Activity className="w-7 h-7 text-teal-accent" />
        </div>
        <h1 className="page-title text-2xl">Welcome to PipSense</h1>
        <p className="text-text-secondary text-sm mt-2">
          Set up once — trade smarter every London session
        </p>
      </header>

      <div className="flex-1 px-4 py-6 space-y-5">
        <div>
          <label className="text-sm text-text-secondary block mb-2">Broker</label>
          <div className="flex flex-wrap gap-2">
            {BROKERS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => set('broker', b)}
                className={`neo-chip ${form.broker === b ? 'neo-chip-active' : ''}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-2">Account balance</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={form.balance}
              onChange={(e) => set('balance', Number(e.target.value))}
              className="neo-input flex-1"
            />
            <div className="flex rounded-2xl overflow-hidden neo-inset p-0.5">
              {['USD', 'GHS'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('currency', c)}
                  className={`px-3 py-2 text-sm rounded-xl transition-all ${
                    form.currency === c ? 'neo-chip-active' : 'text-text-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-2">Instruments</label>
          <div className="flex gap-2">
            {[
              { id: 'XAUUSD', label: 'Gold' },
              { id: 'BTCUSD', label: 'Bitcoin' },
              { id: 'NZDUSD', label: 'NZD/USD' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleInstrument(id)}
                className={`flex-1 py-2 neo-chip text-sm ${
                  form.instruments.includes(id) ? 'neo-chip-blue' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-2">Lot size</label>
          <input
            type="number"
            step="0.01"
            value={form.lotSize}
            onChange={(e) => set('lotSize', Number(e.target.value))}
            className="neo-input"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary block mb-2">Notifications</label>
          <div className="flex gap-2">
            {[
              { id: 'web', label: 'Web only' },
              { id: 'telegram', label: 'Telegram' },
              { id: 'both', label: 'Both' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => set('notifications', id)}
                className={`flex-1 py-2 text-xs neo-chip ${
                  form.notifications === id ? 'neo-chip-active' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-2">
        <button
          type="button"
          onClick={() => submit(false)}
          className="neo-btn neo-btn-primary w-full py-3"
        >
          Start Trading
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          className="w-full py-2 text-text-muted text-sm hover:text-text-secondary"
        >
          Skip for demo
        </button>
      </div>
    </div>
  )
}
