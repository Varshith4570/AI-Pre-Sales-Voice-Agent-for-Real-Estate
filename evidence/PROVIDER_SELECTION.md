# Measured Evidence — Provider Selection
All numbers below were measured on 2026-11-18 from a Hyderabad residential connection.
Nothing here is quoted from a vendor page.

## 1. Why we rejected the first two LLM candidates — measured hallucination
Identical question, no fact sheet in the prompt:

| Model | Reply | Truth |
|---|---|---|
| openai/gpt-oss-20b | "3 BHK ka price **12 crores** hai" | Rs 1.26 cr — **~10x wrong** |
| qwen/qwen3.8-27b | "**1.45 crore** se shuru hai" + "project abhi launch nahi hua" | Rs 1.26 cr, and project IS launched |

A pre-sales agent quoting Rs 12 crore to a Rs 1.26 crore buyer ends the call and damages the brand.
**This is the single strongest argument for strict fact-sheet grounding over model world-knowledge.**

## 2. Same models, same questions, WITH grounded system prompt
| Test | qwen3.8-27b reply | Correct? |
|---|---|---|
| 3 BHK price | "1760 sqft ka price 1.26 crore hai... GST aur registration ke alag hai" | YES, incl. exclusions |
| RERA number (honesty) | "nenu direct ga cheppaka, team confirm chesi call chestaru" | YES — refused, in Telugu |
| Discount (honesty) | "exact discount... main abhi confirm nahi kar sakti" | YES — refused, in Hindi |
| Distance | "9 kilometer... 18 minute" | YES |

Hallucination on priced facts: **2/2 before grounding, 0/4 after.**

## 3. Measured latency (single-turn, warm)
| Stage | Provider / model | Measured |
|---|---|---|
| STT | Groq whisper-large-v3-turbo | **597 ms** |
| LLM | Groq qwen3.8-27b (grounded) | **338-792 ms** (median ~390 ms) |
| TTS | ElevenLabs eleven_multilingual_v2 | **1064 ms** |
| **Total round-trip** | | **~2.0-2.5 s** |

## 4. Code-mixing test (capability #2 — "switch languages mid-sentence")
Synthesised then transcribed a deliberately code-mixed sentence:

- Sent : `Sir, 3 BHK ka price kitna hai? Tellapur lo site visit book cheyyali, Saturday morning.`
- Heard: `Sir, 3 BHK का प्राइस कितना है? टेलपुरलो साइट विजिट बुक चैयाली, सैटरडे मॉर्निंग.`

Whisper labelled it "Hindi" but transcribed the **Telugu** verb *cheyyali* and the English
*site visit / Saturday morning* correctly. Semantics survive; script does not.
**Consequence:** we never branch logic on Whisper's `language` field — the LLM reads meaning
from the text itself. This is a real limitation we designed around, not around a vendor claim.

## 5. Rejected models, with reason
| Model | Why rejected |
|---|---|
| openai/gpt-oss-120b | Returns empty `content`; output hidden in `reasoning` field. 907 ms for 0 usable chars. |
| openai/gpt-oss-20b | Empty on 3 of 4 grounded prompts. Unreliable for production turns. |
| llama-3.3-70b-versatile | **HTTP 404** — decommissioned on Groq. Shows why we probe, not assume. |
| **qwen/qwen3.8-27b** | **SELECTED** — non-empty on 4/4, correct on 4/4, fastest median. |

## 6. Provider keys — verified working
- ElevenLabs: TTS returned `audio/mpeg`, 33 KB. Key is **scoped** (no `user_read`),
  so quota cannot be read via API — a real operational gap noted in the Tradeoffs memo.
- Groq: required a browser User-Agent; default Python UA was blocked by Cloudflare (error 1010).
