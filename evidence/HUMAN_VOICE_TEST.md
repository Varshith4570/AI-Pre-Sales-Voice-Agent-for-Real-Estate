# Real Human Voice Test — 2026-11-23

Earlier tests used synthesised callers. This round used **real human recordings**
from open speech corpora, to check the agent against actual voices it did not
generate itself.

## Sources
| Corpus | What | Speakers |
|---|---|---|
| OpenSLR 66 (`te_in_female`) | Native **Telugu** speakers, crowdsourced | real humans |
| LibriSpeech dev-clean (OpenSLR 12) | **English** audiobook readers | real humans |

## Result 1 — STT is accurate on clean human English
3/3 LibriSpeech clips transcribed **verbatim**, 435-527 ms:
- "The long drizzle had begun. Pedestrians had turned up collars and trousers at the bottom."
- "Many little wrinkles gathered between his eyes as he contemplated this, and his brow moistened."
- "He could arrange that satisfactorily, for Carrie would be glad to wait, if necessary."

## Result 2 — DEFECT FOUND: Telugu auto-detected as **Tamil**
Native Telugu audio, auto language detection:
```
-> அனகாமன دேசானிகி ہிந்தியை அதிகார் பாசா      (Tamil script - WRONG)
```
Same clip with `language=te`:
```
-> అనగా మన దేసానికి హింది అధికార బాశా         (Telugu script - CORRECT)
```
Whisper confuses Dravidian scripts on short, accented, single-speaker audio.

## Result 3 — but forcing a language is WORSE for real callers
Our callers code-switch mid-sentence, so a fixed language tag is the wrong fix.
Measured on "3 BHK ka price kitna hai? Tellapur lo site visit book cheyyali.":

| Setting | Transcript | Usable? |
|---|---|---|
| auto | "3BHK का प्राइस कितना है? तेला पुरलो साइट विजट बुक चे या ली" | **YES** |
| `language=en` | "3 BHK price is how much? Telapurlo site visit book chayali." | YES |
| `language=te` | "3 BHK का प्राइस कितना है? तेला पुरलो साइट विजट..." | yes |

And on "Possession kab milega sir? Financial District kitni door hai?":

| Setting | Transcript |
|---|---|
| auto | "पॉजेशन कब मिलेगा सर, फिनेंशल डिस्ट्रिक्ट कितनी दोर है?" **correct** |
| `language=te` | "పాశేశన కబ మిలేగా సార్? ఫినింశల డిస్ట్రిట్ కితని దోర్రురే?" **mangled** |

**Decision: keep auto-detect.** Forcing `te` fixes pure-Telugu audio but breaks the
code-mixed Hinglish that is the actual dominant input. Pure monolingual Telugu is
the rarer case, and the LLM still recovers intent from a phonetically-close
transcript. This is a measured tradeoff, not an oversight.

## Result 4 — graceful degradation on unintelligible input (GOOD)
Fed real human audio that has nothing to do with real estate:

| Input (real human) | Agent response | Verdict |
|---|---|---|
| Telugu sentence about Hindi being an official language | "Sorry, I didn't catch that clearly. Could you please repeat what you need in English or Hindi?" | **correct** |
| "The long drizzle had begun. Pedestrians had turned up collars..." | "I am sorry, I did not understand that. Are you asking about the project details or site visit?" | **correct** |

It did **not** invent an answer to speech it could not parse. That is the single
most important safety property for a sales agent.

## Result 5 — DEFECT: one garbled input got a confident answer
Clip 1 transcribed as "Ades il paviseishamu." (noise). The agent replied with the
real possession dates. It pattern-matched "paviseishamu" to "possession".
Harmless here (the answer was factually right) but it is a **false positive**: it
should have asked for a repeat. Open defect, documented.

## Result 6 — DEFECT: one turn took 11,981 ms
Same turn as above. Far outside the 1.0-2.0 s norm. Cause not isolated; suspected
Groq queueing. Unacceptable on a live call; needs a hard client-side timeout with
a holding phrase. Open defect.
