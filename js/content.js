/**
 * content.js — fetches and caches the JSON content.
 *
 * All game text lives under content/. Nothing in the UI hard-codes a story,
 * quiz question, character or glossary term. Fetches are cached for the life
 * of the page; a failed fetch is evicted so the player can retry.
 */

const cache = new Map();

export const REGION_ORDER = ['Europe', 'Middle East', 'Africa', 'Asia', 'Americas', 'Oceania'];

export const SENSITIVITY_LABEL = {
  low: 'General tradition',
  medium: 'Living tradition',
  high: 'Sacred living tradition',
};

async function fetchJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status})`);
    return response.json();
  })();
  cache.set(path, promise);
  try {
    return await promise;
  } catch (error) {
    cache.delete(path);
    throw error;
  }
}

async function fetchText(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status})`);
    return response.text();
  })();
  cache.set(path, promise);
  try {
    return await promise;
  } catch (error) {
    cache.delete(path);
    throw error;
  }
}

export const loadMythologies = () => fetchJSON('content/mythologies.json');
export const loadSagaCatalog = () => fetchJSON('content/sagas.json');
export const loadSagaStory = (file) => fetchJSON(`content/saga/${file}`);

export const loadWorldMap = () => fetchText('assets/map/world.txt');
export const loadMapRegions = () => fetchJSON('assets/map/regions.json');

export async function loadMythology(id) {
  const base = `content/${id}`;
  const [info, stories, quiz, characters, glossary] = await Promise.all([
    fetchJSON(`${base}/info.json`),
    fetchJSON(`${base}/stories.json`),
    fetchJSON(`${base}/quiz.json`),
    fetchJSON(`${base}/characters.json`),
    fetchJSON(`${base}/glossary.json`),
  ]);
  if (!Array.isArray(stories) || !Array.isArray(quiz) || !Array.isArray(characters) || !Array.isArray(glossary)) {
    throw new Error(`Content for "${id}" is not in the expected format.`);
  }
  return { info, stories, quiz, characters, glossary };
}

export async function loadAllPlayable() {
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((m) => m.mvp);
  const data = await Promise.all(
    playable.map(async (meta) => {
      const content = await loadMythology(meta.id);
      return { meta, ...content };
    }),
  );
  return data;
}

export function iconFor(id) {
  return `assets/svg/icons/${id}.svg`;
}

export function storyIndexById(stories, storyId) {
  return stories.findIndex((story) => story.id === storyId);
}

export function nextStory(stories, storyId) {
  const index = storyIndexById(stories, storyId);
  return index >= 0 ? stories[index + 1] || null : null;
}

export function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(text) {
  return Math.max(1, Math.round(countWords(text) / 180));
}
