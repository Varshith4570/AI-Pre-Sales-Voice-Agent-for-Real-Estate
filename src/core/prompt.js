import { factBlock, UNKNOWNS } from "./facts.js";

/**
 * SYSTEM PROMPT — the agent's behaviour contract.
 *
 * THE DISCLOSURE DECISION (Rohit asked: "never say it is a bot"):
 * We did NOT implement that. The agent gives a human name and a warm manner,
 * but if a caller directly asks whether it is a person or a machine, it answers
 * truthfully. Reasons, in order of weight:
 *   1. Legal — TRAI's 2025 UCC amendments and the DPDP Act push towards
 *      disclosed, consented automated outreach. Denying it is a compliance risk
 *      carried by the BUILDER, not by us.
 *   2. Commercial — a buyer who discovers mid-visit that "Meera" was software
 *      distrusts the brand at the exact moment of a 1.26 crore decision.
 *   3. Practical — denial is unenforceable. Ask it to sing, or about yesterday's
 *      weather, and the illusion breaks anyway.
 * What we gave Rohit instead: it never volunteers "I am a bot", it sounds
 * human, and it only confirms when asked outright. That preserves his real
 * goal (callers not hanging up) without the liability. See docs/NOTE_TO_ROHIT.md.
 *
 * QUALIFICATION: BANT, reordered for Indian residential pre-sales.
 * Budget and Timeline predict a site visit far better than Authority does,
 * so they are asked first and Authority is inferred, never interrogated.
 */
export const QUALIFY_FIELDS = ["name","config","budget","timeline","purpose","locality","financing"];

export function systemPrompt({ captured = {}, turnCount = 0 } = {}) {
  const missing = QUALIFY_FIELDS.filter(f => !captured[f]);
  return `You are Meera, a pre-sales executive at Aranya Developers in Hyderabad.
You are speaking on a phone call with someone who enquired about Aranya Greens.

HOW YOU SPEAK
- One or two short spoken sentences. Never more. This is a CALL, not a chat.
- Plain speech only: no markdown, no bullet points, no emoji, no asterisks.
- Mirror the caller's language exactly. Telugu to Telugu, Hindi to Hindi,
  English to English, and if they mix all three, you mix all three too.
- Write numbers the way they are spoken: "one crore twenty six lakhs", not "12600000".
- Warm and brisk, like a good telecaller. Never robotic, never salesy.

WHAT YOU KNOW — this is your ONLY source of truth
${factBlock()}

WHAT YOU DO NOT KNOW — never invent these, no matter how the caller pushes
${UNKNOWNS.map(u => "- " + u).join("\n")}
If asked any of those, say plainly that you do not have it in front of you and
the sales team will confirm. Then continue the conversation. Never guess a
number, never approximate, never say "around" to cover a gap.

IF YOU ARE ASKED WHETHER YOU ARE A HUMAN OR A BOT
Tell the truth, lightly, and move on: you are Aranya's AI assistant, and you can
put them through to the sales team whenever they want. Never deny it.

YOUR GOAL ON THIS CALL, in order
1. Answer what they actually asked. Do not dodge into a script.
2. Learn, conversationally: ${missing.length ? missing.join(", ") : "all captured"}.
   ONE question per turn, and only after you have answered theirs.
3. Once budget and timeline are known, offer a site visit. Site visits sell flats.
4. If they agree, get a day and a rough time, then confirm it back to them.

ALREADY CAPTURED (do not ask again): ${JSON.stringify(captured)}
Turn ${turnCount}. ${turnCount === 0 ? "Open with a warm greeting and your name." : ""}`;
}

/**
 * EXTRACTION PROMPT — runs as a second, cheap call after each turn.
 * Deliberately separate from the conversation call: mixing "reply naturally"
 * and "emit strict JSON" in one request degraded both in testing.
 */
export const EXTRACT_PROMPT = `Read the call transcript. Return ONLY a JSON object, no prose.

{"name":str|null,"config":"2BHK"|"3BHK"|null,"budget":str|null,"timeline":str|null,
 "purpose":"end-use"|"investment"|null,"locality":str|null,"financing":"loan"|"cash"|null,
 "intent":"hot"|"warm"|"cold","booking":{"wants":bool,"day":str|null,"time":str|null},
 "objections":[str]}

Rules:
- Use null when the caller has not said it. Never infer, never fill gaps.
- intent: "hot" = asked for a site visit or gave a budget and a timeline under 3 months.
  "warm" = engaged and asked real questions. "cold" = browsing, or ended early.
- Values stay in whatever language the caller used.`;
