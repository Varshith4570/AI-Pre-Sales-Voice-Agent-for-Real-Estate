# Deploying so the agent stays live for a week

The challenge requires: *"A number or link we can call, live for at least a week
after submission."* Localhost does not satisfy that.

## Recommended: Render free tier

Free web services **spin down after ~15 minutes of inactivity** and cold-start in
roughly 30-50 seconds. That is acceptable here with one mitigation (below), and it
is honest to mention it in the submission email.

### Steps

1. Push this folder to a **public GitHub repo** (`data/`, `.env` and `node_modules/`
   are already git-ignored).
2. On https://render.com → **New → Web Service** → connect the repo.
   `render.yaml` is detected automatically.
3. Add the four secret env vars when prompted (they are marked `sync: false`
   so they are never committed):
   - `GROQ_API_KEY`
   - `GROQ_API_KEY_FALLBACK`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. Deploy. Health check is `/api/health`.

### Keep it warm
Free instances sleep. Point a free uptime pinger (cron-job.org, UptimeRobot) at
`https://<your-app>.onrender.com/api/health` every 10 minutes. Cheap insurance
against a cold start during the graders' first call.

### Known constraint: the database resets
Render's free tier has an **ephemeral filesystem** — `data/aranya.db` is wiped on
every redeploy and on wake from sleep. Calls recorded during grading persist for
that session, which is enough for the demo, but the three submitted recordings are
exported to `evidence/recordings/` precisely so they do not depend on the live DB.

For production this is the point at which SQLite must become Postgres — already
flagged in `docs/TRADEOFFS.md` §5.

## Alternative: Cloudflare Tunnel from this machine

Zero cost, no cold starts, real persistence, and the DB survives:

```bash
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3100
```

Gives a public `https://<random>.trycloudflare.com` URL. **The catch: it only
works while your laptop is on and the tunnel process is running.** For a week-long
window that is fragile. Use Render as the primary and keep this as a backup for
the live demo in the final round, where you control the machine.
