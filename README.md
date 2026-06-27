# PipSense

AI-powered London Open Range trading signals for Ghanaian retail forex and gold traders.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS v4 |
| Backend | Python FastAPI |
| Signal Engine | Ported from Pine Script (`indicator`) |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python demo_data.py    # generate demo candle JSON
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — complete onboarding, then use **DEMO** mode to replay past signals.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

| Variable | Purpose |
|----------|---------|
| `SNWOLLEY_HACKATHON_API_KEY` | Team key for TTS/STT/Vision (`X-API-Key` header) |
| `SNWOLLEY_AGENT_API_KEY` | Snwolley platform key for Agents API |
| `SNWOLLEY_AGENT_ID` | Agent ID (default `107`) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram channel ID |
| `TWELVE_DATA_API_KEY` | Twelve Data API for live + historical 15-min OHLC |
| `VITE_API_URL` | Frontend API base (default: `/api` proxy) |

### Snwolley endpoints used

- **Agents** — `POST https://v1.snwolley.ai/v1/chat/completions` → signal explanations
- **TTS** — `POST https://v1.snwolley.ai/api/v1/hackathon/tts` → voice announcements

Without keys, PipSense falls back to template explanations and browser speech synthesis.

## API Endpoints

- `GET /health` — health check
- `GET /signal/current` — current signal state
- `GET /signal/history` — past signals
- `GET /range/today` — London High / Low
- `GET /price/live` — current price
- `POST /explain` — AI explanation
- `POST /voice` — TTS audio
- `GET /demo/candles` — historical candles
- `POST /demo/replay` — run engine on a date

## Screens

1. **Onboarding** — broker, balance, instruments, lot size
2. **Live Signal** — signal card, London range, daily stats, LIVE/DEMO toggle
3. **History** — trade log + engine signals
4. **Risk Calculator** — live pip/dollar risk
5. **Learn** — beginner articles

## Signal Logic

London Open Range strategy from `indicator` (Pine Script):

- Range: first 15-min candle at 7:00 AM GMT
- Breakout High → BUY | Sweep High → SELL
- Breakout Low → SELL | Sweep Low → BUY
- Max 6 trades/day, halt after 4 consecutive losses

Built for Cursor Hackathon UCC 2026 🇬🇭
