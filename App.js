import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, ActivityIndicator, StatusBar,
  Platform, Dimensions,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");
const API = "https://api.anthropic.com/v1/messages";
const API_KEY = "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"; // ← paste your key from console.anthropic.com
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
];

/* ─── AI Helpers ────────────────────────────────────────────────────────── */
function buildPrompt(langId) {
  const names = {
    bukharian: "Bukharian (Bukhori/Judeo-Tajik)",
    farsi: "Farsi (Persian)",
    sogdian: "Sogdian (ancient Silk Road language, use romanized transcription)",
  };
  return `You are an expert ${names[langId]} language teacher. Generate a beginner lesson of exactly 6 exercises.
Return ONLY a valid JSON array, no markdown fences, no explanation.

Use these types in order: mcq, mcq, match, mcq, fillblank, mcq

MCQ: {"type":"mcq","direction":"target_to_en","word":"<romanized>","word_native":"<native script>","english":"<meaning>","correct":"<correct option>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>"],"fun_fact":"<cultural fact>"}

MATCH (4 pairs): {"type":"match","pairs":[{"target":"<romanized>","english":"<meaning>"},{"target":"<w2>","english":"<m2>"},{"target":"<w3>","english":"<m3>"},{"target":"<w4>","english":"<m4>"}]}

FILLBLANK: {"type":"fillblank","template":"<English sentence with ___ blank>","correct_target":"<target word romanized>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>"]}

Rules: real accurate vocabulary only, shuffle options, culturally rich fun_facts.`;
}

async function fetchLesson(langId) {
  const r = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: buildPrompt(langId) }],
    }),
  });
  const d = await r.json();
  console.log("STATUS:", r.status);
  console.log("RESPONSE:", JSON.stringify(d).slice(0, 600));
  if (!r.ok || d.error) {
    throw new Error(`${r.status}: ${d.error?.message || JSON.stringify(d)}`);
  }
  const text = d.content?.[0]?.text || "[]";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

/* ─── Animated Heart ────────────────────────────────────────────────────── */
function Heart({ filled }) {
  return (
    <Text style={{ fontSize: 22, opacity: filled ? 1 : 0.25 }}>❤️</Text>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────────────────── */
function ProgressBar({ current, total, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0.04, current / total),
      duration: 400, useNativeDriver: false,
    }).start();
  }, [current]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return (
    <View style={{ flex: 1, height: 14, backgroundColor: "#E5E5E5", borderRadius: 7, overflow: "hidden" }}>
      <Animated.View style={{ height: "100%", width, backgroundColor: color, borderRadius: 7 }} />
    </View>
  );
}

/* ─── MCQ Exercise ──────────────────────────────────────────────────────── */
function ExerciseMCQ({ ex, lang, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const isNative = ex.direction === "target_to_en";

  const handle = (opt) => {
    if (disabled || selected) return;
    setSelected(opt);
    setTimeout(() => onAnswer(opt === ex.correct, opt), 350);
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
        <Text style={[styles.promptWord, { fontSize: isNative ? 38 : 26 }]}>
          {isNative ? (ex.word_native || ex.word) : ex.english}
        </Text>
        {isNative && ex.word_native && ex.word !== ex.word_native && (
          <Text style={styles.promptRomanized}>{ex.word}</Text>
        )}
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
  const parts = ex.template.split("___");

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

  const tileStyle = (key, isLeft, active, isMatched, isWrong) => [
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
              <TouchableOpacity key={i} style={tileStyle(p.target, true, active, isMatched, isWrong)}
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
              <TouchableOpacity key={i} style={tileStyle(p.english, false, active, isMatched, isWrong)}
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

/* ─── Feedback Bar ──────────────────────────────────────────────────────── */
function FeedbackBar({ correct, funFact, onContinue, lang, correctAnswer }) {
  const slideAnim = useRef(new Animated.Value(200)).current;
  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  }, []);

  return (
    <Animated.View style={[styles.feedbackBar, { backgroundColor: correct ? "#D7FFB8" : "#FFD0D0", borderTopColor: correct ? "#58CC02" : "#FF4B4B", transform: [{ translateY: slideAnim }] }]}>
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
function ResultScreen({ lang, correct, total, xpEarned, onHome, onRetry }) {
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

      <View style={{ gap: 12, width: "100%" }}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: lang.color, borderBottomColor: lang.shadow }]} onPress={onRetry} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Practice Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onHome} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Change Language</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ─── Loading Screen ────────────────────────────────────────────────────── */
function LoadingScreen({ lang }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={[styles.loadingScreen, { backgroundColor: lang.pale }]}>
      <StatusBar barStyle="dark-content" />
      <Animated.Text style={[{ fontSize: 72 }, { transform: [{ scale: pulseAnim }] }]}>{lang.emoji}</Animated.Text>
      <Text style={styles.loadingTitle}>Building your lesson</Text>
      <Text style={[styles.loadingSubtitle, { color: lang.color }]}>{lang.name}</Text>
      <ActivityIndicator size="large" color={lang.color} style={{ marginTop: 16 }} />
    </SafeAreaView>
  );
}

/* ─── Lesson Screen ─────────────────────────────────────────────────────── */
function LessonScreen({ lang, exercises, onDone, onQuit }) {
  const [idx, setIdx] = useState(0);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [xp, setXp] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const ex = exercises[idx];

  const handleAnswer = useCallback((correct, answer) => {
    if (correct) {
      setXp(x => x + XP_PER_CORRECT);
      setCorrectCount(c => c + 1);
      setFeedback({ correct: true, funFact: ex.fun_fact || null });
    } else {
      const newHearts = hearts - 1;
      setHearts(newHearts);
      setFeedback({ correct: false, correctAnswer: ex.correct || ex.correct_target });
      if (newHearts <= 0) setTimeout(() => setDone(true), 1200);
    }
  }, [ex, hearts]);

  const handleMatchComplete = useCallback(() => {
    setXp(x => x + XP_PER_CORRECT);
    setCorrectCount(c => c + 1);
    setFeedback({ correct: true, funFact: "Matching pairs builds deep vocabulary recall!" });
  }, []);

  const handleContinue = () => {
    setFeedback(null);
    if (idx + 1 >= exercises.length) { setDone(true); return; }
    setIdx(i => i + 1);
  };

  if (done) {
    return <ResultScreen lang={lang} correct={correctCount} total={exercises.length}
      xpEarned={xp} onHome={onQuit} onRetry={() => onDone("retry")} />;
  }

  const exerciseLabel = {
    mcq: ex.direction === "target_to_en" ? "What does this mean?" : "How do you say this?",
    fillblank: "Fill in the blank",
    match: "Match the pairs",
  }[ex.type];

  return (
    <SafeAreaView style={styles.lessonScreen}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onQuit} style={styles.quitBtn}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <ProgressBar current={idx} total={exercises.length} color={lang.color} />
        <View style={{ flexDirection: "row", gap: 3 }}>
          {Array.from({ length: HEARTS_MAX }).map((_, i) => <Heart key={i} filled={i < hearts} />)}
        </View>
      </View>

      {/* XP */}
      <View style={{ alignItems: "flex-end", paddingHorizontal: 20, marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFD700" }}>⚡ {xp} XP</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: feedback ? 200 : 24 }}>
        <Text style={styles.exerciseLabel}>{exerciseLabel}</Text>

        {ex.type === "mcq" && (
          <ExerciseMCQ key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} disabled={!!feedback} />
        )}
        {ex.type === "fillblank" && (
          <ExerciseFillBlank key={idx} ex={ex} lang={lang} onAnswer={handleAnswer} disabled={!!feedback} />
        )}
        {ex.type === "match" && (
          <ExerciseMatch key={idx} ex={ex} lang={lang} onComplete={handleMatchComplete} />
        )}
      </ScrollView>

      {feedback && (
        <FeedbackBar correct={feedback.correct} funFact={feedback.funFact}
          onContinue={handleContinue} lang={lang} correctAnswer={feedback.correctAnswer} />
      )}
    </SafeAreaView>
  );
}

/* ─── Home Screen ───────────────────────────────────────────────────────── */
function HomeScreen({ onSelect, stats }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="light-content" backgroundColor="#58CC02" />
      <ScrollView>
        {/* Header */}
        <View style={styles.homeHeader}>
          <Text style={styles.homeHeaderEyebrow}>THE SILK ROAD</Text>
          <Text style={styles.homeTitle}>Language Lab</Text>
          <Text style={styles.homeSubtitle}>Three ancient languages, one modern method</Text>
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

        {/* Language cards */}
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={styles.sectionLabel}>CHOOSE A LANGUAGE</Text>
          {LANGS.map((lang) => (
            <TouchableOpacity key={lang.id} style={styles.langCard} onPress={() => onSelect(lang)} activeOpacity={0.8}>
              {/* Emoji icon */}
              <View style={[styles.langIcon, { backgroundColor: lang.pale }]}>
                <Text style={{ fontSize: 30 }}>{lang.emoji}</Text>
              </View>
              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <Text style={styles.langName}>{lang.name}</Text>
                  <Text style={styles.langNative}>{lang.native}</Text>
                </View>
                <Text style={styles.langDesc}>{lang.desc}</Text>
                {/* Progress mini */}
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
              {/* Arrow */}
              <View style={[styles.langArrow, { backgroundColor: lang.pale }]}>
                <Text style={[styles.langArrowText, { color: lang.color }]}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>Powered by Claude AI · Fresh content each lesson</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── App Root ──────────────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState("home");
  const [activeLang, setActiveLang] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ streak: 0, totalXP: 0, lessons: 0 });

  const startLesson = async (lang) => {
    setActiveLang(lang); setScreen("loading"); setError(null);
    try {
      const exs = await fetchLesson(lang.id);
      if (!Array.isArray(exs) || exs.length === 0) throw new Error("empty");
      setExercises(exs);
      setScreen("lesson");
    } catch (e) {
      setError(e.message || "Unknown error. Check Expo logs for details.");
      setScreen("home");
    }
  };

  const handleDone = (action) => {
    setStats(s => ({
      ...s, totalXP: s.totalXP + 50, lessons: s.lessons + 1,
      streak: s.streak + (action === "retry" ? 0 : 1),
      [activeLang.id + "_xp"]: (s[activeLang.id + "_xp"] || 0) + 50,
    }));
    if (action === "retry") startLesson(activeLang);
    else setScreen("home");
  };

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {screen === "home" && <HomeScreen onSelect={startLesson} stats={stats} />}
      {screen === "loading" && activeLang && <LoadingScreen lang={activeLang} />}
      {screen === "lesson" && activeLang && exercises.length > 0 && (
        <LessonScreen lang={activeLang} exercises={exercises} onDone={handleDone} onQuit={() => setScreen("home")} />
      )}
    </View>
    </SafeAreaProvider>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // Lesson
  lessonScreen: { flex: 1, backgroundColor: "#fff" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingTop: 8 },
  quitBtn: { padding: 8 },
  quitBtnText: { fontSize: 18, color: "#AFAFAF", fontWeight: "800" },
  exerciseLabel: { fontSize: 20, fontWeight: "800", color: "#3C3C3C", paddingHorizontal: 20, marginBottom: 20 },

  // Exercise
  exerciseContainer: { paddingHorizontal: 20, gap: 16 },
  promptCard: { borderRadius: 20, padding: 28, alignItems: "center", borderWidth: 2 },
  promptWord: { fontWeight: "900", color: "#3C3C3C", textAlign: "center" },
  promptRomanized: { fontSize: 15, color: "#AFAFAF", marginTop: 6, fontStyle: "italic" },

  // Options
  optionBtn: {
    padding: 16, borderRadius: 16, borderWidth: 2,
    borderColor: "#E5E5E5", backgroundColor: "#fff",
  },
  optionCorrect: { borderColor: "#58CC02", backgroundColor: "#D7FFB8" },
  optionWrong: { borderColor: "#FF4B4B", backgroundColor: "#FFD0D0" },
  optionText: { fontSize: 16, fontWeight: "700", color: "#3C3C3C" },

  // Fill blank
  fillText: { fontSize: 20, fontWeight: "700", color: "#3C3C3C", textAlign: "center", lineHeight: 34 },
  fillBlank: { fontWeight: "900", textDecorationLine: "underline" },

  // Match
  matchTile: {
    padding: 14, borderRadius: 14, borderWidth: 2,
    borderColor: "#E5E5E5", backgroundColor: "#fff", alignItems: "center",
  },
  matchText: { fontSize: 14, fontWeight: "700", color: "#3C3C3C", textAlign: "center" },
  matchMatched: { borderColor: "#E5E5E5", backgroundColor: "#F7F7F7", opacity: 0.4 },
  matchWrong: { borderColor: "#FF4B4B", backgroundColor: "#FFD0D0" },

  // Feedback
  feedbackBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 24,
    borderTopWidth: 4,
  },
  feedbackTitle: { fontSize: 18, fontWeight: "900" },
  feedbackAnswer: { fontSize: 16, fontWeight: "700", color: "#3C3C3C", marginTop: 2 },
  funFact: { fontSize: 13, color: "#3C3C3C", opacity: 0.75, marginBottom: 12, lineHeight: 18 },
  continueBtn: {
    padding: 16, borderRadius: 16, alignItems: "center",
    borderBottomWidth: 4,
  },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },

  // Result
  resultScreen: {
    flex: 1, backgroundColor: "#fff", alignItems: "center",
    justifyContent: "center", padding: 24, gap: 24,
  },
  resultTitle: { fontSize: 32, fontWeight: "900", color: "#3C3C3C", marginTop: 8 },
  resultSubtitle: { fontSize: 16, color: "#AFAFAF", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, backgroundColor: "#F7F7F7", borderRadius: 16,
    padding: 16, alignItems: "center", borderWidth: 2, borderColor: "#E5E5E5",
  },
  statValue: { fontSize: 22, fontWeight: "900", marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#AFAFAF", marginTop: 2 },
  primaryBtn: { padding: 16, borderRadius: 16, alignItems: "center", borderBottomWidth: 4 },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "900" },
  secondaryBtn: {
    padding: 16, borderRadius: 16, alignItems: "center",
    borderWidth: 2, borderColor: "#E5E5E5", borderBottomWidth: 4, borderBottomColor: "#E5E5E5",
  },
  secondaryBtnText: { color: "#AFAFAF", fontSize: 17, fontWeight: "900" },

  // Loading
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTitle: { fontSize: 22, fontWeight: "900", color: "#3C3C3C" },
  loadingSubtitle: { fontSize: 16, fontWeight: "700" },

  // Home
  homeHeader: { backgroundColor: "#58CC02", padding: 28, paddingTop: 20, alignItems: "center" },
  homeHeaderEyebrow: { color: "rgba(255,255,255,0.8)", fontWeight: "900", letterSpacing: 2, fontSize: 12, marginBottom: 6 },
  homeTitle: { color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -0.5 },
  homeSubtitle: { color: "rgba(255,255,255,0.8)", fontWeight: "700", marginTop: 4, fontSize: 14 },
  statsBar: {
    flexDirection: "row", padding: 16,
    borderBottomWidth: 2, borderBottomColor: "#E5E5E5",
  },
  statBarValue: { fontSize: 18, fontWeight: "900", color: "#3C3C3C" },
  statBarLabel: { fontSize: 11, fontWeight: "700", color: "#AFAFAF" },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#AFAFAF", letterSpacing: 1, marginBottom: 4 },
  langCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderWidth: 2, borderColor: "#E5E5E5",
    borderBottomWidth: 4, borderBottomColor: "#E5E5E5", borderRadius: 20, padding: 18,
  },
  langIcon: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  langName: { fontSize: 18, fontWeight: "900", color: "#3C3C3C" },
  langNative: { fontSize: 13, color: "#AFAFAF", fontWeight: "700" },
  langDesc: { fontSize: 12, color: "#AFAFAF", fontWeight: "700" },
  langXP: { fontSize: 12, fontWeight: "800" },
  langArrow: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  langArrowText: { fontSize: 18, fontWeight: "900" },
  footer: { textAlign: "center", padding: 20, color: "#AFAFAF", fontSize: 11, fontWeight: "700" },

  // Error
  errorBanner: {
    position: "absolute", top: 50, left: 20, right: 20, zIndex: 999,
    backgroundColor: "#FFD0D0", borderWidth: 2, borderColor: "#FF4B4B",
    borderRadius: 12, padding: 12,
  },
  errorText: { color: "#8B0000", fontWeight: "700", textAlign: "center", fontSize: 13 },
});