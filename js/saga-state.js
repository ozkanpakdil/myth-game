/**
 * saga-state.js — durable, per-story progress for the saga library.
 *
 * Each saga has its own run (name, current node, flags, stats and rewind
 * history) and its own set of discovered endings. A single library object is
 * stored under mythos.saga.v2. The old single-saga save (mythos.saga.v1) is
 * migrated on first read so existing Norse players keep their place.
 *
 * Progress is deliberately stored apart from the archive progress: a corrupt
 * saga save must never damage quiz or codex progress. Reads are defensive and
 * malformed data is silently discarded.
 */

export const SAGA_KEY = 'mythos.saga.v1';
export const SAGA_LIBRARY_KEY = 'mythos.saga.v2';
const VERSION = 2;
const MAX_HISTORY = 40;
const MAX_NAME = 24;
const DEFAULT_SAGA = 'norse';

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

function cleanSagaId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{1,32}$/.test(value) ? value : '';
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

function cleanEndings(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === 'string' && /^[a-z0-9-]{1,64}$/.test(id)))];
}

function cleanSnapshot(value) {
  if (!isObject(value)) return null;
  const node = cleanNodeId(value.node);
  if (!node) return null;
  return { node, flags: cleanFlags(value.flags), stats: cleanStats(value.stats) };
}

function cleanRun(raw) {
  if (!isObject(raw)) return null;
  const name = cleanName(raw.name);
  const node = cleanNodeId(raw.node);
  if (!name || !node) return null;

  const visited = Array.isArray(raw.visited)
    ? [...new Set(raw.visited.map(cleanNodeId).filter(Boolean))].slice(-80)
    : [];
  const history = Array.isArray(raw.history)
    ? raw.history.map(cleanSnapshot).filter(Boolean).slice(-MAX_HISTORY)
    : [];

  return {
    name,
    node,
    flags: cleanFlags(raw.flags),
    stats: cleanStats(raw.stats),
    visited: visited.length ? visited : [node],
    history,
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function cleanLibrary(raw) {
  const library = { version: VERSION, last: '', runs: {}, endings: {} };
  if (!isObject(raw)) return library;

  if (isObject(raw.runs)) {
    for (const [sagaId, run] of Object.entries(raw.runs)) {
      const id = cleanSagaId(sagaId);
      const clean = cleanRun(run);
      if (id && clean) library.runs[id] = clean;
    }
  }
  if (isObject(raw.endings)) {
    for (const [sagaId, endings] of Object.entries(raw.endings)) {
      const id = cleanSagaId(sagaId);
      if (id) library.endings[id] = cleanEndings(endings);
    }
  }
  const last = cleanSagaId(raw.last);
  if (last && library.runs[last]) library.last = last;
  return library;
}

function emptyLibrary() {
  return { version: VERSION, last: '', runs: {}, endings: {} };
}

function legacyRun(state) {
  return {
    name: state.name,
    node: state.node,
    flags: state.flags,
    stats: state.stats,
    visited: state.visited,
    history: state.history,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
  };
}

/**
 * Read the multi-saga save, migrating the pre-library v1 save on first use.
 * Migration is best-effort: a malformed old save is ignored.
 */
export function loadSagaLibrary() {
  const stored = readRaw(SAGA_LIBRARY_KEY);
  if (stored) {
    try {
      return cleanLibrary(JSON.parse(stored));
    } catch {
      return emptyLibrary();
    }
  }

  const legacyRaw = readRaw(SAGA_KEY);
  if (!legacyRaw) return emptyLibrary();
  try {
    const legacy = JSON.parse(legacyRaw);
    const name = cleanName(legacy?.name);
    const node = cleanNodeId(legacy?.node);
    if (!isObject(legacy) || !name || !node) return emptyLibrary();
    const migrated = {
      version: VERSION,
      last: DEFAULT_SAGA,
      runs: { [DEFAULT_SAGA]: legacyRun(cleanRun(legacy)) },
      endings: { [DEFAULT_SAGA]: cleanEndings(legacy.endings) },
    };
    writeRaw(SAGA_LIBRARY_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return emptyLibrary();
  }
}

function writeLibrary(library) {
  const clean = cleanLibrary(library);
  clean.version = VERSION;
  writeRaw(SAGA_LIBRARY_KEY, JSON.stringify(clean));
  return clean;
}

/**
 * Load one saga run. The returned object includes that saga's discovered
 * endings so the existing renderer can keep treating `state.endings` as its
 * own gallery.
 */
export function loadSaga(sagaId = DEFAULT_SAGA) {
  const id = cleanSagaId(sagaId);
  if (!id) return null;
  const library = loadSagaLibrary();
  const run = library.runs[id];
  if (!run) return null;
  return { ...run, version: VERSION, endings: library.endings[id] || [] };
}

export function saveSaga(state, sagaId = DEFAULT_SAGA) {
  const id = cleanSagaId(sagaId);
  const run = cleanRun(state);
  if (!id || !run) return null;

  const library = loadSagaLibrary();
  run.updatedAt = new Date().toISOString();
  library.runs[id] = run;
  library.endings[id] = cleanEndings(state.endings);
  library.last = id;
  writeLibrary(library);
  return { ...run, version: VERSION, endings: library.endings[id] };
}

export function clearSaga(sagaId = DEFAULT_SAGA) {
  const id = cleanSagaId(sagaId);
  if (!id) return;
  const library = loadSagaLibrary();
  delete library.runs[id];
  if (library.last === id) library.last = Object.keys(library.runs)[0] || '';
  writeLibrary(library);
}

/** All saved runs, keyed by saga id, for the library cards. */
export function allSagaProgress() {
  const library = loadSagaLibrary();
  const progress = {};
  for (const [sagaId, run] of Object.entries(library.runs)) {
    progress[sagaId] = { ...run, endings: library.endings[sagaId] || [] };
  }
  return progress;
}

/** The most recently played saga, used by the home page resume button. */
export function latestSaga() {
  const library = loadSagaLibrary();
  const sagaId = library.last || Object.keys(library.runs)[0] || '';
  if (!sagaId || !library.runs[sagaId]) return null;
  return { sagaId, ...library.runs[sagaId], endings: library.endings[sagaId] || [] };
}

export function newSaga(name, { endings = [], start = 'prologue' } = {}) {
  const clean = cleanName(name) || 'Michael';
  const firstNode = cleanNodeId(start) || 'prologue';
  return {
    version: VERSION,
    name: clean,
    node: firstNode,
    flags: {},
    stats: { insight: 0, courage: 0, cunning: 0 },
    visited: [firstNode],
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
