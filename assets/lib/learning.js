// Weak-spot + adaptive-difficulty tracking for personalized lesson generation.
//
// Reads/writes live on the profile object (see assets/lib/profiles.js):
//   profile.topicStats  -> { [langId]: { [topicId]: { attempts, correct } } }
//   profile.weakWords   -> { [langId]: [{ item, misses }, ...] }   (capped, worst-first)
//   profile.difficulty  -> { [langId]: "beginner" | "intermediate" | "advanced" }
//   profile.recentAccuracy -> { [langId]: [0|1, ...] }             (rolling window, not shown in UI)

const WEAK_WORDS_CAP = 20;
const ACCURACY_WINDOW = 40;
const MIN_LESSONS_FOR_LEVELING = 3;

// Exercise types with a single unambiguous "item" that was right/wrong.
// `match` has no per-pair correctness signal today, so it's excluded.
export function itemKeyFor(ex) {
  if (!ex) return null;
  if (ex.type === "mcq") return ex.word || ex.correct || null;
  if (ex.type === "fillblank") return ex.correct_target || null;
  if (ex.type === "wordarrange") return ex.english || (ex.correct_order || []).join(" ") || null;
  return null;
}

export function recordAnswers(profile, { langId, topicId, answers }) {
  const topicStats = { ...(profile.topicStats || {}) };
  const langTopics = { ...(topicStats[langId] || {}) };
  const prevTopic = langTopics[topicId] || { attempts: 0, correct: 0 };

  const weakWordsAll = { ...(profile.weakWords || {}) };
  const weakMap = new Map((weakWordsAll[langId] || []).map(w => [w.item, w.misses]));

  const recentAll = { ...(profile.recentAccuracy || {}) };
  let recent = [...(recentAll[langId] || [])];

  let attempts = prevTopic.attempts;
  let correct = prevTopic.correct;

  for (const a of answers || []) {
    if (!a || a.item == null) continue;
    attempts += 1;
    if (a.correct) correct += 1;
    recent.push(a.correct ? 1 : 0);
    if (!a.correct) {
      weakMap.set(a.item, (weakMap.get(a.item) || 0) + 1);
    } else if (weakMap.has(a.item)) {
      // A later correct answer softens (but doesn't erase) a past miss.
      const next = weakMap.get(a.item) - 1;
      if (next <= 0) weakMap.delete(a.item);
      else weakMap.set(a.item, next);
    }
  }

  if (recent.length > ACCURACY_WINDOW) recent = recent.slice(-ACCURACY_WINDOW);

  langTopics[topicId] = { attempts, correct };
  topicStats[langId] = langTopics;

  const weakList = [...weakMap.entries()]
    .map(([item, misses]) => ({ item, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, WEAK_WORDS_CAP);
  weakWordsAll[langId] = weakList;

  recentAll[langId] = recent;

  const lessonsForLang = Object.values(langTopics).reduce((n, t) => n + (t.attempts > 0 ? 1 : 0), 0);
  const difficulty = { ...(profile.difficulty || {}) };
  difficulty[langId] = computeDifficulty(recent, lessonsForLang, difficulty[langId]);

  return { topicStats, weakWords: weakWordsAll, recentAccuracy: recentAll, difficulty };
}

function computeDifficulty(recentAnswers, lessonsCompleted, previousTier) {
  if (lessonsCompleted < MIN_LESSONS_FOR_LEVELING || recentAnswers.length === 0) {
    return previousTier || "beginner";
  }
  const accuracy = recentAnswers.reduce((s, v) => s + v, 0) / recentAnswers.length;
  if (accuracy >= 0.85) return "advanced";
  if (accuracy >= 0.6) return "intermediate";
  return "beginner";
}

export function getPersonalization(profile, langId) {
  const weakWords = ((profile?.weakWords || {})[langId] || []).map(w => w.item);
  const difficulty = (profile?.difficulty || {})[langId] || "beginner";
  return { weakWords, difficulty };
}
