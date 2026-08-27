export { BattleRoom } from "./battleRoom.js";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — avoids code confusion
const CODE_RE = /^\/room\/([A-Z0-9]{4,8})$/i;

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/room" && request.method === "POST") {
      return Response.json({ code: generateCode() }, { headers: corsHeaders() });
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
