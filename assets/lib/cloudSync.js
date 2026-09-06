// Optional backup/restore of a profile to the battle Worker's D1-backed
// /sync endpoint (see worker/). Local AsyncStorage (assets/lib/profiles.js)
// is always the source of truth for gameplay — this is best-effort and must
// never block or fail loudly in the middle of a lesson.

const BATTLE_SERVER_URL = process.env.EXPO_PUBLIC_BATTLE_SERVER_URL || "";
function syncHttpUrl(path) {
  return `${BATTLE_SERVER_URL.replace(/\/$/, "")}${path}`;
}

const PUSH_DEBOUNCE_MS = 4000;
const pendingTimers = new Map(); // profileId -> timeout handle

// Fire-and-forget backup, debounced per profile so rapid lesson completions
// (e.g. prefetch + immediate replay) don't spam the Worker.
export function pushProfile(profile) {
  if (!BATTLE_SERVER_URL || !profile?.id) return;
  const existing = pendingTimers.get(profile.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingTimers.delete(profile.id);
    const { id, syncToken, ...rest } = profile;
    fetch(syncHttpUrl(`/sync/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: syncToken, data: rest }),
    }).catch((err) => console.warn("[cloudSync] push failed:", err?.message || err));
  }, PUSH_DEBOUNCE_MS);
  pendingTimers.set(profile.id, timer);
}

// Explicit "restore on this device" action — never called automatically, so
// a fresh install never silently clobbers local progress.
export async function pullProfile(profileId, syncToken) {
  if (!BATTLE_SERVER_URL || !profileId || !syncToken) return null;
  const r = await fetch(syncHttpUrl(`/sync/${profileId}?token=${encodeURIComponent(syncToken)}`));
  if (!r.ok) return null;
  const { data } = await r.json();
  return data || null;
}
