// Builds the lesson-generation prompt. Shared by the app (direct-to-provider dev mode) and the
// Cloudflare Worker's /lesson route, which builds it SERVER-SIDE from validated inputs so the public
// endpoint can only ever write language lessons, never relay an arbitrary prompt.

export const LESSON_LANGS = ["bukharian", "farsi", "sogdian", "arabic", "uzbek", "hebrew", "aramaic", "futhark"];
export const LESSON_DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const TOPIC_RE = /^[A-Za-z0-9 &'-]{1,40}$/;       // no quotes/newlines: topicId is embedded in the prompt
const MAX_WEAK_WORDS = 8;                          // buildPrompt uses slice(0, 8)
const MAX_WEAK_WORD_LEN = 40;

// Returns { ok: true, value: {langId, topicId, personalization} } or { ok: false, error }.
export function validateLessonRequest(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be a JSON object" };
  const { langId, topicId, personalization } = body;
  if (!LESSON_LANGS.includes(langId)) return { ok: false, error: "unknown language" };
  if (topicId !== undefined && topicId !== null && topicId !== "" &&
      !(typeof topicId === "string" && TOPIC_RE.test(topicId))) {
    return { ok: false, error: "invalid topic" };
  }
  let difficulty = "beginner";
  let weakWords = [];
  if (personalization !== undefined && personalization !== null) {
    if (typeof personalization !== "object") return { ok: false, error: "invalid personalization" };
    if (personalization.difficulty !== undefined) {
      if (!LESSON_DIFFICULTIES.includes(personalization.difficulty)) return { ok: false, error: "invalid difficulty" };
      difficulty = personalization.difficulty;
    }
    if (personalization.weakWords !== undefined) {
      if (!Array.isArray(personalization.weakWords)) return { ok: false, error: "invalid weakWords" };
      weakWords = personalization.weakWords
        .filter(w => typeof w === "string")
        // learner-derived text goes into the prompt: drop control chars, quotes and backslashes, cap length
        .map(w => w.replace(/[\u0000-\u001F\u007F"\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_WEAK_WORD_LEN))
        .filter(Boolean)
        .slice(0, MAX_WEAK_WORDS);
    }
  }
  return {
    ok: true,
    value: { langId, topicId: topicId || undefined, personalization: { difficulty, weakWords } },
  };
}

export function buildPrompt(langId, topicId, personalization) {
  const names = {
    bukharian: "Bukharian (Bukhori/Judeo-Tajik, use Cyrillic script for word_native, e.g., салом, рафтан, хуб — do NOT use Arabic script)",
    farsi: "Farsi (Persian)",
    sogdian: "Sogdian (ancient Silk Road language, romanized transliteration only for both word and word_native)",
    arabic: "Arabic (use both Arabic script and romanized transliteration)",
    uzbek: "Uzbek (modern Latin-script Uzbek)",
    hebrew: "Hebrew (use Hebrew script for word_native, e.g., שלום, ספר, בית — do NOT use Arabic or Latin script for word_native)",
    aramaic: "Aramaic (Classical/Syriac, romanized transliteration only for both word and word_native — do NOT output Syriac script)",
    futhark: "Old Norse (the language of the Elder Futhark rune tradition; use normalized Old Norse spelling in Latin letters for both word and word_native — do NOT output rune characters)",
  };
  const topicHint = topicId ? ` Focus the vocabulary on the topic: "${topicId}".` : "";
  const difficulty = personalization?.difficulty || "beginner";
  const difficultyHint = {
    beginner: "Keep vocabulary common and sentences short and simple.",
    intermediate: "Use moderately varied vocabulary and slightly longer sentences than a total beginner would see.",
    advanced: "Use richer vocabulary, idioms, and more complex sentence structures — this learner is doing well.",
  }[difficulty];
  const weakWords = personalization?.weakWords?.length
    ? ` This learner has previously struggled with these words/phrases — naturally reinforce at least 2-3 of them if they fit the topic: ${personalization.weakWords.slice(0, 8).join(", ")}.`
    : "";
  return `You are an expert ${names[langId]} language teacher. Generate a lesson of exactly 20 exercises for a learner at the ${difficulty} level. ${difficultyHint}${topicHint}${weakWords}
Return ONLY a valid JSON array, no markdown fences, no explanation.

Use these types in order: mcq, mcq, match, mcq, fillblank, mcq, wordarrange, mcq, mcq, match, mcq, fillblank, mcq, wordarrange, mcq, mcq, match, mcq, fillblank, wordarrange

MCQ: {"type":"mcq","direction":"target_to_en","word":"<romanized>","word_native":"<native script>","english":"<meaning>","correct":"<correct option>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>"],"fun_fact":"<cultural fact>"}

MATCH (4 pairs): {"type":"match","pairs":[{"target":"<romanized>","english":"<meaning>"},{"target":"<w2>","english":"<m2>"},{"target":"<w3>","english":"<m3>"},{"target":"<w4>","english":"<m4>"}]}

FILLBLANK: {"type":"fillblank","template":"<English sentence with ___ in place of one word, followed by that word's English meaning in parentheses, e.g. I have ___ (three) apples>","correct_target":"<target word romanized>","options":["<correct_target exactly>","<wrong1 romanized>","<wrong2 romanized>","<wrong3 romanized>"]}

WORDARRANGE: {"type":"wordarrange","english":"<English sentence>","words":["<romanized target-language word, NEVER English>","<word2>","<word3>","<word4>"],"correct_order":["<word1>","<word3>","<word2>","<word4>"],"hint":"<grammar tip about word order>"}

Rules: for direction "target_to_en" every option (and "correct") is an ENGLISH meaning, never a target-language word; only a "en_to_target" MCQ has target-language options. FILLBLANK options are romanized TARGET-language words (never English), and correct_target must be spelled exactly like one of them. Real accurate vocabulary only, shuffle options, culturally rich fun_facts. WORDARRANGE "words" and "correct_order" must be romanized target-language words only — never English words, even though "english" holds the English sentence they translate to.`;
}
