import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Play } from 'lucide-react'

const articles = [
  {
    id: 'london',
    title: 'What is the London session?',
    body: `The London session runs from 7:00 AM to 11:00 AM GMT — that's Ghana time too. It's when European banks open and trading volume spikes. Gold, Bitcoin, and NZD/USD move most during this window.

PipSense captures the first 15-minute candle at 7:00 AM to set your "London High" and "London Low" — the range price must break or sweep for a signal to fire.`,
  },
  {
    id: 'sweep-breakout',
    title: "Sweep vs Breakout — what's the difference?",
    body: `A **Breakout** means price crossed a London level and closed on the other side — momentum is continuing in that direction.

A **Sweep** means price crossed the level but closed back inside the range — a liquidity grab or "fake out" that often reverses. Sweep Low → BUY. Sweep High → SELL.

This is the same concept taught in **Callisto FX Raw** — price hunts stops above/below a range before reversing.`,
  },
  {
    id: 'liquidity',
    title: 'Liquidity & stop hunts',
    body: `**Liquidity** is where stop losses cluster — above highs and below lows. Smart money often pushes price into these zones to fill orders, then reverses.

When PipSense flags a **Sweep**, that's exactly this: price took liquidity beyond the London range and closed back inside. You're trading with the reversal, not the fake breakout.`,
  },
  {
    id: 'profit-mgmt',
    title: 'Profit management — partials & break even',
    body: `PipSense uses a 4-step exit plan:

1. **Partial (35%)** at +50 pips — bank profit early
2. **Move SL to break even** — remaining position can't lose money
3. **TP1–TP3** — scale out 30% / 20% / 15% at 1:1, 1:2, 1:3

After the 50-pip partial, always move your stop to entry. If price comes back, you keep the partial profit and exit the rest at zero loss.`,
  },
  {
    id: 'sl-tp',
    title: 'Stop Loss & Take Profit explained',
    body: `Your **Stop Loss (SL)** is where you exit if the trade goes wrong — it caps your loss in dollars.

**Take Profits** are targets where you close portions of the trade. PipSense splits exits so you lock profit while letting winners run.`,
  },
  {
    id: 'rr',
    title: 'What does R:R mean?',
    body: `Risk-to-Reward (R:R) compares how much you could lose vs gain. A 1:2 R:R means for every $1 risked, you target $2 profit.

PipSense uses 1:1, 1:2, and 1:3 targets — so even winning just TP1 covers your risk.`,
  },
  {
    id: 'mt5',
    title: 'How to copy a trade into MT5',
    body: `1. Tap "Copy MT5" on any signal card
2. Open MetaTrader 5 on your phone or PC
3. Find XAUUSD, BTCUSD, or NZDUSD in Market Watch
4. Tap New Order → paste the copied text
5. Set your lot size (default 0.04)
6. Confirm Entry, SL, and TP levels match
7. Tap Buy or Sell

Always double-check prices before confirming — markets move fast.`,
  },
]

const videos = [
  {
    id: 'liquidity-stops',
    title: 'Liquidity & how stop hunts work',
    source: 'Recommended watch',
    youtubeId: '5d-yZ3E7b6o',
    url: 'https://youtu.be/5d-yZ3E7b6o?si=d0QWK6BSzZe6nwT0',
    description: 'Understand where liquidity sits and why sweeps above/below the London range often reverse — the core idea behind PipSense signals.',
  },
  {
    id: 'callisto-channel',
    title: 'Callisto FX Raw — full channel',
    source: 'Callisto FX Raw',
    youtubeId: null,
    url: 'https://www.youtube.com/@CallistoFXRaw',
    description: 'Callisto FX Raw covers smart money concepts, liquidity, inducement, and session-based setups. PipSense London sweeps align with this framework — watch their liquidity and sweep videos to deepen your understanding.',
  },
]

function Article({ article }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/50"
      >
        <span className="font-medium text-sm pr-4">{article.title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-teal-accent shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-text-secondary leading-relaxed whitespace-pre-line border-t border-divider pt-3">
          {article.body.split('**').map((part, i) =>
            i % 2 === 1 ? <strong key={i} className="text-text-primary">{part}</strong> : part
          )}
        </div>
      )}
    </div>
  )
}

function VideoLesson({ video }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-surface/50"
      >
        <div className="flex items-center gap-3 pr-4">
          <div className="w-9 h-9 rounded-lg bg-brand-blue/20 flex items-center justify-center shrink-0">
            <Play className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-medium text-sm block">{video.title}</span>
            <span className="text-xs text-text-muted">{video.source}</span>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-teal-accent shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-divider pt-3">
          <p className="text-sm text-text-secondary mb-3">{video.description}</p>
          {video.youtubeId ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black mb-3">
              <iframe
                title={video.title}
                src={`https://www.youtube.com/embed/${video.youtubeId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-8 rounded-lg bg-surface border border-border text-sm text-teal-accent hover:border-teal-accent mb-3"
            >
              <Play className="w-5 h-5" /> Browse Callisto FX Raw on YouTube
            </a>
          )}
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-teal-accent hover:underline"
          >
            Watch on YouTube <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}

export default function Learn() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Learn</h1>
      <p className="text-text-muted text-sm mb-4">Trading basics + liquidity concepts</p>

      <h2 className="text-sm font-semibold text-teal-accent mb-2">Video lessons</h2>
      <div className="space-y-3 mb-6">
        {videos.map((v) => (
          <VideoLesson key={v.id} video={v} />
        ))}
      </div>

      <h2 className="text-sm font-semibold text-text-secondary mb-2">Articles</h2>
      <div className="space-y-3">
        {articles.map((a) => (
          <Article key={a.id} article={a} />
        ))}
      </div>
    </div>
  )
}
