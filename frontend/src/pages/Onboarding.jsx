import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      <header className="bg-brand-black px-4 py-6 text-center">
        <h1 className="text-2xl font-bold">Welcome to PipSense</h1>
        <p className="text-text-secondary text-sm mt-1">
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
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  form.broker === b
                    ? 'bg-brand-black text-white border-brand-black'
                    : 'bg-surface border-border text-text-secondary'
                }`}
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
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-text-primary focus:border-teal-accent outline-none"
            />
            <div className="flex rounded-lg overflow-hidden border border-border">
              {['USD', 'GHS'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('currency', c)}
                  className={`px-3 py-2 text-sm ${
                    form.currency === c ? 'bg-teal-accent text-brand-black' : 'bg-surface text-text-muted'
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
                className={`flex-1 py-2 rounded-lg text-sm border ${
                  form.instruments.includes(id)
                    ? 'bg-brand-blue/20 border-brand-blue text-primary'
                    : 'bg-surface border-border text-text-muted'
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
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:border-teal-accent outline-none"
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
                className={`flex-1 py-2 rounded-lg text-xs border ${
                  form.notifications === id
                    ? 'bg-teal-accent/20 border-teal-accent text-teal-accent'
                    : 'bg-surface border-border text-text-muted'
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
          className="w-full py-3 rounded-lg bg-brand-black text-white font-semibold hover:opacity-90"
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
