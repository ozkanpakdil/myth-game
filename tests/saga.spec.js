import { test, expect } from '@playwright/test';
import { readJson } from './helpers.js';

const saga = readJson('content/saga/norse.json');
const greek = readJson('content/saga/greek-olive.json');
const catalog = readJson('content/sagas.json');
const SAGA_KEY = 'mythos.saga.v1';
const LIBRARY_KEY = 'mythos.saga.v2';

async function chooseSaga(page, index) {
  const choice = page.getByTestId(`saga-choice-${index}`);
  await choice.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await choice.click({ force: true });
}

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

async function seedLegacySaga(page, state) {
  await page.goto('/#/');
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
    [SAGA_KEY, state],
  );
}

async function storedLibrary(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), LIBRARY_KEY);
}

async function storedRun(page, sagaId = 'norse') {
  const library = await storedLibrary(page);
  return library?.runs?.[sagaId] || null;
}

test.describe('Saga library', () => {
  test('lists every story with child-friendly metadata and links to each path', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/#/saga');
    await expect(page.getByTestId('saga-library')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('Pick a story');
    await expect(page.locator('[data-testid^="saga-card-"]')).toHaveCount(catalog.length);
    await expect(page.getByTestId('saga-card-greek-olive')).toHaveAttribute('href', '#/saga/greek-olive');
    await expect(page.getByTestId('saga-card-greek-olive')).toContainText('The Olive Tree Contest');
    await expect(page.getByTestId('saga-card-greek-olive')).toContainText('Ages 8+');
    await expect(page.getByTestId('saga-card-norse')).toContainText('The Ash-Seed');
    await expect(page.locator('.saga-library-card svg.saga-scene')).toHaveCount(catalog.length);
    expect(errors).toEqual([]);
  });

  test('every catalog card opens its own landing with the right cover and paths', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    for (const entry of catalog) {
      await page.goto(`/#/saga/${entry.id}`);
      await expect(page.getByTestId('saga-landing'), entry.id).toBeVisible();
      await expect(page.locator('#page-title'), entry.id).toContainText(entry.title.split(' ')[0]);
      await expect(page.getByTestId('saga-hero-art')).toHaveAttribute('data-art', entry.cover_art);
      await expect(page.locator('.saga-road')).toHaveCount(3);
      await expect(page.locator('.saga-ending-card')).toHaveCount(entry.id === 'norse' ? 5 : 4);
    }
    expect(errors).toEqual([]);
  });

  test('opens a short Greek story and saves its run separately', async ({ page }) => {
    await page.goto('/#/saga/greek-olive');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('Olive Tree');
    await expect(page.getByTestId('saga-name')).toHaveValue('Alex');
    await expect(page.locator('.saga-road')).toHaveCount(3);
    await expect(page.locator('.saga-ending-card')).toHaveCount(greek.endings.length);
    await expect(page.getByTestId('saga-hero-art')).toHaveAttribute('data-art', 'olive');

    await page.getByTestId('saga-name').fill('Iris');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'start');
    await expect(page.getByTestId('saga-scene')).toHaveAttribute('data-art', 'olive');
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 0);
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'olive-1');
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 0);
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'olive-2');
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 0);
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'ending-olive');
    await expect(page.getByTestId('saga-ending')).toContainText('The City of the Olive');

    const run = await storedRun(page, 'greek-olive');
    expect(run?.name).toBe('Iris');
    expect(run?.node).toBe('ending-olive');
    const library = await storedLibrary(page);
    expect(library.endings['greek-olive']).toContain('olive');

    await page.goto('/#/saga');
    await expect(page.getByTestId('saga-card-greek-olive')).toContainText('Continue as Iris');
  });

  test('uses the browser voice for the new stories without asking for a studio narrator', async ({ page }) => {
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

    await page.goto('/#/saga/greek-olive');
    await page.getByTestId('saga-name').fill('Iris');
    await page.getByTestId('saga-begin').click();
    await page.getByTestId('saga-listen-0').click();
    await expect(page.getByTestId('voice-dialog')).not.toBeVisible();
    await expect(page.getByTestId('saga-listen-0')).toContainText('Stop');
    await expect.poll(() => page.evaluate(() => window.__sagaSpoken)).toContain('You are Iris');
  });

  test('offers pre-recorded Sonia and Eric studio clips only on the new sagas', async ({ page }) => {
    let askedHuggingFace = false;
    page.on('request', (request) => {
      if (request.url().includes('huggingface.co')) askedHuggingFace = true;
    });

    await page.goto('/#/saga/greek-olive');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'start');
    await expect(page.getByTestId('saga-voice')).toBeVisible();
    await expect(page.getByTestId('saga-voice-panel')).toBeHidden();
    await page.getByTestId('saga-voice-open').click();
    await expect(page.getByTestId('saga-voice-panel')).toBeVisible();
    await expect(page.getByTestId('saga-voice-panel')).toContainText('Nothing downloads here');
    await expect(page.getByTestId('saga-voice-start')).toBeEnabled();
    await expect(page.getByTestId('saga-voice-stop')).toBeHidden();
    await expect(page.getByTestId('saga-voice-select')).toHaveValue('sonia');
    await expect(page.getByTestId('saga-voice-select').locator('option')).toHaveText(['Sonia', 'Eric']);
    expect(askedHuggingFace).toBe(false);

    await page.goto('/#/saga/norse');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-voice')).toHaveCount(0);
  });

  test('plays the pre-rendered Sonia clip for the default Greek opening', async ({ page }) => {
    await page.goto('/#/saga/greek-olive');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'start');
    await page.getByTestId('saga-voice-open').click();
    const clip = page.waitForRequest((request) => /\/audio\/saga\/sonia\/[0-9a-f]{8}\.mp3/.test(request.url()));
    await page.getByTestId('saga-voice-start').click();
    await expect(page.getByTestId('saga-voice-status')).toContainText('Playing with Sonia');
    await expect(clip).resolves.toBeTruthy();
    await page.getByTestId('saga-voice-stop').click();
    await expect(page.getByTestId('saga-voice-status')).toContainText('Stopped');
  });

  test('explains when a custom name has no pre-rendered studio clip', async ({ page }) => {
    await page.goto('/#/saga/greek-olive');
    await page.getByTestId('saga-name').fill('Zephyr');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'start');
    await page.getByTestId('saga-voice-open').click();
    await page.getByTestId('saga-voice-start').click();
    await expect(page.getByTestId('saga-voice-status')).toContainText('No Sonia clip exists');
    await expect(page.getByTestId('saga-voice-stop')).toBeHidden();
    await expect(page.getByTestId('saga-voice-start')).toBeEnabled();
  });

  test('keeps old #/saga/<node> links working and migrates the old save', async ({ page }) => {
    await seedLegacySaga(page, sagaState({ name: 'Michael', node: 'raven-4' }));
    await page.goto('/#/saga/raven-4');
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'raven-4');
    const library = await storedLibrary(page);
    expect(library.runs.norse.name).toBe('Michael');
    expect(library.runs.norse.node).toBe('raven-4');
  });
});

test.describe('The Ash-Seed landing', () => {
  test('presents the Norse saga, its three roads and five endings without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/#/saga/norse');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await expect(page.locator('#page-title')).toContainText('Ash-Seed');
    await expect(page.getByTestId('saga-name')).toHaveValue('Michael');
    await expect(page.locator('.saga-road')).toHaveCount(3);
    await expect(page.locator('.saga-ending-card')).toHaveCount(saga.endings.length);
    await expect(page.locator('.saga-ending-card.is-locked')).toHaveCount(saga.endings.length);
    await expect(page.getByTestId('saga-hero-art')).toHaveAttribute('data-art', 'fjord');
    await expect(page.getByTestId('saga-hero-art').locator('svg.saga-scene')).toBeVisible();
    await expect(page.getByTestId('saga-intro-listen')).toBeVisible();
    await expect(page.getByTestId('saga-hero-art').locator('figcaption span')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('accepts a chosen name, rejects an empty one back to the default, and starts the prologue', async ({ page }) => {
    await page.goto('/#/saga/norse');
    const input = page.getByTestId('saga-name');
    await input.fill('   ');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.getByTestId('saga-page')).toContainText('Michael');

    await page.evaluate(() => {
      localStorage.removeItem('mythos.saga.v1');
      localStorage.removeItem('mythos.saga.v2');
    });
    await page.goto('/#/saga/norse');
    await page.getByTestId('saga-name').fill('  Astrid  ');
    await page.getByTestId('saga-begin').click();
    await expect(page.getByTestId('saga-page')).toContainText('Astrid');

    await page.evaluate(() => {
      localStorage.removeItem('mythos.saga.v1');
      localStorage.removeItem('mythos.saga.v2');
    });
    await page.goto('/#/saga/norse');
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

    await page.goto('/#/saga/norse');
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
    await page.goto('/#/saga/norse');
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
    await page.goto('/#/saga/norse');
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
    await page.goto('/#/saga/norse');
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
    await page.goto('/#/saga/norse');
    await page.getByTestId('saga-name').fill('Jason');
    await page.getByTestId('saga-begin').click();
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 2);

    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'forge-1');
    await page.reload();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'forge-1');
    await expect(page.getByTestId('saga-page')).toContainText('Jason');

    const stored = await storedRun(page);
    expect(stored.name).toBe('Jason');
    expect(stored.node).toBe('forge-1');
    expect(stored.flags.pathHammer).toBe(true);
    expect(stored.visited).toEqual(['prologue', 'forge-1']);

    await page.goto('/#/saga/norse');
    await expect(page.getByTestId('saga-resume')).toBeVisible();
    await expect(page.getByTestId('saga-continue')).toHaveAttribute('href', '#/saga/norse/forge-1');
  });

  test('shows only choices whose requirements the thread has earned', async ({ page }) => {
    await seedLegacySaga(page, sagaState({ node: 'raven-4', visited: ['prologue', 'raven-1', 'raven-2', 'raven-3', 'raven-4'] }));
    await page.goto('/#/saga/norse/raven-4');
    await page.getByTestId('saga-skip').click();

    await expect(page.locator('.saga-choice')).toHaveCount(2);
    await expect(page.getByTestId('saga-choices')).not.toContainText("Show Odin's rune");

    await page.evaluate(() => {
      const library = JSON.parse(localStorage.getItem('mythos.saga.v2'));
      library.runs.norse.flags.odinRune = true;
      localStorage.setItem('mythos.saga.v2', JSON.stringify(library));
    });
    await page.reload();
    await page.getByTestId('saga-skip').click();
    await expect(page.locator('.saga-choice')).toHaveCount(3);
    await expect(page.getByTestId('saga-choices')).toContainText("Show Odin's rune");
  });
});

test.describe('endings and reset', () => {
  test('reaches an ending, records it, and reveals it in the gallery', async ({ page }) => {
    await seedLegacySaga(page, sagaState({ name: 'Jason', node: 'root-1', visited: ['prologue', 'root-1'] }));
    await page.goto('/#/saga/norse/root-1');
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'root-1');
    await page.getByTestId('saga-skip').click();
    await chooseSaga(page, 0);

    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-ending', 'true');
    await expect(page.getByTestId('saga-ending')).toBeVisible();
    await expect(page.getByTestId('saga-ending')).toContainText('The Thread Renewed');
    await expect(page.getByTestId('saga-scene')).toHaveAttribute('data-art', 'meadow');
    await expect(page.getByTestId('saga-again')).toBeVisible();

    const library = await storedLibrary(page);
    expect(library.endings.norse).toContain('renewal');

    await page.getByTestId('saga-again').click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');

    await page.goto('/#/saga/norse');
    await expect(page.getByTestId('saga-landing')).toBeVisible();
    await expect(page.locator('.saga-ending-card.is-locked')).toHaveCount(saga.endings.length - 1);
    await expect(page.locator('.saga-ending-card').filter({ hasText: 'The Thread Renewed' })).toBeVisible();
  });

  test('restart is confirmed, returns to the first scene, keeps the name and found endings', async ({ page }) => {
    await seedLegacySaga(
      page,
      sagaState({
        name: 'Astrid',
        node: 'ending-renewal',
        visited: ['prologue', 'root-1', 'ending-renewal'],
        endings: ['renewal'],
        flags: { pathRaven: true },
      }),
    );
    await page.goto('/#/saga/norse/ending-renewal');
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-ending', 'true');

    await page.getByTestId('saga-restart').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep going' }).click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'ending-renewal');

    await page.getByTestId('saga-restart').click();
    await dialog.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByTestId('saga-page')).toHaveAttribute('data-node', 'prologue');
    await expect(page.getByTestId('saga-page')).toContainText('Astrid');
    const library = await storedLibrary(page);
    expect(library.endings.norse).toEqual(['renewal']);
    expect(library.runs.norse.flags).toEqual({});
  });
});

test.describe('mobile saga', () => {
  test('does not overflow at phone width on the library, landing and scene screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/saga');
    let metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(metrics.doc).toBe(metrics.viewport);
    await expect(page.locator('.saga-library-card')).toHaveCount(catalog.length);

    await page.goto('/#/saga/greek-olive');
    await page.getByTestId('saga-name').fill('Iris');
    await page.getByTestId('saga-begin').click();
    await page.getByTestId('saga-skip').click();
    metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(metrics.doc).toBe(metrics.viewport);
    await expect(page.getByTestId('saga-choices')).toBeVisible();
    await page.getByTestId('saga-voice-open').click();
    await expect(page.getByTestId('saga-voice-panel')).toBeVisible();
    metrics = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(metrics.doc).toBe(metrics.viewport);
  });
});
