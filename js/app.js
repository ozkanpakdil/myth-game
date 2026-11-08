/**
 * app.js — router, chrome and the text screens.
 *
 * The hash router keeps the game deployable as a folder of static files.
 * Every screen reads its content from content/ through content.js.
 */
import {
  loadMythologies,
  loadMythology,
  loadAllPlayable,
  iconFor,
  readingMinutes,
  countWords,
  REGION_ORDER,
  SENSITIVITY_LABEL,
} from './content.js?v=20261108-7';
import {
  getState,
  getSettings,
  updateSettings,
  getLastRoute,
  setLastRoute,
  setLastMyth,
  recordStoryRead,
  awardBadges,
  resetProgress,
} from './storage.js?v=20261108-7';
import {
  mythStats,
  overallStats,
  storyState,
  unlockedCharacterIds,
  glossaryUnlockedCount,
  allStoryQuizzesPassed,
  isStoryUnlocked,
} from './progress.js?v=20261108-7';
import { badgeCatalog, evaluateBadges } from './badges.js?v=20261108-7';
import {
  escapeHtml,
  iconImg,
  progressBar,
  percent,
  plural,
  yearLabel,
  rangeLabel,
  regionSlug,
  setDocumentTitle,
  focusPage,
  listenButtonContent,
  toast,
  confirmDialog,
  emptyState,
} from './ui.js?v=20261108-7';
import { renderQuiz } from './quiz.js?v=20261108-7';
import {
  renderChallengeHub,
  renderTimelineChallenge,
  renderMatchChallenge,
  renderCultureChallenge,
} from './challenges.js?v=20261108-7';
import { renderMap } from './map.js?v=20261108-7';
import { storyScene, characterPortrait } from './scene.js?v=20261108-7';
import { sagaScene } from './saga-art.js?v=20261108-7';
import { renderSaga, sagaContinueHref, sagaSummary } from './saga.js?v=20261108-7';
import { narrate, stopNarration, speechSupported, availableVoices, narrationSupported, studioAudioUrl } from './narration.js?v=20261108-7';

const app = document.getElementById('app');
const nav = document.querySelector('.main-nav');
const themeButton = document.getElementById('theme-toggle');
const fontButton = document.getElementById('font-toggle');
const audioButton = document.getElementById('audio-toggle');
const voiceDialog = document.getElementById('voice-dialog');
const voiceSelect = document.getElementById('voice-select');
const voiceNote = document.getElementById('voice-note');
let voiceTrigger = null;
let activeNarrationButton = null;
let renderSequence = 0;

function resetNarrationButton(button) {
  if (!button) return;
  button.dataset.speaking = 'false';
  button.innerHTML = listenButtonContent(button.dataset.narrationLabel || 'Listen');
}

document.addEventListener('mythos:narration-stop', () => {
  if (!activeNarrationButton) return;
  resetNarrationButton(activeNarrationButton);
  activeNarrationButton = null;
});

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

function applySettings(settings = getSettings()) {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.font = settings.fontScale;
  const themeColor = document.getElementById('theme-color');
  if (themeColor) themeColor.setAttribute('content', settings.theme === 'light' ? '#f3ede0' : '#0e1310');
  if (themeButton) {
    const dark = settings.theme === 'dark';
    themeButton.textContent = dark ? '☾' : '☀';
    themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeButton.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (fontButton) {
    const labels = { md: 'Normal text size', lg: 'Large text size', xl: 'Extra-large text size' };
    fontButton.textContent = 'Aa';
    fontButton.setAttribute('aria-label', `${labels[settings.fontScale]} — change text size`);
    fontButton.setAttribute('title', `${labels[settings.fontScale]} — change text size`);
  }
  if (audioButton) {
    const on = settings.audio !== false;
    audioButton.classList.toggle('is-off', !on);
    audioButton.setAttribute('aria-label', `Open narration settings — narration ${on ? 'on' : 'off'}`);
    audioButton.setAttribute('title', on ? 'Narration on — choose a voice' : 'Narration off — choose a voice');
  }
  const narrationToggle = document.getElementById('narration-enabled');
  if (narrationToggle) narrationToggle.checked = settings.audio !== false;
}

const STUDIO_LABELS = { cori: 'Cori', joe: 'Joe', morgan: 'Morgan' };

function updateStudioVoiceUI() {
  const saved = getSettings().studioVoice || '';
  const status = document.getElementById('studio-voice-status');
  if (!status) return;
  status.textContent = saved
    ? `${STUDIO_LABELS[saved] || saved} is selected. Listen uses ${STUDIO_LABELS[saved] || saved}'s recorded narration for stories and the Norse saga. The new story paths use your browser voice so they can grow without new recordings.`
    : 'System voice selected. Listen uses your installed voice. The new story paths always use your browser voice.';
}

function chooseStudioVoice(input) {
  if (!input?.checked) return;
  stopNarration();
  updateSettings({ studioVoice: input.value, voiceChosen: true });
  updateStudioVoiceUI();
  toast(input.value ? `${STUDIO_LABELS[input.value] || input.value} selected. Press Listen to hear it.` : 'System voice selected. Press Listen to hear it.', { duration: 2200 });
}

function populateVoiceSelect() {
  if (!voiceSelect) return;
  const voices = availableVoices();
  const saved = getSettings().voice;
  const valueFor = (voice) => voice.voiceURI || voice.name;
  const isNatural = (voice) => /premium|enhanced|natural|neural|siri/i.test(voice.name);
  const option = (voice, star = false) => `<option value="${escapeHtml(valueFor(voice))}">${star ? '★ ' : ''}${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`;
  const natural = voices.filter(isNatural);
  const english = voices.filter((voice) => !isNatural(voice) && voice.lang.toLowerCase().startsWith('en'));
  const other = voices.filter((voice) => !isNatural(voice) && !voice.lang.toLowerCase().startsWith('en'));
  const groups = [];
  if (natural.length) groups.push(`<optgroup label="Natural voices (best)">${natural.map((voice) => option(voice, true)).join('')}</optgroup>`);
  if (english.length) groups.push(`<optgroup label="English">${english.map((voice) => option(voice)).join('')}</optgroup>`);
  if (other.length) groups.push(`<optgroup label="Other languages">${other.map((voice) => option(voice)).join('')}</optgroup>`);
  voiceSelect.innerHTML = `<option value="">System default</option>${groups.join('')}`;

  const available = voices.some((voice) => valueFor(voice) === saved);
  voiceSelect.value = available ? saved : '';

  if (!voices.length) {
    voiceNote.textContent = 'No system voices are listed yet. The browser may still use its default voice.';
  } else if (saved && !available) {
    voiceNote.textContent = `Your previous voice is not available anymore. ${voices.length} other ${voices.length === 1 ? 'voice is' : 'voices are'} available.`;
  } else if (!natural.length) {
    voiceNote.textContent = `${voices.length} system ${voices.length === 1 ? 'voice' : 'voices'} found. Install a Premium or Enhanced voice for a more natural sound.`;
  } else {
    voiceNote.textContent = `${voices.length} system ${voices.length === 1 ? 'voice' : 'voices'} found; ${natural.length} marked Natural.`;
  }
}

function previewVoice() {
  if (!speechSupported()) {
    toast('Narration is not available in this browser.', { tone: 'warn' });
    return;
  }
  if (!getSettings().audio) {
    updateSettings({ audio: true });
    applySettings();
  }
  const started = narrate('The story begins before the age of heroes.', {
    onError: () => toast('That voice could not be played. Try another one.', { tone: 'warn' }),
  });
  if (!started) toast('Narration could not start.', { tone: 'warn' });
}

function openVoiceDialog() {
  if (!voiceDialog || voiceDialog.open) return;
  stopNarration();
  voiceTrigger = document.activeElement;
  populateVoiceSelect();
  const narrationToggle = document.getElementById('narration-enabled');
  if (narrationToggle) narrationToggle.checked = getSettings().audio !== false;
  const savedStudio = getSettings().studioVoice || '';
  document.querySelectorAll('input[name="studio-voice"]').forEach((input) => {
    input.checked = input.value === savedStudio;
  });
  updateStudioVoiceUI();
  voiceDialog.showModal();
  const selectedStudio = document.querySelector('input[name="studio-voice"]:checked');
  (selectedStudio || voiceSelect)?.focus();
}

function narrateWithButton(text, button, idleLabel, audioUrl = '') {
  if (button) button.dataset.narrationLabel = idleLabel;
  if (!narrationSupported(audioUrl)) {
    toast('Narration is not available in this browser. You can still read the text.', { tone: 'warn' });
    return;
  }
  if (button?.dataset.speaking === 'true') {
    stopNarration();
    resetNarrationButton(button);
    if (activeNarrationButton === button) activeNarrationButton = null;
    return;
  }
  if (activeNarrationButton && activeNarrationButton !== button) resetNarrationButton(activeNarrationButton);
  if (!getSettings().audio) {
    updateSettings({ audio: true });
    applySettings();
    toast(audioUrl ? 'Narration on. Using the selected studio voice.' : 'Narration on. Using your browser’s local voice.', { duration: 2200 });
  }
  const started = narrate(text, {
    audioUrl,
    onEnd() {
      resetNarrationButton(button);
      if (activeNarrationButton === button) activeNarrationButton = null;
    },
    onError() {
      resetNarrationButton(button);
      if (activeNarrationButton === button) activeNarrationButton = null;
    },
  });
  if (!started) {
    toast('Narration could not start.', { tone: 'warn' });
    return;
  }
  if (button) {
    button.dataset.speaking = 'true';
    button.innerHTML = listenButtonContent('Stop narration', true);
    activeNarrationButton = button;
  }
}

function initChrome() {
  applySettings();
  // While no theme has been chosen explicitly, mirror OS light/dark changes live.
  const systemScheme = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;
  systemScheme?.addEventListener?.('change', () => {
    if (getSettings().themeMode === 'system') applySettings();
  });
  themeButton?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    updateSettings({ theme: next });
    applySettings();
  });
  audioButton?.addEventListener('click', openVoiceDialog);
  document.getElementById('narration-enabled')?.addEventListener('change', (event) => {
    const on = event.currentTarget.checked;
    updateSettings({ audio: on });
    if (!on) stopNarration();
    applySettings();
  });
  voiceSelect?.addEventListener('change', () => {
    stopNarration();
    updateSettings({ voice: voiceSelect.value, studioVoice: '', voiceChosen: true });
    const systemRadio = document.querySelector('input[name="studio-voice"][value=""]');
    if (systemRadio) systemRadio.checked = true;
    updateStudioVoiceUI();
    previewVoice();
  });
  document.querySelectorAll('input[name="studio-voice"]').forEach((input) => {
    input.addEventListener('change', () => chooseStudioVoice(input));
  });
  voiceDialog?.querySelector('[data-testid="voice-preview"]')?.addEventListener('click', previewVoice);
  voiceDialog?.addEventListener('close', () => {
    stopNarration();
    updateSettings({ voiceChosen: true });
    voiceTrigger?.focus({ preventScroll: true });
  });
  document.addEventListener('mythos:open-voice', () => openVoiceDialog());
  if (speechSupported()) {
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      if (voiceDialog?.open) populateVoiceSelect();
    });
  }
  fontButton?.addEventListener('click', () => {
    const order = ['md', 'lg', 'xl'];
    const current = getSettings().fontScale;
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateSettings({ fontScale: next });
    applySettings();
    toast(next === 'md' ? 'Normal text size' : next === 'lg' ? 'Large text size' : 'Extra-large text size', { duration: 1800 });
  });
  document.addEventListener('mythos:audio-change', () => applySettings());
  document.querySelector('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    const main = document.getElementById('main');
    if (!main) return;
    main.focus();
    main.scrollIntoView({ block: 'start' });
  });
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

function markNav(key) {
  if (!nav) return;
  nav.querySelectorAll('a[data-nav]').forEach((link) => {
    if (link.dataset.nav === key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function navKeyFor(route) {
  if (['myths', 'myth', 'story', 'quiz'].includes(route.name)) return 'myths';
  if (route.name === 'codex') return 'codex';
  if (route.name === 'timeline') return 'timeline';
  if (route.name === 'map') return 'map';
  if (route.name === 'challenges') return 'challenges';
  if (route.name === 'results') return 'results';
  if (route.name === 'saga') return 'saga';
  return '';
}

function setTitle(title) {
  setDocumentTitle(title);
}

function breadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${items
    .map((item, index) => {
      const separator = index ? '<span aria-hidden="true">/</span>' : '';
      if (item.href) return `${separator}<a href="${item.href}">${escapeHtml(item.label)}</a>`;
      return `${separator}<span aria-current="page">${escapeHtml(item.label)}</span>`;
    })
    .join('')}</nav>`;
}

function awardProgress(playable, codexUnlocked = null) {
  const newIds = awardBadges(evaluateBadges({ playable, codexUnlocked }));
  if (!newIds.length) return [];
  const catalog = badgeCatalog(playable);
  const names = newIds.map((id) => catalog.find((badge) => badge.id === id)?.name || id);
  toast(`Badge unlocked: ${names.slice(0, 2).join(' · ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`, { tone: 'gold' });
  return newIds;
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function parseRoute() {
  const raw = (location.hash || '#/').replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart || '');
  if (!parts.length) return { name: 'home', parts, query };
  if (parts[0] === 'myths') return { name: 'myths', parts, query };
  if (parts[0] === 'map') return { name: 'map', parts, query };
  if (parts[0] === 'timeline') return { name: 'timeline', parts, query };
  if (parts[0] === 'codex') return { name: 'codex', parts, query, mythId: parts[1] || null };
  if (parts[0] === 'results') return { name: 'results', parts, query };
  if (parts[0] === 'about') return { name: 'about', parts, query };
  if (parts[0] === 'challenges') {
    return { name: 'challenges', sub: parts[1] || '', parts, query };
  }
  if (parts[0] === 'saga') {
    return { name: 'saga', sagaId: parts[1] || null, nodeId: parts[2] || null, parts, query };
  }
  if (parts[0] === 'myth' && parts[1]) {
    if (parts[2] === 'story' && parts[3]) return { name: 'story', mythId: parts[1], storyId: parts[3], parts, query };
    if (parts[2] === 'quiz' && parts[3]) return { name: 'quiz', mythId: parts[1], storyId: parts[3], parts, query };
    return { name: 'myth', mythId: parts[1], parts, query };
  }
  return { name: 'notfound', parts, query };
}

async function renderRoute() {
  const token = ++renderSequence;
  const route = parseRoute();
  stopNarration();
  app.onkeydown = null;
  window.scrollTo(0, 0);
  app.innerHTML = `<div class="page loading-page" role="status"><p class="loading-page__mark" aria-hidden="true">✦</p><p>Opening the archive…</p></div>`;
  try {
    await dispatch(route);
    if (token !== renderSequence) return;
    markNav(navKeyFor(route));
    if (route.name !== 'home' && route.name !== 'notfound') setLastRoute(location.hash || '#/');
    if (route.name !== 'quiz') focusPage();
  } catch (error) {
    if (token !== renderSequence) return;
    console.error(error);
    app.innerHTML = `<div class="page page--narrow" data-testid="error-page">
      <div class="panel panel--center">
        <p class="eyebrow">Something went wrong</p>
        <h1 id="page-title">The archive could not be opened.</h1>
        <p class="lede">${escapeHtml(error.message || 'Unknown error')}</p>
        <p class="muted">Check that the content files are present and that the site is being served over HTTP rather than opened directly from disk.</p>
        <a class="button button--primary" href="#/">Return home</a>
      </div>
    </div>`;
    focusPage();
  }
}

async function dispatch(route) {
  switch (route.name) {
    case 'home':
      await renderHome();
      break;
    case 'myths':
      await renderMyths();
      break;
    case 'map':
      setTitle('Map');
      await renderMap(app);
      break;
    case 'timeline':
      await renderTimeline();
      break;
    case 'codex':
      await renderCodex(route.mythId);
      break;
    case 'results':
      await renderResults();
      break;
    case 'about':
      await renderAbout();
      break;
    case 'myth':
      await renderMyth(route.mythId);
      break;
    case 'story':
      await renderStory(route.mythId, route.storyId);
      break;
    case 'quiz':
      setTitle('Quiz');
      await renderQuiz(app, { mythId: route.mythId, storyId: route.storyId });
      break;
    case 'saga':
      await renderSaga(app, route);
      break;
    case 'challenges':
      setTitle('Challenges');
      if (route.sub === 'timeline') await renderTimelineChallenge(app);
      else if (route.sub === 'match') await renderMatchChallenge(app);
      else if (route.sub === 'culture') await renderCultureChallenge(app);
      else await renderChallengeHub(app);
      break;
    default:
      renderNotFound();
  }
}

function renderNotFound() {
  setTitle('Not found');
  app.innerHTML = `<div class="page page--narrow" data-testid="notfound-page">
    <div class="panel panel--center">
      <p class="eyebrow">404</p>
      <h1 id="page-title">This page is not in the archive.</h1>
      <p class="lede">The link may be old, or the story may not be part of this edition.</p>
      <a class="button button--primary" href="#/">Return home</a>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

async function renderHome() {
  setTitle('');
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((item) => item.mvp);
  const state = getState();
  const readCount = Object.values(state.storiesRead).reduce((sum, stories) => sum + stories.length, 0);
  const passedCount = Object.values(state.quizBest).filter((record) => record.passed).length;
  const finished = playable.filter((meta) => [1, 2, 3, 4, 5, 6].every((n) => state.quizBest[`${meta.id}:${meta.id}-0${n}`]?.passed)).length;
  const journeyPercent = Math.round(((readCount + passedCount) / (playable.length * 12)) * 100);
  const started = readCount > 0 || passedCount > 0;
  const lastRoute = getLastRoute();
  const lastMyth = playable.find((item) => item.id === state.lastMyth);
  const continueHref = started && lastRoute && lastRoute !== '#/' ? lastRoute : '#/myths';
  const saga = sagaSummary();
  const sagaHref = saga ? sagaContinueHref() : '#/saga';

  app.innerHTML = `<div class="page page--home" data-testid="home-page">
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow"><span class="eyebrow__rule" aria-hidden="true"></span> A world mythology game</p>
        <h1 id="page-title">Stories that<br><em>shaped the world.</em></h1>
        <p class="lede">Step into a choose-your-path story from world myth, or read short retellings from ${playable.length} traditions and build a codex of figures and terms. The myths are the same. The road you take is yours.</p>
        <div class="hero__actions">
          <a class="button button--primary" href="${sagaHref}" data-testid="home-saga-primary">${saga ? `Continue as ${escapeHtml(saga.name)}` : 'Choose a story'} <span aria-hidden="true">→</span></a>
          <a class="button button--ghost" href="#/myths">Explore the archive</a>
        </div>
        <p class="small muted hero__aside-link"><a class="text-link" href="#/map">Open the world map</a> · <a class="text-link" href="#/saga">Browse story paths</a></p>
        <dl class="hero__stats">
          <div><dt>Traditions</dt><dd>${playable.length}</dd></div>
          <div><dt>Stories</dt><dd>${playable.length * 6}</dd></div>
          <div><dt>Questions</dt><dd>${playable.length * 20}</dd></div>
          <div><dt>Codex cards</dt><dd>${playable.length * 20}</dd></div>
        </dl>
      </div>
      <aside class="hero-card" aria-label="Your progress">
        <div class="hero-card__top">
          <div class="ring" style="--value:${journeyPercent}">
            <span>${journeyPercent}<small>%</small></span>
          </div>
          <div>
            <p class="eyebrow">Your journey</p>
            <h2>${started ? 'Pick up where you left off.' : 'Begin with one story.'}</h2>
          </div>
        </div>
        <p class="muted">${started
          ? `${plural(readCount, 'story', 'stories')} read · ${plural(passedCount, 'quiz', 'quizzes')} passed · ${finished}/${playable.length} traditions finished.`
          : 'Progress is saved in this browser. There is no account and no timer — read at your own pace.'}</p>
        ${progressBar(readCount + passedCount, playable.length * 12, 'Overall journey progress')}
        <dl class="mini-stats">
          <div><dt>Badges</dt><dd>${state.badges.length}</dd></div>
          <div><dt>Current</dt><dd>${lastMyth ? escapeHtml(lastMyth.name) : '—'}</dd></div>
        </dl>
        <a class="button button--primary button--wide" href="${continueHref}" data-testid="continue-button">${started ? 'Continue' : 'Choose a tradition'}</a>
        <p class="small muted"><a class="text-link text-link--standalone" href="#/results">See detailed progress</a></p>
      </aside>
    </section>

    <section class="saga-home" aria-labelledby="saga-home-title" data-testid="home-saga">
      <figure class="pixel-frame saga-home__art" data-testid="home-saga-art">
        ${sagaScene('suncave')}
        <figcaption class="story-art__caption">
          <strong>Stories for younger readers</strong>
        </figcaption>
      </figure>
      <div class="saga-home__copy">
        <p class="eyebrow">Choose-your-path stories</p>
        <h2 id="saga-home-title">Stories you can step inside.</h2>
        <p class="lede">Six short adventures from Greek, Japanese, Maya, Hindu, Egyptian and Norse myth. Read one scene at a time, make a choice, and find out where your story goes. Written for younger readers, with a myth note at every stop.</p>
        <ul class="saga-home__facts">
          <li><strong>6</strong><span>story paths from world myth</span></li>
          <li><strong>8+</strong><span>starting age, with older sagas too</span></li>
          <li><strong>4</strong><span>endings in every new story</span></li>
        </ul>
        <div class="hero__actions">
          <a class="button button--primary" href="${sagaHref}" data-testid="home-saga-continue">${saga ? `Continue as ${escapeHtml(saga.name)}` : 'Choose a story'} <span aria-hidden="true">→</span></a>
          <a class="button button--ghost" href="#/saga">Browse all story paths</a>
        </div>
        ${saga ? `<p class="small muted">${saga.endings} ending${saga.endings === 1 ? '' : 's'} found in your saved stories · your place is saved in this browser.</p>` : '<p class="small muted">Use your own name or a suggested one. Your choices are saved in this browser.</p>'}
      </div>
    </section>

    <section class="section" aria-labelledby="traditions-title">
      <div class="section-head">
        <div>
          <p class="eyebrow">The traditions</p>
          <h2 id="traditions-title">Choose a tradition</h2>
        </div>
        <a class="text-link" href="#/myths">All traditions and filters</a>
      </div>
      <div class="feature-grid">
        ${playable
          .map(
            (meta) => `<a class="feature-card" href="#/myth/${meta.id}" data-testid="featured-${meta.id}">
              <span class="feature-card__icon">${iconImg(meta.id)}</span>
              <h3>${escapeHtml(meta.name)}</h3>
              <p class="muted small">${escapeHtml(meta.period_text)}</p>
              <p>${escapeHtml(meta.summary)}</p>
              <span class="feature-card__cta">Enter <span aria-hidden="true">→</span></span>
            </a>`,
          )
          .join('')}
      </div>
    </section>

    <section class="section how" aria-labelledby="how-title">
      <div class="section-head">
        <div>
          <p class="eyebrow">How it works</p>
          <h2 id="how-title">Read. Answer. Unlock.</h2>
        </div>
      </div>
      <ol class="steps">
        <li class="step"><span class="step__num">01</span><h3>Read a story</h3><p>Each tradition has six short retellings. Read one paragraph at a time, at your own pace.</p></li>
        <li class="step"><span class="step__num">02</span><h3>Pass the quiz</h3><p>Four or five questions, instant feedback and an explanation for every answer. Score 70% to continue.</p></li>
        <li class="step"><span class="step__num">03</span><h3>Unlock the next</h3><p>A passed quiz opens the next story and adds figures and terms to your codex. Finish all six to face the final challenge.</p></li>
      </ol>
    </section>

    <section class="panel panel--soft home-note">
      <h2>An archive, not an authority</h2>
      <p>Every tradition here has many versions. These retellings are short introductions for learners, not definitive texts. Dates are approximate, and the content is marked <strong>awaiting human review</strong> until a named reviewer checks it.</p>
      <p class="small muted">Living traditions — including Hindu, Shinto, Maya and Chinese traditions — are presented as traditions, with respect. <a class="text-link" href="#/about">Read the content notes</a>.</p>
    </section>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Traditions list                                                     */
/* ------------------------------------------------------------------ */

function progressForMyth(mythId) {
  const state = getState();
  const read = state.storiesRead[mythId]?.length || 0;
  const passed = [1, 2, 3, 4, 5, 6].filter(
    (n) => state.quizBest[`${mythId}:${mythId}-0${n}`]?.passed,
  ).length;
  return { read, passed, percent: Math.round(((read + passed) / 12) * 100) };
}

function mythCard(meta) {
  const progress = progressForMyth(meta.id);
  const status = progress.percent === 100 ? 'Complete' : progress.read || progress.passed ? 'In progress' : 'Not started';
  return `<article class="myth-card" data-testid="myth-card-${meta.id}">
    <a class="myth-card__link" href="#/myth/${meta.id}">
      <div class="myth-card__head">
        <span class="myth-card__icon">${iconImg(meta.id)}</span>
        <div>
          <h3>${escapeHtml(meta.name)}</h3>
          <p class="muted small">${escapeHtml(meta.period_text)}</p>
        </div>
        <span class="pill pill--${meta.sensitivity === 'low' ? 'quiet' : 'gold'}">${escapeHtml(SENSITIVITY_LABEL[meta.sensitivity])}</span>
      </div>
      <p>${escapeHtml(meta.summary)}</p>
      <div class="myth-card__progress">
        ${progressBar(progress.read + progress.passed, 12, `${meta.name} progress`, { compact: true })}
        <span class="muted small">${progress.read}/6 read · ${progress.passed}/6 quizzes · ${status}</span>
      </div>
      <span class="myth-card__cta">Open tradition <span aria-hidden="true">→</span></span>
    </a>
  </article>`;
}

async function renderMyths() {
  setTitle('Traditions');
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((item) => item.mvp);
  let query = '';
  let region = 'all';

  app.innerHTML = `<div class="page" data-testid="myths-page">
    <header class="page-head page-head--split">
      <div>
        <p class="eyebrow">The archive</p>
        <h1 id="page-title">Traditions</h1>
        <p class="lede">${playable.length} playable traditions from the ${mythologies.length} catalogued in the timeline. Each has six stories, a twenty-question final challenge, ten figures and ten glossary terms.</p>
      </div>
      <div class="list-tools">
        <label class="search">
          <span class="visually-hidden">Search traditions</span>
          <span class="search__icon" aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search traditions…" autocomplete="off" data-testid="myth-search">
        </label>
        <div class="region-filters" role="group" aria-label="Filter by region">
          <button class="chip is-active" type="button" data-region-filter="all" aria-pressed="true">All</button>
          ${REGION_ORDER.map((name) => {
            const count = playable.filter((item) => item.region === name).length;
            if (!count) return '';
            return `<button class="chip" type="button" data-region-filter="${escapeHtml(name)}" aria-pressed="false">${escapeHtml(name)} <span>${count}</span></button>`;
          }).join('')}
        </div>
      </div>
    </header>
    <div id="myth-results" aria-live="polite"></div>
    <p class="muted small list-footnote">Only traditions with complete content are shown here. The <a class="text-link" href="#/timeline">timeline</a> lists all ${mythologies.length} catalogued traditions, including those planned for later editions.</p>
  </div>`;

  const results = app.querySelector('#myth-results');
  const search = app.querySelector('[data-testid="myth-search"]');

  function filtered() {
    const needle = query.trim().toLowerCase();
    return playable.filter((meta) => {
      if (region !== 'all' && meta.region !== region) return false;
      if (!needle) return true;
      return [meta.name, meta.summary, meta.region, meta.period_text].join(' ').toLowerCase().includes(needle);
    });
  }

  function renderResults() {
    const items = filtered();
    if (!items.length) {
      results.innerHTML = emptyState('No traditions match.', 'Try a different search or region.', '<button class="button button--ghost" type="button" data-clear-filters>Clear filters</button>');
      results.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
        query = '';
        region = 'all';
        search.value = '';
        app.querySelectorAll('[data-region-filter]').forEach((button) => {
          const active = button.dataset.regionFilter === 'all';
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', String(active));
        });
        renderResults();
      });
      return;
    }
    const groups = REGION_ORDER.filter((name) => items.some((meta) => meta.region === name));
    results.innerHTML = `<p class="result-count" data-testid="myth-count">${items.length} ${items.length === 1 ? 'tradition' : 'traditions'}</p>` +
      groups
        .map(
          (name) => `<section class="region-group" aria-labelledby="region-${regionSlug(name)}">
            <div class="region-group__head"><h2 id="region-${regionSlug(name)}">${escapeHtml(name)}</h2><span class="muted small">${items.filter((meta) => meta.region === name).length}</span></div>
            <div class="myth-grid">${items.filter((meta) => meta.region === name).map(mythCard).join('')}</div>
          </section>`,
        )
        .join('');
  }

  search.addEventListener('input', () => {
    query = search.value;
    renderResults();
  });
  app.querySelectorAll('[data-region-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      region = button.dataset.regionFilter;
      app.querySelectorAll('[data-region-filter]').forEach((other) => {
        const active = other === button;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
      renderResults();
    });
  });
  renderResults();
}

/* ------------------------------------------------------------------ */
/* Mythology page                                                      */
/* ------------------------------------------------------------------ */

async function renderMyth(mythId) {
  const mythologies = await loadMythologies();
  const meta = mythologies.find((item) => item.id === mythId);
  if (!meta || !meta.mvp) {
    renderNotFound();
    return;
  }
  const data = await loadMythology(mythId);
  setLastMyth(mythId);
  setTitle(meta.name);
  const stats = mythStats(mythId, data.stories, data.characters, data.glossary);
  const allPassed = allStoryQuizzesPassed(mythId, data.stories);
  const finalRecord = getState().finalQuiz[mythId];
  const sensitivityNote =
    meta.sensitivity === 'high'
      ? 'This is a living sacred tradition. The retellings are respectful summaries for learners, not authoritative versions, and they do not represent every community.'
      : meta.sensitivity === 'medium'
        ? 'This is a living tradition. The retellings are respectful summaries for learners, and versions vary between communities.'
        : '';

  app.innerHTML = `<div class="page" data-testid="myth-page" data-myth="${meta.id}">
    ${breadcrumb([{ label: 'Traditions', href: '#/myths' }, { label: meta.name }])}
    <header class="myth-hero">
      <div class="myth-hero__icon">${iconImg(meta.id, { className: 'sigil sigil--hero' })}</div>
      <div class="myth-hero__copy">
        <div class="myth-hero__tags">
          <span class="pill pill--quiet">${escapeHtml(meta.region)}</span>
          <span class="pill pill--${meta.sensitivity === 'low' ? 'quiet' : 'gold'}">${escapeHtml(SENSITIVITY_LABEL[meta.sensitivity])}</span>
          <span class="pill pill--quiet">${stats.quizzesPassed}/6 quizzes passed</span>
        </div>
        <h1 id="page-title">${escapeHtml(meta.name)}</h1>
        <p class="myth-hero__period">${escapeHtml(meta.period_text)}</p>
        <p class="lede">${escapeHtml(data.info.intro)}</p>
        <p class="muted small"><strong>Earliest records:</strong> ${escapeHtml(meta.earliest_record)}</p>
      </div>
      <aside class="myth-hero__side">
        <div class="mini-panel">
          <p class="eyebrow">Your progress</p>
          <div class="mini-panel__row"><span>Stories read</span><strong>${stats.readCount}/${stats.storyCount}</strong></div>
          <div class="mini-panel__row"><span>Quizzes passed</span><strong>${stats.quizzesPassed}/6</strong></div>
          <div class="mini-panel__row"><span>Codex</span><strong>${stats.codexUnlocked}/${stats.codexTotal}</strong></div>
          ${progressBar(stats.readCount + stats.quizzesPassed, 12, 'Tradition progress')}
          <a class="button button--ghost button--wide" href="#/codex/${meta.id}">Open codex</a>
        </div>
      </aside>
    </header>

    ${sensitivityNote ? `<aside class="respect-note"><span class="respect-note__mark" aria-hidden="true">✦</span><p><strong>Respect note.</strong> ${escapeHtml(sensitivityNote)}</p></aside>` : ''}

    <div class="myth-layout">
      <section class="myth-main" aria-labelledby="stories-title">
        <div class="section-head">
          <div><p class="eyebrow">Read</p><h2 id="stories-title">The six stories</h2></div>
          <span class="muted small">Pass each quiz to unlock the next</span>
        </div>
        <ol class="story-list">
          ${data.stories
            .map((story, index) => {
              const state = storyState(mythId, data.stories, index);
              const record = state.record;
              const previous = data.stories[index - 1];
              return `<li>${state.unlocked
                ? `<a class="story-row ${state.passed ? 'is-passed' : ''}" href="#/myth/${meta.id}/story/${story.id}" data-testid="story-card-${story.id}">
                    <span class="story-row__num">${String(index + 1).padStart(2, '0')}</span>
                    <span class="story-row__body">
                      <span class="story-row__title">${escapeHtml(story.title)}</span>
                      <span class="story-row__meta">${escapeHtml(story.themes.slice(0, 3).join(' · '))} · ${readingMinutes(story.paragraphs.join(' '))} min read</span>
                    </span>
                    <span class="story-row__status">
                      ${state.read ? '<span class="pill pill--quiet">Read</span>' : ''}
                      ${state.passed ? `<span class="pill pill--gold">Quiz ${record.bestScore}/${record.bestTotal}</span>` : '<span class="pill pill--quiet">Quiz pending</span>'}
                      <span class="story-row__arrow" aria-hidden="true">→</span>
                    </span>
                  </a>`
                : `<div class="story-row is-locked" data-testid="story-card-${story.id}">
                    <span class="story-row__num">${String(index + 1).padStart(2, '0')}</span>
                    <span class="story-row__body">
                      <span class="story-row__title">${escapeHtml(story.title)}</span>
                      <span class="story-row__meta">Pass the quiz for “${escapeHtml(previous?.title || 'the previous story')}” to unlock.</span>
                    </span>
                    <span class="story-row__status"><span class="lock" aria-label="Locked">◍</span></span>
                  </div>`}</li>`;
            })
            .join('')}
        </ol>

        <section class="final-card ${allPassed ? '' : 'is-locked'}" data-testid="final-quiz-card" aria-labelledby="final-title">
          <div>
            <p class="eyebrow">Final challenge</p>
            <h2 id="final-title">The twenty-question challenge</h2>
            <p>${allPassed
              ? finalRecord?.passed
                ? `You have passed this challenge. Best score: ${finalRecord.bestScore}/${finalRecord.bestTotal}.`
                : 'All six story quizzes are passed. The final challenge is open — 20 questions across the whole tradition.'
              : `Pass all six story quizzes to open this challenge. ${stats.quizzesPassed}/6 passed.`}</p>
          </div>
          ${allPassed
            ? `<a class="button button--primary" href="#/myth/${meta.id}/quiz/final" data-testid="start-final-quiz">${finalRecord?.passed ? 'Retake final challenge' : 'Start final challenge'}</a>`
            : `<span class="lock-note"><span class="lock" aria-hidden="true">◍</span> Locked</span>`}
        </section>
      </section>

      <aside class="myth-aside">
        <section class="panel">
          <p class="eyebrow">Timeline facts</p>
          <h2>At a glance</h2>
          <ol class="fact-list">
            ${data.info.timeline.map((fact) => `<li><span class="fact-list__year">${escapeHtml(fact.year_text)}</span><strong>${escapeHtml(fact.label)}</strong><span>${escapeHtml(fact.note)}</span></li>`).join('')}
          </ol>
        </section>
        <section class="panel">
          <details>
            <summary>Sources and further reading</summary>
            <ul class="source-list">
              ${data.info.sources.map((source) => `<li><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.note)}</span></li>`).join('')}
            </ul>
          </details>
          <p class="small muted review-note">Content is marked <strong>awaiting human review</strong>. Dates and answer keys may contain errors.</p>
        </section>
      </aside>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Story reader                                                        */
/* ------------------------------------------------------------------ */

async function renderStory(mythId, storyId) {
  const mythologies = await loadMythologies();
  const meta = mythologies.find((item) => item.id === mythId);
  if (!meta || !meta.mvp) {
    renderNotFound();
    return;
  }
  const data = await loadMythology(mythId);
  const index = data.stories.findIndex((story) => story.id === storyId);
  if (index < 0) {
    renderNotFound();
    return;
  }
  const story = data.stories[index];
  if (!isStoryUnlocked(mythId, data.stories, index)) {
    setTitle('Story locked');
    app.innerHTML = `<div class="page page--narrow" data-testid="story-locked">
      ${breadcrumb([{ label: 'Traditions', href: '#/myths' }, { label: meta.name, href: `#/myth/${meta.id}` }, { label: 'Locked' }])}
      <div class="panel panel--center">
        <p class="eyebrow">Not yet</p>
        <h1 id="page-title">Read the previous story first.</h1>
        <p class="lede">This story opens when you pass the quiz for “${escapeHtml(data.stories[index - 1]?.title || 'the previous story')}”.</p>
        <a class="button button--primary" href="#/myth/${meta.id}">Back to ${escapeHtml(meta.name)}</a>
      </div>
    </div>`;
    return;
  }

  setTitle(story.title);
  setLastMyth(mythId);
  let paragraph = 0;

  function draw() {
    const total = story.paragraphs.length;
    const isLast = paragraph === total - 1;
    const art = storyScene(meta, story, paragraph);
    stopNarration();
    app.innerHTML = `<div class="page page--reader" data-testid="story-page" data-story="${story.id}">
      ${breadcrumb([{ label: 'Traditions', href: '#/myths' }, { label: meta.name, href: `#/myth/${meta.id}` }, { label: `Story ${index + 1}` }])}
      <article class="story-reader">
        <div class="story-layout">
          <aside class="story-art" data-testid="story-scene" data-motif="${art.motif}" data-scene-step="${paragraph + 1}">
            <figure class="pixel-frame pixel-frame--story">
              ${art.svg}
              <figcaption class="story-art__caption">
                <strong>${escapeHtml(art.caption)}</strong>
              </figcaption>
            </figure>
            <div class="story-art__actions">
              <button class="button button--ghost button--small" type="button" data-testid="story-listen">${listenButtonContent('Listen to paragraph')}</button>
              <span class="story-art__hint">Scene ${paragraph + 1} of ${total}</span>
            </div>
          </aside>
          <div class="story-copy">
            <header class="story-reader__head">
              <div class="story-reader__kicker">
                ${iconImg(meta.id, { className: 'sigil sigil--story' })}
                <p class="eyebrow">Story ${index + 1} of ${data.stories.length} · ${escapeHtml(meta.name)}</p>
              </div>
              <h1 id="page-title">${escapeHtml(story.title)}</h1>
              <p class="story-reader__source">Adapted from ${escapeHtml(story.source_ref)}</p>
              <div class="story-reader__tags">
                ${story.themes.map((theme) => `<span class="pill pill--quiet">${escapeHtml(theme)}</span>`).join('')}
                <span class="muted small">${readingMinutes(story.paragraphs.join(' '))} min read</span>
              </div>
            </header>
            <div class="reader-progress">
              <div class="dots" aria-hidden="true">
                ${story.paragraphs.map((_, i) => `<span class="dot ${i === paragraph ? 'is-current' : i < paragraph ? 'is-done' : ''}"></span>`).join('')}
              </div>
              <span class="muted small" data-testid="story-progress">Paragraph ${paragraph + 1} of ${total}</span>
              ${progressBar(paragraph + 1, total, 'Story progress', { compact: true })}
            </div>
            <div class="story-text" data-testid="story-paragraph" tabindex="-1">
              <p>${escapeHtml(story.paragraphs[paragraph])}</p>
            </div>
            ${isLast
              ? `<div class="story-end">
                  <p class="story-end__note">You have reached the end of this retelling. The quiz unlocks the next story.</p>
                  <div class="story-end__actions">
                    <button class="button button--ghost" type="button" data-testid="story-reread">Read again</button>
                    <button class="button button--primary" type="button" data-testid="story-finish">Finish &amp; take the quiz <span aria-hidden="true">→</span></button>
                  </div>
                </div>`
              : ''}
            <div class="reader-controls">
              <button class="button button--ghost" type="button" data-testid="story-back" ${paragraph === 0 ? 'data-back-to-start="true"' : ''}>${paragraph === 0 ? 'Back to tradition' : '← Previous'}</button>
              ${isLast
                ? '<span class="muted small">End of story</span>'
                : '<button class="button button--primary" type="button" data-testid="story-next">Next paragraph →</button>'}
            </div>
            <footer class="story-reader__foot">
              <div class="character-chips">
                <span class="muted small">Figures in this story:</span>
                ${(story.characters || [])
                  .map((id) => {
                    const character = data.characters.find((item) => item.id === id);
                    return character ? `<a class="chip chip--figure" href="#/codex/${meta.id}">${characterPortrait(meta.id, character, { decorative: true })}<span>${escapeHtml(character.name)}</span></a>` : '';
                  })
                  .join('')}
              </div>
              ${story.uncertain ? `<p class="uncertain-note"><strong>Note:</strong> ${escapeHtml(story.notes || 'Some details of this story are uncertain or told differently in different sources.')}</p>` : ''}
              <p class="small muted">Many traditions tell more than one version of this story. This is a short retelling, not a translation.</p>
            </footer>
          </div>
        </div>
      </article>
    </div>`;

    app.querySelector('[data-testid="story-next"]')?.addEventListener('click', () => {
      paragraph = Math.min(total - 1, paragraph + 1);
      draw();
      app.querySelector('[data-testid="story-paragraph"]')?.focus();
      window.scrollTo(0, 0);
    });
    app.querySelector('[data-testid="story-back"]')?.addEventListener('click', () => {
      if (paragraph === 0) {
        location.hash = `#/myth/${meta.id}`;
      } else {
        paragraph -= 1;
        draw();
        app.querySelector('[data-testid="story-paragraph"]')?.focus();
        window.scrollTo(0, 0);
      }
    });
    app.querySelector('[data-testid="story-reread"]')?.addEventListener('click', () => {
      paragraph = 0;
      draw();
      app.querySelector('[data-testid="story-paragraph"]')?.focus();
      window.scrollTo(0, 0);
    });
    app.querySelector('[data-testid="story-listen"]')?.addEventListener('click', (event) => {
      const audioUrl = studioAudioUrl(getSettings().studioVoice, 'story', story.id, paragraph);
      narrateWithButton(story.paragraphs[paragraph], event.currentTarget, 'Listen to paragraph', audioUrl);
    });
    app.querySelector('[data-testid="story-finish"]')?.addEventListener('click', finish);
  }

  async function finish() {
    recordStoryRead(mythId, storyId);
    const playable = mythologies.filter((item) => item.mvp);
    awardProgress(playable);
    toast('Story complete. The quiz is ready.', { tone: 'gold' });
    location.hash = `#/myth/${meta.id}/quiz/${story.id}`;
  }

  draw();
}

/* ------------------------------------------------------------------ */
/* Codex                                                               */
/* ------------------------------------------------------------------ */

async function renderCodex(initialMythId = null) {
  setTitle('Codex');
  const all = await loadAllPlayable();
  const mythologies = all.map((entry) => entry.meta);
  let filter = all.some((entry) => entry.meta.id === initialMythId) ? initialMythId : 'all';
  let query = '';

  function entriesFor(entry) {
    const unlockedCharacters = unlockedCharacterIds(entry.meta.id, entry.stories, entry.characters);
    const glossaryLimit = glossaryUnlockedCount(entry.meta.id, entry.glossary);
    return {
      characters: entry.characters.map((character) => ({
        ...character,
        unlocked: unlockedCharacters.has(character.id),
      })),
      glossary: entry.glossary.map((term, index) => ({
        ...term,
        index,
        unlocked: index < glossaryLimit,
      })),
    };
  }

  function totals() {
    return all.reduce(
      (sum, entry) => {
        const entries = entriesFor(entry);
        sum.unlocked += entries.characters.filter((c) => c.unlocked).length + entries.glossary.filter((t) => t.unlocked).length;
        sum.total += entries.characters.length + entries.glossary.length;
        return sum;
      },
      { unlocked: 0, total: 0 },
    );
  }

  function cards() {
    const needle = query.trim().toLowerCase();
    const selected = filter === 'all' ? all : all.filter((entry) => entry.meta.id === filter);
    return selected
      .map((entry) => {
        const entries = entriesFor(entry);
        const characters = entries.characters.filter((character) => {
          if (!needle) return true;
          return [character.name, character.role, ...(character.domain || []), character.fun_fact].join(' ').toLowerCase().includes(needle);
        });
        const terms = entries.glossary.filter((term) => {
          if (!needle) return true;
          return [term.term, term.definition].join(' ').toLowerCase().includes(needle);
        });
        if (!characters.length && !terms.length) return '';
        return `<section class="codex-group" aria-labelledby="codex-${entry.meta.id}">
          <div class="codex-group__head">
            <div class="codex-group__title">${iconImg(entry.meta.id, { className: 'sigil sigil--small' })}<div><h2 id="codex-${entry.meta.id}">${escapeHtml(entry.meta.name)}</h2><span class="muted small">${entries.characters.filter((c) => c.unlocked).length}/${entry.characters.length} figures · ${entries.glossary.filter((t) => t.unlocked).length}/${entry.glossary.length} terms</span></div></div>
            <a class="text-link" href="#/myth/${entry.meta.id}">Open tradition</a>
          </div>
          ${characters.length ? `<h3 class="codex-subhead">Figures</h3><div class="codex-grid">${characters
            .map((character) => character.unlocked
              ? `<article class="codex-card" data-testid="codex-card-${entry.meta.id}-${character.id}">
                  <div class="codex-card__head"><span class="codex-card__icon">${characterPortrait(entry.meta.id, character, { decorative: true })}</span><div><h4>${escapeHtml(character.name)}</h4><p class="muted small">${escapeHtml(character.role)}</p></div></div>
                  <p class="codex-card__domains">${character.domain.map((domain) => `<span class="chip chip--tiny">${escapeHtml(domain)}</span>`).join('')}</p>
                  <p class="small"><strong>Symbols:</strong> ${escapeHtml(character.symbols.join(', '))}</p>
                  <p class="codex-card__fact">${escapeHtml(character.fun_fact)}</p>
                </article>`
              : `<article class="codex-card is-locked" data-testid="codex-card-${entry.meta.id}-${character.id}">
                  <div class="codex-card__head">
                    <span class="codex-card__icon codex-card__icon--lock" aria-hidden="true">◍</span>
                    <div><h4>Sealed figure</h4><p class="small muted">Read a story featuring this figure.</p></div>
                  </div>
                </article>`)
            .join('')}</div>` : ''}
          ${terms.length ? `<h3 class="codex-subhead">Glossary</h3><div class="codex-grid codex-grid--terms">${terms
            .map((term) => `<article class="codex-card codex-card--term ${term.unlocked ? '' : 'is-locked'}" data-testid="codex-term-${entry.meta.id}-${term.index}">
              ${term.unlocked
                ? `<h4>${escapeHtml(term.term)}</h4><p>${escapeHtml(term.definition)}</p>`
                : `<div class="codex-card__head"><span class="codex-card__icon codex-card__icon--lock" aria-hidden="true">◍</span><div><h4>Sealed term</h4><p class="small muted">Reading unlocks two terms.</p></div></div>`}
            </article>`)
            .join('')}</div>` : ''}
        </section>`;
      })
      .join('');
  }

  function draw() {
    const count = totals();
    app.innerHTML = `<div class="page" data-testid="codex-page">
      <header class="page-head">
        <p class="eyebrow">The codex</p>
        <h1 id="page-title">Figures &amp; terms</h1>
        <p class="lede">Reading a story unlocks the figures who appear in it. Each story also unlocks two glossary terms. Pass a tradition's final challenge to open its whole codex.</p>
        <div class="codex-summary">
          <span class="pill pill--gold" data-testid="codex-count">${count.unlocked} / ${count.total} cards unlocked</span>
          <span class="muted small">Saved in this browser</span>
        </div>
      </header>
      <div class="codex-tools">
        <label class="search"><span class="visually-hidden">Search the codex</span><span class="search__icon" aria-hidden="true">⌕</span><input type="search" placeholder="Search figures and terms…" autocomplete="off" value="${escapeHtml(query)}" data-testid="codex-search"></label>
        <div class="codex-filters" role="group" aria-label="Filter codex by tradition">
          <button class="chip ${filter === 'all' ? 'is-active' : ''}" type="button" data-codex-filter="all" aria-pressed="${filter === 'all'}">All</button>
          ${mythologies.map((meta) => `<button class="chip ${filter === meta.id ? 'is-active' : ''}" type="button" data-codex-filter="${meta.id}" data-testid="codex-filter-${meta.id}" aria-pressed="${filter === meta.id}">${escapeHtml(meta.name)}</button>`).join('')}
        </div>
      </div>
      <div id="codex-content">${cards() || emptyState('Nothing matches.', 'Try another search or tradition.')}</div>
    </div>`;

    app.querySelector('[data-testid="codex-search"]')?.addEventListener('input', (event) => {
      query = event.target.value;
      const content = app.querySelector('#codex-content');
      content.innerHTML = cards() || emptyState('Nothing matches.', 'Try another search or tradition.');
    });
    app.querySelectorAll('[data-codex-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        filter = button.dataset.codexFilter;
        const nextHash = filter === 'all' ? '#/codex' : `#/codex/${filter}`;
        history.replaceState(null, '', nextHash);
        draw();
        app.querySelector(`[data-codex-filter="${filter}"]`)?.focus();
      });
    });

    const playable = mythologies;
    awardProgress(playable, count.unlocked);
  }

  draw();
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function eraFor(year) {
  if (year <= -3000) return 'Deep past · before 3000 BCE';
  if (year <= -1000) return '3000–1000 BCE';
  if (year < 0) return '1000 BCE–1 CE';
  if (year < 1000) return '1–1000 CE';
  if (year < 1500) return '1000–1500 CE';
  return '1500 CE–present';
}

async function renderTimeline() {
  setTitle('Timeline');
  const mythologies = await loadMythologies();
  const sorted = [...mythologies].sort((a, b) => a.start_year - b.start_year || a.name.localeCompare(b.name));
  const eras = [];
  for (const meta of sorted) {
    const era = eraFor(meta.start_year);
    let group = eras.find((item) => item.era === era);
    if (!group) {
      group = { era, items: [] };
      eras.push(group);
    }
    group.items.push(meta);
  }

  app.innerHTML = `<div class="page" data-testid="timeline-page">
    <header class="page-head">
      <p class="eyebrow">Chronology</p>
      <h1 id="page-title">Timeline</h1>
      <p class="lede">All ${mythologies.length} traditions in the catalogue, ordered by their approximate starting period. Overlap is the rule, not the exception: traditions do not begin or end on a single date.</p>
    </header>
    <div class="timeline-legend">
      <span class="pill pill--gold">Playable in this edition</span>
      <span class="pill pill--quiet">Catalogued for later</span>
      <span class="muted small">Dates are approximate and debated.</span>
    </div>
    <div class="timeline">
      ${eras
        .map(
          (group) => `<section class="era" aria-labelledby="era-${regionSlug(group.era)}">
            <h2 class="era__title" id="era-${regionSlug(group.era)}">${escapeHtml(group.era)}</h2>
            <ol class="era__list">
              ${group.items
                .map(
                  (meta) => `<li class="timeline-row ${meta.mvp ? 'is-playable' : ''}" data-testid="timeline-row-${meta.id}">
                    <span class="timeline-row__year">${escapeHtml(yearLabel(meta.start_year))}</span>
                    <span class="timeline-row__dot" aria-hidden="true"></span>
                    <div class="timeline-row__card">
                      <div class="timeline-row__head">
                        ${meta.mvp ? iconImg(meta.id, { className: 'sigil sigil--small' }) : '<span class="timeline-row__mark" aria-hidden="true">·</span>'}
                        <h3>${meta.mvp ? `<a href="#/myth/${meta.id}">${escapeHtml(meta.name)}</a>` : escapeHtml(meta.name)}</h3>
                        <span class="pill pill--quiet">${escapeHtml(meta.region)}</span>
                        ${meta.mvp ? '<span class="pill pill--gold">Playable</span>' : ''}
                      </div>
                      <p class="small"><strong>${escapeHtml(meta.period_text)}</strong></p>
                      <p class="small muted">Earliest records: ${escapeHtml(meta.earliest_record)}</p>
                      <p class="timeline-row__summary">${escapeHtml(meta.summary)}</p>
                    </div>
                  </li>`,
                )
                .join('')}
            </ol>
          </section>`,
        )
        .join('')}
    </div>
    <p class="muted small timeline-foot">Numbers are used only for sorting. Text dates are the source of truth. A date such as “about 2100 BCE” is an estimate, not a fixed event. Period names are regional too: the Iron Age begins around 1200 BCE in Anatolia, 800 BCE in central Europe and 500 BCE in Scandinavia.</p>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

async function renderResults() {
  setTitle('Progress');
  const all = await loadAllPlayable();
  const mythologies = all.map((entry) => entry.meta);
  const stats = overallStats(all);
  const unlocked = stats.codexUnlocked;
  const catalog = badgeCatalog(mythologies);
  awardProgress(mythologies, unlocked);
  const earned = new Set(getState().badges);
  const overallPercent = Math.round(
    ((stats.storiesRead + stats.quizzesPassed + stats.finalPassed) /
      (stats.storiesTotal + stats.quizzesTotal + stats.finalTotal || 1)) *
      100,
  );

  app.innerHTML = `<div class="page" data-testid="results-page">
    <header class="page-head">
      <p class="eyebrow">Your journey</p>
      <h1 id="page-title">Progress</h1>
      <p class="lede">A record of what you have read, passed and unlocked in this browser. Progress stays here; the published site also uses Google Analytics for aggregate usage.</p>
    </header>
    <section class="stat-grid" aria-label="Overall statistics">
      <div class="stat"><span class="stat__value">${stats.storiesRead}<small>/${stats.storiesTotal}</small></span><span class="stat__label">Stories read</span></div>
      <div class="stat"><span class="stat__value">${stats.quizzesPassed}<small>/${stats.quizzesTotal}</small></span><span class="stat__label">Quizzes passed</span></div>
      <div class="stat"><span class="stat__value">${stats.finalPassed}<small>/${stats.finalTotal}</small></span><span class="stat__label">Final challenges</span></div>
      <div class="stat"><span class="stat__value">${unlocked}<small>/${stats.codexTotal}</small></span><span class="stat__label">Codex cards</span></div>
      <div class="stat"><span class="stat__value">${earned.size}<small>/${catalog.length}</small></span><span class="stat__label">Badges</span></div>
    </section>
    <section class="panel overall-panel">
      <div class="section-head"><div><p class="eyebrow">Completion</p><h2>${overallPercent}% of the playable content</h2></div><span class="muted small">${stats.traditionsFinished}/${stats.traditionsTotal} traditions finished</span></div>
      ${progressBar(stats.storiesRead + stats.quizzesPassed + stats.finalPassed, stats.storiesTotal + stats.quizzesTotal + stats.finalTotal, 'Overall completion')}
    </section>

    <section class="section" aria-labelledby="by-tradition-title">
      <div class="section-head"><div><p class="eyebrow">Breakdown</p><h2 id="by-tradition-title">By tradition</h2></div></div>
      <div class="progress-list">
        ${all
          .map((entry) => {
            const s = mythStats(entry.meta.id, entry.stories, entry.characters, entry.glossary);
            return `<a class="progress-row" href="#/myth/${entry.meta.id}" data-testid="progress-myth-${entry.meta.id}">
              ${iconImg(entry.meta.id, { className: 'sigil sigil--small' })}
              <span class="progress-row__name"><strong>${escapeHtml(entry.meta.name)}</strong><span class="muted small">${s.readCount}/6 read · ${s.quizzesPassed}/6 quizzes · ${s.codexUnlocked}/${s.codexTotal} codex</span></span>
              <span class="progress-row__bar">${progressBar(s.readCount + s.quizzesPassed, 12, `${entry.meta.name} progress`, { compact: true })}</span>
              <span class="progress-row__pct">${s.finalPassed ? 'Adept' : s.quizzesPassed === 6 ? 'Scholar' : `${Math.round(((s.readCount + s.quizzesPassed) / 12) * 100)}%`}</span>
            </a>`;
          })
          .join('')}
      </div>
    </section>

    <section class="section" aria-labelledby="badges-title">
      <div class="section-head"><div><p class="eyebrow">Recognition</p><h2 id="badges-title">Badges</h2></div><span class="muted small">${earned.size} earned</span></div>
      <div class="badge-grid">
        ${[...catalog]
          .sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)))
          .map(
            (badge) => `<article class="badge ${earned.has(badge.id) ? 'is-earned' : ''}" data-testid="badge-${badge.id}">
              <span class="badge__icon" aria-hidden="true">${badge.icon}</span>
              <h3>${escapeHtml(badge.name)}</h3>
              <p>${escapeHtml(badge.description)}</p>
              <span class="badge__state">${earned.has(badge.id) ? 'Earned' : 'Locked'}</span>
            </article>`,
          )
          .join('')}
      </div>
    </section>

    <section class="panel danger-zone">
      <div><p class="eyebrow">Local data</p><h2>Reset progress</h2><p>This clears reading progress, quiz scores, challenge results and badges from this browser. Your theme and text-size settings are kept.</p></div>
      <button class="button button--danger" type="button" data-testid="reset-progress">Reset progress</button>
    </section>
    <p class="muted small">Content status: all entries remain <strong>awaiting human fact-check</strong>. Dates, names and answer keys should be reviewed against the sources before release.</p>
  </div>`;

  app.querySelector('[data-testid="reset-progress"]').addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Reset all progress?',
      message: 'This cannot be undone. Reading progress, quiz scores, challenge results and badges will be removed from this browser.',
      confirmLabel: 'Reset progress',
      danger: true,
    });
    if (!confirmed) return;
    resetProgress();
    toast('Progress reset');
    await renderRoute();
  });
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

async function renderAbout() {
  setTitle('About');
  const all = await loadAllPlayable();
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((meta) => meta.mvp);
  const sources = all.flatMap((entry) => entry.info.sources.map((source) => ({ ...source, myth: entry.meta.name })));

  app.innerHTML = `<div class="page page--narrow" data-testid="about-page">
    <header class="page-head">
      <p class="eyebrow">About</p>
      <h1 id="page-title">About this archive</h1>
      <p class="lede">Mythos is a small, text-first educational game about world mythologies. It is built to be read slowly and to make clear where its knowledge comes from.</p>
    </header>
    <section class="panel prose">
      <h2>What the game is</h2>
      <p>${playable.length} traditions are playable: ${playable.map((meta) => escapeHtml(meta.name)).join(', ')}. Each has six short retellings, a five-question quiz after every story, a twenty-question final challenge, ten character cards and ten glossary terms. A stylised map and three challenges offer other ways into the material.</p>
      <p>Progress is stored locally in your browser. There is no account and no game server. The published site loads Google Analytics (measurement ID <code>G-NSB9K61M5S</code>) to understand aggregate use; analytics is disabled on localhost.</p>
      <h2>How the content is written</h2>
      <p>Retellings are short summaries in new words, not translations. They point to named sources and note when a story has several versions. Dates are approximate: the date a story was first written down is usually much later than the oral tradition behind it.</p>
      <p><strong>Review status:</strong> every story, quiz, character and glossary entry is marked <code>verified: false</code>. The material has not yet been checked line by line by a named human reviewer. Treat it as a learning draft.</p>
      <h2>Living traditions</h2>
      <p>Hindu, Shinto, Maya and Chinese traditions are living traditions, not relics. They are presented as traditions and with respect. The game does not depict deities' faces; it uses objects and symbols. If you belong to one of these traditions and find something inaccurate or disrespectful, the correct response is to remove or revise it, not to defend the text.</p>
      <p>Sensitivity is marked on each tradition: <span class="pill pill--quiet">General tradition</span> <span class="pill pill--gold">Living tradition</span>. The Hindu entries are marked high sensitivity and need a dedicated human review before release.</p>
      <h2>Accessibility</h2>
      <p>The game uses native links and buttons, a skip link, visible focus styles, quiz results that take focus so they are read aloud, keyboard-operable challenges and a text-size control. Animations are minimal and respect <code>prefers-reduced-motion</code>. The world map has a list-view alternative.</p>
      <h2>Images and narration</h2>
      <p>All images are original SVG: sixteen-pixel sigils, story scenes, quiz clues and character portraits are built from a small palette and a deterministic pixel grid. The map is an inline SVG built from a text tile grid. No photographs or generated raster art are used.</p>
      <p>Narration is optional. Choose a generated narrator (Joe, Cori or Morgan) in the speaker menu, or use any installed system voice as the fallback. Joe and Cori are open-voice models with permissive licences; Morgan is a fan-made voice clone of a public figure, licensed for non-commercial use only and never presented as an endorsement. No audio is sent to a server. Use the Listen button beside a story or question.</p>
    </section>

    <section class="panel">
      <h2>Sources</h2>
      <p class="muted small">The short source notes for each tradition. These are starting points for readers, not a bibliography of every retelling.</p>
      <div class="about-sources">
        ${all
          .map(
            (entry) => `<section class="about-source-group">
              <h3>${escapeHtml(entry.meta.name)}</h3>
              <ul class="source-list">
                ${entry.info.sources.map((source) => `<li><strong>${escapeHtml(source.title)}</strong><span>${escapeHtml(source.note)}</span></li>`).join('')}
              </ul>
            </section>`,
          )
          .join('')}
      </div>
    </section>

    <section class="panel">
      <h2>Credits</h2>
      <p>Design, code and retellings: the Mythos project. Built with vanilla HTML, CSS and JavaScript. No frameworks and no build step. Google Analytics is the only third-party script and is disabled on localhost.</p>
      <p>Thanks to the translators, scholars and tradition-bearers whose published work makes a project like this possible. Full source notes appear above and in each tradition's page.</p>
      <p class="small muted">${playable.length} playable traditions · ${mythologies.length} catalogued · ${sources.length} source notes.</p>
      <p class="small"><a class="text-link" href="CREDITS.md">Plain-text credits file</a> · <a class="text-link" href="README.md">README</a></p>
    </section>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

initChrome();
window.addEventListener('hashchange', renderRoute);
if (!location.hash) history.replaceState(null, '', '#/');
renderRoute();
