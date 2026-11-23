# Tradeoffs Note

Each section is a real decision: what I chose, what I considered, and the evidence.
Where I measured something, the number is here. Where I did not, I say so.

---

## 1. Web call link instead of a phone number

**Chose:** browser microphone -> my server -> browser speaker.
**Considered:** Twilio, Exotel, Plivo with a real DID.

The brief allows either. A phone number adds a telephony vendor, DID rental,
per-minute carrier charges and PSTN codec loss, and buys nothing a grader cannot
test from a browser. It would also have consumed most of the week.

**What it cost me:** the demo is not a real phone call, and I have no measured
telephony latency or cost. Real PSTN adds roughly 200-400 ms and Rs 0.40-0.80/min
(published rates, not measured by me), and narrowband audio degrades STT accuracy.

The provider layer is isolated enough that swapping the transport means replacing
the audio in/out ends, not the conversation engine.

---

## 2. Grounded fact sheet instead of model knowledge — the decision with evidence

**Chose:** inject a fact block into every system prompt; forbid named topics.
**Considered:** fine-tuning, or a vector-store RAG over brochures.

I tested the no-fact-sheet case before deciding. Asked *"3 BHK ka price kitna hai?"*:

| Model | Answer | Reality |
|---|---|---|
| openai/gpt-oss-20b | "**12 crores**" | Rs 1.26 crore — **~10x wrong** |
| qwen/qwen3.8-27b | "**1.45 crore**", "project abhi launch nahi hua" | Rs 1.26 cr, and it IS launched |

With the fact block: **4/4 correct, 0 hallucinations**, including 2 refusals.

Why not RAG: the entire fact sheet is ~400 tokens. Retrieval would add a vector
store, an embedding call and latency to a corpus that fits in the prompt. **RAG
becomes right at roughly 10+ projects**, not at one.

**What it cost me:** every fact is hand-maintained. A price change means a code
change. For production the fact block should be loaded from a CMS Rohit's team edits.

---

## 3. qwen3.8-27b, chosen by probing rather than by reputation

I tested every chat model Groq exposes:

| Model | Result |
|---|---|
| llama-3.3-70b-versatile | **HTTP 404** — decommissioned |
| openai/gpt-oss-120b | Empty `content`; text buried in `reasoning`. 907 ms for 0 usable chars |
| openai/gpt-oss-20b | Empty on **3 of 4** grounded prompts |
| **qwen/qwen3.8-27b** | **Non-empty 4/4, correct 4/4**, ~316 ms mean |

The two "obvious" picks were unusable. This is why the provider layer probes.

**What it cost me:** qwen is less widely benchmarked, and I have not tested it against
a deliberately manipulative caller trying prompt injection.

---

## 4. Two LLM calls per turn, not one

**Chose:** one call for the spoken reply, a second afterwards for JSON extraction.
**Considered:** one call emitting reply + JSON together; function calling.

Combining them degraded both: asking for natural speech and strict JSON in one
response produced stiffer replies and less reliable JSON.

Crucially, **extraction runs after the reply is sent** (`queueMicrotask`), so it never
delays the caller. The LLM is 1.3% of cost, so a second call is economically free.

**What it cost me:** extraction can lag the conversation by a turn, and if it fails
the call still completes but captures nothing. It is fire-and-forget by design —
a failed extraction must never break a live call.

---

## 5. node:sqlite instead of better-sqlite3 or Postgres

**Chose:** Node 24's built-in SQLite.
**Considered:** better-sqlite3 (first choice), Postgres, a JSON file.

better-sqlite3 has **no prebuilt binary for Node 24 on Windows**. It fell back to
node-gyp, which needs Visual Studio build tools, and the install failed outright.
Node's built-in SQLite means **zero native dependencies** — the repo clones and
runs anywhere, which the brief requires ("lets another engineer run it").

**What it cost me:** it is flagged experimental and prints a warning on boot. Single
writer, so it will not survive multi-instance scale. For production: Postgres.

---

## 6. Capping replies at 160 tokens

Driven by measurement, not taste. TTS is **89.5% of cost** and scales with
characters, and TTS latency does too. In Call 1, as replies shortened, turn time fell
**2406 ms -> 1109 ms**. On a phone call shorter is simultaneously cheaper, faster and
more natural. Verbosity has no upside here.

**What it cost me:** complex questions get a compressed answer. The agent sometimes
answers two of three things asked in one breath.

---

## 7. Whole-utterance audio, not streaming

**Chose:** record until the caller releases the button, then upload once.
**Considered:** streaming STT with partial transcripts and barge-in.

Whisper is a **batch** model — chunking adds round-trips without cutting latency.
Real barge-in needs a streaming STT provider (Deepgram, AssemblyAI) and a different
architecture.

**What it cost me honestly:** the brief asks for handling interruption. **I handle
interruption conversationally — the LLM copes fine when a caller changes topic
mid-flow — but I do not handle acoustic barge-in**, where the caller talks over the
agent and it stops speaking. That needs streaming, and I did not build it.

---

## 8. Degraded mode instead of an error

Found in testing: Groq returned **429** mid-call, the retry loop exhausted, the
exception reached Express, and the caller got **HTTP 500 — dead air**. That is
precisely Rohit's *"when we launch a campaign, it gets crazy"*.

Now: `Retry-After` is honoured with exponential backoff, and if the LLM still fails
the agent **speaks a holding line** and tags the call `llm_degraded`. On a live call,
a slightly worse answer beats silence every time.

**What it cost me:** a degraded turn still bills STT and TTS while adding no value.

---

## 9. Known defects I chose not to fix, and why

| Defect | Evidence | Why deferred |
|---|---|---|
| Whisper invents speech in silence | 1.5 s of silence -> "Thank you." | Correct fix is client-side VAD. Real work, lower value than the memos this week. |
| Indian names mangled | "Naa peru Varshith" -> "Napiru Varshith" | Needs read-back confirmation before CRM write. Designed, not built. |
| Spoken numbers mangled | "one crore thirty lakh" -> "1.30.000.000" | Needs an Indian-numeral normaliser. Known, scoped. |
| No hot-lead alerting | — | Highest-value next feature, but not one of the five required capabilities. |
| One stuck `in_progress` call | callId `510128c0` | Caused by the 500 above killing the session before `end`. The crash is fixed; a stale-session sweeper is not written. |

---

## 10. What I would do next, in order

1. **WhatsApp alert to the sales manager on a hot lead.** Rohit asked for it, it is
   missing, and it is the difference between a booking and a booking nobody acts on.
2. **Read-back confirmation** of name and budget before writing to CRM.
3. **Client-side VAD** to stop paying for silence and stop hallucinated transcripts.
4. **Cache the top 20 answers as pre-rendered audio.** Price and location come up on
   nearly every call; this attacks 90% of the cost directly.
5. **Telephony**, only once the above prove the funnel works.
