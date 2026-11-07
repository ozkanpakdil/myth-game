import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';

test.describe('shell and routing', () => {
  test('home page renders the full shell without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/#/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('Stories that');
    await expect(page.locator('.main-nav a')).toHaveCount(6);
    await expect(page.locator('.brand__name')).toHaveText('Mythos');
    expect(errors).toEqual([]);
  });

  const routes = [
    ['/#/', 'home-page'],
    ['/#/myths', 'myths-page'],
    ['/#/map', 'map-page'],
    ['/#/timeline', 'timeline-page'],
    ['/#/codex', 'codex-page'],
    ['/#/results', 'results-page'],
    ['/#/challenges', 'challenges-page'],
    ['/#/about', 'about-page'],
    ['/#/myth/greek', 'myth-page'],
    ['/#/myth/greek/story/greek-01', 'story-page'],
    ['/#/myth/greek/quiz/greek-01', 'quiz-page'],
    ['/#/challenges/timeline', 'timeline-challenge'],
    ['/#/challenges/match', 'match-challenge'],
    ['/#/challenges/culture', 'culture-challenge'],
  ];

  for (const [route, testId] of routes) {
    test(`route ${route} renders ${testId}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByTestId(testId)).toBeVisible();
      await expect(page.locator('#page-title')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    });
  }

  test('an unknown hash shows the not-found screen', async ({ page }) => {
    await page.goto('/#/this/route/does/not/exist');
    await expect(page.getByTestId('notfound-page')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('not in the archive');
  });

  test('navigation marks the current section', async ({ page }) => {
    await page.goto('/#/timeline');
    await expect(page.locator('.main-nav a[data-nav="timeline"]')).toHaveAttribute('aria-current', 'page');
    await page.goto('/#/codex');
    await expect(page.locator('.main-nav a[data-nav="codex"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.main-nav a[data-nav="timeline"]')).not.toHaveAttribute('aria-current', 'page');
  });

  test('all home images are SVG and resolve', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.getByTestId('home-page')).toBeVisible();
    const images = await page.locator('img').evaluateAll((elements) =>
      elements.map((image) => ({
        src: image.getAttribute('src') || '',
        complete: image.complete,
        width: image.naturalWidth,
      })),
    );
    expect(images.length).toBeGreaterThanOrEqual(10);
    expect(images.every((image) => image.src.endsWith('.svg'))).toBeTruthy();
    expect(images.every((image) => image.complete && image.width > 0)).toBeTruthy();
    await expect(page.locator('img[src$=".png"], img[src$=".jpg"], img[src$=".webp"]')).toHaveCount(0);
  });

  test('the SVG sprite pipeline has one icon for every playable tradition', async () => {
    const icons = readdirSync(path.join(ROOT, 'assets', 'svg', 'icons')).filter((file) => file.endsWith('.svg'));
    for (const id of ['greek', 'norse', 'egypt', 'mesopotamia', 'hindu', 'japan', 'maya', 'celtic']) {
      expect(icons, `${id}.svg should exist`).toContain(`${id}.svg`);
    }
  });
});

test.describe('content integrity', () => {
  test('the validator accepts every content pack', () => {
    test.setTimeout(30_000);
    const output = execFileSync(process.execPath, ['tools/validate_content.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(output).toContain('Content is valid');
  });
});
