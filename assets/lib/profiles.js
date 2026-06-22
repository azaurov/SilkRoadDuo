// Local-only profile storage for Silk Road Duo.
// Each profile has its own stats, achievements, and lesson progress.
//
// Persistence: @react-native-async-storage/async-storage
// Storage layout:
//   @silk-road-duo:profiles  -> [{id, name, avatar, color, createdAt, stats, achievements}, ...]
//   @silk-road-duo:activeId  -> "uuid" of last-selected profile (string | null)
//
// No backend, no sync — intentionally offline-only.

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

// Atomic combined write — serializes concurrent lesson-completion writes.
let _writeQueue = Promise.resolve();
export async function updateProfileAtomic(id, mut) {
  const next = (async () => {
    const profiles = await loadProfiles();
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const patch = {};
    if (mut.stats !== undefined)        patch.stats        = { ...mut.stats };
    if (mut.achievements !== undefined) patch.achievements = Array.isArray(mut.achievements) ? mut.achievements : [];
    profiles[idx] = { ...profiles[idx], ...patch };
    await saveProfiles(profiles);
    return profiles[idx];
  })();
  _writeQueue = _writeQueue.then(() => next, () => next);
  return _writeQueue;
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
