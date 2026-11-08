#!/usr/bin/env node
/**
 * validate_content.js — zero-dependency content checker for Mythos.
 *
 * Usage: node tools/validate_content.js [--verbose]
 *
 * Exit code 0 = no errors (warnings allowed), 1 = at least one error.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const VERBOSE = process.argv.includes('--verbose');

const EXPECTED_MVP = ['greek', 'norse', 'egypt', 'mesopotamia', 'hindu', 'japan', 'maya', 'celtic', 'chinese', 'roman', 'persian', 'canaan', 'minoan', 'hittite', 'slavic'];
const REQUIRED_STORY_COUNT = 6;
const REQUIRED_QUIZ_COUNT = 20;
const REQUIRED_CHARACTER_COUNT = 10;
const REQUIRED_GLOSSARY_COUNT = 10;

const errors = [];
const warnings = [];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const fail = (file, message) => errors.push({ file: rel(file), message });
const warn = (file, message) => warnings.push({ file: rel(file), message });
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isStringArray = (v, min = 1) =>
  Array.isArray(v) && v.length >= min && v.every((s) => isNonEmptyString(s));
const wordCount = (text) => (typeof text === 'string' ? text.trim().split(/\s+/).filter(Boolean).length : 0);

async function loadJSON(file) {
  if (!existsSync(file)) {
    fail(file, 'file is missing');
    return null;
  }
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
    return null;
  }
}

function expectArray(value, file, label) {
  if (!Array.isArray(value)) {
    fail(file, `${label} must be an array`);
    return false;
  }
  return true;
}

function checkUniqueIds(items, file, label) {
  const seen = new Set();
  items.forEach((item, i) => {
    const id = item?.id;
    if (!isNonEmptyString(id)) {
      fail(file, `${label}[${i}] is missing an id`);
      return;
    }
    if (seen.has(id)) fail(file, `${label} has duplicate id "${id}"`);
    seen.add(id);
  });
  return seen;
}

function checkBoolean(item, file, label, field) {
  if (typeof item[field] !== 'boolean') fail(file, `${label}.${field} must be true or false`);
}

/* ------------------------------------------------------------------ */
/* mythologies.json                                                    */
/* ------------------------------------------------------------------ */

async function validateMythologies() {
  const file = path.join(CONTENT_DIR, 'mythologies.json');
  const data = await loadJSON(file);
  if (!data) return null;
  if (!expectArray(data, file, 'mythologies.json')) return null;

  const ids = new Set();
  const mvp = [];
  for (const [i, m] of data.entries()) {
    const at = `entry ${i + 1}${m?.id ? ` (${m.id})` : ''}`;
    if (!isNonEmptyString(m?.id)) fail(file, `${at}: missing id`);
    else if (!/^[a-z_]+$/.test(m.id)) fail(file, `${at}: id must be lowercase letters and underscores`);
    else if (ids.has(m.id)) fail(file, `${at}: duplicate id`);
    else ids.add(m.id);

    for (const field of ['name', 'region', 'period_text', 'earliest_record', 'summary']) {
      if (!isNonEmptyString(m?.[field])) fail(file, `${at}: missing ${field}`);
    }
    if (m?.region && !['Middle East', 'Africa', 'Europe', 'Asia', 'Americas', 'Oceania'].includes(m.region)) {
      fail(file, `${at}: unknown region "${m.region}"`);
    }
    if (m?.summary && wordCount(m.summary) < 8) warn(file, `${at}: summary is very short`);
    for (const field of ['start_year', 'end_year']) {
      if (!Number.isInteger(m?.[field])) fail(file, `${at}: ${field} must be an integer`);
    }
    if (Number.isInteger(m?.start_year) && Number.isInteger(m?.end_year) && m.start_year > m.end_year) {
      fail(file, `${at}: start_year must not be after end_year`);
    }
    if (!['low', 'medium', 'high'].includes(m?.sensitivity)) {
      fail(file, `${at}: sensitivity must be low, medium or high`);
    }
    checkBoolean(m, file, at, 'mvp');
    checkBoolean(m, file, at, 'verified');
    if (m?.verified !== false && VERBOSE) warn(file, `${at}: awaiting human fact-check (verified: true)`);
    if (m?.mvp) mvp.push(m.id);
  }

  const expected = [...EXPECTED_MVP].sort().join(',');
  const actual = [...mvp].sort().join(',');
  if (actual !== expected) {
    fail(file, `mvp entries must be exactly: ${EXPECTED_MVP.join(', ')} (found: ${mvp.join(', ') || 'none'})`);
  }
  if (data.length !== 35) warn(file, `expected 35 seeded mythologies, found ${data.length}`);

  return data;
}

/* ------------------------------------------------------------------ */
/* One mythology folder                                                */
/* ------------------------------------------------------------------ */

async function validateMythology(meta, dir) {
  const id = meta.id;
  const files = {
    info: path.join(dir, 'info.json'),
    stories: path.join(dir, 'stories.json'),
    quiz: path.join(dir, 'quiz.json'),
    characters: path.join(dir, 'characters.json'),
    glossary: path.join(dir, 'glossary.json'),
  };

  const [info, stories, quiz, characters, glossary] = await Promise.all([
    loadJSON(files.info),
    loadJSON(files.stories),
    loadJSON(files.quiz),
    loadJSON(files.characters),
    loadJSON(files.glossary),
  ]);

  /* info ------------------------------------------------------------ */
  if (info) {
    if (info.id !== id) fail(files.info, `id "${info.id}" does not match folder "${id}"`);
    if (!isNonEmptyString(info.name)) fail(files.info, 'missing name');
    if (!isNonEmptyString(info.intro)) {
      fail(files.info, 'missing intro');
    } else {
      const words = wordCount(info.intro);
      if (words < 90) fail(files.info, `intro is ${words} words (minimum 90)`);
      if (words > 190) warn(files.info, `intro is ${words} words (target 100–150)`);
    }
    if (!Array.isArray(info.timeline) || info.timeline.length < 4) {
      fail(files.info, 'timeline must contain at least 4 entries');
    } else {
      info.timeline.forEach((t, i) => {
        for (const field of ['label', 'year_text', 'note']) {
          if (!isNonEmptyString(t?.[field])) fail(files.info, `timeline[${i}] missing ${field}`);
        }
      });
    }
    if (!Array.isArray(info.sources) || info.sources.length < 5) {
      fail(files.info, 'sources must contain at least 5 entries');
    } else {
      info.sources.forEach((s, i) => {
        for (const field of ['title', 'note']) {
          if (!isNonEmptyString(s?.[field])) fail(files.info, `sources[${i}] missing ${field}`);
        }
      });
    }
    if (info.sensitivity !== meta.sensitivity) {
      fail(files.info, `sensitivity "${info.sensitivity}" does not match mythologies.json ("${meta.sensitivity}")`);
    }
    checkBoolean(info, files.info, 'info', 'verified');
  }

  /* characters ------------------------------------------------------ */
  let characterIds = new Set();
  if (characters) {
    if (expectArray(characters, files.characters, 'characters.json')) {
      if (characters.length !== REQUIRED_CHARACTER_COUNT) {
        fail(files.characters, `expected ${REQUIRED_CHARACTER_COUNT} characters, found ${characters.length}`);
      }
      characterIds = checkUniqueIds(characters, files.characters, 'characters');
      characters.forEach((c, i) => {
        const at = `characters[${i}]${c?.id ? ` (${c.id})` : ''}`;
        if (!isNonEmptyString(c?.id) || !/^[a-z0-9_]+$/.test(c?.id || '')) {
          fail(files.characters, `${at}: id must be lowercase letters, digits or underscores`);
        }
        for (const field of ['name', 'role', 'fun_fact']) {
          if (!isNonEmptyString(c?.[field])) fail(files.characters, `${at}: missing ${field}`);
        }
        if (!isStringArray(c?.domain, 1)) fail(files.characters, `${at}: domain must be a non-empty string array`);
        if (!isStringArray(c?.symbols, 1)) fail(files.characters, `${at}: symbols must be a non-empty string array`);
        if (isNonEmptyString(c?.fun_fact) && wordCount(c.fun_fact) < 6) {
          warn(files.characters, `${at}: fun_fact is very short`);
        }
        checkBoolean(c, files.characters, at, 'verified');
      });
    }
  }

  /* stories --------------------------------------------------------- */
  let storyIds = new Set();
  const referencedCharacters = new Set();
  if (stories) {
    if (expectArray(stories, files.stories, 'stories.json')) {
      if (stories.length !== REQUIRED_STORY_COUNT) {
        fail(files.stories, `expected ${REQUIRED_STORY_COUNT} stories, found ${stories.length}`);
      }
      storyIds = checkUniqueIds(stories, files.stories, 'stories');
      stories.forEach((s, i) => {
        const at = `stories[${i}]${s?.id ? ` (${s.id})` : ''}`;
        if (!isNonEmptyString(s?.id) || !new RegExp(`^${id}-\\d{2}$`).test(s?.id || '')) {
          fail(files.stories, `${at}: id must look like "${id}-01"`);
        }
        for (const field of ['title', 'source_ref']) {
          if (!isNonEmptyString(s?.[field])) fail(files.stories, `${at}: missing ${field}`);
        }
        if (!Array.isArray(s?.paragraphs) || s.paragraphs.length < 3 || s.paragraphs.length > 5) {
          fail(files.stories, `${at}: paragraphs must contain 3–5 paragraphs`);
        } else {
          s.paragraphs.forEach((p, j) => {
            if (!isNonEmptyString(p)) fail(files.stories, `${at}: paragraph ${j + 1} is empty`);
          });
          const words = wordCount(s.paragraphs.join(' '));
          if (words < 140) fail(files.stories, `${at}: ${words} words (minimum 140)`);
          if (words > 330) fail(files.stories, `${at}: ${words} words (maximum 330)`);
          if (words < 150 || words > 300) warn(files.stories, `${at}: ${words} words (target 150–300)`);
        }
        if (!isStringArray(s?.characters, 1)) {
          fail(files.stories, `${at}: characters must be a non-empty array`);
        } else {
          s.characters.forEach((cid) => {
            referencedCharacters.add(cid);
            if (!characterIds.has(cid)) fail(files.stories, `${at}: unknown character "${cid}"`);
          });
        }
        if (!isStringArray(s?.themes, 1)) fail(files.stories, `${at}: themes must be a non-empty array`);
        checkBoolean(s, files.stories, at, 'uncertain');
        checkBoolean(s, files.stories, at, 'verified');
        if (s?.uncertain === true && !isNonEmptyString(s?.notes)) {
          warn(files.stories, `${at}: uncertain story should explain why in notes`);
        }
      });
    }
  }
  if (characters && storyIds.size) {
    for (const c of characters) {
      if (c?.id && !referencedCharacters.has(c.id) && VERBOSE) {
        warn(files.characters, `character "${c.id}" is not referenced by any story`);
      }
    }
  }

  /* quiz ------------------------------------------------------------ */
  if (quiz) {
    if (expectArray(quiz, files.quiz, 'quiz.json')) {
      if (quiz.length !== REQUIRED_QUIZ_COUNT) {
        fail(files.quiz, `expected ${REQUIRED_QUIZ_COUNT} questions, found ${quiz.length}`);
      }
      checkUniqueIds(quiz, files.quiz, 'quiz');
      const perStory = new Map();
      const difficulty = { easy: 0, medium: 0, hard: 0 };
      quiz.forEach((q, i) => {
        const at = `quiz[${i}]${q?.id ? ` (${q.id})` : ''}`;
        if (!isNonEmptyString(q?.id) || !new RegExp(`^${id}-q\\d{2}$`).test(q?.id || '')) {
          fail(files.quiz, `${at}: id must look like "${id}-q01"`);
        }
        if (!storyIds.has(q?.story_id)) fail(files.quiz, `${at}: story_id "${q?.story_id}" does not exist`);
        else perStory.set(q.story_id, (perStory.get(q.story_id) || 0) + 1);
        if (!isNonEmptyString(q?.question) || wordCount(q?.question) < 5) {
          fail(files.quiz, `${at}: question is missing or too short`);
        }
        if (!Array.isArray(q?.choices) || q.choices.length !== 4) {
          fail(files.quiz, `${at}: must have exactly 4 choices`);
        } else {
          if (!q.choices.every(isNonEmptyString)) fail(files.quiz, `${at}: every choice must be a non-empty string`);
          if (new Set(q.choices).size !== 4) fail(files.quiz, `${at}: choices must be distinct`);
        }
        if (!Number.isInteger(q?.correct_index) || q.correct_index < 0 || q.correct_index > 3) {
          fail(files.quiz, `${at}: correct_index must be 0–3`);
        }
        if (!isNonEmptyString(q?.explanation) || wordCount(q?.explanation) < 8) {
          fail(files.quiz, `${at}: explanation is missing or too short`);
        }
        if (['easy', 'medium', 'hard'].includes(q?.difficulty)) difficulty[q.difficulty] += 1;
        else fail(files.quiz, `${at}: difficulty must be easy, medium or hard`);
        checkBoolean(q, files.quiz, at, 'verified');
      });

      for (const sid of storyIds) {
        const count = perStory.get(sid) || 0;
        if (count < 1) fail(files.quiz, `story "${sid}" has no quiz questions`);
        else if (count < 3 || count > 4) warn(files.quiz, `story "${sid}" has ${count} questions (target 3–4)`);
      }
      if (difficulty.easy < 8) warn(files.quiz, `only ${difficulty.easy} easy questions (target 10)`);
      if (difficulty.hard < 2 || difficulty.hard > 4) {
        warn(files.quiz, `${difficulty.hard} hard questions (target 3)`);
      }
    }
  }

  /* glossary -------------------------------------------------------- */
  if (glossary) {
    if (expectArray(glossary, files.glossary, 'glossary.json')) {
      if (glossary.length !== REQUIRED_GLOSSARY_COUNT) {
        fail(files.glossary, `expected ${REQUIRED_GLOSSARY_COUNT} terms, found ${glossary.length}`);
      }
      const terms = new Set();
      glossary.forEach((g, i) => {
        const at = `glossary[${i}]${g?.term ? ` (${g.term})` : ''}`;
        if (!isNonEmptyString(g?.term)) fail(files.glossary, `${at}: missing term`);
        else if (terms.has(g.term.toLowerCase())) fail(files.glossary, `${at}: duplicate term`);
        else terms.add(g.term.toLowerCase());
        if (!isNonEmptyString(g?.definition) || wordCount(g?.definition) < 8) {
          fail(files.glossary, `${at}: definition is missing or too short`);
        }
        checkBoolean(g, files.glossary, at, 'verified');
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Branching sagas                                                     */
/* ------------------------------------------------------------------ */

const SAGA_SCENES = new Set([
  'fjord', 'circle', 'well', 'tree', 'asgard', 'forge', 'jotunheim',
  'sea', 'pinewood', 'cave', 'wolf', 'ragnarok', 'meadow', 'empty',
]);

async function validateSagaFile(file) {
  const data = await loadJSON(file);
  if (!data) return;

  for (const field of ['id', 'title', 'tradition', 'subtitle', 'tagline', 'intro', 'setting', 'default_name', 'start']) {
    if (!isNonEmptyString(data[field])) fail(file, `missing ${field}`);
  }
  if (!isStringArray(data.name_suggestions, 1)) fail(file, 'name_suggestions must be a non-empty string array');
  if (isNonEmptyString(data.intro) && wordCount(data.intro) < 40) warn(file, 'intro is very short for a saga landing page');

  const actIds = new Set();
  if (!Array.isArray(data.acts) || data.acts.length < 1) {
    fail(file, 'acts must be a non-empty array');
  } else {
    data.acts.forEach((act, i) => {
      if (!Number.isInteger(act?.id)) fail(file, `acts[${i}]: id must be an integer`);
      else if (actIds.has(act.id)) fail(file, `acts[${i}]: duplicate id ${act.id}`);
      else actIds.add(act.id);
      if (!isNonEmptyString(act?.title)) fail(file, `acts[${i}]: missing title`);
    });
  }

  const pathIds = new Set();
  if (!Array.isArray(data.paths) || data.paths.length < 2) {
    fail(file, 'paths must contain at least 2 named routes');
  } else {
    data.paths.forEach((route, i) => {
      const at = `paths[${i}]${route?.id ? ` (${route.id})` : ''}`;
      if (!isNonEmptyString(route?.id) || !/^[a-z0-9_-]+$/.test(route?.id || '')) {
        fail(file, `${at}: id must be lowercase letters, digits, dashes or underscores`);
      } else if (pathIds.has(route.id)) {
        fail(file, `${at}: duplicate id`);
      } else pathIds.add(route.id);
      for (const field of ['title', 'glyph', 'blurb']) {
        if (!isNonEmptyString(route?.[field])) fail(file, `${at}: missing ${field}`);
      }
    });
  }

  if (!data.boons || typeof data.boons !== 'object' || Array.isArray(data.boons)) {
    fail(file, 'boons must be an object mapping flags to player-facing labels');
  } else {
    for (const [flag, label] of Object.entries(data.boons)) {
      if (!/^[a-zA-Z0-9_]+$/.test(flag)) fail(file, `boons: invalid flag name "${flag}"`);
      if (!isNonEmptyString(label)) fail(file, `boons.${flag}: label must be a non-empty string`);
    }
  }

  const nodes = data.nodes;
  if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) {
    fail(file, 'nodes must be an object keyed by node id');
    return;
  }
  const nodeIds = new Set(Object.keys(nodes));
  if (nodeIds.size < 5) fail(file, 'a saga needs at least 5 scene nodes');
  if (!nodeIds.has(data.start)) fail(file, `start node "${data.start}" does not exist`);

  const endingIds = new Set();
  if (!Array.isArray(data.endings) || data.endings.length < 1) {
    fail(file, 'endings must contain at least one ending');
  } else {
    data.endings.forEach((ending, i) => {
      const at = `endings[${i}]${ending?.id ? ` (${ending.id})` : ''}`;
      for (const field of ['id', 'title', 'rank', 'blurb', 'node']) {
        if (!isNonEmptyString(ending?.[field])) fail(file, `${at}: missing ${field}`);
      }
      if (isNonEmptyString(ending?.id)) {
        if (endingIds.has(ending.id)) fail(file, `${at}: duplicate ending id`);
        else endingIds.add(ending.id);
      }
      if (isNonEmptyString(ending?.node) && !nodeIds.has(ending.node)) {
        fail(file, `${at}: ending node "${ending.node}" does not exist`);
      }
    });
  }

  const graph = new Map();
  const endingNodes = new Set();
  let sceneCount = 0;
  let choiceCount = 0;

  for (const [key, node] of Object.entries(nodes)) {
    const at = `nodes.${key}`;
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      fail(file, `${at}: must be an object`);
      continue;
    }
    if (node.id !== key) fail(file, `${at}: id "${node.id}" must match its key`);
    if (!actIds.has(node.act)) fail(file, `${at}: act "${node.act}" is not declared in acts`);
    if (!isNonEmptyString(node.chapter)) fail(file, `${at}: missing chapter`);
    for (const field of ['title', 'location', 'art', 'artCaption']) {
      if (!isNonEmptyString(node?.[field])) fail(file, `${at}: missing ${field}`);
    }
    if (isNonEmptyString(node.art) && !SAGA_SCENES.has(node.art)) {
      fail(file, `${at}: unknown art scene "${node.art}" (known: ${[...SAGA_SCENES].join(', ')})`);
    }
    if (!Array.isArray(node.text) || node.text.length < 2 || node.text.length > 6) {
      fail(file, `${at}: text must contain 2–6 paragraphs`);
    } else {
      node.text.forEach((paragraph, i) => {
        if (!isNonEmptyString(paragraph)) fail(file, `${at}: text[${i}] is empty`);
      });
      const words = wordCount(node.text.join(' '));
      if (words < 90) warn(file, `${at}: only ${words} words (target 90–160)`);
      if (words > 160) warn(file, `${at}: ${words} words (target 90–160)`);
      if (words > 240) fail(file, `${at}: ${words} words (maximum 240)`);
    }
    if (node.lore !== undefined) {
      for (const field of ['title', 'body', 'source']) {
        if (!isNonEmptyString(node.lore?.[field])) fail(file, `${at}.lore: missing ${field}`);
      }
      if (isNonEmptyString(node.lore?.body) && wordCount(node.lore.body) < 15) {
        warn(file, `${at}.lore: body is very short`);
      }
    }

    const targets = [];
    if (node.ending) {
      const ending = node.ending;
      const atEnding = `${at}.ending`;
      for (const field of ['id', 'title', 'rank', 'summary']) {
        if (!isNonEmptyString(ending?.[field])) fail(file, `${atEnding}: missing ${field}`);
      }
      if (!endingIds.has(ending?.id)) fail(file, `${atEnding}: id "${ending?.id}" is not declared in endings`);
      const declared = (data.endings || []).find((entry) => entry.id === ending?.id);
      if (declared && declared.node !== key) {
        fail(file, `${atEnding}: id "${ending.id}" is declared for node "${declared.node}", not "${key}"`);
      }
      endingNodes.add(key);
      sceneCount += 1;
      if (node.choices !== undefined) fail(file, `${at}: an ending node must not also have choices`);
    } else {
      sceneCount += 1;
      if (!Array.isArray(node.choices) || node.choices.length < 2 || node.choices.length > 5) {
        fail(file, `${at}: choices must contain 2–5 options (or an ending object)`);
      } else {
        node.choices.forEach((choice, i) => {
          const atChoice = `${at}.choices[${i}]`;
          if (!isNonEmptyString(choice?.label)) fail(file, `${atChoice}: missing label`);
          if (!isNonEmptyString(choice?.to) || !nodeIds.has(choice.to)) {
            fail(file, `${atChoice}: target "${choice?.to}" does not exist`);
          } else {
            targets.push(choice.to);
          }
          if (choice?.tag !== undefined && !isNonEmptyString(choice.tag)) {
            fail(file, `${atChoice}: tag must be a non-empty string`);
          }
          if (choice?.requires !== undefined) {
            if (!Array.isArray(choice.requires?.anyFlags) || !choice.requires.anyFlags.every(isNonEmptyString)) {
              fail(file, `${atChoice}: requires.anyFlags must be an array of flag names`);
            }
          }
          if (choice?.effects !== undefined) {
            const effects = choice.effects;
            if (effects.add !== undefined) {
              if (!effects.add || typeof effects.add !== 'object' || Array.isArray(effects.add)) {
                fail(file, `${atChoice}: effects.add must be an object`);
              } else {
                for (const [stat, amount] of Object.entries(effects.add)) {
                  if (!['insight', 'courage', 'cunning'].includes(stat)) fail(file, `${atChoice}: unknown stat "${stat}"`);
                  if (!Number.isInteger(amount)) fail(file, `${atChoice}: effects.add.${stat} must be an integer`);
                }
              }
            }
            if (effects.set !== undefined) {
              if (!effects.set || typeof effects.set !== 'object' || Array.isArray(effects.set)) {
                fail(file, `${atChoice}: effects.set must be an object`);
              } else {
                for (const [flag, value] of Object.entries(effects.set)) {
                  if (!/^[a-zA-Z0-9_]+$/.test(flag)) fail(file, `${atChoice}: invalid flag name "${flag}"`);
                  if (!['boolean', 'string', 'number'].includes(typeof value)) {
                    fail(file, `${atChoice}: effects.set.${flag} must be a boolean, string or number`);
                  }
                }
              }
            }
            if (effects.add === undefined && effects.set === undefined) {
              warn(file, `${atChoice}: effects object has no add or set values`);
            }
          }
          choiceCount += 1;
        });
      }
    }
    graph.set(key, targets);
  }

  // Reachability from the start.
  const reached = new Set();
  if (nodeIds.has(data.start)) {
    const queue = [data.start];
    reached.add(data.start);
    while (queue.length) {
      const current = queue.shift();
      for (const next of graph.get(current) || []) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    for (const key of nodeIds) {
      if (!reached.has(key)) fail(file, `nodes.${key}: unreachable from the start node`);
    }
    for (const [endingId, ending] of (data.endings || []).entries()) {
      if (ending?.node && !reached.has(ending.node)) fail(file, `endings[${endingId}]: node "${ending.node}" is unreachable`);
    }
  }

  // Every scene should be able to reach at least one ending.
  const reverse = new Map();
  for (const key of nodeIds) reverse.set(key, []);
  for (const [from, targets] of graph) {
    for (const to of targets) reverse.get(to)?.push(from);
  }
  const canEnd = new Set(endingNodes);
  const backQueue = [...endingNodes];
  while (backQueue.length) {
    const current = backQueue.shift();
    for (const previous of reverse.get(current) || []) {
      if (!canEnd.has(previous)) {
        canEnd.add(previous);
        backQueue.push(previous);
      }
    }
  }
  for (const key of nodeIds) {
    if (!canEnd.has(key)) fail(file, `nodes.${key}: no route from this scene to an ending`);
  }

  if (VERBOSE) {
    console.log(`Saga "${data.title}": ${sceneCount} scenes, ${choiceCount} choices, ${endingNodes.size} endings.`);
  }
}

async function validateSagas() {
  const dir = path.join(CONTENT_DIR, 'saga');
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => path.join(dir, entry.name));
  if (!files.length) {
    warn(dir, 'saga folder has no .json files');
    return;
  }
  for (const file of files.sort()) await validateSagaFile(file);
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(CONTENT_DIR)) {
    console.error('content/ directory not found');
    process.exit(1);
  }

  const mythologies = await validateMythologies();
  if (!mythologies) {
    report();
    return;
  }

  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const metaById = new Map(mythologies.map((m) => [m.id, m]));

  await validateSagas();

  for (const name of dirs) {
    if (name === 'saga') continue;
    const meta = metaById.get(name);
    if (!meta) {
      warn(path.join(CONTENT_DIR, name), 'content folder has no entry in mythologies.json');
      continue;
    }
    await validateMythology(meta, path.join(CONTENT_DIR, name));
  }

  for (const m of mythologies.filter((x) => x.mvp)) {
    if (!dirs.includes(m.id)) fail(path.join(CONTENT_DIR, m.id), 'MVP mythology is missing its content folder');
  }

  if (VERBOSE) {
    console.log(`Checked ${mythologies.length} mythology entries and ${dirs.length} content folders.`);
  }
  report();
}

function report() {
  const red = process.stdout.isTTY ? '\x1b[31m' : '';
  const yellow = process.stdout.isTTY ? '\x1b[33m' : '';
  const green = process.stdout.isTTY ? '\x1b[32m' : '';
  const dim = process.stdout.isTTY ? '\x1b[2m' : '';
  const reset = process.stdout.isTTY ? '\x1b[0m' : '';

  if (errors.length) {
    console.log(`\n${red}ERRORS (${errors.length})${reset}`);
    for (const { file, message } of errors) console.log(`  ${red}✗${reset} ${file}: ${message}`);
  }
  if (warnings.length) {
    console.log(`\n${yellow}WARNINGS (${warnings.length})${reset}`);
    for (const { file, message } of warnings) console.log(`  ${yellow}!${reset} ${file}: ${message}`);
  }
  if (!errors.length && !warnings.length) {
    console.log(`${green}✓ Content is valid. No errors or warnings.${reset}`);
  } else if (!errors.length) {
    console.log(`\n${green}✓ No errors.${reset} ${dim}(${warnings.length} warning${warnings.length === 1 ? '' : 's'})${reset}`);
  }
  if (errors.length) {
    console.log(`\n${red}Validation failed: ${errors.length} error${errors.length === 1 ? '' : 's'}.${reset}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Validator crashed:', error);
  process.exit(1);
});
