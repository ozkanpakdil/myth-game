/**
 * saga.js — The Ash-Seed, a branching Norse saga.
 *
 * One run is a single named protagonist moving through a hand-written story
 * graph. The current node lives in the save, the browser hash mirrors it, and
 * each choice pushes a snapshot so the Back button and the in-game "previous
 * scene" control can both rewind cleanly. Scenes are animated inline SVG (see
 * saga-art.js); there are no GIFs and nothing is fetched at runtime except the
 * story JSON.
 */

import { loadSaga } from './content.js?v=20261108-4';
import {
  escapeHtml,
  progressBar,
  toast,
  confirmDialog,
  setDocumentTitle,
  listenButtonContent,
} from './ui.js?v=20261108-4';
import { sagaScene, sagaGlyph } from './saga-art.js?v=20261108-4';
import {
  narrate,
  narrateSequence,
  stopNarration,
  narrationSupported,
  narrationEnabled,
  ensureNarration,
  selectedStudioVoice,
  voiceChosen,
  sagaAudioUrl,
} from './narration.js?v=20261108-4';
import {
  loadSaga as loadSagaState,
  saveSaga,
  newSaga,
  pushHistory,
  applyEffects,
  cleanName,
} from './saga-state.js?v=20261108-4';

const STAT_LABELS = { insight: 'Insight', courage: 'Courage', cunning: 'Cunning' };
const MAX_PIPS = 5;

/* ------------------------------------------------------------------ */
/* Data helpers                                                        */
/* ------------------------------------------------------------------ */

function matchesWhen(when, state) {
  if (!when) return true;
  if (Array.isArray(when.flags) && !when.flags.every((flag) => state.flags[flag])) return false;
  if (Array.isArray(when.anyFlags) && !when.anyFlags.some((flag) => state.flags[flag])) return false;
  if (when.minStats) {
    for (const [stat, value] of Object.entries(when.minStats)) {
      if ((state.stats[stat] || 0) < value) return false;
    }
  }
  return true;
}

function choiceAvailable(choice, state) {
  return matchesWhen(choice.requires, state);
}

function storyText(data, node, state) {
  const variants = (node.variants || [])
    .filter((variant) => matchesWhen(variant.when, state))
    .map((variant) => variant.text);
  return [...node.text, ...variants].map((paragraph) => paragraph.replaceAll('{name}', state.name));
}

function actFor(data, node) {
  return data.acts.find((act) => act.id === node.act) || data.acts[0];
}

function glyphForChoice(label) {
  const text = String(label).toLowerCase();
  if (/wolf|fenrir|loki|sigyn|chain|howl/.test(text)) return 'wolf';
  if (/thor|hammer|forge|thrym|giant|mjolnir|wedding/.test(text)) return 'hammer';
  if (/raven|odin|mimir|well|rune|heimdall|bifrost|wisdom/.test(text)) return 'rune';
  if (/seed|plant|root|tree|ash|grow/.test(text)) return 'seed';
  if (/burn|fire|ragnarok|flame|alight/.test(text)) return 'flame';
  if (/home|shore|quiet|family|return/.test(text)) return 'tree';
  if (/crown|asgard|god/.test(text)) return 'crown';
  return 'rune';
}

function pips(value) {
  const filled = Math.max(0, Math.min(MAX_PIPS, value));
  return `<span class="saga-pips" aria-hidden="true">${Array.from({ length: MAX_PIPS }, (_, index) => `<span class="saga-pip${index < filled ? ' is-on' : ''}"></span>`).join('')}</span>`;
}

function pathTrail(data, state) {
  const ids = [...state.history.map((entry) => entry.node), state.node];
  const unique = ids.filter((id, index) => ids.indexOf(id) === index);
  const shown = unique.slice(-6);
  return {
    shown: shown.map((id) => data.nodes[id]).filter(Boolean),
    hidden: Math.max(0, unique.length - shown.length),
  };
}

function boonList(data, state) {
  return Object.keys(state.flags)
    .map((flag) => data.boons[flag] || null)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Narration                                                           */
/* ------------------------------------------------------------------ */

let activeSagaListen = null;

document.addEventListener('mythos:narration-stop', () => {
  if (!activeSagaListen) return;
  resetSagaListen(activeSagaListen);
  activeSagaListen = null;
});

function resetSagaListen(button) {
  if (!button) return;
  button.dataset.speaking = 'false';
  button.innerHTML = listenButtonContent(button.dataset.listenLabel || 'Listen');
}

function playSagaNarration(button, text, audioUrls = []) {
  if (!button) return;
  if (button.dataset.speaking === 'true') {
    stopNarration();
    resetSagaListen(button);
    activeSagaListen = null;
    return;
  }
  if (activeSagaListen && activeSagaListen !== button) resetSagaListen(activeSagaListen);
  if (!voiceChosen()) {
    document.dispatchEvent(new CustomEvent('mythos:open-voice'));
    toast('Choose a narrator first. Morgan is selected by default.', { tone: 'gold', duration: 3200 });
    return;
  }
  const urls = audioUrls.filter(Boolean);
  if (!narrationSupported(urls[0])) {
    toast('Narration is not available in this browser.', { tone: 'warn' });
    return;
  }
  if (!narrationEnabled()) {
    ensureNarration();
    toast('Narration on. Using your chosen voice.', { tone: 'gold', duration: 2400 });
  }
  const clean = String(text || '').trim();
  if (!clean) {
    toast('There is no text to read here.', { tone: 'warn' });
    return;
  }
  const callbacks = {
    onEnd: () => {
      resetSagaListen(button);
      if (activeSagaListen === button) activeSagaListen = null;
    },
    onError: () => {
      resetSagaListen(button);
      if (activeSagaListen === button) activeSagaListen = null;
      toast('Narration could not start. Try another voice in the header.', { tone: 'warn' });
    },
  };
  const started = urls.length > 1
    ? narrateSequence(urls, { fallbackText: clean, ...callbacks })
    : narrate(clean, { audioUrl: urls[0] || '', ...callbacks });
  if (!started) {
    resetSagaListen(button);
    return;
  }
  button.dataset.speaking = 'true';
  button.innerHTML = listenButtonContent('Stop', true);
  activeSagaListen = button;
}

/* ------------------------------------------------------------------ */
/* Landing                                                             */
/* ------------------------------------------------------------------ */

function nameForm(data, saved, { compact = false } = {}) {
  const value = saved?.name || data.default_name;
  return `<form class="saga-name-form${compact ? ' saga-name-form--compact' : ''}" data-testid="saga-name-form">
    ${compact ? '' : '<label class="saga-name-label" for="saga-name">What will the saga call you?</label>'}
    <div class="saga-name-row">
      <input class="saga-name-input" id="saga-name" name="saga-name" type="text" maxlength="24" autocomplete="nickname" spellcheck="false" value="${escapeHtml(value)}" aria-label="Your name in the saga" data-testid="saga-name">
      <button class="button button--primary" type="submit" data-testid="${compact ? 'saga-begin-new' : 'saga-begin'}">Begin the saga <span aria-hidden="true">→</span></button>
    </div>
    <div class="saga-name-suggestions" aria-label="Suggested names">
      <span class="small muted">Try:</span>
      ${data.name_suggestions.map((name) => `<button class="chip chip--name" type="button" data-suggest="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
    </div>
    <p class="small muted">The name appears in the story and is saved with your path. You can use any name you like.</p>
  </form>`;
}

function endingGallery(data, found) {
  return `<section class="saga-gallery" aria-labelledby="saga-endings-title">
    <div class="section-head">
      <div>
        <p class="eyebrow">The threads you have tied</p>
        <h2 id="saga-endings-title">Endings discovered</h2>
      </div>
      <span class="pill pill--gold">${found.size} / ${data.endings.length}</span>
    </div>
    <div class="saga-gallery__grid">
      ${data.endings
        .map((ending) => {
          const discovered = found.has(ending.id);
          return `<article class="saga-ending-card${discovered ? '' : ' is-locked'}">
            <span class="saga-ending-card__glyph">${sagaGlyph(discovered ? 'seed' : 'rune', { size: 28 })}</span>
            <div>
              <h3>${discovered ? escapeHtml(ending.title) : 'Undiscovered ending'}</h3>
              <p class="small muted">${discovered ? escapeHtml(ending.blurb) : `Reach the end of a different road to reveal this thread.`}</p>
              ${discovered ? `<span class="pill pill--quiet">${escapeHtml(ending.rank)}</span>` : ''}
            </div>
          </article>`;
        })
        .join('')}
    </div>
  </section>`;
}

function renderLanding(app, data, state) {
  setDocumentTitle(data.title);
  const found = new Set(state?.endings || []);
  const node = state ? data.nodes[state.node] : null;
  const act = node ? actFor(data, node) : null;
  const sceneCount = Object.keys(data.nodes).length;

  app.innerHTML = `<div class="page page--saga" data-testid="saga-landing">
    <header class="saga-hero">
      <div class="saga-hero__copy">
        <p class="eyebrow"><span class="eyebrow__rule" aria-hidden="true"></span> A choose-your-path saga · Norse myth</p>
        <h1 id="page-title">The<br><em>Ash-Seed.</em></h1>
        <p class="lede">${escapeHtml(data.intro)}</p>
        <div class="saga-hero__meta">
          <span class="pill pill--quiet">${sceneCount} scenes</span>
          <span class="pill pill--quiet">${data.paths.length} roads</span>
          <span class="pill pill--quiet">${data.endings.length} endings</span>
        </div>
        ${
          state && node
            ? `<div class="saga-resume" data-testid="saga-resume">
                <div class="saga-resume__head">
                  <span class="saga-resume__glyph">${sagaGlyph('seed', { size: 34 })}</span>
                  <div>
                    <p class="eyebrow">Your thread</p>
                    <h2>Continue as ${escapeHtml(state.name)}</h2>
                  </div>
                </div>
                <p class="muted small">${escapeHtml(act.title)} · Chapter ${escapeHtml(node.chapter)} · ${escapeHtml(node.title)}</p>
                <div class="saga-resume__actions">
                  <a class="button button--primary" href="#/saga/${encodeURIComponent(state.node)}" data-testid="saga-continue">Continue the saga <span aria-hidden="true">→</span></a>
                  <button class="button button--ghost" type="button" data-testid="saga-restart-landing">Start this thread again</button>
                </div>
              </div>`
            : `<div class="saga-resume saga-resume--new">
                <p class="eyebrow">Begin</p>
                <h2>Who walks into the story?</h2>
                ${nameForm(data, null)}
              </div>`
        }
        ${state ? `<details class="saga-new-thread"><summary>Begin a new thread</summary>${nameForm(data, state, { compact: true })}</details>` : ''}
        <div class="saga-intro-listen-wrap">
          <button class="button button--ghost button--small" type="button" data-testid="saga-intro-listen" data-listen-label="Listen to the intro" aria-label="Listen to the introduction">${listenButtonContent('Listen to the intro')}</button>
        </div>
      </div>
      <figure class="pixel-frame saga-hero__frame" data-testid="saga-hero-art" data-art="fjord">
        ${sagaScene('fjord')}
        <figcaption class="story-art__caption">
          <strong>Raven Bay, the last autumn</strong>
        </figcaption>
      </figure>
    </header>

    <section class="saga-roads" aria-labelledby="saga-roads-title">
      <div class="section-head">
        <div>
          <p class="eyebrow">Three roads</p>
          <h2 id="saga-roads-title">The same seed. Different myths.</h2>
        </div>
        <p class="muted small">Choices change who you meet and what the ending costs.</p>
      </div>
      <div class="saga-road-grid">
        ${data.paths
          .map(
            (path) => `<article class="saga-road">
              <span class="saga-road__glyph">${sagaGlyph(path.glyph, { size: 36 })}</span>
              <div>
                <h3>${escapeHtml(path.title)}</h3>
                <p>${escapeHtml(path.blurb)}</p>
              </div>
            </article>`,
          )
          .join('')}
      </div>
    </section>

    <section class="saga-how panel panel--soft" aria-labelledby="saga-how-title">
      <p class="eyebrow">How the saga works</p>
      <h2 id="saga-how-title">Read a scene. Choose a road. Live with it.</h2>
      <ol class="saga-how__steps">
        <li><span>01</span><div><strong>Read step by step</strong><p>Each scene reveals one paragraph at a time. The myth note appears when the scene is complete.</p></div></li>
        <li><span>02</span><div><strong>Choose with your instincts</strong><p>Every choice adds a gift or a debt to your thread. Some choices only appear if you have earned them.</p></div></li>
        <li><span>03</span><div><strong>Find a different ending</strong><p>Progress, gifts found and endings are saved in this browser. Start again to walk another road.</p></div></li>
      </ol>
    </section>

    ${endingGallery(data, found)}

    <aside class="saga-source-note">
      <p class="small muted"><strong>About the myths.</strong> This is an original interactive retelling, not a translation. It follows the Poetic Edda and Prose Edda closely, but invents the mortal protagonist and the choices around them. Names use the common English spellings <em>Odin, Thor, Loki, Fenrir, Yggdrasil</em>; the notes use Old Norse forms where they matter.</p>
    </aside>
  </div>`;

  const input = app.querySelector('[data-testid="saga-name"]');
  app.querySelectorAll('[data-suggest]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!input) return;
      input.value = button.dataset.suggest || '';
      input.focus();
    });
  });

  async function beginSaga(form, isNewThread = false) {
    const formInput = form.querySelector('[data-testid="saga-name"]');
    const name = cleanName(formInput?.value) || data.default_name;
    if (state && isNewThread) {
      const confirmed = await confirmDialog({
        title: 'Begin a new thread?',
        message: `This will replace the saved path for ${state.name}. The endings you have already found stay unlocked.`,
        confirmLabel: 'Begin again',
        cancelLabel: 'Keep my thread',
        danger: true,
      });
      if (!confirmed) return;
    }
    const next = newSaga(name, { endings: state?.endings || [] });
    saveSaga(next);
    toast(`The saga knows you as ${next.name}.`, { duration: 2200 });
    location.hash = `#/saga/${data.start}`;
  }

  app.querySelector('[data-testid="saga-intro-listen"]')?.addEventListener('click', (event) => {
    const studio = selectedStudioVoice();
    playSagaNarration(event.currentTarget, data.intro, studio ? [sagaAudioUrl(studio, data.intro)] : []);
  });

  app.querySelectorAll('form[data-testid="saga-name-form"]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      beginSaga(form, Boolean(state));
    });
  });

  app.querySelector('[data-testid="saga-restart-landing"]')?.addEventListener('click', async () => {
    if (!state) return;
    const confirmed = await confirmDialog({
      title: 'Start this thread again?',
      message: `You will return to the first scene as ${state.name}. The endings you have already found stay unlocked.`,
      confirmLabel: 'Start again',
      cancelLabel: 'Keep going',
      danger: true,
    });
    if (!confirmed) return;
    const next = newSaga(state.name, { endings: state.endings });
    saveSaga(next);
    location.hash = `#/saga/${data.start}`;
  });
}

/* ------------------------------------------------------------------ */
/* Play                                                                */
/* ------------------------------------------------------------------ */

function sceneHeader(data, node) {
  const act = actFor(data, node);
  return `<p class="eyebrow"><span class="eyebrow__rule" aria-hidden="true"></span> Act ${act.id} · ${escapeHtml(act.title)}</p>
    <p class="saga-location">${escapeHtml(node.location)} · Chapter ${escapeHtml(node.chapter)}</p>`;
}

function loreMarkup(node) {
  if (!node.lore) return '';
  return `<aside class="saga-lore" data-testid="saga-lore">
    <p class="eyebrow">Myth note</p>
    <h2>${escapeHtml(node.lore.title)}</h2>
    <p>${escapeHtml(node.lore.body)}</p>
    <p class="saga-lore__source">Source: ${escapeHtml(node.lore.source)}</p>
    <button class="button button--ghost button--small saga-lore__listen" type="button" data-saga-listen data-listen-target="lore" data-listen-label="Listen to the myth note" data-testid="saga-lore-listen">${listenButtonContent('Listen to the myth note')}</button>
  </aside>`;
}

function choiceMarkup(choices, state) {
  const available = choices.filter((choice) => choiceAvailable(choice, state));
  if (!available.length) {
    return `<div class="saga-choices" data-testid="saga-choices"><p class="small muted">This path ends here. Return to the saga home to begin another.</p><a class="button button--ghost" href="#/saga">Saga home</a></div>`;
  }
  return `<div class="saga-choices" data-testid="saga-choices" hidden>
    <div class="saga-choices__head">
      <p class="eyebrow">Choose your path</p>
      <span class="small muted">${available.length} ${available.length === 1 ? 'choice' : 'choices'}</span>
    </div>
    ${available
      .map(
        (choice, index) => `<button class="saga-choice" type="button" data-choice="${index}" data-testid="saga-choice-${index}">
          <span class="saga-choice__glyph">${sagaGlyph(glyphForChoice(choice.label), { size: 28 })}</span>
          <span class="saga-choice__body">
            <strong>${escapeHtml(choice.label)}</strong>
            ${choice.tag ? `<small>${escapeHtml(choice.tag)}</small>` : ''}
          </span>
          <span class="saga-choice__arrow" aria-hidden="true">→</span>
        </button>`,
      )
      .join('')}
  </div>`;
}

function threadCard(data, state, node) {
  const boons = boonList(data, state);
  const trail = pathTrail(data, state);
  const last = state.history[state.history.length - 1];
  return `<aside class="saga-thread panel" aria-label="Your thread">
    <div class="saga-thread__head">
      <span class="saga-thread__glyph">${sagaGlyph('seed', { size: 34 })}</span>
      <div>
        <p class="eyebrow">Your thread</p>
        <h2>${escapeHtml(state.name)}</h2>
      </div>
    </div>
    <dl class="saga-stats">
      ${Object.entries(STAT_LABELS)
        .map(
          ([key, label]) => `<div class="saga-stat">
            <dt>${label}</dt>
            <dd>${pips(state.stats[key] || 0)}<strong>${state.stats[key] || 0}</strong></div>`,
        )
        .join('')}
    </dl>
    <div class="saga-thread__boons">
      <p class="eyebrow">Gifts &amp; debts</p>
      ${boons.length ? `<div class="saga-boon-list">${boons.map((boon) => `<span class="pill pill--quiet">${escapeHtml(boon)}</span>`).join('')}</div>` : '<p class="small muted">Nothing yet. Every choice leaves a mark.</p>'}
    </div>
    <details class="saga-trail">
      <summary>Path so far <span class="muted small">${trail.shown.length}${trail.hidden ? ` +${trail.hidden}` : ''} ${trail.shown.length === 1 && !trail.hidden ? 'scene' : 'scenes'}</span></summary>
      <ol>
        ${trail.shown.map((pathNode) => `<li${pathNode.id === node.id ? ' class="is-current"' : ''}>${escapeHtml(pathNode.title)}</li>`).join('')}
      </ol>
    </details>
    ${last ? `<button class="button button--ghost button--wide saga-thread__back" type="button" data-testid="saga-back">← Previous scene</button>` : ''}
  </aside>`;
}

function endingMarkup(data, state, node) {
  if (!node.ending) return '';
  const found = new Set(state.endings || []);
  return `<section class="saga-ending" data-testid="saga-ending">
    <div class="saga-ending__head">
      <div>
        <p class="eyebrow">Ending found</p>
        <h2>${escapeHtml(node.ending.title)}</h2>
      </div>
      <span class="pill pill--gold">${escapeHtml(node.ending.rank)}</span>
    </div>
    <p>${escapeHtml(node.ending.summary)}</p>
    <p class="small muted">You have found ${found.size} of ${data.endings.length} endings. Each road can end more than one way — begin again to pull a different thread.</p>
    <div class="saga-ending__actions">
      <button class="button button--primary" type="button" data-testid="saga-again">Begin a new thread <span aria-hidden="true">→</span></button>
      <a class="button button--ghost" href="#/saga">Saga home</a>
    </div>
  </section>`;
}

function renderNode(app, data, state) {
  const node = data.nodes[state.node];
  if (!node) {
    renderLanding(app, data, state);
    return;
  }
  setDocumentTitle(node.title);
  const act = actFor(data, node);
  const text = storyText(data, node, state);
  const isEnding = Boolean(node.ending);
  const revealed = isEnding ? text.length : 1;
  const complete = revealed >= text.length;
  const availableChoices = (node.choices || []).filter((choice) => choiceAvailable(choice, state));
  const last = state.history[state.history.length - 1];

  app.innerHTML = `<div class="page page--saga-play" data-testid="saga-page" data-node="${escapeHtml(node.id)}" data-ending="${isEnding ? 'true' : 'false'}">
    <nav class="saga-topbar" aria-label="Saga navigation">
      <a class="saga-topbar__home" href="#/saga">← The Ash-Seed</a>
      <div class="saga-topbar__meta">
        <span class="pill pill--quiet">Act ${act.id} · ${escapeHtml(act.title)}</span>
        <span class="pill pill--quiet">Chapter ${escapeHtml(node.chapter)}</span>
        <button class="button button--ghost button--small" type="button" data-testid="saga-restart">Restart</button>
      </div>
    </nav>

    <div class="saga-layout">
      <aside class="saga-visual">
        <figure class="pixel-frame saga-frame" data-testid="saga-scene" data-art="${escapeHtml(node.art)}">
          ${sagaScene(node.art)}
          <figcaption class="story-art__caption">
            <strong>${escapeHtml(node.artCaption || 'A scene from the saga')}</strong>
          </figcaption>
        </figure>
        ${threadCard(data, state, node)}
      </aside>

      <section class="saga-copy">
        <header class="saga-scene-head">
          ${sceneHeader(data, node)}
          <h1 id="page-title">${escapeHtml(node.title)}</h1>
          <div class="saga-scene-progress">
            <div class="dots" aria-hidden="true">
              ${text.map((_, index) => `<span class="dot${index === 0 ? ' is-current' : ''}" data-dot="${index}"></span>`).join('')}
            </div>
            <span class="muted small" data-testid="saga-progress">Paragraph 1 of ${text.length}</span>
            ${progressBar(1, text.length, 'Scene reading progress', { compact: true }).replace('class="progress', 'data-saga-progress class="progress')}
            ${isEnding || complete ? '' : '<button class="text-link saga-skip" type="button" data-testid="saga-skip">Reveal the whole scene</button>'}
          </div>
        </header>

        <div class="saga-read-tools">
          <button class="button button--ghost button--small" type="button" data-saga-listen data-listen-target="scene" data-listen-label="Listen to scene" data-testid="saga-listen" aria-label="Listen to this scene">${listenButtonContent('Listen to scene')}</button>
        </div>

        <div class="saga-text" data-testid="saga-text">
          ${text
            .map(
              (paragraph, index) => `<div class="saga-paragraph-group" data-paragraph-group="${index}"${index < revealed ? '' : ' hidden'}>
                <p class="saga-paragraph${index < revealed ? '' : ' is-hidden'}" data-paragraph="${index}"${index < revealed ? '' : ' hidden'}>${escapeHtml(paragraph)}</p>
                <button class="saga-listen-inline" type="button" data-saga-listen data-listen-target="paragraph-${index}" data-listen-label="Listen" data-testid="saga-listen-${index}" aria-label="Listen to paragraph ${index + 1}">${listenButtonContent('Listen')}</button>
              </div>`,
            )
            .join('')}
        </div>

        <div class="saga-after" ${complete ? '' : 'hidden'}>
          ${loreMarkup(node)}
          ${isEnding ? endingMarkup(data, state, node) : choiceMarkup(node.choices || [], state)}
        </div>

        <div class="saga-controls" ${isEnding || complete ? 'hidden' : ''}>
          <button class="button button--primary" type="button" data-testid="saga-continue">Continue <span aria-hidden="true">→</span></button>
          <span class="small muted">Click, or press Enter</span>
        </div>
      </section>
    </div>
  </div>`;

  const progressLabel = app.querySelector('[data-testid="saga-progress"]');
  const progressWrap = app.querySelector('[data-saga-progress]');
  const progressFill = progressWrap?.querySelector('.progress__fill');
  const dots = [...app.querySelectorAll('[data-dot]')];
  const after = app.querySelector('.saga-after');
  const controls = app.querySelector('.saga-controls');
  const continueButton = app.querySelector('[data-testid="saga-continue"]');
  const skipButton = app.querySelector('[data-testid="saga-skip"]');
  const choices = app.querySelector('[data-testid="saga-choices"]');
  let shown = revealed;

  function updateProgress() {
    if (progressLabel) {
      progressLabel.textContent = isEnding
        ? `Ending · ${text.length} paragraph${text.length === 1 ? '' : 's'}`
        : `Paragraph ${shown} of ${text.length}`;
    }
    if (progressWrap) progressWrap.setAttribute('aria-valuenow', String(shown));
    if (progressFill) progressFill.style.width = `${Math.round((shown / text.length) * 100)}%`;
    dots.forEach((dot, index) => {
      dot.classList.toggle('is-done', index < shown - 1);
      dot.classList.toggle('is-current', index === shown - 1);
    });
  }

  function reveal(index) {
    const group = app.querySelector(`[data-paragraph-group="${index}"]`);
    if (group) group.hidden = false;
    const paragraph = app.querySelector(`[data-paragraph="${index}"]`);
    if (paragraph) {
      paragraph.hidden = false;
      paragraph.classList.remove('is-hidden');
    }
  }

  function finishReveal() {
    stopNarration();
    if (activeSagaListen) {
      resetSagaListen(activeSagaListen);
      activeSagaListen = null;
    }
    for (let index = shown; index < text.length; index += 1) reveal(index);
    shown = text.length;
    updateProgress();
    if (after) after.hidden = false;
    if (controls) controls.hidden = true;
    if (skipButton) skipButton.hidden = true;
    if (choices) {
      choices.hidden = false;
      const heading = choices.querySelector('.eyebrow');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
    }
  }

  function advance() {
    if (shown >= text.length) {
      finishReveal();
      return;
    }
    reveal(shown);
    shown += 1;
    updateProgress();
    if (shown >= text.length) finishReveal();
  }

  app.querySelectorAll('[data-saga-listen]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.listenTarget || '';
      if (target === 'scene' && button.dataset.speaking !== 'true' && shown < text.length) {
        finishReveal();
        button.focus({ preventScroll: true });
      }
      let speech = '';
      let segments = [];
      if (target === 'scene') {
        segments = [...text];
        if (isEnding && node.ending) segments.push(node.ending.summary);
        speech = segments.join(' ');
      } else if (target === 'lore' && node.lore) {
        speech = `${node.lore.title}. ${node.lore.body}. Source: ${node.lore.source}`;
        segments = [speech];
      } else if (target.startsWith('paragraph-')) {
        speech = text[Number(target.split('-')[1])] || '';
        segments = [speech];
      }
      const studio = selectedStudioVoice();
      playSagaNarration(button, speech, studio ? segments.map((part) => sagaAudioUrl(studio, part)) : []);
    });
  });

  continueButton?.addEventListener('click', advance);
  skipButton?.addEventListener('click', () => {
    finishReveal();
  });
  app.querySelector('.saga-copy')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.defaultPrevented || shown >= text.length) return;
    if (event.target.closest('button, a, input, textarea, select, summary')) return;
    event.preventDefault();
    advance();
  });

  const available = (node.choices || []).filter((choice) => choiceAvailable(choice, state));
  let busy = false;
  app.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      if (busy) return;
      const choice = available[Number(button.dataset.choice)];
      if (!choice) return;
      busy = true;
      button.classList.add('is-chosen');
      const next = applyEffects(pushHistory(state), choice.effects || {});
      next.node = choice.to;
      if (!next.visited.includes(choice.to)) next.visited = [...next.visited, choice.to];
      const target = data.nodes[choice.to];
      if (target?.ending && !next.endings.includes(target.ending.id)) {
        next.endings = [...next.endings, target.ending.id];
      }
      saveSaga(next);
      location.hash = `#/saga/${encodeURIComponent(choice.to)}`;
    });
  });

  app.querySelector('[data-testid="saga-back"]')?.addEventListener('click', () => {
    if (!last) return;
    location.hash = `#/saga/${encodeURIComponent(last.node)}`;
  });

  app.querySelector('[data-testid="saga-restart"]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Restart this thread?',
      message: `You will return to the first scene as ${state.name}. The endings you have already found stay unlocked.`,
      confirmLabel: 'Restart',
      cancelLabel: 'Keep going',
      danger: true,
    });
    if (!confirmed) return;
    const next = newSaga(state.name, { endings: state.endings });
    saveSaga(next);
    history.replaceState(null, '', `#/saga/${data.start}`);
    renderNode(app, data, next);
    window.scrollTo(0, 0);
  });

  app.querySelector('[data-testid="saga-again"]')?.addEventListener('click', () => {
    const next = newSaga(state.name, { endings: state.endings });
    saveSaga(next);
    history.replaceState(null, '', `#/saga/${data.start}`);
    renderNode(app, data, next);
    window.scrollTo(0, 0);
    toast('A new thread begins.', { tone: 'gold', duration: 2200 });
  });

  updateProgress();
  if (isEnding && choices) choices.hidden = false;
}

/* ------------------------------------------------------------------ */
/* Route entry                                                         */
/* ------------------------------------------------------------------ */

function redirectToSaved(app, data, state) {
  if (state) history.replaceState(null, '', `#/saga/${encodeURIComponent(state.node)}`);
  renderNode(app, data, state);
}

export async function renderSaga(app, route = {}) {
  const data = await loadSaga();
  let state = loadSagaState();
  const requested = route.nodeId || '';

  if (!state) {
    renderLanding(app, data, null);
    return;
  }

  if (!requested) {
    renderLanding(app, data, state);
    return;
  }

  if (!data.nodes[requested]) {
    renderLanding(app, data, state);
    toast('That scene is not part of this saga.', { tone: 'warn' });
    return;
  }

  if (requested !== state.node) {
    const history = state.history || [];
    let restoreIndex = -1;
    for (let index = history.length - 1; index >= 0; index -= 1) {
      if (history[index].node === requested) {
        restoreIndex = index;
        break;
      }
    }
    if (restoreIndex >= 0) {
      const snapshot = history[restoreIndex];
      state = saveSaga({
        ...state,
        node: snapshot.node,
        flags: { ...snapshot.flags },
        stats: { ...snapshot.stats },
        history: history.slice(0, restoreIndex),
        visited: [...new Set([...state.visited, snapshot.node])],
      });
      renderNode(app, data, state);
      return;
    }
    redirectToSaved(app, data, state);
    return;
  }

  renderNode(app, data, state);
}

export function sagaContinueHref() {
  const state = loadSagaState();
  return state ? `#/saga/${encodeURIComponent(state.node)}` : '#/saga';
}

export function sagaSummary() {
  const state = loadSagaState();
  return state
    ? { name: state.name, node: state.node, endings: state.endings.length, history: state.history.length }
    : null;
}
