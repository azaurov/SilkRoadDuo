// POST /lesson -- generates one language lesson on the server so provider API keys never ship in the
// app or the web bundle (a public GitHub Pages bundle and a public release APK both leaked them).
//
// Deliberately NOT a generic LLM relay: the client sends {langId, topicId, personalization}, this
// code validates them and builds the prompt itself, so the endpoint can only ever write lessons.
// Provider order, models and token budgets mirror the app's old direct-call chain.
import { buildPrompt, validateLessonRequest } from "../../assets/lib/lessonPrompt.js";

// Web origins allowed to call this from a browser. Native apps send no Origin header, and a
// non-browser client can fake one, so this is hygiene; the real limits are the fixed prompt and the
// per-IP rate limit.
export const ALLOWED_ORIGINS = [
  "https://azaurov.github.io",
  "http://localhost:8081",
  "http://localhost:19006",
];
const MAX_BODY_BYTES = 4096;

export const BACKENDS = [
  { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY",
    model: "openai/gpt-oss-20b", maxTokens: 6500, extraBody: { reasoning_effort: "low" } },
  { name: "openrouter", url: "https://openrouter.ai/api/v1/chat/completions", keyEnv: "OPENROUTER_API_KEY",
    model: "google/gemma-4-31b-it:free", maxTokens: 8000,
    extraHeaders: { "HTTP-Referer": "https://silkroadduo.app", "X-Title": "SilkRoadDuo" } },
  { name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY", model: "gemini-3.6-flash", maxTokens: 8000 },
];

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function fail(status, message, headers) {
  return new Response(JSON.stringify({ error: { message } }), {
    status, headers: { "Content-Type": "application/json", ...headers },
  });
}

export async function handleLesson(request, env, { fetchImpl = fetch } = {}) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return fail(403, "origin not allowed", {});
  const headers = cors(origin);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return fail(405, "POST only", headers);

  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) return fail(413, "request too large", headers);
  let raw;
  try { raw = await request.text(); } catch { return fail(400, "unreadable body", headers); }
  if (raw.length > MAX_BODY_BYTES) return fail(413, "request too large", headers);
  let body;
  try { body = JSON.parse(raw); } catch { return fail(400, "invalid JSON", headers); }

  const checked = validateLessonRequest(body);
  if (!checked.ok) return fail(400, checked.error, headers);

  if (env.LESSON_LIMITER) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const { success } = await env.LESSON_LIMITER.limit({ key: ip });
    if (!success) return fail(429, "too many lesson requests; wait a minute", { ...headers, "Retry-After": "60" });
  }

  const { langId, topicId, personalization } = checked.value;
  const prompt = buildPrompt(langId, topicId, personalization);

  const available = BACKENDS.filter(b => env[b.keyEnv]);
  if (!available.length) return fail(503, "AI backends are not configured", headers);

  // Try each provider in order; fall through on ANY failure, exactly like the app's old direct chain.
  let lastStatus = 502;
  let lastMessage = "all AI backends failed";
  for (const b of available) {
    let resp;
    try {
      resp = await fetchImpl(b.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env[b.keyEnv]}`, ...b.extraHeaders },
        body: JSON.stringify({
          model: b.model, max_tokens: b.maxTokens, messages: [{ role: "user", content: prompt }], ...b.extraBody,
        }),
      });
    } catch (e) {
      lastMessage = `${b.name}: network error`;
      continue;
    }
    let data;
    try { data = await resp.json(); } catch { data = null; }
    if (resp.ok && data && !data.error && data.choices?.[0]?.message?.content) {
      // Same OpenAI-shaped JSON the app already parses; nothing about the provider or key is added.
      return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json", ...headers } });
    }
    lastStatus = resp.status >= 400 ? resp.status : 502;
    lastMessage = `${b.name}: ${data?.error?.message || `HTTP ${resp.status}`}`.slice(0, 200);
  }
  // 429/413 pass through so the app's existing "rate-limited, wait a moment" message still triggers.
  return fail(lastStatus === 429 || lastStatus === 413 ? lastStatus : 502, lastMessage, headers);
}
