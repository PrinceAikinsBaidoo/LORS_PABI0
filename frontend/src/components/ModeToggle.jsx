export default function ModeToggle({ mode, onChange, sessionStatus }) {
  return (
    <div className="flex items-center justify-between glass-card p-3 mb-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('live')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'live'
              ? 'bg-success/20 text-buy border border-buy/30'
              : 'bg-surface text-text-muted border border-border'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {mode === 'live' && (
              <span className="w-2 h-2 rounded-full bg-buy pulse-dot" />
            )}
            LIVE
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange('demo')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            mode === 'demo'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-surface text-text-muted border border-border'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {mode === 'demo' && (
              <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            )}
            DEMO
          </span>
        </button>
      </div>
      <p className="text-xs text-text-secondary text-right max-w-[140px]">
        {sessionStatus}
      </p>
    </div>
  )
}
