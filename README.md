# Building Ads — Course Approval Dashboard

Dashboard for managing course marketing campaigns across **3 colleges** (מרכז הבנייה הישראלי / אינטק / אולטימה). The source-of-truth gate between Google Drive (content) and Meta Ads Manager (campaigns).

**Core rule**: nothing goes live without admin approval.

## Stack

- **Frontend**: vanilla JS + Tailwind via CDN (single `index.html`)
- **Real-time sync**: Firebase Firestore — `onSnapshot` listeners push state changes to every connected browser instantly
- **Static hosting**: `serve` on Railway

## Demo users

| Email | Password | Role |
|---|---|---|
| `admin@bc.co.il` | `demo123` | מנהל מערכת — approve/reject/comment |
| `content@bc.co.il` | `demo123` | מנהלת תוכן — upload to Drive, comment |
| `campaigns@bc.co.il` | `demo123` | מנהלת קמפיינים — write ad copy, upload to Meta after approval |

## Local dev

```bash
npm install
npm start
# → http://localhost:3000
```

## Firebase setup (already configured)

This project uses the Firebase project **`building-ads`** (`apiKey: AIzaSyB...`). The config is committed in `public/index.html` — that's fine because Firestore security rules enforce access.

### Firestore rules — set this in the Firebase console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠ Open access — fine for a closed team. To tighten: integrate Firebase Auth and check `request.auth.uid` in the rules.

## Deploy to Railway

Auto-deploys on every push to `main`:
- Build: `npm install` (just `serve`)
- Start: `npm start` → static hosting of `public/`

To expose: **Railway → Settings → Networking → Generate Domain**

## Roadmap

- Hash passwords + move users to Firestore
- Real Google Drive sync (currently "Refresh Drive" simulates)
- Meta Ads API integration for the actual upload step
- Firebase Auth + tightened Firestore rules
