export { BattleRoom } from "./battleRoom.js";
import { handleLesson } from "./lesson.js";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — avoids code confusion
const CODE_RE = /^\/room\/([A-Z0-9]{4,8})$/i;
const SYNC_RE = /^\/sync\/([A-Za-z0-9_-]{1,100})$/;

function generateCode(len = 5) {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return out;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Backup/restore for a device-local profile (see assets/lib/profiles.js /
// cloudSync.js). `token` is the profile's own syncToken — a bearer secret
// generated on-device, not real auth, matching the existing room-code
// security model. First write for a profile_id claims that id with its token;
// later writes/reads must present the same token.
async function handleSync(request, env, profileId, headers) {
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers });
    }
    const { token, data } = body || {};
    if (!token || typeof token !== "string" || data === undefined) {
      return new Response("Missing token or data", { status: 400, headers });
    }
    const existing = await env.PROFILES_DB
      .prepare("SELECT token FROM profile_sync WHERE profile_id = ?")
      .bind(profileId)
      .first();
    if (existing && existing.token !== token) {
      return new Response("Forbidden", { status: 403, headers });
    }
    await env.PROFILES_DB
      .prepare(
        `INSERT INTO profile_sync (profile_id, token, data, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(profile_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(profileId, token, JSON.stringify(data), Date.now())
      .run();
    return Response.json({ ok: true }, { headers });
  }

  if (request.method === "GET") {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400, headers });
    const row = await env.PROFILES_DB
      .prepare("SELECT token, data FROM profile_sync WHERE profile_id = ?")
      .bind(profileId)
      .first();
    if (!row) return new Response("Not Found", { status: 404, headers });
    if (row.token !== token) return new Response("Forbidden", { status: 403, headers });
    return Response.json({ data: JSON.parse(row.data) }, { headers });
  }

  return new Response("Method Not Allowed", { status: 405, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /lesson has its own (restricted) CORS and must be matched before the generic OPTIONS reply below.
    if (url.pathname === "/lesson") return handleLesson(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/room" && request.method === "POST") {
      return Response.json({ code: generateCode() }, { headers: corsHeaders() });
    }

    const syncMatch = url.pathname.match(SYNC_RE);
    if (syncMatch) {
      return handleSync(request, env, syncMatch[1], corsHeaders());
    }

    const match = url.pathname.match(CODE_RE);
    if (match) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426, headers: corsHeaders() });
      }
      const code = match[1].toUpperCase();
      const stub = env.BATTLE_ROOM.getByName(code);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  },
};
