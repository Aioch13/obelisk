import { APP_KEY } from "./data.js";
import { createEmptyProfile, hydrateProfile } from "./engine.js";

const PROFILE_KEY = `${APP_KEY}:profile`;

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? hydrateProfile(JSON.parse(raw)) : createEmptyProfile();
  } catch {
    return createEmptyProfile();
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}
