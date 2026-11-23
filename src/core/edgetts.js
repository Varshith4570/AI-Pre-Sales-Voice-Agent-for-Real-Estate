/**
 * MICROSOFT EDGE TTS — free, keyless TTS fallback.
 *
 * Uses the same public endpoint Edge's "Read Aloud" uses. No API key, no quota,
 * no billing account. It is the last line of defence: if AWS credentials expire
 * AND ElevenLabs is out of quota, the agent still has a voice.
 *
 * MEASURED (same 86-char code-mixed sentence, 3 runs each):
 *   Polly neural (Kajal)     559 ms   <- primary
 *   edge-tts (Neerja en-IN) 1334 ms   <- fallback, 2.4x slower
 *
 * Also note: edge-tts 7.2.7 broke with `WSServerHandshakeError: 403` because
 * Microsoft rotated the Sec-MS-GEC token scheme. Upgrading to 7.3.1 fixed it.
 * That fragility is exactly why this is the fallback and not the primary.
 */
import { EdgeTTS } from "node-edge-tts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export async function edgeSynthesize(text, {
  voice = process.env.EDGE_TTS_VOICE || "en-IN-NeerjaNeural",
} = {}) {
  const tmp = path.join(os.tmpdir(), `aranya-${crypto.randomUUID()}.mp3`);
  try {
    // node-edge-tts writes to a file rather than returning a buffer.
    await new EdgeTTS({ voice, lang: voice.slice(0, 5), outputFormat: "audio-24khz-48kbitrate-mono-mp3" })
      .ttsPromise(text, tmp);
    return await fs.readFile(tmp);
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

export const EDGE_USD_PER_CHAR = 0;   // genuinely free
