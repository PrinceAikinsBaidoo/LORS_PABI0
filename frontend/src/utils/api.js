const BASE = import.meta.env.VITE_API_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => request('/health'),
  currentSignal: (instrument = 'XAUUSD') =>
    request(`/signal/current?instrument=${instrument}`),
  signalHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/signal/history${q ? `?${q}` : ''}`)
  },
  todayRange: (instrument = 'XAUUSD') =>
    request(`/range/today?instrument=${instrument}`),
  livePrice: (instrument = 'XAUUSD') =>
    request(`/price/live?instrument=${instrument}`),
  explain: (signal) =>
    request('/explain', { method: 'POST', body: JSON.stringify(signal) }),
  voice: (text) =>
    request('/voice', { method: 'POST', body: JSON.stringify({ text }) }),
  demoCandles: (instrument, date) =>
    request(`/demo/candles?instrument=${instrument}&date=${date}`),
  demoDates: () => request('/demo/dates'),
  demoReplay: (instrument, date) =>
    request('/demo/replay', {
      method: 'POST',
      body: JSON.stringify({ instrument, date }),
    }),
}
