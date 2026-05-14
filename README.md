# Building Ads — Course Approval Dashboard

Single-deploy app for managing course marketing campaigns across **3 colleges** (מרכז הבנייה הישראלי / אינטק / אולטימה). It's the source-of-truth gate between Google Drive (content) and Meta Ads Manager (campaigns).

**Core rule**: nothing goes live without admin approval.

## How it works

```
[Browser A]                          [Browser B]
   │ login                              │ login
   ▼                                    ▼
   ─── HTTPS + WebSocket to ───────────────
                  ▼
            Node.js server (server.js)
              ├── /api/login    (auth, token issue)
              ├── /api/logout
              ├── /api/me       (verify token)
              ├── /api/state    (read snapshot)
              └── WebSocket     (real-time pub/sub)
                  ▼
            data/state.json (persisted to disk)
```

No external services. No Firebase, no Supabase, no Postgres. Just **Node + Express + ws + a JSON file**.

When **User A** approves a banner, a WebSocket `update` message goes to the server. The server checks the user's permissions (only `admin` can approve/reject), writes the new state to `data/state.json`, and broadcasts the new state to every other connected browser. **User B** sees a toast pop up and the UI refreshes — all in under 300ms.

## What's inside

- **`server.js`** — Express + WebSocket server (~150 lines, single file)
- **`public/index.html`** — the dashboard, vanilla JS + Tailwind via CDN
- **`package.json`** — `express` and `ws` only
- **`railway.json`** — Railway deploy config
- **`data/`** — runtime state (gitignored; persisted across restarts only with a Railway volume)

## Demo users

Defined in `server.js` (top of file). Change passwords for production.

| Email | Password | Role | Can do |
|---|---|---|---|
| `admin@bc.co.il` | `demo123` | מנהל מערכת | אישור · דחייה · הערות · ייצוא למטא |
| `content@bc.co.il` | `demo123` | מנהלת תוכן | העלאה לדרייב · הערות |
| `campaigns@bc.co.il` | `demo123` | מנהלת קמפיינים | כתיבת טקסטים · העלאה למטא אחרי אישור · הערות |

The server enforces permissions: a non-admin trying to send an `approve` or `reject` action gets `{ error: "permission_denied" }` and the action is rejected.

## Local dev

```bash
npm install
npm start
# → open http://localhost:3000
```

Open the URL in two browsers (e.g. Chrome + an incognito tab). Login as `admin@bc.co.il` in one and `content@bc.co.il` in the other. Approve a banner in admin — you'll see a live toast in the other window within ~300ms.

## Deploy to Railway

1. Push to `main` (Railway watches the GitHub repo)
2. Railway auto-detects Node, runs `npm install` then `npm start`
3. Generate a public domain in **Settings → Networking → Generate Domain**

### To persist state across container restarts

Railway containers have ephemeral filesystems by default. To keep `data/state.json` between restarts, add a volume:

**Settings → Volumes → Add Volume**
- Mount path: `/app/data`
- Size: 1 GB (free tier)

That's it — the JSON file lives in the volume.

## Roadmap

- Replace the JSON file with SQLite or Postgres for atomic multi-writer safety
- Real Google Drive sync via service account (currently the "Refresh Drive" button simulates)
- Meta Ads API integration for the actual upload step
- Per-action audit log accessible via `/api/log` for compliance
- Switch to Argon2-hashed passwords (currently plain — fine for closed-team demo, not for real users)
