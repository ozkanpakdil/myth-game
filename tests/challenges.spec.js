import { test, expect } from '@playwright/test';
import { allCharacters, allStories, mythologies } from './helpers.js';

const metaById = Object.fromEntries(mythologies.map((meta) => [meta.id, meta]));

test.describe('Timeline Builder', () => {
  test('can be solved with the arrow controls and records a perfect attempt', async ({ page }) => {
    await page.goto('/#/challenges/timeline');
    await expect(page.getByTestId('timeline-challenge')).toBeVisible();
    await expect(page.locator('.order-item')).toHaveCount(6);

    const current = await page.locator('.order-item').evaluateAll((items) =>
      items.map((item) => item.dataset.testid.replace('order-item-', '')),
    );
    const desired = [...current].sort(
      (a, b) => metaById[a].start_year - metaById[b].start_year || metaById[a].name.localeCompare(metaById[b].name),
    );

    for (let target = 0; target < desired.length; target += 1) {
      const ids = await page.locator('.order-item').evaluateAll((items) =>
        items.map((item) => item.dataset.testid.replace('order-item-', '')),
      );
      const from = ids.indexOf(desired[target]);
      for (let position = from; position > target; position -= 1) {
        await page.getByTestId(`up-${desired[target]}`).click();
      }
    }

    await page.getByTestId('check-order').click();
    await expect(page.getByTestId('order-result')).toBeVisible();
    await expect(page.getByTestId('order-score')).toHaveText('6 / 6');
    await expect(page.getByTestId('order-result')).toHaveClass(/is-pass/);

    const challenges = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')).challenges);
    expect(challenges.timeline.perfect).toBe(true);

    await page.goto('/#/results');
    await expect(page.getByTestId('badge-timeline-master')).toHaveClass(/is-earned/);
  });
});

test.describe('Pantheon Match', () => {
  test('can match five figures to culture and domain for 10/10', async ({ page }) => {
    await page.goto('/#/challenges/match');
    await expect(page.getByTestId('match-challenge')).toBeVisible();

    for (let round = 0; round < 5; round += 1) {
      const name = await page.locator('.figure-card h2').innerText();
      const character = allCharacters.find((item) => item.name === name);
      expect(character, `character ${name}`).toBeTruthy();

      await page.getByTestId(`match-culture-${character.mythId}`).click();
      const domain = character.domain[0];
      await page
        .locator('[data-testid^="match-domain-"]')
        .filter({ hasText: domain })
        .first()
        .click();
      await page.getByTestId('match-next').click();
    }

    await expect(page.getByTestId('match-result')).toBeVisible();
    await expect(page.getByTestId('match-score')).toHaveText('10 / 10');
    const challenges = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')).challenges);
    expect(challenges.match.perfect).toBe(true);

    await page.goto('/#/results');
    await expect(page.getByTestId('badge-matchmaker')).toHaveClass(/is-earned/);
  });
});

test.describe('Which Culture?', () => {
  test('identifies all five snippets from the story text', async ({ page }) => {
    await page.goto('/#/challenges/culture');
    await expect(page.getByTestId('culture-challenge')).toBeVisible();

    for (let round = 0; round < 5; round += 1) {
      const snippet = (await page.getByTestId('culture-snippet').innerText()).trim();
      const base = snippet.replace(/…$/, '').trim();
      const story = allStories.find((item) => item.paragraphs[0].trim().startsWith(base));
      expect(story, `snippet: ${base.slice(0, 60)}`).toBeTruthy();
      await page.getByTestId(`culture-option-${story.mythId}`).click();
      await page.getByTestId('culture-next').click();
    }

    await expect(page.getByTestId('culture-result')).toBeVisible();
    await expect(page.getByTestId('culture-score')).toHaveText('5 / 5');
    const challenges = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.progress.v1')).challenges);
    expect(challenges.culture.perfect).toBe(true);

    await page.goto('/#/results');
    await expect(page.getByTestId('badge-culture-detective')).toHaveClass(/is-earned/);
  });
});

test.describe('map', () => {
  test('region keyboard selection, legend and markers navigate into traditions', async ({ page }) => {
    await page.goto('/#/map');
    await expect(page.getByTestId('map-page')).toBeVisible();
    await expect(page.locator('.map-region')).toHaveCount(6);
    await expect(page.locator('.map-marker')).toHaveCount(9);

    await page.getByTestId('map-region-europe').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('map-region-title')).toHaveText('Europe');
    await expect(page.getByTestId('map-region-link-greek')).toBeVisible();

    await page.getByTestId('map-marker-japan').click();
    await expect(page.getByTestId('myth-page')).toBeVisible();
    await expect(page.locator('#page-title')).toHaveText('Japanese');

    await page.goto('/#/map');
    await page.locator('[data-region-legend="oceania"]').click();
    await expect(page.getByTestId('map-region-title')).toHaveText('Oceania');
    await expect(page.getByTestId('map-region-link-maya')).toHaveCount(0);
  });

  test('the map scrolls horizontally on a phone without the page overflowing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/map');
    const metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      scroll: document.querySelector('.map-scroll')?.scrollWidth || 0,
      box: document.querySelector('.map-scroll')?.clientWidth || 0,
    }));
    expect(metrics.doc).toBe(metrics.viewport);
    expect(metrics.scroll).toBeGreaterThan(metrics.box);
    await expect(page.locator('.map-scroll-hint')).toBeVisible();
    await expect(page.locator('.map-list__item')).toHaveCount(9);
  });
});
