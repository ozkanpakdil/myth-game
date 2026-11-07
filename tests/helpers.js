import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export const mythologies = readJson('content/mythologies.json');
export const playable = mythologies.filter((meta) => meta.mvp);
export const dataByMyth = Object.fromEntries(
  playable.map((meta) => [
    meta.id,
    {
      meta,
      info: readJson(`content/${meta.id}/info.json`),
      stories: readJson(`content/${meta.id}/stories.json`),
      quiz: readJson(`content/${meta.id}/quiz.json`),
      characters: readJson(`content/${meta.id}/characters.json`),
      glossary: readJson(`content/${meta.id}/glossary.json`),
    },
  ]),
);

export const allCharacters = playable.flatMap((meta) =>
  dataByMyth[meta.id].characters.map((character) => ({ ...character, mythId: meta.id, mythName: meta.name })),
);
export const allStories = playable.flatMap((meta) =>
  dataByMyth[meta.id].stories.map((story) => ({ ...story, mythId: meta.id, mythName: meta.name })),
);

export function freshState(overrides = {}) {
  const now = new Date().toISOString();
  return {
    version: 1,
    storiesRead: {},
    quizBest: {},
    finalQuiz: {},
    challenges: {},
    badges: [],
    lastRoute: '',
    lastMyth: '',
    startedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function quizRecord({ score = 5, total = 5, passed = true } = {}) {
  return {
    attempts: 1,
    bestScore: score,
    bestTotal: total,
    lastScore: score,
    lastTotal: total,
    passed,
    perfect: score === total,
  };
}

export async function seedProgress(page, state) {
  await page.goto('/#/');
  await page.evaluate((value) => {
    localStorage.setItem('mythos.progress.v1', JSON.stringify(value));
  }, state);
  await page.reload();
}

export async function readStory(page, storyId = 'greek-01') {
  await page.getByTestId(`story-card-${storyId}`).click();
  await page.waitForSelector('[data-testid="story-page"]');
  let guard = 0;
  while ((await page.getByTestId('story-next').count()) > 0) {
    await page.getByTestId('story-next').click();
    guard += 1;
    if (guard > 20) throw new Error('Story did not reach its final paragraph.');
  }
  await page.getByTestId('story-finish').click();
  await page.waitForSelector('[data-testid="quiz-page"]');
}

export async function answerQuiz(page, questions, { wrong = false } = {}) {
  let guard = 0;
  while ((await page.getByTestId('quiz-question').count()) > 0) {
    const questionText = await page.getByTestId('quiz-question').innerText();
    const question = questions.find((item) => item.question === questionText);
    if (!question) throw new Error(`Unknown question: ${questionText}`);
    const choice = wrong ? (question.correct_index + 1) % question.choices.length : question.correct_index;
    await page.getByTestId(`quiz-choice-${choice}`).click();
    await page.getByTestId('quiz-next').click();
    guard += 1;
    if (guard > 40) throw new Error('Quiz did not finish.');
  }
  await page.waitForSelector('[data-testid="quiz-result"]');
}

export function seededGreekFinalState() {
  const state = freshState({ storiesRead: { greek: dataByMyth.greek.stories.map((story) => story.id) }, lastMyth: 'greek' });
  for (const story of dataByMyth.greek.stories) {
    state.quizBest[`greek:${story.id}`] = quizRecord({ score: 5, total: 5, passed: true });
  }
  return state;
}

export function fullyPlayedState() {
  const state = freshState();
  for (const meta of playable) {
    const data = dataByMyth[meta.id];
    state.storiesRead[meta.id] = data.stories.map((story) => story.id);
    for (const story of data.stories) {
      state.quizBest[`${meta.id}:${story.id}`] = quizRecord({ score: 5, total: 5, passed: true });
    }
  }
  return state;
}
