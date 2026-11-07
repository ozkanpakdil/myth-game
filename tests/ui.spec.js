import { test, expect } from '@playwright/test';
import { dataByMyth, freshState, seedProgress, quizRecord } from './helpers.js';

test.describe('settings', () => {
  test('theme and text size persist across reloads', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();

    await page.getByRole('button', { name: /Normal text size/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-font', 'lg');
    const largeSize = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
    expect(largeSize).toBe('18px');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-font', 'lg');
  });
});

test.describe('progress reset', () => {
  test('cancel keeps progress; confirm clears it but keeps settings', async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    const state = freshState({
      storiesRead: { greek: ['greek-01'] },
      quizBest: { 'greek:greek-01': quizRecord({ score: 4, total: 4 }) },
      badges: ['first-story'],
    });
    await seedProgress(page, state);
    await page.goto('/#/results');
    await expect(page.getByTestId('results-page')).toContainText('1/48');

    await page.getByTestId('reset-progress').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('results-page')).toContainText('1/48');

    await page.getByTestId('reset-progress').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reset progress' }).click();
    await expect(page.getByTestId('results-page')).toContainText('0/48');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')));
    expect(stored.storiesRead).toEqual({});
    expect(stored.quizBest).toEqual({});
    expect(stored.badges).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('responsive layout', () => {
  test('phone screens do not overflow horizontally on the main screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/#/', '/#/myths', '/#/myth/greek', '/#/myth/greek/story/greek-01', '/#/myth/greek/quiz/greek-01', '/#/timeline', '/#/codex']) {
      await page.goto(route);
      const metrics = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }));
      expect(metrics.doc, `overflow on ${route}`).toBe(metrics.viewport);
    }
    await expect(page.getByTestId('codex-page')).toBeVisible();
  });

  test('navigation remains available on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/#/');
    await expect(page.locator('.main-nav')).toBeVisible();
    await expect(page.locator('.main-nav a')).toHaveCount(6);
    await page.locator('.main-nav a[data-nav="challenges"]').click();
    await expect(page.getByTestId('challenges-page')).toBeVisible();
  });
});

test.describe('accessibility basics', () => {
  test('the skip link focuses main without changing the route', async ({ page }) => {
    await page.goto('/#/myths');
    const before = await page.evaluate(() => location.hash);
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
    expect(await page.evaluate(() => location.hash)).toBe(before);
    await expect(page.getByTestId('myths-page')).toBeVisible();
  });

  test('quiz feedback is announced and keyboard operable', async ({ page }) => {
    await page.goto('/#/myth/greek/quiz/greek-01');
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    const question = dataByMyth.greek.quiz[0];
    await page.getByTestId(`quiz-choice-${question.correct_index}`).click();
    const feedback = page.locator('#quiz-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.choice').first()).toBeDisabled();
    await expect(page.getByTestId('quiz-next')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('quiz-progress-label')).toContainText('Question 2 of 4');
  });
});
