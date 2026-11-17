// Top-list persisted in localStorage. Every access is guarded because
// storage can be unavailable (private mode, blocked site data).

import { HIGHSCORE } from './config.js';

export function loadHighscores() {
  try {
    const raw = localStorage.getItem(HIGHSCORE.storageKey);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function qualifies(score, list = loadHighscores()) {
  if (score <= 0) return false;
  if (list.length < HIGHSCORE.maxEntries) return true;
  return score > list[list.length - 1].score;
}

/** Insert an entry and return its 0-based rank (or -1 if it did not make it). */
export function saveHighscore(entry) {
  const list = loadHighscores();
  const record = { ...entry, date: new Date().toISOString() };
  list.push(record);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, HIGHSCORE.maxEntries);
  try {
    localStorage.setItem(HIGHSCORE.storageKey, JSON.stringify(trimmed));
  } catch {
    /* storage unavailable – keep going */
  }
  return trimmed.indexOf(record);
}

export function bestScore() {
  const list = loadHighscores();
  return list.length ? list[0].score : 0;
}

export function clearHighscores() {
  try {
    localStorage.removeItem(HIGHSCORE.storageKey);
  } catch {
    /* ignore */
  }
}
