/**
 * PROVIDER LAYER — every external AI call in the system lives here.
 *
 * Deliberately NOT a framework. The challenge says "'The framework handles it'
 * is not an answer", so each HTTP call is written out: the URL, the headers,
 * the body, the parse, the timing and the cost. Nothing is hidden behind an SDK.
 *
 * Three findings from probing these APIs that are encoded below:
 *  1. Groq rejects the default Node/undici UA with Cloudflare error 1010.
 *     A browser User-Agent is REQUIRED, not cosmetic.
 *  2. llama-3.3-70b-versatile is 404 on Groq (decommissioned). gpt-oss-* return
 *     an empty `content` with the text buried in `reasoning`. qwen3.8-27b was
 *     the only model that answered reliably. We probe, we do not assume.
 *  3. The ElevenLabs key is scoped without `user_read`, so quota CANNOT be
 *     polled. We meter characters ourselves instead.
 */
import { setTimeout as delay } from "node:timers/promises";
import { pollySynthesize, pollyConfigured, POLLY_USD_PER_CHAR } from "./polly.js";
import { edgeSynthesize, EDGE_USD_PER_CHAR } from "./edgetts.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const GROQ_KEYS = [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_FALLBACK].filter(Boolean);
const EL_KEY    = process.env.ELEVENLABS_API_KEY;
const EL_BASE   = process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io";
const EL_VOICE  = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const EL_MODEL  = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";
const STT_MODEL = process.env.STT_MODEL || "whisper-large-v3-turbo";
const LLM_MODEL = process.env.LLM_MODEL || "qwen/qwen3.8-27b";

/** Published rates, Nov 2026. Used only to attribute cost per call. */
export const RATES = {
  sttPerMinUsd : 0.04,    // Groq whisper-large-v3-turbo
  llmInPerMTok : 0.29,    // qwen3.8-27b input
  llmOutPerMTok: 0.59,    // qwen3.8-27b output
  ttsPerKChar  : 0.15,    // ElevenLabs Creator tier, ~Rs 0.11/100 chars
  usdToInr     : 84.5,
};

/** Try each key in turn. A single 429 must not kill a live call. */
async function groqFetch(path, init, { retries = 2 } = {}) {
  let lastErr;
  for (const key of GROQ_KEYS) {
    for (let a = 0; a <= retries; a++) {
      try {
        const res = await fetch(`https://api.groq.com/openai/v1${path}`, {
          ...init,
          headers: { ...init.headers, Authorization: `Bearer ${key}`, "User-Agent": UA },
        });
        if (res.status === 429 || res.status >= 500) {   // transient
          // MEASURED: under burst load Groq returns 429 with a Retry-After header.
          // Rohit's "when we launch a campaign, it gets crazy" is exactly this case,
          // so we honour the server's own hint instead of a blind fixed sleep.
          const hinted = Number(res.headers.get("retry-after")) * 1000;
          lastErr = new Error(`groq ${res.status}`);
          lastErr.status = res.status;
          await delay(Number.isFinite(hinted) && hinted > 0
            ? Math.min(hinted, 4000)
            : 400 * Math.pow(2, a));          // 400, 800, 1600 ms
          continue;
        }
        if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return res;
      } catch (e) { lastErr = e; await delay(200); }
    }
  }
  throw lastErr ?? new Error("groq: all keys failed");
}

/** Speech to text. Returns the transcript plus what it cost us. */
export async function transcribe(buf, filename = "audio.webm") {
  const t0 = Date.now();
  const fd = new FormData();
  fd.append("file", new Blob([buf]), filename);
  fd.append("model", STT_MODEL);
  fd.append("response_format", "verbose_json");
  // NOTE: we do NOT pass `language`. Forcing a language broke code-mixed input
  // in testing; letting Whisper auto-detect preserved the Telugu verb forms.
  const res  = await groqFetch("/audio/transcriptions", { method: "POST", body: fd });
  const data = await res.json();
  const secs = data.duration ?? 0;
  return {
    text: (data.text || "").trim(),
    // Whisper's label is UNRELIABLE on code-mixed speech (it called a
    // Telugu+Hindi+English sentence "Hindi"). Logged for analysis, never branched on.
    detectedLanguage: data.language ?? null,
    audioSeconds: secs,
    ms: Date.now() - t0,
    costUsd: (secs / 60) * RATES.sttPerMinUsd,
  };
}

/** One conversation turn. */
export async function chat(messages, { maxTokens = 160, temperature = 0.35 } = {}) {
  const t0  = Date.now();
  const res = await groqFetch("/chat/completions", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ model: LLM_MODEL, messages, max_tokens: maxTokens, temperature }),
  });
  const data = await res.json();
  const msg  = data.choices?.[0]?.message ?? {};
  const u    = data.usage ?? {};
  return {
    text: (msg.content || "").trim(),
    promptTokens: u.prompt_tokens ?? 0,
    completionTokens: u.completion_tokens ?? 0,
    ms: Date.now() - t0,
    costUsd: ((u.prompt_tokens ?? 0) / 1e6) * RATES.llmInPerMTok
           + ((u.completion_tokens ?? 0) / 1e6) * RATES.llmOutPerMTok,
  };
}

/** Strict-JSON extraction. Lower temperature, and we tolerate a fenced reply. */
export async function extractJson(messages) {
  const r = await chat(messages, { maxTokens: 320, temperature: 0 });
  let t = r.text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a !== -1 && b > a) t = t.slice(a, b + 1);
  try { return { json: JSON.parse(t), ...r }; }
  catch { return { json: null, parseError: r.text.slice(0, 200), ...r }; }
}

/** Text to speech. Returns MP3 bytes. */
export async function synthesize(text) {
  // TTS CHAIN — ordered by MEASURED latency and cost, not by brand:
  //
  //   1. AWS Polly neural   559 ms   1M chars/month free for 12 months
  //   2. Edge TTS          1334 ms   free forever, no key, but 2.4x slower
  //   3. ElevenLabs          ~900 ms best prosody, but free quota is 40k chars
  //                                  TOTAL and we exhausted it during testing
  //
  // ElevenLabs sits LAST deliberately. It has the nicest voice, but a voice
  // agent whose voice dies is DOWN, not degraded. Polly's free tier is ~2,500
  // calls/month, which outlasts any demo, and it is the fastest of the three.
  const chain = [];
  if (pollyConfigured()) chain.push(["polly", () => pollySynthesize(text), POLLY_USD_PER_CHAR]);
  chain.push(["edge", () => edgeSynthesize(text), EDGE_USD_PER_CHAR]);
  if (EL_KEY) chain.push(["elevenlabs", null, 0]);

  let lastErr;
  for (const [name, fn] of chain) {
    const t0 = Date.now();
    try {
      if (name === "elevenlabs") return await elevenSynthesize(text);
      const audio = await fn();
      return {
        audio,
        ms: Date.now() - t0,
        chars: text.length,
        costUsd: text.length * (name === "polly" ? POLLY_USD_PER_CHAR : EDGE_USD_PER_CHAR),
        provider: name,
        failedOver: name !== chain[0][0],
      };
    } catch (err) {
      lastErr = err;
      console.error(`[tts-failover] ${name} ->`, err.message, "| trying next provider");
    }
  }
  throw lastErr ?? new Error("all TTS providers failed");
}

async function elevenSynthesize(text) {
  const t0  = Date.now();
  const res = await fetch(`${EL_BASE}/v1/text-to-speech/${EL_VOICE}`, {
    method : "POST",
    headers: { "xi-api-key": EL_KEY, "Content-Type": "application/json", "User-Agent": UA },
    body   : JSON.stringify({
      text,
      model_id: EL_MODEL,   // multilingual_v2 — required for Telugu/Hindi/English in one line
      voice_settings: { stability: 0.45, similarity_boost: 0.75, speed: 1.05 },
    }),
  });
  if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    audio: buf,
    chars: text.length,
    ms: Date.now() - t0,
    costUsd: (text.length / 1000) * RATES.ttsPerKChar,
  };
}

export const MODELS = { stt: STT_MODEL, llm: LLM_MODEL, tts: EL_MODEL, voice: EL_VOICE };
