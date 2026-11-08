import { test, expect } from '@playwright/test';
import { dataByMyth, freshState, seedProgress, quizRecord, fullyPlayedState } from './helpers.js';

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
    for (const route of ['/#/', '/#/saga', '/#/myths', '/#/myth/greek', '/#/myth/greek/story/greek-01', '/#/myth/greek/quiz/greek-01', '/#/timeline', '/#/codex']) {
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
    await expect(page.locator('.main-nav a')).toHaveCount(7);
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

  test('quiz feedback is focused, readable and keyboard operable', async ({ page }) => {
    await page.goto('/#/myth/greek/quiz/greek-01');
    await expect(page.getByTestId('quiz-question')).toBeVisible();
    const question = dataByMyth.greek.quiz[0];
    await page.getByTestId(`quiz-choice-${question.correct_index}`).click();
    const feedback = page.locator('#quiz-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Correct');
    await expect(feedback).toContainText('The answer is');
    await expect(feedback).toBeFocused();
    await expect(page.locator('.choice').first()).toBeDisabled();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('quiz-next')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('quiz-progress-label')).toContainText('Question 2 of 4');
  });
});

test.describe('visual storytelling and narration', () => {
  test('story scenes are SVG, change with the paragraph, and expose narration', async ({ page }) => {
    await page.goto('/#/myth/greek/story/greek-01');
    const scene = page.getByTestId('story-scene');
    await expect(scene).toBeVisible();
    await expect(scene).toHaveAttribute('data-motif', 'titan');
    await expect(scene.locator('svg.pixel-scene')).toBeVisible();
    await expect(page.getByTestId('story-listen')).toBeVisible();
    await expect(page.getByTestId('story-listen').locator('svg.button__icon')).toHaveCount(1);
    const first = await scene.locator('svg.pixel-scene').innerHTML();
    await page.getByTestId('story-next').click();
    await expect(scene).toHaveAttribute('data-scene-step', '2');
    const second = await scene.locator('svg.pixel-scene').innerHTML();
    expect(second).not.toBe(first);
  });

  test('quiz questions have related SVG art, keyboard focus and icons on every answer', async ({ page }) => {
    await seedProgress(page, fullyPlayedState());
    await page.goto('/#/myth/egypt/quiz/final');
    await expect(page.getByTestId('quiz-scene').locator('svg.pixel-scene')).toBeVisible();
    await expect(page.getByTestId('quiz-question')).toBeFocused();
    await expect(page.getByTestId('quiz-listen')).toBeVisible();
    await expect(page.getByTestId('quiz-listen').locator('svg.button__icon')).toHaveCount(1);
    await expect(page.locator('[data-testid^="quiz-choice-"] .character-portrait, [data-testid^="quiz-choice-"] .choice-glyph')).toHaveCount(4);

    const quiz = dataByMyth.egypt.quiz;
    for (let i = 0; i < 4; i += 1) {
      await page.getByTestId(`quiz-choice-${quiz[i].correct_index}`).click();
      await page.getByTestId('quiz-next').click();
    }
    await expect(page.getByTestId('quiz-question')).toContainText(quiz[4].question);
    await expect(page.locator('[data-testid^="quiz-choice-"] .character-portrait')).toHaveCount(4);

    await page.getByTestId('quiz-question').focus();
    await page.keyboard.press('a');
    await expect(page.locator('#quiz-feedback')).toHaveClass(/is-visible/);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('quiz-progress-label')).toContainText('Question 6 of 20');
  });


  test('a different system voice can be selected, previewed and persisted', async ({ page }) => {
    await page.addInitScript(() => {
      const voices = [
        { name: 'Test Alto', lang: 'en-GB', voiceURI: 'test-alto', localService: true, default: true },
        { name: 'Test Tenor', lang: 'en-US', voiceURI: 'test-tenor', localService: true, default: false },
        { name: 'Test Premium', lang: 'en-GB', voiceURI: 'test-premium', localService: true, default: false },
        { name: 'Voix de test', lang: 'fr-FR', voiceURI: 'test-fr', localService: true, default: false },
      ];
      const synth = window.speechSynthesis;
      synth.getVoices = () => voices;
      synth.speak = (utterance) => {
        setTimeout(() => utterance.onstart?.(), 0);
        setTimeout(() => utterance.onend?.(), 15);
      };
      synth.cancel = () => {};
    });

    await page.goto('/#/');
    await page.locator('#audio-toggle').click();
    await expect(page.getByTestId('voice-dialog')).toBeVisible();
    const select = page.getByTestId('voice-select');
    await expect(select.locator('option[value="test-alto"]')).toHaveCount(1);
    await expect(select.locator('optgroup[label="Natural voices (best)"]')).toHaveCount(1);
    await expect(select.locator('option[value="test-premium"]')).toHaveCount(1);
    await expect(page.getByTestId('studio-sample-cori')).toBeVisible();
    await expect(page.getByTestId('studio-sample-cori')).toHaveAttribute('src', 'audio/samples/en_GB-cori-high.mp3');
    const sample = await page.request.get('/audio/samples/en_GB-cori-high.mp3');
    expect(sample.status()).toBe(200);
    expect(sample.headers()['content-type']).toContain('audio');
    await expect(page.getByTestId('studio-voice-morgan')).toBeChecked();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Morgan is selected');
    await page.getByTestId('studio-voice-joe').check();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Joe is selected. Listen uses Joe');
    const savedStudio = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.settings.v1')).studioVoice);
    expect(savedStudio).toBe('joe');
    const duration = await page.getByTestId('studio-sample-cori').evaluate((audio) => new Promise((resolve) => {
      if (audio.readyState >= 1) return resolve(audio.duration);
      audio.addEventListener('loadedmetadata', () => resolve(audio.duration), { once: true });
      audio.addEventListener('error', () => resolve(-1), { once: true });
      audio.load();
      setTimeout(() => resolve(-1), 5000);
    }));
    expect(duration).toBeGreaterThan(0);
    await select.selectOption('test-tenor');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.settings.v1')));
    expect(stored.voice).toBe('test-tenor');
    expect(stored.studioVoice).toBe('');
    await expect(page.getByTestId('studio-voice-system')).toBeChecked();
    await expect(page.getByTestId('studio-voice-status')).toContainText('System voice selected');

    await page.getByTestId('voice-close').click();
    await expect(page.getByTestId('voice-dialog')).not.toBeVisible();
    await page.reload();
    await page.locator('#audio-toggle').click();
    await expect(select).toHaveValue('test-tenor');
    await expect(page.getByTestId('studio-voice-system')).toBeChecked();
    await expect(page.getByTestId('studio-voice-status')).toContainText('System voice selected');
    await page.getByTestId('studio-voice-joe').check();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Joe is selected. Listen uses Joe');
    await page.getByTestId('voice-preview').click();
  });

  test('a saved studio voice plays generated story and quiz audio', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('#audio-toggle').click();
    await page.getByTestId('studio-voice-joe').check();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Listen uses Joe');
    await page.getByTestId('voice-close').click();

    await page.goto('/#/myth/greek/story/greek-01');
    const storyClip = page.waitForRequest((request) => request.url().includes('/audio/voices/joe/story/greek-01-0.mp3'));
    await page.getByTestId('story-listen').click();
    await storyClip;
    await expect(page.getByTestId('story-listen')).toContainText('Stop narration');
    await expect.poll(() => page.evaluate(() => document.querySelector('audio[aria-hidden="true"]')?.readyState || 0)).toBeGreaterThan(1);

    await page.goto('/#/myth/greek/quiz/greek-01');
    const quizClip = page.waitForRequest((request) => request.url().includes('/audio/voices/joe/quiz/greek-q01.mp3'));
    await page.getByTestId('quiz-listen').click();
    await quizClip;
    await expect.poll(() => page.evaluate(() => document.querySelector('audio[aria-hidden="true"]')?.readyState || 0)).toBeGreaterThan(1);
  });

  test('the XTTS narrator is selectable, disclosed and plays its own clips', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('#audio-toggle').click();
    await expect(page.getByTestId('studio-sample-morgan')).toHaveAttribute('src', 'audio/samples/morgan-xtts.mp3');
    const sample = await page.request.get('/audio/samples/morgan-xtts.mp3');
    expect(sample.status()).toBe(200);
    expect(sample.headers()['content-type']).toContain('audio');
    await expect(page.getByTestId('studio-voice-disclosure')).toContainText('non-commercial');
    await expect(page.getByTestId('studio-voice-morgan')).toBeChecked();

    await page.getByTestId('studio-voice-system').check();
    await page.getByTestId('studio-voice-morgan').check();
    await expect(page.getByTestId('studio-voice-status')).toContainText('Listen uses Morgan');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.settings.v1')).studioVoice)).toBe('morgan');
    await page.getByTestId('voice-close').click();

    await page.goto('/#/myth/greek/story/greek-01');
    const storyClip = page.waitForRequest((request) => request.url().includes('/audio/voices/morgan/story/greek-01-0.mp3'));
    await page.getByTestId('story-listen').click();
    await storyClip;
    await expect.poll(() => page.evaluate(() => document.querySelector('audio[aria-hidden="true"]')?.readyState || 0)).toBeGreaterThan(1);

    await page.reload();
    await page.locator('#audio-toggle').click();
    await expect(page.getByTestId('studio-voice-morgan')).toBeChecked();
  });

  test('the narration button opens its settings and the on/off choice persists', async ({ page }) => {
    await page.goto('/#/');
    const trigger = page.locator('#audio-toggle');
    await trigger.click();
    await expect(page.getByTestId('voice-dialog')).toBeVisible();
    const enabled = page.getByTestId('narration-enabled');
    await expect(enabled).toBeChecked();
    await enabled.uncheck();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mythos.settings.v1')));
    expect(stored.audio).toBe(false);
    await page.getByTestId('voice-close').click();
    await expect(trigger).toHaveClass(/is-off/);

    await page.reload();
    await trigger.click();
    await expect(enabled).not.toBeChecked();
    await enabled.check();
    await page.getByTestId('voice-close').click();
    await expect(trigger).not.toHaveClass(/is-off/);
  });
});
