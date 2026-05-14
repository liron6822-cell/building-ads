// Building Ads — Node.js server with WebSocket real-time sync
// No external services: auth, state, real-time — all in-process.

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

// ============================================================
// USERS — change passwords for production deployment
// ============================================================
const USERS = {
  "admin@bc.co.il": {
    password: "demo123",
    name: "ליאור — מנהל מערכת",
    role: "admin",
    initials: "ל",
    permissions: ["approve", "reject", "comment", "view_all", "manage_brochures", "export_meta"]
  },
  "content@bc.co.il": {
    password: "demo123",
    name: "דנה — מנהלת תוכן",
    role: "content",
    initials: "ד",
    permissions: ["upload_drive", "comment", "view_all"]
  },
  "campaigns@bc.co.il": {
    password: "demo123",
    name: "שירה — מנהלת קמפיינים",
    role: "campaigns",
    initials: "ש",
    permissions: ["write_ad_copy", "upload_meta_after_approval", "comment", "view_all"]
  }
};

// ============================================================
// STATE — persisted to JSON file (Railway volume recommended)
// ============================================================
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

function emptyState() {
  return { approvals: {}, comments: {}, notifications: [], log: [], last_sync: null };
}
function loadState() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch (e) { console.error("[state] load failed:", e.message); }
  return emptyState();
}
let state = loadState();
let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) { console.error("[state] save failed:", e.message); }
  }, 400);
}

// ============================================================
// SESSIONS — in-memory token store
// ============================================================
const sessions = {}; // token -> { email, role, ... }
function newToken() { return crypto.randomBytes(24).toString("hex"); }
function publicUser(email) {
  const u = USERS[email]; if (!u) return null;
  const { password, ...rest } = u;
  return { email, ...rest };
}

// ============================================================
// HTTP server
// ============================================================
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = USERS[(email || "").toLowerCase()];
  if (!u || u.password !== password) {
    return res.status(401).json({ error: "אימייל או סיסמה שגויים" });
  }
  const token = newToken();
  sessions[token] = { email: email.toLowerCase(), role: u.role };
  res.json({ token, user: publicUser(email.toLowerCase()) });
});

app.post("/api/logout", (req, res) => {
  const { token } = req.body || {};
  if (token) delete sessions[token];
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/, "");
  const s = sessions[token];
  if (!s) return res.status(401).json({ error: "לא מחובר" });
  res.json({ user: publicUser(s.email) });
});

app.get("/api/state", (req, res) => res.json(state));

// ============================================================
// WebSocket server — real-time state sync
// ============================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Map(); // ws -> { email, role }

function broadcast(payload, exceptWs = null) {
  const msg = JSON.stringify(payload);
  for (const [ws, _info] of clients) {
    if (ws !== exceptWs && ws.readyState === 1) ws.send(msg);
  }
}

wss.on("connection", (ws) => {
  clients.set(ws, null);
  ws.send(JSON.stringify({ type: "state", state }));

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === "auth") {
      const s = sessions[msg.token];
      if (s) {
        clients.set(ws, { email: s.email, role: s.role });
        ws.send(JSON.stringify({ type: "auth_ok", user: publicUser(s.email) }));
      } else {
        ws.send(JSON.stringify({ type: "auth_fail" }));
      }
      return;
    }

    if (msg.type === "update") {
      const auth = clients.get(ws);
      if (!auth) { ws.send(JSON.stringify({ type: "error", error: "not_authenticated" })); return; }

      // Enforce permissions for approve/reject
      if (msg.action === "approve" || msg.action === "reject") {
        if (auth.role !== "admin") {
          ws.send(JSON.stringify({ type: "error", error: "permission_denied", action: msg.action }));
          return;
        }
      }

      // Apply the new state (trust client diff for simplicity, but track who did it)
      state = msg.state;
      state._updatedBy = auth.email;
      state._updatedAt = Date.now();
      state._lastAction = msg.action || null;
      saveState();

      // Broadcast to all other clients
      broadcast({ type: "state", state }, ws);
      // Echo to sender so they know it was applied
      ws.send(JSON.stringify({ type: "state_ack", state }));
    }
  });

  ws.on("close", () => clients.delete(ws));
});

// ============================================================
// Start
// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[server] ${Object.keys(USERS).length} users · state file: ${STATE_FILE}`);
});
