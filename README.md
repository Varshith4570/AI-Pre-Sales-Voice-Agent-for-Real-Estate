# Aranya Pre-Sales Voice Agent

AI pre-sales executive for **Aranya Greens, Tellapur, Hyderabad** (fictional project).
Built for the Convey Labs coding challenge.

Call it in **Telugu, Hindi or English — mixed freely**. It answers project questions
from a fact sheet, refuses to invent what it does not know, qualifies the buyer, and
books a site visit into a CRM stand-in. Every call is transcribed, costed and scored.

## Run it

```bash
npm install            # zero native dependencies
cp .env.example .env   # add your Groq + ElevenLabs keys
npm start              # http://localhost:3100
```

Requires **Node 20+** (uses the built-in `node:sqlite`). Tested on Node 24.14.0.

| URL | What |
|---|---|
| `/` | Call page — hold the button, speak, release |
| `/dashboard.html` | Post-call view + CRM stand-in + live economics |
| `/api/health` | Models in use |
| `/api/economics` | Measured cost per call and per booked visit |

## How a turn works

```
browser mic (webm)
   -> POST /api/call/:id/turn
   -> Groq whisper-large-v3-turbo        STT   ~300-680 ms
   -> Groq qwen3.8-27b + fact sheet      LLM   ~300-350 ms
   -> ElevenLabs eleven_multilingual_v2  TTS   ~540-1360 ms
   -> base64 mp3 back to the browser     total ~1.1-2.4 s
   -> (after responding) second LLM call extracts JSON -> SQLite
```

Nothing is hidden behind an SDK: every HTTP call, header, retry and cost line is in
`src/core/providers.js`.

## Layout

| Path | Role |
|---|---|
| `src/core/facts.js` | Fact sheet — the agent's only source of truth |
| `src/core/prompt.js` | Persona, language mirroring, BANT qualification, honesty rules |
| `src/core/providers.js` | STT / LLM / TTS, key failover, per-call cost metering |
| `src/core/agent.js` | One turn end to end + async extraction + booking |
| `src/core/db.js` | SQLite: `calls`, `turns`, `site_visits` |
| `src/server.js` | HTTP API + static pages |
| `docs/` | Fact sheet, economics memo, tradeoffs, note to Rohit |
| `evidence/` | Measured provider selection and test runs |

## Measured, not claimed

| | |
|---|---|
| Cost per call | **Rs 6.95** |
| Cost per booked site visit | **Rs 13.89** (small sample — see memo) |
| TTS share of cost | **89.5%** |
| LLM share of cost | **1.3%** |
| Mean turn latency | **1462 ms** |
| Hallucinations under adversarial probing | **0 / 5** |

Full numbers: `evidence/TEST_RUNS.md`. Live: `GET /api/economics`.

## Known limitations

Documented honestly in `docs/TRADEOFFS.md` §9 — Whisper hallucinating on silence,
Indian names and spoken numbers mangled by STT, no acoustic barge-in, no hot-lead
alerting, single project only.
