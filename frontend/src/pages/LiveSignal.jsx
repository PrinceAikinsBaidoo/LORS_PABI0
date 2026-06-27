import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import ModeToggle from '../components/ModeToggle'
import SignalCard from '../components/SignalCard'
import LondonRangeBox from '../components/LondonRangeBox'
import DailyStatsBar from '../components/DailyStatsBar'
import { api } from '../utils/api'
import { useUser } from '../context/UserContext'
import { calcDollarRisk, formatPrice, mt5CopyString } from '../utils/risk'
import { enrichWithProfitDollars } from '../utils/profitManagement'
import { instrumentShort } from '../utils/instruments'
import { logTrade } from '../utils/storage'

function enrichSignal(signal, user) {
  if (!signal?.entry) return signal
  const lot = user.lotSize || 0.04
  const riskDollars = calcDollarRisk(signal.instrument, lot, signal.entry, signal.sl)
  const base = {
    ...signal,
    riskDollars,
    slDollars: -riskDollars,
    tp1Dollars: calcDollarRisk(signal.instrument, lot * 0.3, signal.entry, signal.tp1),
    tp2Dollars: calcDollarRisk(signal.instrument, lot * 0.2, signal.entry, signal.tp2),
    tp3Dollars: calcDollarRisk(signal.instrument, lot * 0.15, signal.entry, signal.tp3),
  }
  return enrichWithProfitDollars(base, lot)
}

function replayDelayMs(prev, next) {
  if (!prev?.time || !next?.time) return 2500
  const gap = new Date(next.time) - new Date(prev.time)
  return Math.min(6000, Math.max(2000, gap / 10))
}

function formatReplayDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function LiveSignal() {
  const user = useUser()
  const userInsts = user.instruments?.length ? user.instruments : ['XAUUSD']
  const [instrument, setInstrument] = useState(userInsts[0])
  const [mode, setMode] = useState('demo')
  const [signal, setSignal] = useState(null)
  const [allSignals, setAllSignals] = useState([])
  const [replayIndex, setReplayIndex] = useState(0)
  const [replaying, setReplaying] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [range, setRange] = useState(null)
  const [price, setPrice] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [demoDate, setDemoDate] = useState('')
  const [defaultDate, setDefaultDate] = useState('')
  const [replayDayCount, setReplayDayCount] = useState(5)
  const [demoDates, setDemoDates] = useState([])
  const [statusMsg, setStatusMsg] = useState('Replay Mode — real market data')
  const [toast, setToast] = useState('')
  const replayTimer = useRef(null)
  const explainCache = useRef({})
  const audioRef = useRef(null)

  const stopVoice = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    speechSynthesis.cancel()
  }, [])

  const speakSignal = useCallback(async (sig, exp, isDemo = false) => {
    if (!sig) return
    stopVoice()
    setVoiceLoading(true)
    try {
      const text = `PipSense signal. ${isDemo ? 'Demo signal. ' : ''}${sig.direction} ${instrumentShort(sig.instrument)}. ${exp} Entry at ${sig.entry}. Stop loss at ${sig.sl}. Take profit targets: ${sig.tp1}, ${sig.tp2}, and ${sig.tp3}.`
      const res = await api.voice(text)
      if (res.audio_base64) {
        const audio = new Audio(`data:${res.content_type || 'audio/wav'};base64,${res.audio_base64}`)
        audioRef.current = audio
        await audio.play()
      } else if (res.fallback) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(text))
      }
    } catch {
      speechSynthesis.speak(new SpeechSynthesisUtterance(exp || 'Signal ready'))
    } finally {
      setVoiceLoading(false)
    }
  }, [stopVoice])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const clearReplayTimer = () => {
    if (replayTimer.current) {
      clearTimeout(replayTimer.current)
      replayTimer.current = null
    }
  }

  const fetchExplanation = useCallback(async (sig) => {
    const key = `${sig.time}-${sig.direction}`
    if (explainCache.current[key]) return explainCache.current[key]
    try {
      const exp = await api.explain(sig)
      explainCache.current[key] = exp.explanation
      return exp.explanation
    } catch {
      const fallback = sig.explanation || 'Price interacted with the London range and triggered a setup.'
      explainCache.current[key] = fallback
      return fallback
    }
  }, [])

  const showSignalAt = useCallback(async (sig, index, total, dateLabel) => {
    const enriched = enrichSignal(sig, user)
    setSignal(enriched)
    setPrice(sig.entry)
    setReplayIndex(index)
    setStatusMsg(
      `Replaying ${dateLabel} — signal ${index + 1} of ${total} · ${new Date(sig.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} GMT`
    )
    const exp = await fetchExplanation(sig)
    setExplanation(exp)
    speakSignal(sig, exp, true)
  }, [user, fetchExplanation, speakSignal])

  const startReplay = useCallback((signals, dateStr) => {
    clearReplayTimer()
    if (!signals.length) return

    setReplaying(true)
    const dateLabel = formatReplayDate(dateStr)
    let i = 0

    const step = async () => {
      await showSignalAt(signals[i], i, signals.length, dateLabel)
      i += 1
      if (i < signals.length) {
        const delay = replayDelayMs(signals[i - 1], signals[i])
        replayTimer.current = setTimeout(step, delay)
      } else {
        setReplaying(false)
        setStatusMsg(`${dateLabel} replay complete — ${signals.length} signals from real data`)
      }
    }

    step()
  }, [showSignalAt])

  const stopReplay = () => {
    clearReplayTimer()
    stopVoice()
    setReplaying(false)
  }

  useEffect(() => {
    api.demoDates().then((d) => {
      setDemoDates(d.dates || [])
      setDefaultDate(d.default || '')
      setReplayDayCount(d.count || d.dates?.length || 5)
      setDemoDate(d.default || d.dates?.[d.dates.length - 1] || '')
    }).catch(() => {
      const fallback = new Date()
      fallback.setDate(fallback.getDate() - 2)
      setDemoDate(fallback.toISOString().slice(0, 10))
    })
  }, [])

  const loadDemo = useCallback(async () => {
    if (!demoDate) return
    setLoading(true)
    stopReplay()
    explainCache.current = {}
    try {
      const data = await api.demoReplay(instrument, demoDate)
      setRange(data.range)
      setStats(data.stats)
      setAllSignals(data.signals || [])
      setPrice(data.range?.close)

      if (data.signals?.length) {
        startReplay(data.signals, demoDate)
      } else {
        setSignal(null)
        setExplanation('')
        setStatusMsg(
          `No signals on ${formatReplayDate(demoDate)} — Range LH: ${formatPrice(instrument, data.range?.high)} | LL: ${formatPrice(instrument, data.range?.low)}`
        )
      }
    } catch {
      setStatusMsg('Could not load market data — check backend & Twelve Data key')
    } finally {
      setLoading(false)
    }
  }, [instrument, demoDate, startReplay])

  const loadLive = useCallback(async () => {
    setLoading(true)
    stopReplay()
    try {
      const [sigRes, rangeRes, priceRes] = await Promise.all([
        api.currentSignal(instrument),
        api.todayRange(instrument),
        api.livePrice(instrument),
      ])
      setRange(rangeRes)
      setPrice(priceRes.price)
      setStats(sigRes.stats || {})
      setAllSignals(sigRes.signal ? [sigRes.signal] : [])
      const enriched = enrichSignal(sigRes.signal, user)
      setSignal(enriched)
      const exp = sigRes.explanation || (sigRes.signal ? await fetchExplanation(sigRes.signal) : '')
      setExplanation(exp)
      if (sigRes.signal && exp) {
        speakSignal(sigRes.signal, exp, false)
      }
      setStatusMsg(
        `${sigRes.session_status || 'London Session Active'} · Live price from Twelve Data`
      )
    } catch {
      setStatusMsg('Live data unavailable — switch to DEMO replay')
    } finally {
      setLoading(false)
    }
  }, [instrument, user, fetchExplanation, speakSignal])

  useEffect(() => {
    if (mode === 'demo' && demoDate) loadDemo()
    else if (mode === 'live') loadLive()
    return () => {
      clearReplayTimer()
      stopVoice()
    }
  }, [mode, demoDate, loadDemo, loadLive, stopVoice])

  const handleVoice = () => {
    if (!signal) return
    speakSignal(signal, explanation, mode === 'demo')
  }

  const handleCopy = () => {
    if (!signal) return
    navigator.clipboard.writeText(mt5CopyString(signal))
    showToast('Copied to clipboard!')
  }

  const handleLog = () => {
    if (!signal) return
    logTrade(signal)
    showToast('Trade logged!')
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-success text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {toast}
        </div>
      )}

      <ModeToggle mode={mode} onChange={setMode} sessionStatus={statusMsg} />

      {userInsts.length > 1 && (
        <div className="flex gap-2 mb-4">
          {userInsts.map((inst) => (
            <button
              key={inst}
              type="button"
              onClick={() => setInstrument(inst)}
              className={`flex-1 py-1.5 rounded-lg text-xs border ${
                instrument === inst
                  ? 'bg-teal-accent/20 border-teal-accent text-teal-accent'
                  : 'bg-surface border-border text-text-muted'
              }`}
            >
              {instrumentShort(inst)}
            </button>
          ))}
        </div>
      )}

      {mode === 'demo' && (
        <div className="mb-4 space-y-2">
          <div>
            <label className="text-xs text-text-muted block mb-1">
              Replay date — last {replayDayCount} trading days{' '}
              <span className="text-teal-accent">(Twelve Data)</span>
            </label>
            <select
              value={demoDate}
              onChange={(e) => setDemoDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:border-teal-accent outline-none"
            >
              {demoDates.map((d) => (
                <option key={d} value={d}>
                  {formatReplayDate(d)}{d === defaultDate ? ' (2 days ago)' : ''}
                </option>
              ))}
            </select>
          </div>

          {allSignals.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (replaying ? stopReplay() : startReplay(allSignals, demoDate))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue/20 border border-brand-blue/40 text-primary text-xs font-medium"
              >
                {replaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {replaying ? 'Pause' : 'Replay trades'}
              </button>
              <button
                type="button"
                onClick={() => startReplay(allSignals, demoDate)}
                className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-secondary"
                title="Restart replay"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-text-muted ml-auto">
                {replayIndex + 1} / {allSignals.length} signals
              </span>
            </div>
          )}
        </div>
      )}

      <SignalCard
        signal={signal}
        explanation={explanation}
        loading={loading}
        onVoice={handleVoice}
        onCopy={handleCopy}
        onLogTrade={handleLog}
        voiceLoading={voiceLoading}
      />

      <LondonRangeBox range={range} price={price} instrument={instrument} />
      <DailyStatsBar stats={stats} />

      {!signal && !loading && mode === 'demo' && (
        <p className="text-center text-text-muted text-sm px-4">
          No London session signals fired on this date.
        </p>
      )}
    </div>
  )
}
