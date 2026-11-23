# Summary - AI Pre-Sales Voice Agent for Aranya Developers

**Dyapa Varshith Reddy** · varshithreddy4570@gmail.com · +91 7386309294
Submitted for the Convey Labs Forward Deployed Backend Engineer challenge.

---

## What this is

A voice agent that works as a pre-sales executive for **Aranya Greens, Tellapur**
(fictional project, real location). You call it from a browser, speak in Telugu,
Hindi or English — mixed freely — and it answers project questions from a fact
sheet, refuses to invent what it does not know, qualifies you on budget, timeline
and intent, and books a site visit into a CRM stand-in. Every call is transcribed,
costed per turn, and scored hot/warm/cold.

**One project done properly rather than both done shallowly.** The brief says
"Depth beats breadth", so Aranya Skyline is deliberately not implemented.

---

## Every deliverable

| # | Deliverable | Where |
|---|---|---|
| 1 | **Summary document** | this file |
| 2 | **Working agent** | `<LIVE_URL>` — call page at `/`, dashboard at `/dashboard.html` |
| 3 | **Call recordings (3, incl. a failure)** | Attached to this email: `6_Call_Recordings_Transcripts.pdf` + `7_Call_Audio.zip` |
| 4 | **Code + README** | `<REPO_URL>` — [`README.md`](../README.md), runs with `npm install && npm start` |
| 5 | **Economics memo** | Attached: `2_Economics_Memo.pdf` |
| 6 | **Tradeoffs note** | Attached: `3_Tradeoffs_Note.pdf` |
| 7 | **Note to Rohit** | Attached: `4_Note_to_Rohit.pdf` |
| 8 | **Walkthrough video (5 min)** | `<VIDEO_URL>` |

Supporting evidence, all measured by me:
- [`evidence/PROVIDER_SELECTION.md`](../evidence/PROVIDER_SELECTION.md) — why each model, with the probes that rejected the others
- [`evidence/TEST_RUNS.md`](../evidence/TEST_RUNS.md) — full call logs, costs, latencies
- [`evidence/HUMAN_VOICE_TEST.md`](../evidence/HUMAN_VOICE_TEST.md) — tested against **real human recordings**, not my own synthesis
- [`docs/FACT_SHEET.md`](FACT_SHEET.md) — the invented-but-realistic project data

---

## The five required capabilities

| # | Required | How it is met |
|---|---|---|
| 1 | Talk to it by phone or web link | Web call link. Hold-to-talk, browser mic. Telephony deliberately skipped — reasoning in Tradeoffs §1 |
| 2 | Natural conversation: interruption, off-topic, pauses, language switching | Verified on real human audio. Replies mirror the caller's language mix. **Acoustic barge-in is NOT implemented** — see Tradeoffs §7 |
| 3 | Correct answers + an honest "I don't know" | Grounded fact sheet; RERA number, discounts, maintenance charges and competitor comparisons are all refused by design |
| 4 | Book a site visit, saved visibly | SQLite `site_visits`, shown in the dashboard. 4 bookings recorded so far |
| 5 | See what happened on each call | Dashboard: full transcript, per-turn latency split, captured fields, outcome, cost |

---

## How it works, end to end

```
browser mic (webm/opus)
   │
   ├─ POST /api/call/:id/turn
   │
   ├─ STT   Groq whisper-large-v3-turbo        ~300-680 ms
   ├─ LLM   Groq qwen3.8-27b + fact sheet      ~300-350 ms
   ├─ TTS   AWS Polly neural (Kajal, en-IN)    ~560 ms
   │
   ├─ base64 mp3 returned, browser plays it    total ~1.0-2.0 s
   │
   └─ AFTER replying: a second LLM call extracts JSON
      (name, config, budget, timeline, purpose, visit day/time)
      → SQLite: calls, turns, site_visits
```

Nothing is hidden behind an SDK. Every HTTP call, header, retry and cost line is
written out in `src/core/providers.js` — the brief says *"The framework handles it"
is not an answer*.

---

## Numbers (measured from the database, not from pricing pages)

| Metric | Value |
|---|---|
| Completed calls | 7 |
| Site visits booked | 4 |
| **Cost per call** | **Rs 4.17** |
| **Cost per booked site visit** | **Rs 7.30** |
| TTS share of cost | **84%** |
| LLM share of cost | **2.0%** |
| Mean turn latency | 2512 ms |
| Worst turn latency | 12751 ms |

**The finding that drives every decision: TTS is ~85-90% of the bill, the LLM is
~1%.** Optimising the model is pointless; every cost lever is characters spoken.
That is why replies are capped at 160 tokens. Modelled at Rohit's 3,000 leads/month
on realistic 4-minute calls: **Rs 54,000/month vs Rs 1.6-2.4 lakh for 8 telecallers**
— full workings and caveats in the economics memo.

---

## Three things I found by measuring, not assuming

**1. An ungrounded model invents prices.** Asked "3 BHK ka price kitna hai?" with no
fact sheet, `gpt-oss-20b` answered **"12 crores"** for a Rs 1.26 crore flat — 10x
wrong. With the fact block injected: 4/4 correct, 0 hallucinations across 5
adversarial probes. This is the entire argument for grounding, and I have the
before/after.

**2. The "obvious" models were unusable.** `llama-3.3-70b-versatile` returns **404**
(decommissioned). `gpt-oss-120b/20b` return an **empty `content`** with the text
buried in a `reasoning` field. Only `qwen3.8-27b` answered reliably. Probing beat
reputation.

**3. Forcing a language makes code-mixed speech worse.** Whisper auto-detected real
native Telugu audio as **Tamil script**. Setting `language=te` fixes that clip — but
it *destroys* the Hinglish that is the dominant real input ("Possession kab milega
sir?" became unusable). **Auto-detect stays.** A measured tradeoff, not an oversight.

---

## What does not work yet

Stated here rather than buried, because the brief grades honesty.

| Defect | Status |
|---|---|
| **HTTP 500 on a live turn** when the LLM rate-limited — caller got dead air | **FIXED.** Honours `Retry-After`, exponential backoff, plus a degraded mode that always speaks. Re-tested. See `CALL-3-FAILURE` |
| **ElevenLabs quota died mid-build** (40k chars total) and the agent went mute | **FIXED.** TTS chain is now Polly → Edge TTS → ElevenLabs. A vendor outage cannot silence it |
| Whisper hallucinates speech from silence ("Thank you.") | **OPEN.** Needs client-side VAD |
| Indian names and spoken numbers mangled ("Naa peru Varshith" → "Napiru Varshith") | **OPEN.** CRM rows can be wrong; needs read-back confirmation |
| One turn took **11,981 ms** | **OPEN.** Needs a hard timeout with a holding phrase |
| Confident answer to a garbled transcript | **OPEN.** Should have asked for a repeat |
| No hot-lead alerting to the sales manager | **OPEN.** Rohit asked for it; highest-value next build |
| No acoustic barge-in | **OPEN by design.** Needs streaming STT |
| Only Aranya Greens | **By design.** Depth over breadth |

---

## The one thing I did not build as asked

Rohit said: *"Please make sure it never says it is a bot."*

**I did not build that.** The agent never volunteers it, but if asked directly it
says it is an AI assistant and offers a human. Reasons — regulatory exposure under
TRAI/DPDP lands on **Aranya**, not the vendor; the illusion collapses under the
exact adversarial pressure Convey Labs promises to apply; and discovery mid-way
through a Rs 1.26 crore decision is far worse than disclosure up front. The full
argument, in plain language and addressed to Rohit, is in the Note to Rohit.

I flagged it rather than silently ignoring it, and I said what would change my mind:
measured drop-off after the disclosure turn.

---

## Questions I would have asked a real client

1. The email says submit to `tech@conveylabs.ai`; the PDF rules and the questions
   line both say `official@conveylabs.ai`. I am sending to both.
2. The shortlist email says **Backend Developer**; the PDF says **Forward Deployed
   Backend Engineer**. Which is the role?
3. Rohit's real connect rate and site-visit conversion — my cost-per-booking uses
   industry estimates, and his CRM would make it real.
