// Profile storage for Silk Road Duo.
// Each profile has its own stats, achievements, lesson progress, and
// personalization data (per-topic accuracy, weak words, difficulty tier —
// see assets/lib/learning.js).
//
// Persistence: @react-native-async-storage/async-storage is the source of
// truth for gameplay (offline-first). assets/lib/cloudSync.js optionally
// backs a profile up to the battle Worker's /sync endpoint (opt-in restore
// on another device, using the profile's syncToken as a bearer secret) —
// local storage is never blocked on or overwritten by that.
// Storage layout:
//   @silk-road-duo:profiles  -> [{id, name, avatar, color, createdAt, stats,
//                                 achievements, topicStats, weakWords,
//                                 recentAccuracy, difficulty, syncToken}, ...]
//   @silk-road-duo:activeId  -> "uuid" of last-selected profile (string | null)

import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILES_KEY = "@silk-road-duo:profiles";
const ACTIVE_KEY   = "@silk-road-duo:activeId";

export const DEFAULT_AVATARS = [
  "🐪", "🏺", "🌙", "⭐", "🕌", "🌴", "🗺️",
  "👤", "👩", "👨", "🧑", "👴", "👵", "🧒",
  "🎓", "📚", "✨", "💫", "🌿", "🔮",
];

export const DEFAULT_COLORS = [
  "#C0392B", // silk red (default)
  "#1E3A8A", // lapis lazuli blue
  "#065F46", // oasis green
  "#7C3AED", // amethyst
  "#D97706", // saffron
  "#0369A1", // ocean blue
  "#7C2D12", // sienna
  "#581C87", // royal purple
];

export const DEFAULT_STATS = {
  streak: 0,
  totalXP: 0,
  lessons: 0,
  perfectLessons: 0,
  lastActiveDate: null,
  // per-language XP is stored as <langId>_xp
};

function uuid() {
  return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function makeProfile({ name, avatar, color }) {
  return {
    id: uuid(),
    name: (name || "").trim() || "Traveler",
    avatar: avatar || "🐪",
    color: color || DEFAULT_COLORS[0],
    createdAt: Date.now(),
    stats: { ...DEFAULT_STATS },
    achievements: [],
    topicStats: {},
    weakWords: {},
    recentAccuracy: {},
    difficulty: {},
    // Bearer secret for the optional cloud-sync backup/restore endpoint —
    // never displayed, only sent to the Worker over HTTPS.
    syncToken: uuid(),
  };
}

// ── Storage operations ──────────────────────────────────────────────────────
export async function loadProfiles() {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[profiles] loadProfiles failed:", err);
    return [];
  }
}

export async function saveProfiles(profiles) {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function loadActiveId() {
  try {
    return await AsyncStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveId(id) {
  if (id == null) {
    await AsyncStorage.removeItem(ACTIVE_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_KEY, id);
  }
}

// ── CRUD helpers ────────────────────────────────────────────────────────────
export async function createProfile({ name, avatar, color }) {
  const profiles = await loadProfiles();
  const profile = makeProfile({ name, avatar, color });
  profiles.push(profile);
  await saveProfiles(profiles);
  await saveActiveId(profile.id);
  return profile;
}

export async function updateProfile(id, patch) {
  const profiles = await loadProfiles();
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const next = {
    ...profiles[idx],
    ...patch,
    // Don't let callers clobber stats or achievements through updateProfile.
    stats: profiles[idx].stats,
    achievements: profiles[idx].achievements,
  };
  profiles[idx] = next;
  await saveProfiles(profiles);
  return next;
}

export async function deleteProfile(id) {
  const profiles = await loadProfiles();
  const next = profiles.filter((p) => p.id !== id);
  await saveProfiles(next);
  const active = await loadActiveId();
  if (active === id) {
    await saveActiveId(next[0]?.id ?? null);
  }
  return next;
}

// Fields updateProfileAtomic is allowed to merge, and how each one merges:
// object fields replace wholesale (callers pass the full computed value, as
// learning.js's recordAnswers()/applyProgress do), matching the previous
// stats/achievements behavior.
const ATOMIC_FIELDS = ["stats", "achievements", "topicStats", "weakWords", "recentAccuracy", "difficulty"];

// Atomic combined write — serializes concurrent lesson-completion writes.
let _writeQueue = Promise.resolve();
export async function updateProfileAtomic(id, mut) {
  const next = (async () => {
    const profiles = await loadProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const patch = {};
    for (const key of ATOMIC_FIELDS) {
      if (mut[key] === undefined) continue;
      patch[key] = key === "achievements"
        ? (Array.isArray(mut[key]) ? mut[key] : [])
        : { ...mut[key] };
    }
    profiles[idx] = { ...profiles[idx], ...patch };
    await saveProfiles(profiles);
    return profiles[idx];
  })();
  _writeQueue = _writeQueue.then(() => next, () => next);
  return _writeQueue;
}

// Used only by the explicit "Restore from cloud backup" action (cloudSync.js
// pullProfile + assets/lib/profiles_ui.js) — writes a profile fetched from
// the Worker into local storage under its original id, so it plays exactly
// like it did on the device that backed it up.
export async function upsertProfileFromBackup(profileId, syncToken, data) {
  const profiles = await loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profileId);
  const restored = { ...data, id: profileId, syncToken };
  if (idx >= 0) profiles[idx] = restored;
  else profiles.push(restored);
  await saveProfiles(profiles);
  return restored;
}

// ── Streak helpers ──────────────────────────────────────────────────────────
export function bumpStreak(currentStreak, lastActiveDate) {
  const today = new Date().toISOString().slice(0, 10);
  if (lastActiveDate === today) {
    return { streak: currentStreak, lastActiveDate: today };
  }
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastActiveDate === yesterday) {
    return { streak: currentStreak + 1, lastActiveDate: today };
  }
  return { streak: 1, lastActiveDate: today };
}
