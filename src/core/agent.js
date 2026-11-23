/**
 * CONVERSATION ENGINE — one caller turn, end to end.
 *
 * audio in -> STT -> LLM reply -> TTS -> audio out, with extraction running
 * AFTER the reply has been sent so it never delays the caller.
 *
 * THE LATENCY DECISION (measured): STT 597 ms + LLM ~390 ms + TTS ~1060 ms
 * = roughly 2.0-2.5 s before the caller hears anything. Telephony research
 * puts tolerable silence at about 1.5 s. So extraction, cost accounting and
 * persistence are all moved OFF the reply path. We also cap max_tokens at 160
 * because TTS cost and TTS latency both scale with characters — a chattier
 * agent is literally a slower and more expensive one.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { transcribe, chat, extractJson, synthesize } from "./providers.js";
import { systemPrompt, EXTRACT_PROMPT } from "./prompt.js";
import * as store from "./db.js";

/** In-memory state per live call. SQLite holds the durable record. */
const sessions = new Map();

export function startCall(label) {
  const id = randomUUID().slice(0, 8);
  store.createCall(id, label);
  sessions.set(id, { id, history: [], captured: {}, turnCount: 0, objections: [] });
  return id;
}

export const getSession = id => sessions.get(id);

/** Opening line. Scripted, not generated: it must be instant and identical every call. */
export async function greet(callId) {
  const s = sessions.get(callId);
  if (!s) throw new Error("unknown call");
  const text = "Namaste, Aranya Developers nunchi Meera speaking. " +
               "Aranya Greens gurinchi enquiry chesaru kada, cheppandi sir, " +
               "what would you like to know?";
  const tts = await synthesize(text);
  s.history.push({ role: "assistant", content: text });
  store.addTurn(callId, { idx: s.turnCount++, role: "agent", text, ttsMs: tts.ms, costUsd: tts.costUsd });
  store.bumpCost(callId, { tts: tts.costUsd });
  return { text, audio: tts.audio, ms: tts.ms };
}

/** One full caller turn. */
export async function handleTurn(callId, audioBuf, filename) {
  const s = sessions.get(callId);
  if (!s) throw new Error("unknown call");
  const t0 = Date.now();

  // 1 - hear
  const stt = await transcribe(audioBuf, filename);
  if (!stt.text) {
    // Real failure mode: silence, or speech Whisper could not resolve.
    const fb = "Sorry sir, voice clear ga vinipinchaledu. Marokasari cheppandi?";
    const tts = await synthesize(fb);
    store.addTurn(callId, { idx: s.turnCount++, role: "agent", text: fb,
                            ttsMs: tts.ms, costUsd: tts.costUsd, totalMs: Date.now() - t0 });
    store.bumpCost(callId, { stt: stt.costUsd, tts: tts.costUsd, secs: stt.audioSeconds });
    return { transcript: "", reply: fb, audio: tts.audio, empty: true };
  }

  const af = `${callId}-${s.turnCount}.webm`;
  fs.writeFileSync(path.join("data", "audio", af), audioBuf);
  store.addTurn(callId, { idx: s.turnCount++, role: "caller", text: stt.text,
                          detectedLang: stt.detectedLanguage, audioFile: af,
                          sttMs: stt.ms, costUsd: stt.costUsd });
  s.history.push({ role: "user", content: stt.text });

  // 2 - think. Only the last 10 turns are sent: prompt tokens are billed EVERY
  // turn, so an unbounded history makes a long call quadratically expensive.
  //
  // DEGRADED MODE: if the LLM is rate-limited or down, the caller must still
  // hear a human-sounding sentence. A 500 here means dead air on a live call,
  // which is worse than an imperfect answer. Observed in testing: Groq returned
  // 429 under burst and the turn previously threw. Now it holds the line.
  let llm;
  try {
    llm = await chat([
      { role: "system", content: systemPrompt({ captured: s.captured, turnCount: s.turnCount }) },
      ...s.history.slice(-10),
    ]);
  } catch (e) {
    console.error("[llm-degraded]", e.message);
    llm = { text: "", promptTokens: 0, completionTokens: 0, ms: 0, costUsd: 0, degraded: true };
    store.updateCall(callId, { notes: `llm_degraded:${e.message}`.slice(0, 200) });
  }
  const reply = llm.text
    || "Sorry sir, oka second — line lo chinna problem vachindi. Meeru cheppindi marokasari cheptara?";
  s.history.push({ role: "assistant", content: reply });

  // 3 - speak
  const tts = await synthesize(reply);
  const totalMs = Date.now() - t0;

  store.addTurn(callId, { idx: s.turnCount++, role: "agent", text: reply,
    llmMs: llm.ms, ttsMs: tts.ms, totalMs,
    promptTokens: llm.promptTokens, completionTokens: llm.completionTokens,
    costUsd: llm.costUsd + tts.costUsd });
  store.bumpCost(callId, { stt: stt.costUsd, llm: llm.costUsd, tts: tts.costUsd, secs: stt.audioSeconds });

  // 4 - extract, AFTER responding. Never blocks the caller.
  queueMicrotask(() => updateCapture(callId).catch(e => console.error("[extract]", e.message)));

  return {
    transcript: stt.text, reply, audio: tts.audio,
    detectedLanguage: stt.detectedLanguage,
    timing: { stt: stt.ms, llm: llm.ms, tts: tts.ms, total: totalMs },
    cost: { stt: stt.costUsd, llm: llm.costUsd, tts: tts.costUsd },
  };
}

/** Second pass: pull structured fields out of the transcript so far. */
async function updateCapture(callId) {
  const s = sessions.get(callId);
  if (!s || s.history.length < 2) return;
  const convo = s.history.map(m => `${m.role === "user" ? "CALLER" : "AGENT"}: ${m.content}`).join("\n");
  const out = await extractJson([
    { role: "system", content: EXTRACT_PROMPT },
    { role: "user", content: convo },
  ]);
  if (!out.json) return;
  const j = out.json;
  for (const k of ["name","config","budget","timeline","purpose","locality","financing"]) {
    if (j[k]) s.captured[k] = j[k];
  }
  if (Array.isArray(j.objections)) s.objections = j.objections;
  store.updateCall(callId, { captured_json: JSON.stringify(s.captured), intent: j.intent ?? null });

  // Capability #4 — a booking the sales team can actually see.
  if (j.booking?.wants && j.booking.day && !s.booked) {
    s.booked = true;
    store.bookVisit(callId, { name: s.captured.name, config: s.captured.config,
                              budget: s.captured.budget, day: j.booking.day, time: j.booking.time });
    store.updateCall(callId, { outcome: "booked" });
  }
}

export function endCall(callId) {
  const s = sessions.get(callId);
  if (!s) return null;
  const c = store.getCall(callId);
  if (c && c.outcome === "in_progress") {
    store.updateCall(callId, { outcome: s.turnCount > 3 ? "qualified" : "dropped" });
  }
  store.updateCall(callId, { ended_at: new Date().toISOString() });
  sessions.delete(callId);
  return store.getCall(callId);
}
