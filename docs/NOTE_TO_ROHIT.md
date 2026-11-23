# Note to Rohit Menon, Head of Sales, Aranya Developers

Hi Rohit,

You asked for an AI that does the job of a pre-sales executive, and what it would
cost. Here is what I built, what it costs, what it will not do, and the one thing
I did differently from what you asked.

---

## What it does today

You can call it and talk to it. It answers as Meera from Aranya Developers.

- **It picks up immediately**, at any hour. Your point about leads waiting hours is
  the problem I built this around.
- **It speaks the way your buyers speak.** I tested it in Telugu, Hindi and English
  mixed into the same sentence, which is how the calls actually come in. It replies
  in whatever mix the caller used.
- **It knows Aranya Greens properly.** Prices for all four configurations, possession
  dates, distances to ORR, Financial District, schools and hospitals, amenities,
  payment plan, booking amount.
- **It books the site visit** and writes the lead into a dashboard your team can
  open: name, configuration, budget, timeline, and the day and time they want.
- **It writes up every call** — full transcript, what was captured, and whether the
  lead was hot, warm or cold. Nothing depends on a caller remembering to update the CRM.

In testing it took a buyer from "what is the price" to a booked Saturday morning
site visit in **four exchanges and under fifteen seconds of talking.**

---

## What it costs

**About Rs 7 per call** at current length. On a realistic four-minute call, roughly
**Rs 14 to Rs 22**.

Across your 3,000 leads a month, that is roughly **Rs 54,000 a month**, against
Rs 1.6-2.4 lakh for eight telecallers. The full breakdown is in the economics memo.

One honest caution: that Rs 54,000 does not yet include telephone-line charges for
real phone calls, which would add roughly Rs 1.60-3.20 per four-minute call. I have
not measured those, so I have not hidden them inside a confident number.

---

## The one thing I did not do as you asked

> *"Please make sure it never says it is a bot. Our customers hang up on bots."*

**I did not build that, and I would advise against it.**

The agent never announces it. It has a name, it sounds human, and it does not open
with "I am an AI". But if a caller asks directly — *"aap insaan ho ya robot?"* — it
tells the truth and offers to connect them to your sales team.

Three reasons, and the third is the one that matters most to you:

1. **Regulation is moving against it.** TRAI's rules on commercial calling and the
   DPDP Act both point towards disclosed, consented automated contact. If that is
   enforced, the penalty lands on Aranya Developers, not on the software vendor.

2. **Denial does not survive contact.** Ask it to sing, ask about yesterday's match,
   interrupt it twice — the illusion breaks anyway. Then the buyer has not just
   discovered it is AI, they have discovered Aranya lied to them. That is strictly
   worse than telling them in the first place.

3. **The moment it breaks is the worst possible moment.** A buyer who finds out
   mid-site-visit that "Meera" was software is now suspicious about a Rs 1.26 crore
   purchase, and about everything else your team told them.

**I think your real worry is callers hanging up, not the word "bot".** The agent is
built for that: it answers instantly, speaks their language, knows the project
cold, and never sounds like an IVR. If disclosure does cost us calls, that will
show up in the dashboard as a drop after the disclosure turn — and we can measure
it and revisit. I would rather test that honestly than build a liability into your
brand. If you still want denial after seeing the data, that is your call to make,
not mine, but I will not put it in without you deciding it with the numbers in front of you.

---

## Your wishlist, point by point

| What you asked | Status |
|---|---|
| "Leads wait hours. That has to stop." | **Done.** Answers in about 1.5 seconds, 24/7. |
| "Half my leads are not serious. I want to know which half." | **Done.** Every call is scored hot, warm or cold on budget, timeline and intent. |
| "It should know our projects better than my team does." | **Done for Aranya Greens.** Aranya Skyline needs its fact sheet; about a day's work. |
| "Buyers always ask about the area." | **Done.** Distances, drive times, schools and hospitals all answered from the fact sheet. |
| "Serious buyers should end up at the site." | **Done.** It asks for the visit once budget and timeline are known, and books it. |
| "My sales manager should never miss a hot one." | **Partly.** Hot leads are flagged in the dashboard, but **nobody is alerted yet.** A WhatsApp or SMS ping to the manager is the single most valuable next thing to build. |
| "When we launch a campaign, it gets crazy." | **Partly.** It found its own limit during testing — the AI provider rate-limited us and one call broke. I fixed it so the agent keeps talking instead of going silent, but real campaign-scale load has not been tested. |
| "It has to be cheaper than my team." | **Yes, roughly a third of the cost.** See the caution on telephony above. |
| "Never say it is a bot." | **Not done, deliberately.** See above. |

---

## What it will not do yet

I would rather you hear these from me than find them on a live call.

- **It only knows Aranya Greens.** Ask it about Aranya Skyline and it has nothing.
- **It does not phone people.** Today it is a web link, not an outbound caller.
  Outbound dialling is a separate build and brings telephony cost and DND rules with it.
- **It does not alert your sales manager.** Hot leads sit in the dashboard until
  someone looks.
- **It mishears Indian names and large numbers.** In testing, "Naa peru Varshith"
  came through as "Napiru Varshith", and "one crore thirty lakh" as a mangled numeral.
  The conversation still worked, but **your CRM row can be wrong**, so until it reads
  the name and budget back for confirmation, treat captured names as unverified.
- **It can mishear silence as speech.** On a quiet line it occasionally invents a
  short phrase. Known cause, known fix, not built yet.
- **It will not negotiate.** Discounts, RERA number, maintenance charges, legal
  documents and unit availability are all deliberately blocked. It says it does not
  know and promises the sales team will confirm. I would rather it look unhelpful
  once than quote a number you then have to honour.

---

## What I need from you before this goes live

1. **The real fact sheet** for Aranya Greens, with the **RERA number** and the current
   price list. Mine is realistic but invented, and the agent must never quote a price
   you have not approved.
2. **Your actual numbers** — connect rate, how many connects become site visits, and
   what a site visit is worth. My cost-per-visit figure uses industry estimates; yours
   would make it real.
3. **A decision on disclosure**, in writing, after reading the section above.
4. **Where hot leads should go** — which number gets the WhatsApp, and how fast
   someone acts on it. The agent booking a visit nobody follows up on is worthless.
5. **Approval to spend on telephony** if you want real phone calls rather than a link.
6. **Thirty of your own recorded calls**, if you have them. The fastest way to make
   this sound like your best telecaller is to study what he actually says.

---

## My honest recommendation

**Run it on a slice, not the whole funnel.** Point one campaign's leads at it for two
weeks — ideally the evening and weekend leads your team covers worst. Compare
booked site visits per hundred leads against your telecallers over the same period.

I do **not** recommend replacing your eight callers. The agent is better at speed,
consistency and hours. Your people are better at a nervous buyer on a Rs 1.5 crore
decision. The version of this that works is the agent catching every lead in the
first minute and handing the serious ones to a human while they are still interested.

If after two weeks it is not booking more visits per hundred leads than the team
does in those same hours, I would tell you to stop.

Varshith
