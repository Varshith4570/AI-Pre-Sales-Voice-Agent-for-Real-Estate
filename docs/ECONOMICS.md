# Economics Memo — Aranya Pre-Sales Voice Agent

**Every figure here comes from the `calls` table of the running system.** Costs are
written per turn as the call happens, so these are measured, not modelled. The live
numbers are at `GET /api/economics`.

---

## 1. What one call actually costs

Measured over completed test calls (avg 4 turns, 11.4 s of caller audio):

| Component | Provider | Measured cost | Share |
|---|---|---|---|
| Text to speech | ElevenLabs multilingual v2 | $0.0736 | **89.5%** |
| Speech to text | Groq whisper-large-v3-turbo | $0.0076 | 9.2% |
| LLM | Groq qwen3.8-27b | $0.0011 | **1.3%** |
| **Total per call** | | **$0.0822** | |
| **In rupees (USD 84.5)** | | **Rs 6.95** | |

### The finding that should drive every decision
**TTS is ~90% of the bill. The LLM is 1.3%.**

Most "AI calling cost" conversations focus on the model. That is the wrong place to
look. Optimising the LLM from 1.3% to 0.6% saves half a paisa. Cutting spoken
characters by a third saves ~Rs 2.30 a call. Concretely:

- `max_tokens` is capped at **160**. A chattier agent is both slower and dearer.
- The greeting is a fixed string, not generated, so it is identical and instant.
- Measured in Call 1: as replies got shorter, turn latency fell 2406 ms -> 1109 ms.
  **Shorter replies are simultaneously cheaper, faster and better on a phone call.**

---

## 2. What a booked site visit costs

Measured in the current dataset: **Rs 13.89 per booked site visit** (Rs 6.95 x 2 calls,
1 booking). That ratio comes from 2 calls and is far too small a sample to trust.

Modelled over Rohit's actual volume of **3,000 leads/month**, using a longer and more
realistic 4-minute call (~90 s of caller speech, 12 turns):

| | Conservative | Expected | Optimistic |
|---|---|---|---|
| Cost per call | Rs 22 | Rs 18 | Rs 14 |
| Connect rate | 55% | 65% | 75% |
| Site visit booking rate (of connects) | 8% | 12% | 18% |
| Calls / month | 3,000 | 3,000 | 3,000 |
| **Monthly AI cost** | **Rs 66,000** | **Rs 54,000** | **Rs 42,000** |
| Site visits booked | 132 | 234 | 405 |
| **Cost per booked site visit** | **Rs 500** | **Rs 231** | **Rs 104** |

Assumptions stated plainly, because they drive the answer more than the per-minute rate:
connect and booking rates are **industry-typical estimates, not measured by us**. Rohit's
own CRM has his real numbers, and that is the first thing to plug in.

---

## 3. Against the current team

Rohit has **8 telecallers** for 3,000 leads a month.

| | 8 telecallers | AI agent (expected) |
|---|---|---|
| Monthly cost | Rs 1,60,000 - 2,40,000 (at Rs 20-30k each) | **Rs 54,000** |
| Hours covered | ~9/day, weekdays | **24/7, including evenings and weekends** |
| Response time | hours, sometimes next day | **seconds** |
| Consistency | varies by caller and by hour | identical every call |
| CRM updates | often skipped | **automatic, every call** |
| Capacity on a campaign spike | fixed at 8 | limited by API rate, not headcount |

**AI cost is roughly a quarter to a third of the team cost.** But see section 5 — that is
not the honest full story, and I do not recommend replacing the team.

---

## 4. The real economic argument is speed, not cost

Rohit's own email names the actual problem: *"Many leads are called hours after they
enquire, and by then they have already spoken to three other builders."*

Industry lead-response research consistently finds that contact within the first
few minutes converts dramatically better than contact an hour later. At
**Rs 85 lakh to Rs 1.6 crore a flat**, a single additional sale dwarfs the entire
annual AI bill. The agent answers in **~1.5 seconds**, at 11 pm on a Sunday.

If this works, it will not be because it saved Rs 1 lakh a month on salaries.
It will be because it got to leads first.

---

## 5. Where this costing could be wrong — read this before quoting it

1. **Sample size is 2 calls.** The per-call figure is solid; the per-booking figure
   is arithmetic on one booking, not a conversion rate.
2. **Test calls were short** (11 s of audio). A real 4-minute call costs more,
   which is why section 2 models rather than extrapolates.
3. **No telephony cost is included.** This build uses a web-call link. Adding real
   PSTN calling (Exotel/Plivo/Twilio) adds roughly **Rs 0.40-0.80 per minute**,
   i.e. Rs 1.60-3.20 on a 4-minute call — comparable to the entire AI cost today.
   Published rates; we have not measured them.
4. **ElevenLabs volume pricing is not modelled.** At 3,000 calls/month the
   character volume lands in a higher tier where unit cost falls.
5. **The key we used is scoped without `user_read`**, so quota cannot be polled
   via API. We meter characters ourselves. For production, billing alerts must be
   set on the ElevenLabs dashboard directly.
6. **Human handover is not costed.** Hot leads should reach a human, and that
   human's time is a real cost this memo does not carry.

---

## 6. Levers, in order of actual impact

| Lever | Effect | Why |
|---|---|---|
| Shorten replies | **Largest** | TTS is 90% of cost and scales with characters |
| Cheaper TTS voice | **Large** | Same reason; trade quality for ~60-70% of the bill |
| Cache common answers as audio | Large | Price and location answers repeat on nearly every call |
| Client-side VAD | Medium | Stops paying STT for silence (see Failure B) |
| Trim LLM history window | Small | Already capped at 10 turns |
| Swap LLM | **Negligible** | It is 1.3% of the bill |
