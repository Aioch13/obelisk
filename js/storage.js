import { APP_KEY } from "./data.js";
import { createEmptyProfile, hydrateProfile } from "./engine.js";

// --- Storage keys --------------------------------------------------------
//
// Roster lives at one key as a single JSON blob:
//   { activeProfileId, profiles: { [id]: ProfileBlob } }
//
// The legacy single-profile key (everything saved before the multi-profile
// rework) is migrated into the new roster as a slot named "Player 1" the
// first time we boot under the new shape. We don't delete the legacy key
// — leaving it as a recovery breadcrumb if something goes wrong.

const ROSTER_KEY = `${APP_KEY}:roster`;
const LEGACY_PROFILE_KEY = `${APP_KEY}:profile`;

function makeProfileId(name) {
  const slug = String(name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "player";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

function createNamedProfile(name) {
  const profile = hydrateProfile(createEmptyProfile());
  profile.name = String(name || "Player").slice(0, 24);
  // lastLegendId is the most recently selected legend for this slot,
  // shown as the profile's "avatar" on the picker so the player can
  // identify their slot at a glance. Stays null until the player
  // actually starts a run, at which point main.js sets it.
  profile.lastLegendId = profile.lastLegendId || null;
  return profile;
}

function migrateLegacyProfile() {
  // If a legacy single-profile blob exists, wrap it as the first roster
  // slot so existing saves don't disappear when the new code lands.
  // No pre-seeded "Lucas/Alycia" slots — the picker prompts for a name
  // and creates whatever the kid types.
  let legacy = null;
  try {
    const raw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (raw) legacy = hydrateProfile(JSON.parse(raw));
  } catch {
    legacy = null;
  }
  const roster = { activeProfileId: null, profiles: {} };
  if (legacy) {
    const legacyId = makeProfileId(legacy.name || "Player 1");
    legacy.name = legacy.name || "Player 1";
    legacy.lastLegendId = legacy.lastLegendId || null;
    roster.profiles[legacyId] = legacy;
  }
  return roster;
}

function loadRosterRaw() {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through
  }
  return null;
}

function persistRoster(roster) {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {
    // localStorage may be full or unavailable; the in-memory state still
    // works, the player will just lose progress on reload. No-op on
    // failure to avoid crashing the game over a quota issue.
  }
}

// --- Roster API ----------------------------------------------------------

export function loadRoster() {
  const existing = loadRosterRaw();
  if (existing && existing.profiles && Object.keys(existing.profiles).length > 0) {
    // Hydrate every profile so any new fields added since the slot was
    // saved get backfilled with defaults.
    const hydrated = {};
    for (const [id, blob] of Object.entries(existing.profiles)) {
      hydrated[id] = hydrateProfile(blob);
      // Preserve the slot's display name across hydrate, since
      // hydrateProfile doesn't know about names.
      hydrated[id].name = blob?.name || "Player";
    }
    return {
      activeProfileId: existing.profiles[existing.activeProfileId]
        ? existing.activeProfileId
        : null,
      profiles: hydrated,
    };
  }
  // No roster yet — first launch (or a fresh browser). Seed Lucas +
  // Alycia, and migrate any legacy single-profile blob into a third
  // slot if it exists.
  const fresh = migrateLegacyProfile();
  persistRoster(fresh);
  return fresh;
}

export function saveRoster(roster) {
  persistRoster(roster);
}

export function getProfileList(roster) {
  if (!roster?.profiles) return [];
  return Object.entries(roster.profiles).map(([id, profile]) => ({
    id,
    name: profile?.name || "Player",
    lastLegendId: profile?.lastLegendId || null,
    bestRunFloor: Number(profile?.bestRunFloor || 0),
    totalRuns: Number(profile?.totalRuns || 0),
    totalWins: Number(profile?.totalWins || 0),
    isActive: id === roster.activeProfileId,
  }));
}

export function setActiveProfile(roster, profileId) {
  if (!roster?.profiles?.[profileId]) return roster;
  const next = { ...roster, activeProfileId: profileId };
  persistRoster(next);
  return next;
}

export function createProfile(roster, name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return roster;
  const id = makeProfileId(trimmed);
  const profile = createNamedProfile(trimmed);
  const next = {
    ...roster,
    profiles: { ...roster.profiles, [id]: profile },
    activeProfileId: id,
  };
  persistRoster(next);
  return next;
}

export function deleteProfile(roster, profileId) {
  if (!roster?.profiles?.[profileId]) return roster;
  const remaining = { ...roster.profiles };
  delete remaining[profileId];
  const stillActive = roster.activeProfileId === profileId
    ? Object.keys(remaining)[0] || null
    : roster.activeProfileId;
  const next = { ...roster, profiles: remaining, activeProfileId: stillActive };
  persistRoster(next);
  return next;
}

// --- Active-profile API (preserves the old loadProfile / saveProfile
//     surface so engine.js and ui.js don't need to know about the
//     roster shape) -------------------------------------------------------

export function loadProfile() {
  const roster = loadRoster();
  const id = roster.activeProfileId;
  if (id && roster.profiles[id]) return hydrateProfile(roster.profiles[id]);
  return createEmptyProfile();
}

export function saveProfile(profile) {
  const roster = loadRosterRaw() || loadRoster();
  const id = roster.activeProfileId;
  if (!id) return;
  // Preserve the display name across saves — engine.js doesn't carry
  // .name, so we re-attach it from the existing slot.
  const existingName = roster.profiles?.[id]?.name;
  const merged = { ...profile };
  if (existingName) merged.name = existingName;
  const next = {
    ...roster,
    profiles: { ...roster.profiles, [id]: merged },
  };
  persistRoster(next);
}

export function clearProfile() {
  // "Clear save" wipes the active profile only — the other slot(s)
  // stay intact so one kid clearing their save doesn't erase the
  // other's progress.
  const roster = loadRoster();
  const id = roster.activeProfileId;
  if (!id) return;
  const existingName = roster.profiles?.[id]?.name || "Player";
  const fresh = createNamedProfile(existingName);
  const next = {
    ...roster,
    profiles: { ...roster.profiles, [id]: fresh },
  };
  persistRoster(next);
}

// Used by tests / dev tools — wipes the entire roster including legacy.
// Not wired to a UI button; call from the console if you need it.
export function clearAllProfiles() {
  try {
    localStorage.removeItem(ROSTER_KEY);
    localStorage.removeItem(LEGACY_PROFILE_KEY);
  } catch {
    // no-op
  }
}
