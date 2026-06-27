const KEY = 'pipsense_user'

export const defaultUser = {
  broker: 'XM',
  balance: 1000,
  currency: 'USD',
  instruments: ['XAUUSD'],
  lotSize: 0.04,
  notifications: 'both',
  onboarded: false,
}

export function loadUser() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaultUser, ...JSON.parse(raw) } : { ...defaultUser }
  } catch {
    return { ...defaultUser }
  }
}

export function saveUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function wantsTelegram(user) {
  const prefs = user?.notifications || loadUser().notifications
  return prefs === 'telegram' || prefs === 'both'
}

const HISTORY_KEY = 'pipsense_trade_history'

export function loadTradeHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function logTrade(signal) {
  const history = loadTradeHistory()
  history.unshift({
    id: crypto.randomUUID(),
    loggedAt: new Date().toISOString(),
    ...signal,
    outcome: 'open',
  })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  return history
}
