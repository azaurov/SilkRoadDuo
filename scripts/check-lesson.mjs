#!/usr/bin/env node
// Hand-check that a REAL, well-formed lesson comes back.
//   node scripts/check-lesson.mjs                      # curated Futhark numbers+greetings, 100 runs each
//   node scripts/check-lesson.mjs --live futhark numbers   # pull one lesson from the AI provider chain and validate it
//   node scripts/check-lesson.mjs --live arabic greetings
// Exit code 0 = all checks passed, 1 = at least one failure. Keys come from .env and are never printed.
import fs from "node:fs";
import { register } from "node:module";

// lib files use extensionless imports (Metro style); let plain node resolve them.
register("data:text/javascript," + encodeURIComponent(
  `export async function resolve(s,c,n){try{return await n(s,c)}catch(e){if(s.startsWith(".")&&!/\\.[a-z]+$/.test(s))return n(s+".js",c);throw e}}`));

const root = new URL("..", import.meta.url).pathname;
const { futharkStaticLesson } = await import(root + "assets/lib/futharkStatic.js");
const { buildPrompt } = await import(root + "assets/lib/lessonPrompt.js");
const { toRunes } = await import(root + "assets/lib/runes.js");
const { cleanExercises } = await import(root + "assets/lib/lessonClean.js");

const ORDER = "mcq mcq match mcq fillblank mcq wordarrange mcq mcq match mcq fillblank mcq wordarrange mcq mcq match mcq fillblank wordarrange".split(" ");
const uniq = a => new Set(a).size === a.length;

// Returns a list of problems (empty = lesson is good).
export function validate(ex, langId, { strict = true } = {}) {
  const bad = [];
  if (!Array.isArray(ex)) return ["not an array"];
  if (strict && ex.length !== 20) return [`expected 20 exercises, got ${ex.length}`];
  if (!strict && ex.length < 14) return [`only ${ex.length} usable exercises left after cleanup (need >= 14)`];
  const targets = new Set();
  ex.forEach(x => {
    if (x.type === "mcq" && x.word) targets.add(x.word.toLowerCase());
    if (x.type === "match") x.pairs.forEach(p => targets.add(p.target.toLowerCase()));
    if (x.type === "fillblank") targets.add(x.correct_target.toLowerCase());
  });
  ex.forEach((x, i) => {
    const at = `#${i + 1} ${x.type}`;
    if (strict && x.type !== ORDER[i]) bad.push(`${at}: expected type ${ORDER[i]}`);
    if (x.type === "mcq") {
      if (x.options?.length !== 4 || !uniq(x.options)) bad.push(`${at}: need 4 unique options`);
      if (!x.options?.includes(x.correct)) bad.push(`${at}: correct "${x.correct}" not among options`);
      if (x.direction === "target_to_en") {
        if (x.correct.toLowerCase() === x.word.toLowerCase()) bad.push(`${at}: answer is the target word, not English`);
        const leak = x.options.filter(o => targets.has(o.toLowerCase()));
        if (leak.length) bad.push(`${at}: target-language words offered as English answers: ${leak.join(", ")}`);
      }
      if (langId === "futhark" && x.word_native !== toRunes(x.word)) bad.push(`${at}: runes don't match "${x.word}"`);
    }
    if (x.type === "match") {
      if (x.pairs?.length !== 4 || !uniq(x.pairs.map(p => p.english)) || !uniq(x.pairs.map(p => p.target))) bad.push(`${at}: need 4 unique pairs`);
    }
    if (x.type === "fillblank") {
      if (!x.template?.includes("___")) bad.push(`${at}: no ___ blank`);
      if (!x.options?.includes(x.correct_target)) bad.push(`${at}: correct_target "${x.correct_target}" not among options [${x.options}]`);
      if (!uniq(x.options || [])) bad.push(`${at}: duplicate options [${x.options}]`);
    }
    if (x.type === "wordarrange") {
      if ([...x.words].sort().join("|") !== [...x.correct_order].sort().join("|")) bad.push(`${at}: bank != correct_order`);
      const eng = new Set(x.english.toLowerCase().match(/[a-z']+/g) || []);
      if (x.words.every(w => eng.has(w.toLowerCase()))) bad.push(`${at}: bank is English`);
    }
  });
  return bad;
}

function loadEnv() {
  const env = {};
  try { for (const l of fs.readFileSync(root + ".env", "utf8").split("\n")) { const k = l.indexOf("="); if (k > 0) env[l.slice(0, k)] = l.slice(k + 1).trim(); } } catch {}
  return env;
}

async function live(langId, topicId) {
  const env = loadEnv();
  const urls = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
    gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  };
  const models = { groq: "openai/gpt-oss-20b", openrouter: "google/gemma-4-31b-it:free", gemini: "gemini-3.6-flash" };
  const maxTokens = { groq: 6500, openrouter: 8000, gemini: 8000 };
  const extras = { groq: { reasoning_effort: "low" }, openrouter: {}, gemini: {} };
  const keys = {};
  keys.groq = env["EXPO_PUBLIC_GROQ_" + "API_KEY"];
  keys.openrouter = env["EXPO_PUBLIC_OPENROUTER_" + "API_KEY"];
  keys.gemini = env["EXPO_PUBLIC_GEMINI_" + "API_KEY"];
  const prompt = buildPrompt(langId, topicId, { difficulty: "beginner" });
  for (const name of Object.keys(urls)) {
    const [url, key, model, max, extra] = [urls[name], keys[name], models[name], maxTokens[name], extras[name]];
    if (!key) { console.log(`  ${name}: no key, skipped`); continue; }
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, max_tokens: max, messages: [{ role: "user", content: prompt }], ...extra }), signal: AbortSignal.timeout(90000) });
      const d = await r.json();
      const raw = d.choices?.[0]?.message?.content;
      if (!r.ok || !raw) { console.log(`  ${name}: HTTP ${r.status}, no lesson`); continue; }
      const ex = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
      console.log(`  pulled a live lesson from ${name} (${model})`);
      return ex;
    } catch (e) { console.log(`  ${name}: ${e.message.slice(0, 80)}`); }
  }
  return null;
}

let failed = false;
const args = process.argv.slice(2);
if (args[0] === "--self-test") {
  // Reproduce the original bug: take a good lesson and put Old Norse words in the English options.
  const ex = futharkStaticLesson("numbers");
  const m = ex.find(x => x.type === "mcq" && x.direction === "target_to_en");
  m.options = ["fjórir", "tveir", "þrjú", m.word]; m.correct = m.word;
  const bad = validate(ex, "futhark");
  const caught = bad.some(b => b.includes("not English")) && bad.some(b => b.includes("target-language words"));
  console.log(caught ? "PASS: checker catches Old Norse words used as English answers" : "FAIL: checker missed the original bug", bad);
  process.exit(caught ? 0 : 1);
}
if (args[0] === "--live") {
  const [, langId = "futhark", topicId = "numbers"] = args;
  console.log(`LIVE ${langId}/${topicId}`);
  const raw = await live(langId, topicId);
  if (!raw) { console.log("FAIL: no provider returned a lesson"); process.exit(1); }
  const ex = cleanExercises(raw, langId); // the same cleanup App.js fetchLesson applies
  console.log(`  ${raw.length} exercises from AI, ${ex.length} after the app's cleanup`);
  const bad = validate(ex, langId, { strict: false });
  console.log(bad.length ? "FAIL:\n  " + bad.join("\n  ") : "PASS: live lesson is well-formed");
  process.exit(bad.length ? 1 : 0);
}

for (const topic of ["numbers", "greetings"]) {
  let n = 0;
  for (let i = 0; i < 100; i++) {
    const bad = validate(futharkStaticLesson(topic), "futhark");
    if (bad.length) { failed = true; console.log(`FAIL futhark/${topic} run ${i}:\n  ` + bad.join("\n  ")); break; }
    n++;
  }
  if (n === 100) console.log(`PASS futhark/${topic}: 100/100 curated lessons well-formed`);
}
for (const other of ["food", "travel"]) {
  if (futharkStaticLesson(other) !== null) { failed = true; console.log(`FAIL: curated lesson wrongly served for topic "${other}"`); }
}
console.log("PASS other topics fall through to the AI");
const app = fs.readFileSync(root + "App.js", "utf8");
const wired = /langId === "futhark"[\s\S]{0,120}futharkStaticLesson\(topicId\)[\s\S]{0,80}return fixed/.test(app);
console.log(wired ? "PASS App.js fetchLesson routes Futhark numbers/greetings to the curated lesson" : "FAIL: App.js fetchLesson is not wired to futharkStaticLesson");
process.exit(failed || !wired ? 1 : 0);
