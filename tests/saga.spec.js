import { test, expect } from '@playwright/test';
import { readJson } from './helpers.js';

const saga = readJson('content/saga/norse.json');

async function chooseSaga(page, index) {
  const choice = page.getByTestId(`saga-choice-${index}`);
  await choice.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await choice.click({ force: true });
}
const SAGA_KEY = 'mythos.saga.v1';

function sagaState(overrides = {}) {
  const now = new Date().toISOString();
  return {
    version: 1,
    name: 'Michael',
    node: 'prologue',
    flags: {},
    stats: { insight: 0, courage: 0, cunning: 0 },
    visited: ['prologue'],
    history: [],
    endings: [],
    startedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

async function seedSaga(page, state) {
  await page.goto('/#/');
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
    [SAGA_KEY, state],
  );
}

test.describe('The Ash-Seed landing', () => {
  test('presents the saga, its three roads and five endings without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/#/saga');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('Ash-Seed');
    await expect(page.getByTestId('saga-name')).toHaveValue('Michael');
    await expect(page.locator('.saga-road')).toHaveCount(3);
    await expect(page.locator('.saga-ending-card')).toHaveCount(saga.endings.length);
    await expect(page.locator('.saga-ending-card.is-locked')).toHaveCount(saga.endings.length);
    await expect(page.getByTestId('saga-hero-art').locator('svg.saga-scene')).toBeVisible();
    await expect(page.getByTestId('saga-hero-art').locator('[class*="saga-"]').first()).toBeAttached();
    await expect(page.getByTestId('saga-intro-listen')).toBeVisible();
    await expect(page.getByTestId('saga-hero-art').locator('figcaption span')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('accepts a chosen name, rejects an empty one back to the default, and starts the prologue', async ({ page }) => {
    await page.goto('/#/saga');
    const input = page.getByTestId('saga-name');
    await input.fill('   ');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.getByTestId('saga-page')).toContainText('Michael');

    await page.evaluate(() => localStorage.removeItem('mythos.saga.v1'));
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('  Astrid  ');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toContainText('Astrid');

    await page.evaluate(() => localStorage.removeItem('mythos.saga.v1'));
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('Eirik');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toContainText('Eirik');
  });
});

test.describe('branching play', () => {
  test('reads a paragraph or the whole scene aloud and toggles the control to stop', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeUtterance {
        constructor(text) {
          this.text = text;
          this.onstart = null;
          this.onend = null;
          this.onerror = null;
        }
      }
      const synth = {
        speak(utterance) {
          window.__sagaSpoken = utterance.text;
          setTimeout(() => utterance.onstart?.(), 10);
          setTimeout(() => utterance.onend?.(), 120);
        },
        cancel() {},
        getVoices() { return []; },
      };
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    });

    await page.goto('/#/saga');
    await page.evaluate(() => localStorage.setItem('mythos.settings.v1', JSON.stringify({
      theme: 'dark', fontScale: 'md', audio: true, voice: '', studioVoice: '', voiceChosen: true,
    })));
    await page.reload();
    await page.getByTestId('saga-name').fill('Michael');
    await page.getByTestId('saga-begin').click();

    const firstParagraph = saga.nodes.prologue.text[0].replaceAll('{name}', 'Michael');
    await page.getByTestId('saga-listen-0').click();
    await expect(page.getByTestId('saga-listen-0')).toContainText('Stop');
    await expect.poll(() => page.evaluate(() => window.__sagaSpoken)).toBe(firstParagraph);
    await expect(page.getByTestId('saga-listen-0')).toContainText('Listen');

    await page.getByTestId('saga-listen').click();
    await expect(page.getByTestId('saga-progress')).toContainText(`Paragraph ${saga.nodes.prologue.text.length} of`);
    const fullScene = await page.evaluate(() => window.__sagaSpoken);
    expect(fullScene).toContain('Three roads leave this shore');
    expect(fullScene.length).toBeGreaterThan(firstParagraph.length);
  });

  test('asks for a narrator on the first Listen and uses Morgan once chosen', async ({ page }) => {
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('Michael');
    await page.getByTestId('saga-begin').click();

    await page.getByTestId('saga-listen-0').click();
    await expect(page.getByTestId('voice-dialog')).toBeVisible();
    await expect(page.getByTestId('studio-voice-morgan')).toBeChecked();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Morgan is selected');
    await page.getByTestId('voice-close').click();
    await expect(page.getByTestId('voice-dialog')).not.toBeVisible();

    const clip = page.waitForRequest((request) => request.url().includes('/audio/voices/morgan/saga/'));
    await page.getByTestId('saga-listen-0').click();
    await clip;
  });

  test('applies a newly chosen narrator to the next Listen and resets the old control', async ({ page }) => {
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('Michael');
    await page.getByTestId('saga-begin').click();

    await page.getByTestId('saga-listen-0').click();
    await page.getByTestId('voice-close').click();
    await page.getByTestId('saga-listen-0').click();
    await expect(page.getByTestId('saga-listen-0')).toContainText('Stop');

    await page.locator('#audio-toggle').click();
    await expect(page.getByTestId('saga-listen-0')).toContainText('Listen');
    await page.getByTestId('studio-voice-joe').check();
    await page.getByTestId('voice-close').click();

    const clip = page.waitForRequest((request) => request.url().includes('/audio/voices/joe/saga/'));
    await page.getByTestId('saga-listen-0').click();
    await clip;
  });

  test('reveals prose step by step, opens the myth note, and follows a chosen road', async ({ page }) => {
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('Michael');
    await page.getByTestId('saga-begin').click();

    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.getByTestId('saga-progress')).toContainText('Paragraph 1 of');
    await expect(page.locator('.saga-paragraph:visible')).toHaveCount(1);
    await expect(page.getByTestId('saga-lore')).toBeHidden();
    await expect(page.getByTestId('saga-listen')).toBeVisible();
    await expect(page.getByTestId('saga-listen-0')).toBeVisible();
    await expect(page.getByTestId('saga-listen-1')).toBeHidden();
    await expect(page.getByTestId('saga-scene').locator('figcaption span')).toHaveCount(0);

    await page.getByTestId('saga-continue').click();
    await expect(page.getByTestId('saga-progress')).toContainText('Paragraph 2 of');
    await expect(page.locator('.saga-paragraph:visible')).toHaveCount(2);

    await page.getByTestId('saga-skip').click();
    await expect(page.getByTestId('saga-progress')).toContainText(`Paragraph ${saga.nodes.prologue.text.length} of`);
    await expect(page.locator('.saga-paragraph:visible')).toHaveCount(saga.nodes.prologue.text.length);
    await expect(page.getByTestId('saga-lore')).toBeVisible();
    await expect(page.getByTestId('saga-choices')).toBeVisible();
    await expect(page.locator('.saga-choice')).toHaveCount(3);
    await expect(page.getByTestId('saga-lore-listen')).toBeVisible();
    for (let index = 0; index < saga.nodes.prologue.text.length; index += 1) {
      await expect(page.getByTestId(`saga-listen-${index}`)).toBeVisible();
    }

    await chooseSaga(page, 0);
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'raven-1');
    await expect(page.getByTestId('saga-scene')).toHaveAttribute('data-art', 'circle');
    await expect(page.getByTestId('saga-text').locator('.saga-paragraph').first()).toContainText('raven flew low');

    await page.getByTestId('saga-skip').click();
    await page.getByTestId('saga-choices').waitFor();
    await expect(page.getByTestId('saga-choice-1')).toBeVisible();

    await page.getByTestId('saga-back').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.locator('.saga-stat').first()).toContainText('0');
  });

  test('saves the run across reloads and offers a resume on the landing page', async ({ page }) => {
    await page.goto('/#/saga');
    await page.getByTestId('saga-name').fill('Jason');
    await page.getByTestId('saga-begin').click();
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 2);

    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'forge-1');
    await page.reload();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'forge-1');
    await expect(page.getByTestId('saga-page')).toContainText('Jason');

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAGA_KEY);
    expect(stored.name).toBe('Jason');
    expect(stored.node).toBe('forge-1');
    expect(stored.flags.pathHammer).toBe(true);
    expect(stored.visited).toEqual(['prologue', 'forge-1']);

    await page.goto('/#/saga');
    await expect(page.getByTestId('saga-resume')).toBeVisible();
    await expect(page.getByTestId('saga-continue')).toHaveAttribute('href', '#/saga/forge-1');
  });

  test('shows only choices whose requirements the thread has earned', async ({ page }) => {
    await seedSaga(page, sagaState({ node: 'raven-4', visited: ['prologue', 'raven-1', 'raven-2', 'raven-3', 'raven-4'] }));
    await page.goto('/#/saga/raven-4');
    await page.getByTestId('saga-skip').click();

    await expect(page.locator('.saga-choice')).toHaveCount(2);
    await expect(page.getByTestId('saga-choices')).not.toContainText("Show Odin's rune");

    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem('mythos.saga.v1'));
      state.flags.odinRune = true;
      localStorage.setItem('mythos.saga.v1', JSON.stringify(state));
    });
    await page.reload();
    await page.getByTestId('saga-skip').click();
    await expect(page.locator('.saga-choice')).toHaveCount(3);
    await expect(page.getByTestId('saga-choices')).toContainText("Show Odin's rune");
  });
});

test.describe('endings and reset', () => {
  test('reaches an ending, records it, and reveals it in the gallery', async ({ page }) => {
    await seedSaga(page, sagaState({ name: 'Jason', node: 'root-1', visited: ['prologue', 'root-1'] }));
    await page.goto('/#/saga/root-1');
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'root-1');
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 0);

    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-ending', 'true');
    await expect(page.getByTestId('saga-ending')).toBeVisible();
    await expect(page.getByTestId('saga-ending')).toContainText('The Thread Renewed');
    await expect(page.getByTestId('saga-scene')).toHaveAttribute('data-art', 'meadow');
    await expect(page.getByTestId('saga-again')).toBeVisible();

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAGA_KEY);
    expect(stored.endings).toContain('renewal');

    await page.getByTestId('saga-again').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');

    await page.goto('/#/saga');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await expect(page.locator('.saga-ending-card.is-locked')).toHaveCount(saga.endings.length - 1);
    await expect(page.locator('.saga-ending-card').filter({ hasText: 'The Thread Renewed' })).toBeVisible();
  });

  test('restart is confirmed, returns to the first scene, keeps the name and found endings', async ({ page }) => {
    await seedSaga(
      page,
      sagaState({
        name: 'Astrid',
        node: 'ending-renewal',
        visited: ['prologue', 'root-1', 'ending-renewal'],
        endings: ['renewal'],
        flags: { pathRaven: true },
      }),
    );
    await page.goto('/#/saga/ending-renewal');
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-ending', 'true');

    await page.getByTestId('saga-restart').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep going' }).click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'ending-renewal');

    await page.getByTestId('saga-restart').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.getByTestId('saga-page')).toContainText('Astrid');
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAGA_KEY);
    expect(stored.endings).toEqual(['renewal']);
    expect(stored.flags).toEqual({});
  });
});

test.describe('mobile saga', () => {
  test('does not overflow at phone width on the landing and scene screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/saga');
    let metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(metrics.doc).toBe(metrics.viewport);

    await page.getByTestId('saga-name').fill('Michael');
    await page.getByTestId('saga-begin').click();
    await page.getByTestId('saga-skip').click();
    metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(metrics.doc).toBe(metrics.viewport);
    await expect(page.getByTestId('saga-choices')).toBeVisible();
  });
});
