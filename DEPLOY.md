# Deploying so the agent stays live for a week

The challenge requires: *"A number or link we can call, live for at least a week
after submission."* Localhost does not satisfy that.

---

## Why NOT Netlify

Netlify is built for static sites and **serverless functions**, not long-lived
servers. Three concrete blockers for this app:

1. **No persistent process.** This is an Express server holding an in-memory
   session map (`src/core/agent.js`) across turns of the same call. Serverless
   functions are stateless and die after each request, so call state would be
   lost between turns.
2. **No writable disk.** `node:sqlite` writes `data/aranya.db`. Netlify Functions
   have a read-only filesystem apart from `/tmp`, which is wiped per invocation.
   The CRM stand-in and the post-call view would not survive.
3. **60-second synchronous function cap.** Not fatal on its own, but combined with
   the above it means a rewrite, not a deploy.

Netlify *does* have a long-lived "Netlify Server" product, but it is **Early
Access** and explicitly limited/subject to change — the wrong thing to bet a
submission deadline on.

**Verdict: use Render.** It runs the app as-is, free, with no code changes.
If you specifically want Netlify, the honest path is splitting the frontend
(`public/`) onto Netlify and still hosting the backend on Render — which is more
moving parts for zero benefit here.

---

## Recommended: Render free tier (~15 minutes)

`render.yaml` is already in the repo, so Render configures itself.

### Steps

1. Go to **https://render.com** and sign in **with GitHub**.
2. **New → Web Service** → select
   `Varshith4570/AI-Pre-Sales-Voice-Agent-for-Real-Estate`.
3. Render reads `render.yaml` and fills in build/start commands. Confirm:
   - Build: `npm install`
   - Start: `node src/server.js`
   - Health check: `/api/health`
   - Plan: **Free**, Region: **Singapore** (closest to Hyderabad)
4. Add the secret environment variables (they are marked `sync: false`, so they
   are never in the repo):

   | Key | Value |
   |---|---|
   | `GROQ_API_KEY` | your Groq key |
   | `GROQ_API_KEY_FALLBACK` | your second Groq key |
   | `AWS_ACCESS_KEY_ID` | Polly-only IAM user (see warning below) |
   | `AWS_SECRET_ACCESS_KEY` | that user's secret |

5. **Create Web Service.** First build takes 2-4 minutes.
6. Open `https://<your-app>.onrender.com/api/health` — expect `{"ok":true,...}`.
7. Test the call page at `https://<your-app>.onrender.com/`.

### SECURITY WARNING - read before step 4

The AWS keys currently in `.env` are **Infinall production credentials**. Do not
put those on a third-party host for a job application. Create a dedicated user:

1. AWS Console → **IAM → Users → Create user** (e.g. `aranya-polly-demo`).
2. Attach **only** the AWS managed policy `AmazonPollyReadOnlyAccess`
   (`polly:SynthesizeSpeech` is all this app needs).
3. **Create access key** → *Application running outside AWS* → copy both values.
4. Use those on Render. Delete the user after the final round.

That key can do nothing except turn text into speech.

### Keep it awake
Render free instances sleep after ~15 minutes idle and cold-start in 30-50 s.
Point a free pinger (cron-job.org or UptimeRobot) at
`https://<your-app>.onrender.com/api/health` every 10 minutes.

Mention the cold start in the submission email. It is a free-tier constraint the
challenge explicitly tolerates (*"Free tiers and trial credits are fine"*), and
naming it is better than a grader hitting a 40-second blank page.

### Known constraint: the database resets
Render's free filesystem is **ephemeral** — `data/aranya.db` is wiped on redeploy
and on wake. Calls made during grading persist for that session, which is enough
for a demo, and the three submitted recordings live in `evidence/recordings/`
precisely so they never depend on the live DB.

This is exactly where SQLite must become Postgres for production — already flagged
in `docs/TRADEOFFS.md` section 5.

---

## Backup for the final round: Cloudflare Tunnel

Zero cost, no cold start, real persistence — but only while your laptop is on:

```bash
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3100
```

Gives a public `https://<random>.trycloudflare.com`. Too fragile for a week-long
window, ideal for the in-office demo where you control the machine.
