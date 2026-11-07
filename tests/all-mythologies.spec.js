import { test, expect } from '@playwright/test';
import { dataByMyth, fullyPlayedState, playable, seedProgress } from './helpers.js';

test('every playable tradition serves all six stories, all story quizzes and the final challenge', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await seedProgress(page, fullyPlayedState());

  for (const meta of playable) {
    await page.goto(`/#/myth/${meta.id}`);
    await expect(page.getByTestId('myth-page')).toBeVisible();
    await expect(page.locator('[data-testid^="story-card-"]')).toHaveCount(6);

    for (const story of dataByMyth[meta.id].stories) {
      await page.goto(`/#/myth/${meta.id}/story/${story.id}`);
      await expect(page.getByTestId('story-page')).toBeVisible();
      await expect(page.locator('#page-title')).toHaveText(story.title);

      await page.goto(`/#/myth/${meta.id}/quiz/${story.id}`);
      await expect(page.getByTestId('quiz-page')).toBeVisible();
      await expect(page.locator('[data-testid^="quiz-choice-"]')).toHaveCount(4);
    }

    await page.goto(`/#/myth/${meta.id}/quiz/final`);
    await expect(page.getByTestId('quiz-page')).toBeVisible();
    await expect(page.locator('.quiz-meta')).toContainText('20 questions');
  }

  expect(errors).toEqual([]);
});
