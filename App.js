import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, ActivityIndicator, StatusBar,
  Platform, Dimensions,
} from "react-native";
import * as Speech from "expo-speech";
import { SafeAreaView, SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

const { width: SCREEN_W } = Dimensions.get("window");

// EXPO_PUBLIC_LLM_BACKEND: "openrouter" (default) | "groq" | "gemini" | "local"
const BACKEND = process.env.EXPO_PUBLIC_LLM_BACKEND || "openrouter";
const API =
  BACKEND === "local"       ? "http://10.0.2.2:11434/v1/chat/completions" :
  BACKEND === "groq"        ? "https://api.groq.com/openai/v1/chat/completions" :
  BACKEND === "gemini"      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" :
                              "https://openrouter.ai/api/v1/chat/completions";
const API_KEY =
  BACKEND === "local"       ? "ollama" :
  BACKEND === "groq"        ? process.env.EXPO_PUBLIC_GROQ_API_KEY :
  BACKEND === "gemini"      ? process.env.EXPO_PUBLIC_GEMINI_API_KEY :
                              process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const MODEL =
  BACKEND === "local"       ? "gemma4" :
  BACKEND === "groq"        ? "llama-3.3-70b-versatile" :
  BACKEND === "gemini"      ? "gemini-2.0-flash" :
                              "openai/gpt-oss-120b:free";

const HEARTS_MAX = 3;
const XP_PER_CORRECT = 10;

/* ─── Language Config ───────────────────────────────────────────────────── */
const LANGS = [
  {
    id: "bukharian", name: "Bukharian", native: "Бухорӣ", emoji: "🕌",
    color: "#1CB0F6", shadow: "#1899D6", pale: "#EBF8FF",
    desc: "Judeo-Tajik · Silk Road Jews of Central Asia",
  },
  {
    id: "farsi", name: "Farsi", native: "فارسی", emoji: "🦁",
    color: "#58CC02", shadow: "#46A302", pale: "#F0FDE8",
    desc: "Persian · Language of Hafez & Rumi",
  },
  {
    id: "sogdian", name: "Sogdian", native: "Sogdī", emoji: "🐪",
    color: "#CE82FF", shadow: "#9C4FD1", pale: "#F7EEFF",
    desc: "Ancient · Voice of the Silk Road",
  },
  {
    id: "arabic", name: "Arabic", native: "العربية", emoji: "🌙",
    color: "#FF9600", shadow: "#E08500", pale: "#FFF8ED",
    desc: "Classical · Language of trade & scholarship",
  },
  {
    id: "uzbek", name: "Uzbek", native: "O'zbek", emoji: "🌟",
    color: "#FF4B4B", shadow: "#CC1111", pale: "#FFF0F0",
    desc: "Turkic · Heart of the ancient Silk Road",
  },
  {
    id: "hebrew", name: "Hebrew", native: "עברית", emoji: "✡️",
    color: "#4C97FF", shadow: "#3C7FCC", pale: "#EFF5FF",
    desc: "Semitic · Sacred language of Torah & Jewish tradition",
  },
  {
    id: "aramaic", name: "Aramaic", native: "ܐܪܡܝܐ", emoji: "🏺",
    color: "#26C6DA", shadow: "#00ACC1", pale: "#E0F7FA",
    desc: "Ancient · Lingua franca of the Near East",
  },
];

// Languages with a native-script TTS locale; others use device default (romanized word)
const SPEECH_LOCALE = {
  farsi:     "fa-IR",
  arabic:    "ar-SA",
  uzbek:     "uz-UZ",
  hebrew:    "he-IL",
};

/* ─── Lesson Topics ─────────────────────────────────────────────────────── */
const TOPICS = [
  { id: "greetings", name: "Greetings", emoji: "👋", desc: "Hello, goodbye & pleasantries" },
  { id: "food", name: "Food & Market", emoji: "🍎", desc: "Fruits, spices & market talk" },
  { id: "numbers", name: "Numbers", emoji: "🔢", desc: "Count from 1 to 100" },
  { id: "family", name: "Family", emoji: "👨‍👩‍👧", desc: "Parents, siblings & relatives" },
  { id: "travel", name: "Travel", emoji: "🗺️", desc: "Roads, cities & directions" },
  { id: "nature", name: "Nature", emoji: "🌿", desc: "Animals, plants & landscape" },
  { id: "colors", name: "Colors", emoji: "🎨", desc: "The full color spectrum" },
  { id: "time", name: "Time & Days", emoji: "📅", desc: "Days, months & telling time" },
];

/* ─── Achievements ──────────────────────────────────────────────────────── */
const ACHIEVEMENTS = [
  { id: "first_lesson", name: "First Steps", emoji: "👣", desc: "Complete your first lesson", check: (s) => s.lessons >= 1 },
  { id: "streak_3", name: "On Fire", emoji: "🔥", desc: "Reach a 3-day streak", check: (s) => s.streak >= 3 },
  { id: "streak_7", name: "Week Warrior", emoji: "⚔️", desc: "Reach a 7-day streak", check: (s) => s.streak >= 7 },
  { id: "xp_100", name: "XP Collector", emoji: "⚡", desc: "Earn 100 total XP", check: (s) => s.totalXP >= 100 },
  { id: "xp_500", name: "XP Master", emoji: "💎", desc: "Earn 500 total XP", check: (s) => s.totalXP >= 500 },
  { id: "trilingual", name: "Trilingual", emoji: "🗣️", desc: "Try all 3 core languages", check: (s) => s.bukharian_xp > 0 && s.farsi_xp > 0 && s.sogdian_xp > 0 },
  { id: "polyglot", name: "Polyglot", emoji: "🌐", desc: "Try all 7 languages", check: (s) => s.bukharian_xp > 0 && s.farsi_xp > 0 && s.sogdian_xp > 0 && s.arabic_xp > 0 && s.uzbek_xp > 0 && s.hebrew_xp > 0 && s.aramaic_xp > 0 },
  { id: "perfect_10", name: "Perfectionist", emoji: "🏅", desc: "Complete 10 perfect lessons", check: (s) => s.perfectLessons >= 10 },
  { id: "lessons_5", name: "Dedicated", emoji: "📚", desc: "Complete 5 lessons", check: (s) => s.lessons >= 5 },
  { id: "lessons_25", name: "Scholar", emoji: "🎓", desc: "Complete 25 lessons", check: (s) => s.lessons >= 25 },
];

/* ─── Cultural Tips ─────────────────────────────────────────────────────── */
const CULTURAL_TIPS = [
  { emoji: "🐪", text: "Sogdian merchants dominated Silk Road trade from the 4th–8th centuries, leaving inscriptions from China to Constantinople." },
  { emoji: "📜", text: "Bukharian Jews trace their community to the ancient Persian diaspora — their dialect preserves medieval Tajik vocabulary lost elsewhere." },
  { emoji: "🌹", text: "Persian poetry gave the world over 70,000 verses from Hafez alone. 'Ghazal' — a love poem form — spread from Farsi to Urdu and Turkish." },
  { emoji: "🕌", text: "Bukhara (in modern Uzbekistan) was once the world's most important center of Islamic scholarship, home to 300 mosques and 100 madrasas." },
  { emoji: "🌙", text: "Arabic became a lingua franca of science, medicine and philosophy in the medieval world — 'algebra', 'algorithm' and 'alcohol' are all Arabic loanwords." },
  { emoji: "🌟", text: "The Uzbek city of Samarkand was a key Silk Road hub where Chinese, Indian, Persian and Turkic cultures intermingled for centuries." },
  { emoji: "🍊", text: "The word 'orange' entered English via Old French 'orenge', from Arabic 'nāranj', from Persian 'nārang', from Sanskrit 'nāraṅga'." },
  { emoji: "🎶", text: "The oud (عود), ancestor of the European lute, traveled westward along the Silk Road and shaped Renaissance music." },
  { emoji: "🧭", text: "The Silk Road was not a single road but a network of routes spanning 4,000 miles from China to the Mediterranean." },
  { emoji: "💰", text: "Sogdian merchants used sophisticated letters of credit — effectively early banking — to transfer wealth across thousands of miles without carrying gold." },
];

/* ─── AI Helpers ────────────────────────────────────────────────────────── */
function buildPrompt(langId, topicId) {
  const names = {
    bukharian: "Bukharian (Bukhori/Judeo-Tajik, use Cyrillic script for word_native, e.g., салом, рафтан, хуб — do NOT use Arabic script)",
    farsi: "Farsi (Persian)",
    sogdian: "Sogdian (ancient Silk Road language, romanized transliteration only for both word and word_native)",
    arabic: "Arabic (use both Arabic script and romanized transliteration)",
    uzbek: "Uzbek (modern Latin-script Uzbek)",
    hebrew: "Hebrew (use Hebrew script for word_native, e.g., שלום, ספר, בית — do NOT use Arabic or Latin script for word_native)",
    aramaic: "Aramaic (Classical/Syriac, use romanized transliteration)",
  };
  const topicHint = topicId ? ` Focus the vocabulary on the topic: "${topicId}".` : "";
  return `You are an expert ${names[langId]} language teacher. Generate a beginner lesson of exactly 20 exercises.${topicHint}
Return ONLY a valid JSON array, no markdown fences, no explanation.

Use these types in order: mcq, mcq, match, mcq, fillblank, mcq, wordarrange, mcq, mcq, match, mcq, fillblank, mcq, wordarrange, mcq, mcq, match, mcq, fillblank, wordarrange

MCQ: {"type":"mcq","direction":"target_to_en","word":"<romanized>","word_native":"<native script>","english":"<meaning>","correct":"<correct option>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>"],"fun_fact":"<cultural fact>"}

MATCH (4 pairs): {"type":"match","pairs":[{"target":"<romanized>","english":"<meaning>"},{"target":"<w2>","english":"<m2>"},{"target":"<w3>","english":"<m3>"},{"target":"<w4>","english":"<m4>"}]}

FILLBLANK: {"type":"fillblank","template":"<English sentence with ___ blank>","correct_target":"<target word romanized>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>"]}

WORDARRANGE: {"type":"wordarrange","english":"<English sentence>","words":["<word1>","<word2>","<word3>","<word4>"],"correct_order":["<word1>","<word3>","<word2>","<word4>"],"hint":"<grammar tip about word order>"}

Rules: real accurate vocabulary only, shuffle options, culturally rich fun_facts. WORDARRANGE words should be 4-5 romanized target-language words that form a simple sentence.`;
}

async function fetchLesson(langId, topicId) {
  const r = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
      ...(BACKEND === "openrouter" && {
        "HTTP-Referer": "https://silkroadduo.app",
        "X-Title": "SilkRoadDuo",
      }),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: buildPrompt(langId, topicId) }],
    }),
  });
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(`${r.status}: ${d.error?.message || JSON.stringify(d)}`);
  const raw = d.choices?.[0]?.message?.content || "[]";
  let jsonStr = raw.replace(/```json|```/g, "").trim();
  const start = jsonStr.indexOf("[");
  const end = jsonStr.lastIndexOf("]");
  if (start !== -1 && end > start) jsonStr = jsonStr.slice(start, end + 1);
  let exercises;
  try {
    exercises = JSON.parse(jsonStr);
  } catch {
    // Response truncated mid-array — drop the incomplete last element
    const lastComma = jsonStr.lastIndexOf(",");
    exercises = lastComma > 0 ? JSON.parse(jsonStr.slice(0, lastComma) + "]") : [];
  }
  // Sogdian ancient script cannot be shaped by Android's HarfBuzz; use romanized only
  if (langId === "sogdian") {
    exercises.forEach(ex => { delete ex.word_native; });
  }
  // Normalize correct answer to exactly match the option string (guards against AI casing/whitespace drift)
  return exercises.map(ex => {
    if (ex.type === "mcq" && ex.options) {
      const match = ex.options.find(o => o.trim().toLowerCase() === (ex.correct || "").trim().toLowerCase());
      if (match) ex.correct = match;
    }
    if (ex.type === "fillblank" && ex.options) {
      const match = ex.options.find(o => o.trim().toLowerCase() === (ex.correct_target || "").trim().toLowerCase());
      if (match) ex.correct_target = match;
    }
    return ex;
  });
}

/* ─── Animated Heart ────────────────────────────────────────────────────── */
function Heart({ filled }) {
  return <Text style={{ fontSize: 22, opacity: filled ? 1 : 0.25 }}>❤️</Text>;
}

/* ─── Progress Bar ──────────────────────────────────────────────────────── */
function ProgressBar({ current, total, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.max(0.04, current / total), duration: 400, useNativeDriver: false }).start();
  }, [current]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={{ flex: 1, height: 14, backgroundColor: "#E5E5E5", borderRadius: 7, overflow: "hidden" }}>
      <Animated.View style={{ height: "100%", width, backgroundColor: color, borderRadius: 7 }} />
    </View>
  );
}

// Detect which bundled font covers the script characters (Sogdian U+10F30-U+10F6F vs Old Uyghur U+10F70-U+10FAF)
function sogdianFont(text = "") {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x10F70 && cp <= 0x10FAF) return "NotoSansOldUyghur";
    if (cp >= 0x10F00 && cp <= 0x10F6F) return "NotoSansSogdian";
  }
  return "NotoSansSogdian";
}

/* ─── MCQ Exercise ──────────────────────────────────────────────────────── */
function ExerciseMCQ({ ex, lang, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const isNative = ex.direction === "target_to_en";
  const ttsLocale = SPEECH_LOCALE[lang.id];
  // With a locale: speak native script. Without: speak romanized word via default TTS.
  const ttsWord = ttsLocale ? (ex.word_native || ex.word) : ex.word;

  const handle = (opt) => {
    if (disabled || selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt === ex.correct, opt), 350);
  };

  const speak = () => {
    Speech.stop();
    if (ttsLocale) {
      // Try native-script voice; fall back to romanized if locale voice not installed
      Speech.speak(ttsWord, { language: ttsLocale, onError: () => Speech.speak(ex.word, {}) });
    } else {
      Speech.speak(ex.word, {});
    }
  };

  const optStyle = (opt) => {
    if (!selected) return [styles.optionBtn, { borderColor: "#E5E5E5" }];
    if (opt === ex.correct) return [styles.optionBtn, styles.optionCorrect];
    if (opt === selected) return [styles.optionBtn, styles.optionWrong];
    return [styles.optionBtn, { borderColor: "#E5E5E5", opacity: 0.4 }];
  };
  const optTextStyle = (opt) => {
    if (!selected) return styles.optionText;
    if (opt === ex.correct) return [styles.optionText, { color: "#2A7C00" }];
    if (opt === selected) return [styles.optionText, { color: "#8B0000" }];
    return [styles.optionText, { color: "#AFAFAF" }];
  };

  return (
    <View style={styles.exerciseContainer}>
      <View style={[styles.promptCard, { backgroundColor: lang.pale, borderColor: lang.color + "44" }]}>
        <Text style={[styles.promptWord, { fontSize: isNative ? 38 : 26 }, lang.id === "sogdian" && { fontFamily: sogdianFont(ex.word_native || ex.word) }]}>
          {isNative ? (ex.word_native || ex.word) : ex.english}
        </Text>
        {isNative && ex.word_native && ex.word !== ex.word_native && (
          <Text style={styles.promptRomanized}>{ex.word}</Text>
        )}
        <TouchableOpacity onPress={speak} style={styles.speakBtn} activeOpacity={0.7}>
          <Text style={[styles.speakBtnText, { color: lang.color }]}>🔊</Text>
        </TouchableOpacity>
      </View>
      <View style={{ gap: 10 }}>
        {ex.options.map((opt, i) => (
          <TouchableOpacity key={i} style={optStyle(opt)} onPress={() => handle(opt)} activeOpacity={0.7}>
            <Text style={optTextStyle(opt)}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Fill in the Blank ─────────────────────────────────────────────────── */
function ExerciseFillBlank({ ex, lang, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const rawParts = ex.template.split("___");
  const parts = rawParts.length >= 2 ? rawParts : [ex.template, ""];

  const handle = (opt) => {
    if (disabled || selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt === ex.correct_target, opt), 350);
  };

  const optStyle = (opt) => {
    if (!selected) return [styles.optionBtn, { borderColor: "#E5E5E5" }];
    if (opt === ex.correct_target) return [styles.optionBtn, styles.optionCorrect];
    if (opt === selected) return [styles.optionBtn, styles.optionWrong];
    return [styles.optionBtn, { borderColor: "#E5E5E5", opacity: 0.4 }];
  };
  const optTextStyle = (opt) => {
    if (!selected) return styles.optionText;
    if (opt === ex.correct_target) return [styles.optionText, { color: "#2A7C00" }];
    if (opt === selected) return [styles.optionText, { color: "#8B0000" }];
    return [styles.optionText, { color: "#AFAFAF" }];
  };

  return (
    <View style={styles.exerciseContainer}>
      <View style={[styles.promptCard, { backgroundColor: lang.pale, borderColor: lang.color + "44" }]}>
        <Text style={styles.fillText}>
          {parts[0]}
          <Text style={[styles.fillBlank, { color: selected ? lang.color : "#AFAFAF", borderBottomColor: selected ? lang.color : "#AFAFAF" }]}>
            {selected ? ` ${selected} ` : "  ___  "}
          </Text>
          {parts[1]}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {ex.options.map((opt, i) => (
          <TouchableOpacity key={i} style={[optStyle(opt), { flex: 1, minWidth: "45%" }]} onPress={() => handle(opt)} activeOpacity={0.7}>
            <Text style={optTextStyle(opt)}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Match Exercise ────────────────────────────────────────────────────── */
function ExerciseMatch({ ex, lang, onComplete }) {
  const [selLeft, setSelLeft] = useState(null);
  const [selRight, setSelRight] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrong, setWrong] = useState(null);
  const [shuffled] = useState(() => ({
    left: [...ex.pairs].sort(() => Math.random() - 0.5),
    right: [...ex.pairs].sort(() => Math.random() - 0.5),
  }));

  useEffect(() => {
    if (!selLeft || !selRight) return;
    if (selLeft.english === selRight.english) {
      const next = [...matched, selLeft.target];
      setMatched(next);
      setSelLeft(null); setSelRight(null);
      if (next.length === ex.pairs.length) setTimeout(() => onComplete(), 500);
    } else {
      setWrong(`${selLeft.target}|${selRight.english}`);
      setTimeout(() => { setSelLeft(null); setSelRight(null); setWrong(null); }, 600);
    }
  }, [selLeft, selRight]);

  const tileStyle = (active, isMatched, isWrong) => [
    styles.matchTile,
    active && { borderColor: lang.color, backgroundColor: lang.pale },
    isMatched && styles.matchMatched,
    isWrong && styles.matchWrong,
  ];

  return (
    <View style={styles.exerciseContainer}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, gap: 10 }}>
          {shuffled.left.map((p, i) => {
            const isMatched = matched.includes(p.target);
            const active = selLeft?.target === p.target;
            const isWrong = wrong?.startsWith(p.target);
            return (
              <TouchableOpacity key={i} style={tileStyle(active, isMatched, isWrong)}
                onPress={() => !isMatched && setSelLeft(p)} activeOpacity={0.7}>
                <Text style={[styles.matchText, isMatched && { color: "#AFAFAF", textDecorationLine: "line-through" }, active && { color: lang.color }]}>
                  {p.target}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          {shuffled.right.map((p, i) => {
            const isMatched = matched.includes(p.target);
            const active = selRight?.english === p.english;
            const isWrong = wrong?.endsWith(p.english);
            return (
              <TouchableOpacity key={i} style={tileStyle(active, isMatched, isWrong)}
                onPress={() => !isMatched && setSelRight(p)} activeOpacity={0.7}>
                <Text style={[styles.matchText, isMatched && { color: "#AFAFAF", textDecorationLine: "line-through" }, active && { color: lang.color }]}>
                  {p.english}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 }}>
        {ex.pairs.map((_, i) => (
          <View key={i} style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: i < matched.length ? lang.color : "#E5E5E5",
          }} />
        ))}
      </View>
    </View>
  );
}

/* ─── Word Arrange Exercise ─────────────────────────────────────────────── */
function ExerciseWordArrange({ ex, lang, onAnswer, disabled }) {
  const [placed, setPlaced] = useState([]);
  const [bank, setBank] = useState(() => [...ex.words].sort(() => Math.random() - 0.5));
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(null);

  const addWord = (word, idx) => {
    if (submitted) return;
    setPlaced(p => [...p, word]);
    setBank(b => b.filter((_, i) => i !== idx));
  };

  const removeWord = (word, idx) => {
    if (submitted) return;
    setBank(b => [...b, word]);
    setPlaced(p => p.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (placed.length !== ex.words.length) return;
    const isCorrect = placed.join("|") === ex.correct_order.join("|");
    setCorrect(isCorrect);
    setSubmitted(true);
    setTimeout(() => onAnswer(isCorrect, placed.join(" ")), 500);
  };

  return (
    <View style={styles.exerciseContainer}>
      <View style={[styles.promptCard, { backgroundColor: lang.pale, borderColor: lang.color + "44" }]}>
        <Text style={styles.arrangeEnglish}>{ex.english}</Text>
        {ex.hint && <Text style={styles.arrangeHint}>💡 {ex.hint}</Text>}
      </View>

      {/* Answer zone */}
      <View style={[styles.arrangeZone, submitted && (correct ? styles.arrangeCorrect : styles.arrangeWrong)]}>
        {placed.length === 0 ? (
          <Text style={styles.arrangePlaceholder}>Tap words to build the sentence</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {placed.map((w, i) => (
              <TouchableOpacity key={i} onPress={() => removeWord(w, i)}
                style={[styles.wordChip, { backgroundColor: lang.color }]} activeOpacity={0.7}>
                <Text style={styles.wordChipText}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Word bank */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {bank.map((w, i) => (
          <TouchableOpacity key={i} onPress={() => addWord(w, i)}
            style={styles.wordBankChip} activeOpacity={0.7}>
            <Text style={styles.wordBankChipText}>{w}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit button */}
      {!submitted && placed.length === ex.words.length && (
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: lang.color, borderBottomColor: lang.shadow }]}
          onPress={submit} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>CHECK</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Feedback Bar ──────────────────────────────────────────────────────── */
function FeedbackBar({ correct, funFact, onContinue, lang, correctAnswer }) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, []);

  return (
    <Animated.View style={[styles.feedbackBar, { backgroundColor: correct ? "#D7FFB8" : "#FFD0D0", borderTopColor: correct ? "#58CC02" : "#FF4B4B", paddingBottom: Math.max(insets.bottom + 12, 24), transform: [{ translateY: slideAnim }] }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Text style={{ fontSize: 28 }}>{correct ? "🎉" : "💡"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.feedbackTitle, { color: correct ? "#2A7C00" : "#8B0000" }]}>
            {correct ? "Excellent!" : "Correct answer:"}
          </Text>
          {!correct && correctAnswer && (
            <Text style={styles.feedbackAnswer}>{correctAnswer}</Text>
          )}
        </View>
      </View>
      {correct && funFact && (
        <Text style={styles.funFact}>✦ {funFact}</Text>
      )}
      <TouchableOpacity
        style={[styles.continueBtn, { backgroundColor: correct ? "#58CC02" : "#FF4B4B", borderBottomColor: correct ? "#46A302" : "#CC1111" }]}
        onPress={onContinue} activeOpacity={0.85}>
        <Text style={styles.continueBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Result Screen ─────────────────────────────────────────────────────── */
function ResultScreen({ lang, correct, total, xpEarned, onHome, onRetry, newAchievements }) {
  const pct = Math.round((correct / total) * 100);
  const perfect = correct === total;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, []);

  return (
    <SafeAreaView style={styles.resultScreen}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={[{ alignItems: "center" }, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={{ fontSize: 80 }}>{perfect ? "🏆" : pct >= 60 ? "⭐" : lang.emoji}</Text>
        <Text style={styles.resultTitle}>{perfect ? "Perfect!" : pct >= 60 ? "Well done!" : "Keep going!"}</Text>
        <Text style={styles.resultSubtitle}>Lesson Complete</Text>
      </Animated.View>

      <View style={styles.statsRow}>
        {[
          { icon: "⚡", label: "Total XP", value: `+${xpEarned}`, color: "#FFD700" },
          { icon: "🎯", label: "Accuracy", value: `${pct}%`, color: lang.color },
          { icon: "✅", label: "Correct", value: `${correct}/${total}`, color: "#58CC02" },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={{ fontSize: 22 }}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {newAchievements && newAchievements.length > 0 && (
        <View style={styles.achievementUnlock}>
          <Text style={styles.achievementUnlockTitle}>🏅 Achievement Unlocked!</Text>
          {newAchievements.map((a) => (
            <View key={a.id} style={styles.achievementRow}>
              <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
              <View>
                <Text style={styles.achievementName}>{a.name}</Text>
                <Text style={styles.achievementDesc}>{a.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: 12, width: "100%" }}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: lang.color, borderBottomColor: lang.shadow }]} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Practice Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onHome} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ─── Loading Screen ────────────────────────────────────────────────────── */
function LoadingScreen({ lang, topic }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const topicObj = TOPICS.find(t => t.id === topic);

  return (
    <SafeAreaView style={[styles.loadingScreen, { backgroundColor: lang.pale }]}>
      <StatusBar barStyle="dark-content" />
      <Animated.Text style={[{ fontSize: 72 }, { transform: [{ scale: pulseAnim }] }]}>{lang.emoji}</Animated.Text>
      <Text style={styles.loadingTitle}>Building your lesson</Text>
      <Text style={[styles.loadingSubtitle, { color: lang.color }]}>{lang.name}</Text>
      {topicObj && <Text style={styles.loadingTopic}>{topicObj.emoji} {topicObj.name}</Text>}
      <ActivityIndicator size="large" color={lang.color} style={{ marginTop: 16 }} />
    </SafeAreaView>
  );
}

/* ─── Topic Picker Screen ───────────────────────────────────────────────── */
function TopicScreen({ lang, onSelect, onBack }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.topicHeader, { backgroundColor: lang.color }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.topicHeaderTitle}>{lang.emoji} {lang.name}</Text>
          <Text style={styles.topicHeaderSub}>Choose a topic</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <TouchableOpacity style={styles.topicCardRandom} onPress={() => onSelect(null)} activeOpacity={0.8}>
          <Text style={{ fontSize: 28 }}>🎲</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.topicCardName}>Random Lesson</Text>
            <Text style={styles.topicCardDesc}>Surprise me with mixed vocabulary</Text>
          </View>
          <Text style={[styles.langArrowText, { color: lang.color }]}>→</Text>
        </TouchableOpacity>
        {TOPICS.map((topic) => (
          <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => onSelect(topic.id)} activeOpacity={0.8}>
            <Text style={{ fontSize: 26 }}>{topic.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.topicCardName}>{topic.name}</Text>
              <Text style={styles.topicCardDesc}>{topic.desc}</Text>
            </View>
            <Text style={[styles.langArrowText, { color: lang.color }]}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Achievements Screen ───────────────────────────────────────────────── */
function AchievementsScreen({ stats, onBack }) {
  const unlocked = ACHIEVEMENTS.filter(a => a.check(stats));
  const locked = ACHIEVEMENTS.filter(a => !a.check(stats));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.achieveHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: "#3C3C3C" }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.achieveHeaderTitle}>🏅 Achievements</Text>
        <Text style={styles.achieveHeaderCount}>{unlocked.length}/{ACHIEVEMENTS.length}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {unlocked.length > 0 && (
          <>
            <Text style={styles.achieveSectionLabel}>UNLOCKED</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {unlocked.map(a => (
                <View key={a.id} style={[styles.achieveCard, styles.achieveCardUnlocked]}>
                  <Text style={{ fontSize: 28 }}>{a.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.achieveCardName}>{a.name}</Text>
                    <Text style={styles.achieveCardDesc}>{a.desc}</Text>
                  </View>
                  <Text style={{ color: "#58CC02", fontSize: 18 }}>✓</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {locked.length > 0 && (
          <>
            <Text style={styles.achieveSectionLabel}>LOCKED</Text>
            <View style={{ gap: 10 }}>
              {locked.map(a => (
                <View key={a.id} style={[styles.achieveCard, styles.achieveCardLocked]}>
                  <Text style={{ fontSize: 28, opacity: 0.3 }}>{a.emoji}</Text>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={[styles.achieveCardName, { color: "#AFAFAF" }]}>{a.name}</Text>
                    <Text style={styles.achieveCardDesc}>{a.desc}</Text>
                  </View>
                  <Text style={{ color: "#AFAFAF", fontSize: 18 }}>🔒</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Lesson Screen ─────────────────────────────────────────────────────── */
function LessonScreen({ lang, exercises, onComplete, onQuit }) {
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [xp, setXp] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPerfect, setIsPerfect] = useState(true);

  const ex = exercises[idx];

  const handleAnswer = useCallback((correct, answer) => {
    if (correct) {
      setXp(x => x + XP_PER_CORRECT);
      setCorrectCount(c => c + 1);
      setFeedback({ correct: true, funFact: ex.fun_fact || null });
    } else {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      setIsPerfect(false);
      setFeedback({ correct: false, correctAnswer: ex.correct || ex.correct_target || (ex.correct_order && ex.correct_order.join(" ")) });
      if (newHearts <= 0) {
        setTimeout(() => onComplete({ correctCount, xp, isPerfect: false, outOfHearts: true }), 1200);
      }
    }
  }, [ex, hearts, correctCount, xp]);

  const handleMatchComplete = useCallback(() => {
    setXp(x => x + XP_PER_CORRECT);
    setCorrectCount(c => c + 1);
    setFeedback({ correct: true, funFact: "Matching pairs builds deep vocabulary recall!" });
  }, []);

  const handleContinue = () => {
    setFeedback(null);
    if (idx + 1 >= exercises.length) {
      onComplete({ correctCount, xp, isPerfect });
      return;
    }
    setIdx(i => i + 1);
  };

  const exerciseLabel = {
    mcq: ex.direction === "target_to_en" ? "What does this mean?" : "How do you say this?",
    fillblank: "Fill in the blank",
    match: "Match the pairs",
    wordarrange: "Arrange the words",
  }[ex.type] || "Complete the exercise";

  return (
    <SafeAreaView style={styles.lessonScreen}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onQuit} style={styles.quitBtn}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <ProgressBar current={idx} total={exercises.length} color={lang.color} />
        <View style={{ flexDirection: "row", gap: 3 }}>
          {Array.from({ length: HEARTS_MAX }).map((_, i) => <Heart key={i} filled={i < hearts} />)}
        </View>
      </View>

      <View style={{ alignItems: "flex-end", paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFD700" }}>⚡ {xp} XP</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: feedback ? 200 : 24 }}>
        <Text style={styles.exerciseLabel}>{exerciseLabel}</Text>
        {ex.type === "mcq" && <ExerciseMCQ key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} disabled={!!feedback} />}
        {ex.type === "fillblank" && <ExerciseFillBlank key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} disabled={!!feedback} />}
        {ex.type === "match" && <ExerciseMatch key={idx} ex={ex} lang={lang} onComplete={handleMatchComplete} />}
        {ex.type === "wordarrange" && <ExerciseWordArrange key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} disabled={!!feedback} />}
      </ScrollView>

      {feedback && (
        <FeedbackBar correct={feedback.correct} funFact={feedback.funFact}
          onContinue={handleContinue} lang={lang} correctAnswer={feedback.correctAnswer} />
      )}
    </SafeAreaView>
  );
}


/* ─── Home Screen ───────────────────────────────────────────────────────── */
function HomeScreen({ onSelect, stats, onAchievements }) {
  const dailyTip = CULTURAL_TIPS[new Date().getDate() % CULTURAL_TIPS.length];
  const unlockedCount = ACHIEVEMENTS.filter(a => a.check(stats)).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="light-content" backgroundColor="#58CC02" />
      <ScrollView>
        {/* Header */}
        <View style={styles.homeHeader}>
          <Text style={styles.homeHeaderEyebrow}>THE SILK ROAD</Text>
          <Text style={styles.homeTitle}>Language Lab</Text>
          <Text style={styles.homeSubtitle}>Seven ancient languages, one modern method</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          {[
            { icon: "🔥", label: "Streak", value: stats.streak },
            { icon: "⚡", label: "Total XP", value: stats.totalXP },
            { icon: "🏆", label: "Lessons", value: stats.lessons },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 20 }}>{s.icon}</Text>
              <Text style={styles.statBarValue}>{s.value}</Text>
              <Text style={styles.statBarLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Cultural tip of the day */}
        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>SILK ROAD FACT</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 26 }}>{dailyTip.emoji}</Text>
            <Text style={styles.tipText}>{dailyTip.text}</Text>
          </View>
        </View>

        {/* Achievements button */}
        <TouchableOpacity style={styles.achieveBtn} onPress={onAchievements} activeOpacity={0.8}>
          <Text style={{ fontSize: 22 }}>🏅</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.achieveBtnTitle}>Achievements</Text>
            <Text style={styles.achieveBtnSub}>{unlockedCount} of {ACHIEVEMENTS.length} unlocked</Text>
          </View>
          <Text style={styles.langArrowText}>→</Text>
        </TouchableOpacity>

        {/* Language cards */}
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={styles.sectionLabel}>CHOOSE A LANGUAGE</Text>
          {LANGS.map((lang) => (
            <TouchableOpacity key={lang.id} style={styles.langCard} onPress={() => onSelect(lang)} activeOpacity={0.8}>
              <View style={[styles.langIcon, { backgroundColor: lang.pale }]}>
                <Text style={{ fontSize: 30 }}>{lang.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <Text style={styles.langName}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                <Text style={styles.langDesc}>{lang.desc}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1, height: 5, backgroundColor: "#E5E5E5", borderRadius: 3, overflow: "hidden" }}>
                    <View style={{
                      height: "100%", backgroundColor: lang.color,
                      width: `${Math.min(100, (stats[lang.id + "_xp"] || 0) / 2)}%`,
                      borderRadius: 3,
                    }} />
                  </View>
                  <Text style={[styles.langXP, { color: lang.color }]}>{stats[lang.id + "_xp"] || 0} XP</Text>
                </View>
              </View>
              <View style={[styles.langArrow, { backgroundColor: lang.pale }]}>
                <Text style={[styles.langArrowText, { color: lang.color }]}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>Powered by AI · Fresh content each lesson</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── App Root ──────────────────────────────────────────────────────────── */
export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansSogdian: require("./assets/fonts/NotoSansSogdian-Regular.ttf"),
    NotoSansOldUyghur: require("./assets/fonts/NotoSansOldUyghur-Regular.ttf"),
  });

  const [screen, setScreen] = useState("home");
  const [activeLang, setActiveLang] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ streak: 0, totalXP: 0, lessons: 0, perfectLessons: 0 });
  const [resultData, setResultData] = useState(null);
  const prefetchedLesson = useRef(null);

  const triggerPrefetch = (langId, topicId) => {
    fetchLesson(langId, topicId)
      .then(exs => { prefetchedLesson.current = { langId, topicId, exs }; })
      .catch(() => {});
  };

  const startLesson = async (lang, topicId) => {
    setActiveLang(lang); setActiveTopic(topicId); setError(null);
    const cached = prefetchedLesson.current;
    if (cached && cached.langId === lang.id && cached.topicId === topicId) {
      prefetchedLesson.current = null;
      setExercises(cached.exs);
      setScreen("lesson");
      triggerPrefetch(lang.id, topicId);
      return;
    }
    setScreen("loading");
    try {
      const exs = await fetchLesson(lang.id, topicId);
      if (!Array.isArray(exs) || exs.length === 0) throw new Error("empty");
      setExercises(exs);
      setScreen("lesson");
      triggerPrefetch(lang.id, topicId);
    } catch (e) {
      setError(e.message || "Unknown error. Check Expo logs for details.");
      setScreen("home");
    }
  };

  const handleLessonComplete = useCallback(({ correctCount, xp, isPerfect }) => {
    const newStats = {
      ...stats,
      totalXP: stats.totalXP + xp,
      lessons: stats.lessons + 1,
      perfectLessons: stats.perfectLessons + (isPerfect ? 1 : 0),
      streak: stats.streak + 1,
      [activeLang.id + "_xp"]: (stats[activeLang.id + "_xp"] || 0) + xp,
    };
    const prevUnlocked = new Set(ACHIEVEMENTS.filter(a => a.check(stats)).map(a => a.id));
    const newAchievements = ACHIEVEMENTS.filter(a => a.check(newStats) && !prevUnlocked.has(a.id));
    setStats(newStats);
    setResultData({ correctCount, total: exercises.length, xpEarned: xp, newAchievements });
    setScreen("result");
  }, [stats, activeLang, exercises]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {screen === "home" && (
          <HomeScreen
            onSelect={(lang) => { setActiveLang(lang); setScreen("topic"); }}
            stats={stats}
            onAchievements={() => setScreen("achievements")}
          />
        )}
        {screen === "topic" && activeLang && (
          <TopicScreen lang={activeLang} onSelect={(topicId) => startLesson(activeLang, topicId)}
            onBack={() => setScreen("home")} />
        )}
        {screen === "achievements" && (
          <AchievementsScreen stats={stats} onBack={() => setScreen("home")} />
        )}
        {screen === "loading" && activeLang && <LoadingScreen lang={activeLang} topic={activeTopic} />}
        {screen === "lesson" && activeLang && exercises.length > 0 && (
          <LessonScreen lang={activeLang} exercises={exercises}
            onComplete={handleLessonComplete} onQuit={() => setScreen("home")} />
        )}
        {screen === "result" && activeLang && resultData && (
          <ResultScreen
            lang={activeLang}
            correct={resultData.correctCount}
            total={resultData.total}
            xpEarned={resultData.xpEarned}
            newAchievements={resultData.newAchievements}
            onRetry={() => startLesson(activeLang, activeTopic)}
            onHome={() => setScreen("home")}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  lessonScreen: { flex: 1, backgroundColor: "#fff" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingTop: 8 },
  quitBtn: { padding: 8 },
  quitBtnText: { fontSize: 18, color: "#AFAFAF", fontWeight: "800" },
  exerciseLabel: { fontSize: 20, fontWeight: "800", color: "#3C3C3C", paddingHorizontal: 20, marginBottom: 20 },

  exerciseContainer: { paddingHorizontal: 20, gap: 16 },
  promptCard: { borderRadius: 20, padding: 28, alignItems: "center", borderWidth: 2 },
  promptWord: { fontWeight: "900", color: "#3C3C3C", textAlign: "center" },
  promptRomanized: { fontSize: 15, color: "#AFAFAF", marginTop: 6, fontStyle: "italic" },

  optionBtn: { padding: 16, borderRadius: 16, borderWidth: 2, borderColor: "#E5E5E5", backgroundColor: "#fff" },
  optionCorrect: { borderColor: "#58CC02", backgroundColor: "#D7FFB8" },
  optionWrong: { borderColor: "#FF4B4B", backgroundColor: "#FFD0D0" },
  optionText: { fontSize: 16, fontWeight: "700", color: "#3C3C3C" },

  fillText: { fontSize: 20, fontWeight: "700", color: "#3C3C3C", textAlign: "center", lineHeight: 34 },
  fillBlank: { fontWeight: "900", textDecorationLine: "underline" },

  matchTile: { padding: 14, borderRadius: 14, borderWidth: 2, borderColor: "#E5E5E5", backgroundColor: "#fff", alignItems: "center" },
  matchText: { fontSize: 14, fontWeight: "700", color: "#3C3C3C", textAlign: "center" },
  matchMatched: { borderColor: "#E5E5E5", backgroundColor: "#F7F7F7", opacity: 0.4 },
  matchWrong: { borderColor: "#FF4B4B", backgroundColor: "#FFD0D0" },

  // Word arrange
  arrangeEnglish: { fontSize: 22, fontWeight: "800", color: "#3C3C3C", textAlign: "center", marginBottom: 6 },
  arrangeHint: { fontSize: 13, color: "#AFAFAF", fontWeight: "600", textAlign: "center", marginTop: 4 },
  arrangeZone: {
    minHeight: 64, borderRadius: 16, borderWidth: 2, borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA", padding: 12, justifyContent: "center",
  },
  arrangeCorrect: { borderColor: "#58CC02", backgroundColor: "#D7FFB8" },
  arrangeWrong: { borderColor: "#FF4B4B", backgroundColor: "#FFD0D0" },
  arrangePlaceholder: { color: "#AFAFAF", fontWeight: "600", textAlign: "center" },
  wordChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  wordChipText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  wordBankChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 2, borderColor: "#E5E5E5", backgroundColor: "#fff",
    borderBottomWidth: 3, borderBottomColor: "#E5E5E5",
  },
  wordBankChipText: { color: "#3C3C3C", fontWeight: "700", fontSize: 15 },
  submitBtn: { padding: 14, borderRadius: 14, alignItems: "center", borderBottomWidth: 4, marginTop: 4 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },

  feedbackBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 20,
    borderTopWidth: 4,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "900" },
  feedbackAnswer: { fontSize: 16, fontWeight: "700", color: "#3C3C3C", marginTop: 2 },
  funFact: { fontSize: 13, color: "#3C3C3C", opacity: 0.75, marginBottom: 12, lineHeight: 18 },
  continueBtn: { padding: 16, borderRadius: 16, alignItems: "center", borderBottomWidth: 4 },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },

  resultScreen: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24, gap: 20 },
  resultTitle: { fontSize: 32, fontWeight: "900", color: "#3C3C3C", marginTop: 8 },
  resultSubtitle: { fontSize: 16, color: "#AFAFAF", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "#F7F7F7", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 2, borderColor: "#E5E5E5" },
  statValue: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#AFAFAF", marginTop: 2 },
  primaryBtn: { padding: 16, borderRadius: 16, alignItems: "center", borderBottomWidth: 4 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  secondaryBtn: { padding: 16, borderRadius: 16, alignItems: "center", borderWidth: 2, borderColor: "#E5E5E5", borderBottomWidth: 4, borderBottomColor: "#E5E5E5" },
  secondaryBtnText: { color: "#AFAFAF", fontSize: 17, fontWeight: "900" },

  achievementUnlock: { width: "100%", backgroundColor: "#FFF8E1", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#FFD700" },
  achievementUnlockTitle: { fontSize: 15, fontWeight: "900", color: "#856300", marginBottom: 10 },
  achievementRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  achievementName: { fontSize: 14, fontWeight: "800", color: "#3C3C3C" },
  achievementDesc: { fontSize: 12, color: "#AFAFAF", fontWeight: "600" },

  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTitle: { fontSize: 22, fontWeight: "900", color: "#3C3C3C" },
  loadingSubtitle: { fontSize: 16, fontWeight: "700" },
  loadingTopic: { fontSize: 14, color: "#AFAFAF", fontWeight: "700" },

  homeHeader: { backgroundColor: "#58CC02", padding: 28, paddingTop: 20, alignItems: "center" },
  homeHeaderEyebrow: { color: "rgba(255,255,255,0.8)", fontWeight: "900", letterSpacing: 2, fontSize: 12, marginBottom: 6 },
  homeTitle: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  homeSubtitle: { color: "rgba(255,255,255,0.8)", fontWeight: "700", marginTop: 4, fontSize: 14 },
  statsBar: { flexDirection: "row", padding: 16, borderBottomWidth: 2, borderBottomColor: "#E5E5E5" },
  statBarValue: { fontSize: 18, fontWeight: "900", color: "#3C3C3C" },
  statBarLabel: { fontSize: 11, fontWeight: "700", color: "#AFAFAF" },

  tipCard: { margin: 16, marginTop: 14, backgroundColor: "#FFFBEA", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#FFE066" },
  tipLabel: { fontSize: 10, fontWeight: "900", color: "#C8960C", letterSpacing: 1.5, marginBottom: 8 },
  tipText: { fontSize: 13, color: "#5C4A00", lineHeight: 20, fontWeight: "600", flex: 1 },

  achieveBtn: { marginHorizontal: 16, marginBottom: 4, flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderRadius: 16, padding: 16, borderWidth: 2, borderColor: "#E5E5E5" },
  achieveBtnTitle: { fontSize: 16, fontWeight: "800", color: "#3C3C3C" },
  achieveBtnSub: { fontSize: 12, color: "#AFAFAF", fontWeight: "600", marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#AFAFAF", letterSpacing: 1, marginBottom: 4 },
  langCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderWidth: 2, borderColor: "#E5E5E5", borderBottomWidth: 4, borderBottomColor: "#E5E5E5", borderRadius: 20, padding: 18 },
  langIcon: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  langName: { fontSize: 18, fontWeight: "900", color: "#3C3C3C" },
  langNative: { fontSize: 13, color: "#AFAFAF", fontWeight: "700" },
  langDesc: { fontSize: 12, color: "#AFAFAF", fontWeight: "700" },
  langXP: { fontSize: 12, fontWeight: "800" },
  langArrow: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  langArrowText: { fontSize: 18, fontWeight: "900", color: "#AFAFAF" },
  footer: { textAlign: "center", padding: 20, color: "#AFAFAF", fontSize: 11, fontWeight: "700" },

  // Topic screen
  topicHeader: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 12 },
  topicHeaderTitle: { fontSize: 20, fontWeight: "900", color: "#fff" },
  topicHeaderSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  topicCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 2, borderColor: "#E5E5E5", borderBottomWidth: 4, borderBottomColor: "#E5E5E5", borderRadius: 16, padding: 16 },
  topicCardRandom: { flexDirection: "row", alignItems: "center", backgroundColor: "#F7F7F7", borderWidth: 2, borderColor: "#E5E5E5", borderBottomWidth: 4, borderBottomColor: "#E5E5E5", borderRadius: 16, padding: 16 },
  topicCardName: { fontSize: 16, fontWeight: "800", color: "#3C3C3C" },
  topicCardDesc: { fontSize: 12, color: "#AFAFAF", fontWeight: "600", marginTop: 2 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 22, fontWeight: "800", color: "#fff" },

  // Achievements screen
  achieveHeader: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 12, borderBottomWidth: 2, borderBottomColor: "#E5E5E5" },
  achieveHeaderTitle: { flex: 1, fontSize: 20, fontWeight: "900", color: "#3C3C3C", textAlign: "center" },
  achieveHeaderCount: { fontSize: 14, fontWeight: "800", color: "#AFAFAF" },
  achieveSectionLabel: { fontSize: 11, fontWeight: "900", color: "#AFAFAF", letterSpacing: 1.5, marginBottom: 10 },
  achieveCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, borderWidth: 2 },
  achieveCardUnlocked: { backgroundColor: "#F0FDE8", borderColor: "#58CC02" },
  achieveCardLocked: { backgroundColor: "#F7F7F7", borderColor: "#E5E5E5" },
  achieveCardName: { fontSize: 15, fontWeight: "800", color: "#3C3C3C" },
  achieveCardDesc: { fontSize: 12, color: "#AFAFAF", fontWeight: "600", marginTop: 2 },

  errorBanner: {
    position: "absolute", top: 50, left: 20, right: 20, zIndex: 999,
    backgroundColor: "#FFD0D0", borderWidth: 2, borderColor: "#FF4B4B",
    borderRadius: 12, padding: 12,
  },
  errorText: { color: "#8B0000", fontWeight: "700", textAlign: "center", fontSize: 13 },

  speakBtn: { position: "absolute", top: 10, right: 10, padding: 6 },
  speakBtnText: { fontSize: 22 },
});

