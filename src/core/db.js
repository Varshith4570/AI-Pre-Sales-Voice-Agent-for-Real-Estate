/**
 * PERSISTENCE — the CRM stand-in (capability #4) and the post-call view (#5).
 *
 * node:sqlite, not better-sqlite3. Why: better-sqlite3 has no prebuilt binary
 * for Node 24 on Windows and fell back to node-gyp, which needs Visual Studio
 * build tools. Node 24 ships SQLite in core, so the project installs with
 * ZERO native dependencies and another engineer can run it on any OS.
 * That is a real portability decision, logged in docs/TRADEOFFS.md.
 *
 * Every cost is stored PER TURN, not estimated at the end. The economics memo
 * is therefore built from measured rows, not from vendor pricing pages.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("data");
fs.mkdirSync(path.join(DIR, "audio"), { recursive: true });
export const db = new DatabaseSync(path.join(DIR, "aranya.db"));

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS calls (
  id            TEXT PRIMARY KEY,
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  caller_label  TEXT,
  outcome       TEXT DEFAULT 'in_progress',   -- in_progress|booked|qualified|dropped|failed
  intent        TEXT,                          -- hot|warm|cold
  captured_json TEXT DEFAULT '{}',
  turns         INTEGER DEFAULT 0,
  audio_seconds REAL DEFAULT 0,
  cost_stt_usd  REAL DEFAULT 0,
  cost_llm_usd  REAL DEFAULT 0,
  cost_tts_usd  REAL DEFAULT 0,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS turns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id     TEXT NOT NULL,
  idx         INTEGER NOT NULL,
  role        TEXT NOT NULL,                   -- caller|agent
  text        TEXT NOT NULL,
  detected_lang TEXT,
  audio_file  TEXT,
  stt_ms      INTEGER, llm_ms INTEGER, tts_ms INTEGER, total_ms INTEGER,
  prompt_tokens INTEGER, completion_tokens INTEGER,
  cost_usd    REAL DEFAULT 0,
  created_at  TEXT NOT NULL
);

-- The CRM stand-in Rohit's team would actually look at.
CREATE TABLE IF NOT EXISTS site_visits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id     TEXT NOT NULL,
  name        TEXT,
  phone       TEXT,
  config      TEXT,
  budget      TEXT,
  visit_day   TEXT,
  visit_time  TEXT,
  status      TEXT DEFAULT 'requested',
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_call ON turns(call_id);
CREATE INDEX IF NOT EXISTS idx_visits_call ON site_visits(call_id);
`);

const now = () => new Date().toISOString();

export function createCall(id, label) {
  db.prepare("INSERT INTO calls(id,started_at,caller_label) VALUES(?,?,?)").run(id, now(), label ?? null);
  return id;
}

export function addTurn(callId, t) {
  db.prepare(`INSERT INTO turns
    (call_id,idx,role,text,detected_lang,audio_file,stt_ms,llm_ms,tts_ms,total_ms,
     prompt_tokens,completion_tokens,cost_usd,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    callId, t.idx, t.role, t.text, t.detectedLang ?? null, t.audioFile ?? null,
    t.sttMs ?? null, t.llmMs ?? null, t.ttsMs ?? null, t.totalMs ?? null,
    t.promptTokens ?? null, t.completionTokens ?? null, t.costUsd ?? 0, now());
}

export function updateCall(callId, f) {
  const cols = [], vals = [];
  for (const [k, v] of Object.entries(f)) { cols.push(`${k}=?`); vals.push(v); }
  if (!cols.length) return;
  vals.push(callId);
  db.prepare(`UPDATE calls SET ${cols.join(",")} WHERE id=?`).run(...vals);
}

export function bumpCost(callId, { stt = 0, llm = 0, tts = 0, secs = 0 }) {
  db.prepare(`UPDATE calls SET cost_stt_usd=cost_stt_usd+?, cost_llm_usd=cost_llm_usd+?,
              cost_tts_usd=cost_tts_usd+?, audio_seconds=audio_seconds+?, turns=turns+1
              WHERE id=?`).run(stt, llm, tts, secs, callId);
}

export function bookVisit(callId, v) {
  db.prepare(`INSERT INTO site_visits(call_id,name,phone,config,budget,visit_day,visit_time,created_at)
              VALUES(?,?,?,?,?,?,?,?)`).run(
    callId, v.name ?? null, v.phone ?? null, v.config ?? null,
    v.budget ?? null, v.day ?? null, v.time ?? null, now());
}

export const getCall    = id => db.prepare("SELECT * FROM calls WHERE id=?").get(id);
export const getTurns   = id => db.prepare("SELECT * FROM turns WHERE call_id=? ORDER BY idx").all(id);
export const listCalls  = () => db.prepare("SELECT * FROM calls ORDER BY started_at DESC LIMIT 100").all();
export const listVisits = () => db.prepare("SELECT * FROM site_visits ORDER BY created_at DESC LIMIT 100").all();

/** Aggregates that feed the economics memo directly — no spreadsheet guesswork. */
export function economics() {
  const a = db.prepare(`SELECT COUNT(*) calls,
      SUM(cost_stt_usd+cost_llm_usd+cost_tts_usd) total_usd,
      AVG(cost_stt_usd+cost_llm_usd+cost_tts_usd) avg_usd,
      SUM(cost_stt_usd) stt, SUM(cost_llm_usd) llm, SUM(cost_tts_usd) tts,
      AVG(audio_seconds) avg_secs, AVG(turns) avg_turns,
      SUM(CASE WHEN outcome='booked' THEN 1 ELSE 0 END) booked
      FROM calls WHERE outcome != 'in_progress'`).get();
  const lat = db.prepare(`SELECT AVG(stt_ms) stt, AVG(llm_ms) llm, AVG(tts_ms) tts,
      AVG(total_ms) total, MAX(total_ms) worst FROM turns WHERE role='agent'`).get();
  return { ...a, latency: lat };
}
