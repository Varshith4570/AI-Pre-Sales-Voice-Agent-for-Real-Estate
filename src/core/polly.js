/**
 * AWS POLLY — TTS FALLBACK
 *
 * WHY THIS EXISTS (found the hard way):
 * Mid-testing ElevenLabs returned HTTP 401 `quota_exceeded`:
 *   "quota of 40000. You have 4 credits remaining, while 55 are required."
 * The key was valid; the free-tier character budget was simply spent. A voice
 * agent whose voice dies is not degraded, it is DOWN — and on demo day that is
 * indistinguishable from broken code.
 *
 * Polly is a different vendor on a different billing account, so a quota wall at
 * ElevenLabs cannot take it down too. Voice "Kajal" is Amazon's en-IN neural
 * voice, which is the right accent for Hyderabad buyers.
 *
 * SigV4 is signed by hand (~25 lines) rather than pulling in the AWS SDK:
 * the SDK is ~15 MB for one POST, and the brief asks for code I can explain.
 */
import crypto from "node:crypto";

const REGION  = process.env.AWS_REGION || "ap-south-1";
const SERVICE = "polly";
const sha256  = (s) => crypto.createHash("sha256").update(s).digest("hex");
const hmac    = (k, s) => crypto.createHmac("sha256", k).update(s).digest();

export function pollyConfigured() {
  return Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function pollySynthesize(text, {
  voice  = process.env.POLLY_VOICE_ID || "Kajal",
  engine = "neural",
} = {}) {
  const host = `polly.${REGION}.amazonaws.com`;
  const path = "/v1/speech";
  // Polly caps a single request at 3000 chars; our replies are capped far below.
  const body = JSON.stringify({
    Text: text.slice(0, 2900),
    OutputFormat: "mp3",
    VoiceId: voice,
    Engine: engine,
    LanguageCode: "en-IN",
  });

  const now   = new Date();
  const amz   = now.toISOString().replace(/[:-]|\.\d{3}/g, "");   // 20261118T121500Z
  const date  = amz.slice(0, 8);
  const hash  = sha256(body);

  const canonical = [
    "POST", path, "",
    "content-type:application/json",
    `host:${host}`,
    `x-amz-date:${amz}`,
    "", "content-type;host;x-amz-date", hash,
  ].join("\n");

  const scope  = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amz, scope, sha256(canonical)].join("\n");

  const kDate    = hmac(`AWS4${process.env.AWS_SECRET_ACCESS_KEY}`, date);
  const kRegion  = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");

  const res = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": amz,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, ` +
        `SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
    },
    body,
  });

  if (!res.ok) throw new Error(`polly ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Polly neural: $16 per 1M chars (published). Cheaper than ElevenLabs' ~$0.15/1k.
export const POLLY_USD_PER_CHAR = 16 / 1_000_000;
