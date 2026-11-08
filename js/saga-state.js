/**
 * saga-state.js — durable progress for The Ash-Seed.
 *
 * The saga is intentionally stored apart from the archive progress: it is a
 * different kind of play (a single branching run with a named protagonist),
 * and a corrupt saga save must never damage quiz or codex progress. Reads are
 * defensive and a malformed save is silently discarded.
 */

export const SAGA_KEY = 'mythos.saga.v1';
const VERSION = 1;
const MAX_HISTORY = 40;
const MAX_NAME = 24;

const memory = new Map();

function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    memory.set(key, value);
  } catch {
    memory.set(key, value);
  }
}

function removeRaw(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  memory.delete(key);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function cleanName(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME);
}

function cleanNodeId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,64}$/.test(value) ? value : '';
}

function cleanFlags(value) {
  if (!isObject(value)) return {};
  const flags = {};
  for (const [key, flag] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_]{1,48}$/.test(key)) continue;
    if (flag === true) flags[key] = true;
  }
  return flags;
}

function cleanStats(value) {
  const clamp = (number) => (Number.isFinite(number) ? Math.max(0, Math.min(99, Math.round(number))) : 0);
  if (!isObject(value)) return { insight: 0, courage: 0, cunning: 0 };
  return {
    insight: clamp(value.insight),
    courage: clamp(value.courage),
    cunning: clamp(value.cunning),
  };
}

function cleanSnapshot(value) {
  if (!isObject(value)) return null;
  const node = cleanNodeId(value.node);
  if (!node) return null;
  return { node, flags: cleanFlags(value.flags), stats: cleanStats(value.stats) };
}

function cleanState(raw) {
  if (!isObject(raw)) return null;
  const name = cleanName(raw.name);
  const node = cleanNodeId(raw.node);
  if (!name || !node) return null;

  const visited = Array.isArray(raw.visited)
    ? [...new Set(raw.visited.map(cleanNodeId).filter(Boolean))].slice(-80)
    : [];
  const endings = Array.isArray(raw.endings)
    ? [...new Set(raw.endings.filter((id) => typeof id === 'string' && /^[a-z0-9-]{1,48}$/.test(id)))]
    : [];
  const history = Array.isArray(raw.history)
    ? raw.history.map(cleanSnapshot).filter(Boolean).slice(-MAX_HISTORY)
    : [];

  return {
    version: VERSION,
    name,
    node,
    flags: cleanFlags(raw.flags),
    stats: cleanStats(raw.stats),
    visited: visited.length ? visited : [node],
    history,
    endings,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function loadSaga() {
  const raw = readRaw(SAGA_KEY);
  if (!raw) return null;
  try {
    return cleanState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSaga(state) {
  const clean = cleanState(state);
  if (!clean) return null;
  clean.updatedAt = new Date().toISOString();
  writeRaw(SAGA_KEY, JSON.stringify(clean));
  return clean;
}

export function clearSaga() {
  removeRaw(SAGA_KEY);
}

export function newSaga(name, { endings = [] } = {}) {
  const clean = cleanName(name) || 'Michael';
  return {
    version: VERSION,
    name: clean,
    node: 'prologue',
    flags: {},
    stats: { insight: 0, courage: 0, cunning: 0 },
    visited: ['prologue'],
    history: [],
    endings: [...new Set(endings)],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function snapshotSaga(state) {
  return {
    node: state.node,
    flags: cleanFlags(state.flags),
    stats: cleanStats(state.stats),
  };
}

export function pushHistory(state) {
  const history = [...(state.history || []), snapshotSaga(state)].slice(-MAX_HISTORY);
  return { ...state, history };
}

export function popHistory(state) {
  const history = [...(state.history || [])];
  const previous = history.pop();
  if (!previous) return null;
  return {
    ...state,
    ...previous,
    history,
    visited: [...new Set([...(state.visited || []), previous.node])],
  };
}

export function applyEffects(state, effects = {}) {
  const next = {
    ...state,
    flags: { ...state.flags },
    stats: { ...state.stats },
  };
  if (isObject(effects.set)) {
    for (const [key, value] of Object.entries(effects.set)) {
      if (value === true) next.flags[key] = true;
      else if (value === false) delete next.flags[key];
    }
  }
  if (isObject(effects.add)) {
    for (const [key, value] of Object.entries(effects.add)) {
      if (!['insight', 'courage', 'cunning'].includes(key)) continue;
      if (!Number.isFinite(value)) continue;
      next.stats[key] = Math.max(0, Math.min(99, (next.stats[key] || 0) + Math.round(value)));
    }
  }
  return next;
}
