# Building Ads — Course Approval Dashboard

Single-page dashboard for managing course marketing campaigns across **3 colleges** (מרכז הבנייה הישראלי / אינטק / אולטימה). Built as the source-of-truth gate between Google Drive (content) and Meta Ads Manager (campaigns).

**Core rule**: nothing goes live without admin approval.

## What's inside

- **`index.html`** — the entire app (HTML + Tailwind via CDN + vanilla JS). No build step.
- **`package.json`** — minimal `serve` setup for Railway.
- **`railway.json`** — deploy config.

## Features

- 🔐 **Auth** — email + password, 3 demo users with different permissions
- 🎓 **3-college filter** + per-college approval progress
- 🖼 **Banner approval** with thumbnails from Drive
- 📝 **Ad copy approval** — title + body, with variant support, real Meta export texts
- ❓ **Screening question approval**
- 📁 **Drive file checklist** per course (brochure / banners / syllabus / Meta xlsx / summary)
- 💬 **Per-item comments** with role attribution
- 🔔 **Live notifications** + 📜 **action log** (persisted in localStorage)
- 🔄 **Refresh Drive** button (simulated scan)
- 🚀 **Export to Meta** gate — disabled until 100% approved

## Demo accounts

| Role | Email | Password |
|---|---|---|
| System Admin | `admin@bc.co.il` | `demo123` |
| Content Manager | `content@bc.co.il` | `demo123` |
| Campaign Manager | `campaigns@bc.co.il` | `demo123` |

## Local dev

```bash
npm install
npm start
# opens on http://localhost:3000
```

## Deploy

Auto-deploys to Railway on push to `main`. The app is fully client-side — `serve` just hosts the static files.

## Roadmap

- Real Google Drive sync via service account (replace simulated refresh)
- Backend for auth + audit log persistence beyond localStorage
- Meta Ads API integration for the actual upload step
- Automated CSV export from approved courses
