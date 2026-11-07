import { test, expect } from '@playwright/test';
import {
  dataByMyth,
  answerQuiz,
  readStory,
  seedProgress,
  freshState,
  quizRecord,
  seededGreekFinalState,
} from './helpers.js';

test.describe('the Greek story loop', () => {
  test('read, pass, unlock, persist and award badges', async ({ page }) => {
    await page.goto('/#/myth/greek');
    await expect(page.getByTestId('story-card-greek-01')).toHaveAttribute('href', '#/myth/greek/story/greek-01');
    await expect(page.getByTestId('story-card-greek-02')).toHaveClass(/is-locked/);
    await expect(page.getByTestId('final-quiz-card')).toContainText('Pass all six story quizzes');

    await readStory(page);
    await expect(page.getByTestId('quiz-page')).toBeVisible();
    await answerQuiz(page, dataByMyth.greek.quiz);

    await expect(page.getByTestId('quiz-score')).toHaveText('4');
    await expect(page.getByTestId('quiz-pass')).toHaveText('Passed');
    await expect(page.getByTestId('next-story')).toBeVisible();

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')));
    expect(stored.storiesRead.greek).toContain('greek-01');
    expect(stored.quizBest['greek:greek-01'].passed).toBe(true);
    expect(stored.quizBest['greek:greek-01'].perfect).toBe(true);

    await page.getByTestId('next-story').click();
    await expect(page.getByTestId('story-page')).toBeVisible();
    await expect(page.locator('#page-title')).toHaveText('Demeter and Persephone');

    await page.goto('/#/myth/greek');
    await expect(page.getByTestId('story-card-greek-02')).toHaveAttribute('href', '#/myth/greek/story/greek-02');
    await expect(page.getByTestId('story-card-greek-03')).toHaveClass(/is-locked/);
    await expect(page.getByTestId('final-quiz-card')).toContainText('1/6 passed');

    await page.reload();
    await expect(page.getByTestId('story-card-greek-02')).toHaveAttribute('href', '#/myth/greek/story/greek-02');

    await page.goto('/#/results');
    await expect(page.getByTestId('badge-first-story')).toHaveClass(/is-earned/);
    await expect(page.getByTestId('badge-perfect-quiz')).toHaveClass(/is-earned/);
    await expect(page.getByTestId('progress-myth-greek')).toContainText('1/6 read');
  });

  test('a failed quiz does not unlock the next story, and retry resets the questions', async ({ page }) => {
    await page.goto('/#/myth/greek/quiz/greek-01');
    await expect(page.getByTestId('quiz-page')).toBeVisible();
    await answerQuiz(page, dataByMyth.greek.quiz, { wrong: true });

    await expect(page.getByTestId('quiz-pass')).toHaveText('Not passed yet');
    await expect(page.getByTestId('quiz-score')).toHaveText('0');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')));
    expect(stored.quizBest['greek:greek-01'].passed).toBe(false);

    await page.getByTestId('quiz-retry').click();
    await expect(page.getByTestId('quiz-page')).toBeVisible();
    await expect(page.getByTestId('quiz-progress-label')).toContainText('Question 1 of 4');
    await expect(page.getByTestId('quiz-choice-0')).toBeVisible();

    await page.goto('/#/myth/greek');
    await expect(page.getByTestId('story-card-greek-02')).toHaveClass(/is-locked/);
  });

  test('the final challenge stays locked until all six quizzes are passed, then scores 20/20', async ({ page }) => {
    await page.goto('/#/myth/greek');
    await expect(page.getByTestId('start-final-quiz')).toHaveCount(0);

    await seedProgress(page, seededGreekFinalState());
    await page.goto('/#/myth/greek');
    await expect(page.getByTestId('start-final-quiz')).toBeVisible();
    await page.getByTestId('start-final-quiz').click();
    await expect(page.getByTestId('quiz-page')).toBeVisible();
    await expect(page.locator('.quiz-meta')).toContainText('20 questions');

    await answerQuiz(page, dataByMyth.greek.quiz);
    await expect(page.getByTestId('quiz-score')).toHaveText('20');
    await expect(page.getByTestId('quiz-pass')).toHaveText('Passed');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')));
    expect(stored.finalQuiz.greek.passed).toBe(true);
    expect(stored.finalQuiz.greek.bestScore).toBe(20);
  });
});

test.describe('codex unlocks', () => {
  test('one read story unlocks its figure and two terms; a final pass unlocks the whole tradition', async ({ page }) => {
    await seedProgress(page, freshState({ storiesRead: { greek: ['greek-01'] } }));
    await page.goto('/#/codex');
    await expect(page.getByTestId('codex-count')).toContainText('3 / 160');
    await expect(page.getByTestId('codex-card-greek-zeus')).not.toHaveClass(/is-locked/);
    await expect(page.getByTestId('codex-card-greek-hades')).toHaveClass(/is-locked/);
    await expect(page.getByTestId('codex-term-greek-0')).not.toHaveClass(/is-locked/);
    await expect(page.getByTestId('codex-term-greek-2')).toHaveClass(/is-locked/);

    await page.getByTestId('codex-filter-greek').click();
    await expect(page.locator('#codex-greek')).toBeVisible();
    await expect(page.locator('#codex-norse')).toHaveCount(0);

    const finalState = freshState({ storiesRead: { greek: ['greek-01'] }, finalQuiz: { greek: quizRecord({ score: 20, total: 20 }) } });
    await seedProgress(page, finalState);
    await page.goto('/#/codex');
    await expect(page.getByTestId('codex-count')).toContainText('20 / 160');
    await expect(page.getByTestId('codex-card-greek-hades')).not.toHaveClass(/is-locked/);
  });
});

test.describe('timeline', () => {
  test('shows all catalogued traditions and marks only the playable ones', async ({ page }) => {
    await page.goto('/#/timeline');
    await expect(page.getByTestId('timeline-page')).toBeVisible();
    await expect(page.locator('.timeline-row')).toHaveCount(35);
    await expect(page.getByTestId('timeline-row-greek')).toHaveClass(/is-playable/);
    await expect(page.getByTestId('timeline-row-greek').locator('h3 a')).toHaveAttribute('href', '#/myth/greek');
    await expect(page.getByTestId('timeline-row-roman')).not.toHaveClass(/is-playable/);
    await expect(page.getByTestId('timeline-page')).toContainText('35 traditions');
  });
});
