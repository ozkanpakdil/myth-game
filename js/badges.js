/**
 * badges.js — the achievement catalogue and its evaluator.
 *
 * Badges are plain data so the results screen, the quiz result and the toasts
 * all describe them the same way. Evaluation is derived from stored progress;
 * nothing extra needs to be saved when a badge is earned.
 */
import { getState } from './storage.js?v=20261107-5';

export const STATIC_BADGES = [
  { id: 'first-story', name: 'First Steps', description: 'Read your first story.', icon: '✦' },
  { id: 'first-quiz', name: 'Quiz Initiate', description: 'Pass your first quiz.', icon: '◆' },
  { id: 'perfect-quiz', name: 'Flawless', description: 'Score 100% on any quiz.', icon: '★' },
  { id: 'timeline-master', name: 'Timeline Master', description: 'Put every event in the right order.', icon: '⏳' },
  { id: 'matchmaker', name: 'Matchmaker', description: 'Match every deity, domain and tradition.', icon: '⚖' },
  { id: 'culture-detective', name: 'Culture Detective', description: 'Identify every culture from its story.', icon: '❖' },
  { id: 'codex-keeper', name: 'Codex Keeper', description: 'Unlock 25 codex cards.', icon: '◈' },
  { id: 'mythologist', name: 'Mythologist', description: 'Finish all eight playable traditions.', icon: '✷' },
];

export function badgeCatalog(playable = []) {
  const perMyth = playable.flatMap((meta) => [
    {
      id: `finished-${meta.id}`,
      name: `${meta.name} Scholar`,
      description: `Pass all six ${meta.name} story quizzes.`,
      icon: '◇',
    },
    {
      id: `finalist-${meta.id}`,
      name: `${meta.name} Adept`,
      description: `Pass the ${meta.name} final challenge.`,
      icon: '◉',
    },
  ]);
  return [...STATIC_BADGES, ...perMyth];
}

export function evaluateBadges({ playable = [], codexUnlocked = null } = {}) {
  const state = getState();
  const earned = [];

  const readCount = Object.values(state.storiesRead).reduce((sum, list) => sum + list.length, 0);
  if (readCount > 0) earned.push('first-story');

  const quizRecords = Object.values(state.quizBest);
  if (quizRecords.some((record) => record.passed)) earned.push('first-quiz');
  if (quizRecords.some((record) => record.perfect)) earned.push('perfect-quiz');

  if (state.challenges.timeline?.perfect) earned.push('timeline-master');
  if (state.challenges.match?.perfect) earned.push('matchmaker');
  if (state.challenges.culture?.perfect) earned.push('culture-detective');
  if (Number.isFinite(codexUnlocked) && codexUnlocked >= 25) earned.push('codex-keeper');

  let finishedAll = playable.length > 0;
  for (const meta of playable) {
    const passedStories = [1, 2, 3, 4, 5, 6].every(
      (number) => state.quizBest[`${meta.id}:${meta.id}-${String(number).padStart(2, '0')}`]?.passed,
    );
    if (passedStories) earned.push(`finished-${meta.id}`);
    else finishedAll = false;
    if (state.finalQuiz[meta.id]?.passed) earned.push(`finalist-${meta.id}`);
  }
  if (finishedAll) earned.push('mythologist');
  return earned;
}
