/**
 * progress.js — derivations shared by every screen.
 * The single source of truth is storage.js; these helpers only read it.
 */
import {
  getReadStories,
  getQuizRecord,
  getState,
  isFinalQuizPassed,
  isQuizPassed,
} from './storage.js?v=20261108-4';

export function isStoryUnlocked(mythId, stories, index) {
  if (index <= 0) return true;
  const previous = stories[index - 1];
  return Boolean(previous && isQuizPassed(mythId, previous.id));
}

export function allStoryQuizzesPassed(mythId, stories) {
  return stories.length > 0 && stories.every((story) => isQuizPassed(mythId, story.id));
}

export function storyState(mythId, stories, index) {
  const story = stories[index];
  const unlocked = isStoryUnlocked(mythId, stories, index);
  const read = getReadStories(mythId).includes(story.id);
  const record = getQuizRecord(mythId, story.id);
  return {
    unlocked,
    read,
    passed: Boolean(record?.passed),
    record,
  };
}

export function unlockedCharacterIds(mythId, stories, characters) {
  if (isFinalQuizPassed(mythId)) return new Set(characters.map((character) => character.id));
  const read = new Set(getReadStories(mythId));
  const unlocked = new Set();
  for (const story of stories) {
    if (!read.has(story.id)) continue;
    for (const id of story.characters || []) unlocked.add(id);
  }
  return unlocked;
}

export function glossaryUnlockedCount(mythId, glossary) {
  if (isFinalQuizPassed(mythId)) return glossary.length;
  return Math.min(glossary.length, getReadStories(mythId).length * 2);
}

export function mythStats(mythId, stories, characters, glossary) {
  const read = getReadStories(mythId);
  const readIds = new Set(read);
  const quizzesPassed = stories.filter((story) => isQuizPassed(mythId, story.id)).length;
  const finalPassed = isFinalQuizPassed(mythId);
  const characterIds = unlockedCharacterIds(mythId, stories, characters);
  const terms = glossaryUnlockedCount(mythId, glossary);
  return {
    readCount: readIds.size,
    storyCount: stories.length,
    quizzesPassed,
    finalPassed,
    nextStory: stories.find((story) => !readIds.has(story.id)) || null,
    storyPercent: stories.length ? Math.round(((readIds.size + quizzesPassed) / (stories.length * 2)) * 100) : 0,
    codexUnlocked: characterIds.size + terms,
    codexTotal: characters.length + glossary.length,
    charactersUnlocked: characterIds.size,
    glossaryUnlocked: terms,
    charactersTotal: characters.length,
    glossaryTotal: glossary.length,
  };
}

export function overallStats(playableData) {
  const stats = {
    storiesRead: 0,
    storiesTotal: 0,
    quizzesPassed: 0,
    quizzesTotal: 0,
    finalPassed: 0,
    finalTotal: 0,
    codexUnlocked: 0,
    codexTotal: 0,
    traditionsFinished: 0,
    traditionsTotal: playableData.length,
  };
  for (const entry of playableData) {
    const { meta, stories, characters, glossary } = entry;
    const s = mythStats(meta.id, stories, characters, glossary);
    stats.storiesRead += s.readCount;
    stats.storiesTotal += s.storyCount;
    stats.quizzesPassed += s.quizzesPassed;
    stats.quizzesTotal += s.storyCount;
    stats.codexUnlocked += s.codexUnlocked;
    stats.codexTotal += s.codexTotal;
    if (s.quizzesPassed === s.storyCount) stats.traditionsFinished += 1;
    if (isFinalQuizPassed(meta.id)) {
      stats.finalPassed += 1;
      stats.finalTotal += 1;
    } else {
      stats.finalTotal += 1;
    }
  }
  return stats;
}

export function lastPlayableMyth() {
  const state = getState();
  return state.lastMyth || null;
}
