# Walkthrough Video — 5 minutes maximum

The brief asks for exactly two things beyond the demo: **one decision you are proud
of, and one you are unsure about.** Do not narrate the code line by line.

Record with OBS or Windows Game Bar (Win+G). Screen + mic. Keep to 5:00.

---

## 0:00-0:30 — Who and what

> "I'm Varshith. This is a pre-sales voice agent for Aranya Greens in Tellapur.
> I'll call it, break it on purpose, show you what a call costs, and then talk
> through one decision I'm proud of and one I'm still unsure about."

---

## 0:30-2:00 — Live call (the demo)

Open `/`. Click Start call. Speak these, in this order:

1. **"3 BHK ka price kitna hai? Tellapur lo amenities enti?"**
   → point out: *answered in the same language mix I used*, and the price came
   from the fact sheet, not the model.

2. **"RERA number enti? Exact number cheppandi."**
   → *"It refuses. It does not know, and it says so. That is deliberate — the
   alternative is inventing a RERA number for a one-crore purchase."*

3. **"Budget one crore thirty lakh, next three months. Saturday morning site
   visit book cheyyandi."**
   → switch to `/dashboard.html`: the booking is in the CRM table, transcript is
   there, per-turn latency is there, cost in rupees is there.

---

## 2:00-2:45 — The numbers

On the dashboard KPIs:

> "Roughly **Rs 4 to 7 a call**. But the split is the interesting part: **TTS is
> about 85-90 percent of the bill, the language model is about one percent.**
> Everyone assumes the model is the expensive bit. It isn't. That's why replies
> are capped at 160 tokens — shorter replies are cheaper *and* faster *and* better
> on a phone call."

---

## 2:45-3:30 — Where it breaks (do not skip this)

> "Three things are broken and I know why."

- Whisper transcribes **silence as "Thank you."** → needs client-side VAD.
- **"Naa peru Varshith" became "Napiru Varshith."** The conversation survives
  because the model reads intent, but **the CRM row is wrong.** Fix is reading the
  name back for confirmation.
- One turn took **12 seconds**. Unacceptable on a call; needs a hard timeout with
  a holding phrase.

---

## 3:30-4:15 — The decision I'm proud of

> "Rohit asked me to make sure it never says it's a bot. I didn't build that.
>
> It never volunteers it. But asked directly, it says it's an AI and offers a human.
> Three reasons: the regulatory exposure under TRAI and DPDP lands on Aranya, not
> on me; the illusion breaks under pressure anyway, and then the buyer hasn't just
> learned it's AI, they've learned Aranya lied; and the moment it breaks is the
> worst possible moment — mid-decision on a one-crore flat.
>
> I told him what would change my mind: if the dashboard shows people dropping off
> right after the disclosure turn, that's data, and we revisit it."

---

## 4:15-4:50 — The decision I'm unsure about

> "I tested on real human Telugu recordings from an open corpus. Whisper
> auto-detected them as **Tamil** — wrong script entirely. Forcing `language=te`
> fixes those clips.
>
> But when I tested that fix on code-mixed Hinglish — which is what Rohit says his
> buyers actually speak — forcing Telugu made it **worse**. So I kept auto-detect,
> optimising for the common case and accepting that pure monolingual Telugu
> degrades.
>
> I'm genuinely unsure that's right. The honest answer is I'd route on detected
> language per utterance, and I haven't built that yet."

---

## 4:50-5:00 — Close

> "Everything's in the summary document — code, economics memo, tradeoffs, the
> note to Rohit, and three call recordings including the one that broke. Thanks."

---

## Checklist before recording
- [ ] Server running, dashboard already has bookings in it
- [ ] Mic tested, system audio audible
- [ ] Browser zoom ~125% so text is readable
- [ ] Close Slack/WhatsApp/notifications
- [ ] One practice run — **under 5:00**
