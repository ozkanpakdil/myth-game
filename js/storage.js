/**
 * storage.js — progress and settings for Mythos.
 *
 * Everything lives in localStorage under two keys. Reads are defensive: a
 * missing, corrupt or partially-written blob is quarantined and replaced with
 * a clean state instead of breaking the game. If localStorage is unavailable
 * (private mode, disabled storage) the same API keeps working in memory.
 */

const PROGRESS_KEY = 'mythos.progress.v1';
const SETTINGS_KEY = 'mythos.settings.v1';
const VERSION = 1;

const memory = new Map();
let persistent = true;

function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    persistent = false;
    return memory.get(key) ?? null;
  }
}

function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    persistent = true;
  } catch {
    persistent = false;
    memory.set(key, value);
  }
}

function freshState() {
  return {
    version: VERSION,
    storiesRead: {},
    quizBest: {},
    finalQuiz: {},
    challenges: {},
    badges: [],
    lastRoute: '',
    lastMyth: '',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberOr(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function booleanOr(value) {
  return value === true;
}

function sanitizeRecord(record) {
  if (!isObject(record)) return null;
  const bestTotal = numberOr(record.bestTotal);
  const bestScore = Math.min(numberOr(record.bestScore), bestTotal);
  return {
    attempts: numberOr(record.attempts),
    bestScore,
    bestTotal,
    lastScore: numberOr(record.lastScore),
    lastTotal: numberOr(record.lastTotal),
    passed: booleanOr(record.passed),
    perfect: booleanOr(record.perfect),
  };
}

function sanitizeState(raw) {
  if (!isObject(raw)) return null;
  const state = freshState();

  if (isObject(raw.storiesRead)) {
    for (const [mythId, ids] of Object.entries(raw.storiesRead)) {
      if (!/^[a-z_]+$/.test(mythId) || !Array.isArray(ids)) continue;
      const clean = [...new Set(ids.filter((id) => typeof id === 'string' && id.length < 64))];
      if (clean.length) state.storiesRead[mythId] = clean;
    }
  }
  if (isObject(raw.quizBest)) {
    for (const [key, record] of Object.entries(raw.quizBest)) {
      if (!/^[a-z_]+:[a-z_]+-\d{2}$/.test(key)) continue;
      const clean = sanitizeRecord(record);
      if (clean) state.quizBest[key] = clean;
    }
  }
  if (isObject(raw.finalQuiz)) {
    for (const [mythId, record] of Object.entries(raw.finalQuiz)) {
      if (!/^[a-z_]+$/.test(mythId)) continue;
      const clean = sanitizeRecord(record);
      if (clean) state.finalQuiz[mythId] = clean;
    }
  }
  if (isObject(raw.challenges)) {
    for (const [name, record] of Object.entries(raw.challenges)) {
      if (!/^[a-z]+$/.test(name)) continue;
      const clean = sanitizeRecord(record);
      if (clean) state.challenges[name] = clean;
    }
  }
  if (Array.isArray(raw.badges)) {
    state.badges = [...new Set(raw.badges.filter((b) => typeof b === 'string' && b.length < 64))];
  }
  if (typeof raw.lastRoute === 'string' && raw.lastRoute.startsWith('#/')) state.lastRoute = raw.lastRoute.slice(0, 300);
  if (typeof raw.lastMyth === 'string' && /^[a-z_]+$/.test(raw.lastMyth)) state.lastMyth = raw.lastMyth;
  if (typeof raw.startedAt === 'string') state.startedAt = raw.startedAt;
  return state;
}

function loadState() {
  const raw = readRaw(PROGRESS_KEY);
  if (!raw) return freshState();
  try {
    const parsed = JSON.parse(raw);
    const clean = sanitizeState(parsed);
    if (clean) return clean;
  } catch {
    /* fall through to quarantine */
  }
  try {
    writeRaw(`${PROGRESS_KEY}.corrupt`, raw.slice(0, 10000));
  } catch {
    /* ignore */
  }
  return freshState();
}

/** Studio narrators that have pre-generated clips under audio/voices/. */
export const STUDIO_VOICES = ['cori', 'joe', 'morgan'];

function defaultSettings() {
  return { theme: 'dark', fontScale: 'md', audio: true, voice: '', studioVoice: 'morgan', voiceChosen: false };
}

function loadSettings() {
  const raw = readRaw(SETTINGS_KEY);
  if (!raw) return defaultSettings();
  try {
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      fontScale: ['md', 'lg', 'xl'].includes(parsed.fontScale) ? parsed.fontScale : 'md',
      audio: parsed.audio !== false,
      voice: typeof parsed.voice === 'string' ? parsed.voice.slice(0, 200) : '',
      studioVoice: parsed.studioVoice === ''
        ? ''
        : (STUDIO_VOICES.includes(parsed.studioVoice) ? parsed.studioVoice : 'morgan'),
      voiceChosen: typeof parsed.voiceChosen === 'boolean'
        ? parsed.voiceChosen
        : (Object.prototype.hasOwnProperty.call(parsed, 'studioVoice') || Boolean(parsed.voice)),
    };
  } catch {
    return defaultSettings();
  }
}

let state = loadState();
let settings = loadSettings();

function persist() {
  state.updatedAt = new Date().toISOString();
  writeRaw(PROGRESS_KEY, JSON.stringify(state));
}

export function getState() {
  return state;
}

export function isPersistent() {
  return persistent;
}

export function getSettings() {
  return { ...settings };
}

export function updateSettings(patch) {
  settings = {
    ...settings,
    ...(patch.theme === 'light' || patch.theme === 'dark' ? { theme: patch.theme } : {}),
    ...(['md', 'lg', 'xl'].includes(patch.fontScale) ? { fontScale: patch.fontScale } : {}),
    ...(typeof patch.audio === 'boolean' ? { audio: patch.audio } : {}),
    ...(typeof patch.voice === 'string' ? { voice: patch.voice.slice(0, 200) } : {}),
    ...(typeof patch.studioVoice === 'string' && (patch.studioVoice === '' || STUDIO_VOICES.includes(patch.studioVoice)) ? { studioVoice: patch.studioVoice } : {}),
    ...(typeof patch.voiceChosen === 'boolean' ? { voiceChosen: patch.voiceChosen } : {}),
  };
  writeRaw(SETTINGS_KEY, JSON.stringify(settings));
  return { ...settings };
}

/* ------------------------------------------------------------------ */
/* Reading and quiz records                                            */
/* ------------------------------------------------------------------ */

export function getReadStories(mythId) {
  return [...(state.storiesRead[mythId] || [])];
}

export function isStoryRead(mythId, storyId) {
  return (state.storiesRead[mythId] || []).includes(storyId);
}

export function recordStoryRead(mythId, storyId) {
  const list = state.storiesRead[mythId] || (state.storiesRead[mythId] = []);
  if (list.includes(storyId)) return false;
  list.push(storyId);
  persist();
  return true;
}

export function getQuizRecord(mythId, storyId) {
  return state.quizBest[`${mythId}:${storyId}`] || null;
}

export function isQuizPassed(mythId, storyId) {
  return Boolean(getQuizRecord(mythId, storyId)?.passed);
}

export function recordQuizResult({ mythId, storyId, score, total, passed }) {
  const key = `${mythId}:${storyId}`;
  const previous = getQuizRecord(mythId, storyId) || {
    attempts: 0,
    bestScore: 0,
    bestTotal: 0,
    lastScore: 0,
    lastTotal: 0,
    passed: false,
    perfect: false,
  };
  const previousRatio = previous.bestTotal ? previous.bestScore / previous.bestTotal : 0;
  const next = {
    ...previous,
    attempts: previous.attempts + 1,
    lastScore: score,
    lastTotal: total,
    passed: previous.passed || passed,
    perfect: previous.perfect || (total > 0 && score === total),
  };
  if (total > 0 && score / total >= previousRatio) {
    next.bestScore = score;
    next.bestTotal = total;
  }
  state.quizBest[key] = next;
  persist();
  return { record: next, isNewPass: passed && !previous.passed };
}

export function getFinalQuizRecord(mythId) {
  return state.finalQuiz[mythId] || null;
}

export function isFinalQuizPassed(mythId) {
  return Boolean(getFinalQuizRecord(mythId)?.passed);
}

export function recordFinalQuiz({ mythId, score, total, passed }) {
  const previous = getFinalQuizRecord(mythId) || {
    attempts: 0,
    bestScore: 0,
    bestTotal: 0,
    lastScore: 0,
    lastTotal: 0,
    passed: false,
    perfect: false,
  };
  const previousRatio = previous.bestTotal ? previous.bestScore / previous.bestTotal : 0;
  const next = {
    ...previous,
    attempts: previous.attempts + 1,
    lastScore: score,
    lastTotal: total,
    passed: previous.passed || passed,
    perfect: previous.perfect || (total > 0 && score === total),
  };
  if (total > 0 && score / total >= previousRatio) {
    next.bestScore = score;
    next.bestTotal = total;
  }
  state.finalQuiz[mythId] = next;
  persist();
  return { record: next, isNewPass: passed && !previous.passed };
}

/* ------------------------------------------------------------------ */
/* Challenges and badges                                               */
/* ------------------------------------------------------------------ */

export function getChallengeRecord(name) {
  return state.challenges[name] || null;
}

export function recordChallenge(name, score, total) {
  const previous = state.challenges[name] || {
    attempts: 0,
    bestScore: 0,
    bestTotal: 0,
    lastScore: 0,
    lastTotal: 0,
    passed: false,
    perfect: false,
  };
  const previousRatio = previous.bestTotal ? previous.bestScore / previous.bestTotal : 0;
  const next = {
    ...previous,
    attempts: previous.attempts + 1,
    lastScore: score,
    lastTotal: total,
    passed: previous.passed || (total > 0 && score / total >= 0.7),
    perfect: previous.perfect || (total > 0 && score === total),
  };
  if (total > 0 && score / total >= previousRatio) {
    next.bestScore = score;
    next.bestTotal = total;
  }
  state.challenges[name] = next;
  persist();
  return next;
}

export function hasBadge(id) {
  return state.badges.includes(id);
}

export function awardBadges(ids) {
  const fresh = ids.filter((id) => typeof id === 'string' && !state.badges.includes(id));
  if (!fresh.length) return [];
  state.badges.push(...fresh);
  persist();
  return fresh;
}

/* ------------------------------------------------------------------ */
/* Navigation memory                                                   */
/* ------------------------------------------------------------------ */

export function setLastRoute(route) {
  if (typeof route === 'string' && route.startsWith('#/')) {
    state.lastRoute = route;
    persist();
  }
}

export function getLastRoute() {
  return state.lastRoute;
}

export function setLastMyth(mythId) {
  if (typeof mythId === 'string' && /^[a-z_]+$/.test(mythId)) {
    state.lastMyth = mythId;
    persist();
  }
}

export function getLastMyth() {
  return state.lastMyth;
}

/* ------------------------------------------------------------------ */
/* Reset                                                               */
/* ------------------------------------------------------------------ */

export function resetProgress() {
  state = freshState();
  persist();
  return state;
}
