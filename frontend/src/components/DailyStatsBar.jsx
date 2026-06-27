export default function DailyStatsBar({ stats }) {
  const {
    tradesToday = 0,
    maxTrades = 6,
    consecLoss = 0,
    maxConsec = 4,
    halted = false,
    perfectSignals = 0,
    winRate = 0,
  } = stats || {}

  return (
    <div className="glass-card p-3 mb-4">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-text-muted text-xs">Trades today</p>
          <p className={`font-mono font-semibold text-sm ${tradesToday >= maxTrades ? 'text-sell' : 'text-text-primary'}`}>
            {tradesToday} / {maxTrades}
          </p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Perfect</p>
          <p className="font-mono font-semibold text-sm text-buy">{perfectSignals}</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Win rate</p>
          <p className="font-mono font-semibold text-sm text-buy">{winRate}%</p>
        </div>
        <div>
          <p className="text-text-muted text-xs">Session</p>
          <p className={`font-semibold text-sm ${halted ? 'text-sell' : 'text-buy'}`}>
            {halted ? 'Halted' : 'Active'}
          </p>
        </div>
      </div>
    </div>
  )
}
