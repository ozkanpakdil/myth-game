/**
 * challenges.js — three text challenges built from the same JSON content.
 * Drag-and-drop is supported where a mouse is available; every action also has
 * keyboard controls, so no drag-and-drop is required.
 */
import { escapeHtml, focusPage, progressBar, toast, yearLabel, rangeLabel } from './ui.js?v=20261108-7';
import { loadMythologies, loadAllPlayable } from './content.js?v=20261108-7';
import { awardBadges, getChallengeRecord, recordChallenge } from './storage.js?v=20261108-7';
import { evaluateBadges } from './badges.js?v=20261108-7';

const CHALLENGES = [
  {
    id: 'timeline',
    name: 'Timeline Builder',
    href: '#/challenges/timeline',
    icon: '⏳',
    text: 'Six traditions, one order. Put them from oldest to youngest using the dates you have learned.',
  },
  {
    id: 'match',
    name: 'Pantheon Match',
    href: '#/challenges/match',
    icon: '⚖',
    text: 'A figure appears. Name the tradition they belong to, then the domain they rule.',
  },
  {
    id: 'culture',
    name: 'Which Culture?',
    href: '#/challenges/culture',
    icon: '❖',
    text: 'Read a line of story and identify where it comes from. Close reading beats guessing.',
  },
];

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function challengeHeader(eyebrow, title, description) {
  return `<header class="page-head">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1 id="page-title">${escapeHtml(title)}</h1>
    <p class="lede">${escapeHtml(description)}</p>
  </header>`;
}

function recordLine(record) {
  if (!record) return '<span class="muted small">Not attempted yet</span>';
  return `<span class="pill pill--quiet">Best ${record.bestScore}/${record.bestTotal}</span>
    <span class="muted small">${record.attempts} attempt${record.attempts === 1 ? '' : 's'}</span>`;
}

export async function renderChallengeHub(root) {
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((item) => item.mvp);
  root.innerHTML = `<div class="page" data-testid="challenges-page">
    <header class="page-head">
      <p class="eyebrow">Practice</p>
      <h1 id="page-title">Challenges</h1>
      <p class="lede">Three short tests of what you have noticed. Every challenge can be replayed; your best result is kept.</p>
    </header>
    <div class="challenge-grid">
      ${CHALLENGES.map((challenge) => {
        const record = getChallengeRecord(challenge.id);
        return `<article class="challenge-card" data-testid="challenge-${challenge.id}">
          <span class="challenge-card__icon" aria-hidden="true">${challenge.icon}</span>
          <h2>${escapeHtml(challenge.name)}</h2>
          <p>${escapeHtml(challenge.text)}</p>
          <div class="challenge-card__meta">${recordLine(record)}</div>
          <a class="button button--primary" href="${challenge.href}">${record ? 'Try again' : 'Start challenge'}</a>
        </article>`;
      }).join('')}
    </div>
    <section class="panel panel--soft study-note">
      <h2>Need a refresher?</h2>
      <p>The <a href="#/timeline">timeline</a> lists all ${mythologies.length} catalogued traditions by approximate period. The <a href="#/codex">codex</a> collects the figures and terms you have unlocked.</p>
      <p class="muted small">${playable.length} traditions are playable in this edition.</p>
    </section>
  </div>`;
  focusPage();
}

/* ------------------------------------------------------------------ */
/* Timeline Builder                                                    */
/* ------------------------------------------------------------------ */

export async function renderTimelineChallenge(root) {
  const mythologies = await loadMythologies();
  const playable = mythologies.filter((item) => item.mvp);
  let order = shuffled(playable).slice(0, 6);
  let checked = false;
  let dragId = null;

  function page() {
    root.innerHTML = `<div class="page page--narrow" data-testid="timeline-challenge">
      ${breadcrumb('Timeline Builder')}
      ${challengeHeader('Challenge 01', 'Build the timeline', 'Drag a card, or use its arrow buttons, to arrange the six traditions by their approximate start date, oldest first. The start date used for sorting is shown on each card. Dates are estimates and regional: the Iron Age starts at different times in different places. Ties are neighbours, and any order among equal dates is accepted.')}
      <div id="order-list" class="order-list" data-testid="order-list" role="list"></div>
      <div class="challenge-actions">
        <button class="button button--primary" type="button" data-testid="check-order">Check my order</button>
        <a class="button button--ghost" href="#/challenges">Back to challenges</a>
      </div>
      <p class="visually-hidden" id="order-status" role="status" data-testid="order-status"></p>
      <div id="order-result" tabindex="-1"></div>
    </div>`;
    renderOrder();
    root.querySelector('[data-testid="check-order"]').addEventListener('click', check);
    focusPage();
  }

  function announce(message) {
    const status = root.querySelector('#order-status');
    if (status) status.textContent = message;
  }

  function clearDropMark() {
    root.querySelectorAll('.order-item.is-drop-target').forEach((item) => {
      item.classList.remove('is-drop-target');
    });
  }

  function renderOrder() {
    const list = root.querySelector('#order-list');
    if (!list) return;
    list.innerHTML = order
      .map((item, i) => `<div class="order-item" role="listitem" tabindex="-1" draggable="${checked ? 'false' : 'true'}" data-testid="order-item-${item.id}">
        <span class="order-item__number" aria-hidden="true">${i + 1}</span>
        <div class="order-item__body">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="muted small">${escapeHtml(item.period_text)} · starts c. ${escapeHtml(yearLabel(item.start_year))}</span>
        </div>
        <div class="order-item__buttons">
          <button class="icon-button" type="button" data-testid="up-${item.id}" data-id="${item.id}" data-dir="-1" aria-label="Move ${escapeHtml(item.name)} up" ${i === 0 || checked ? 'disabled' : ''}>↑</button>
          <button class="icon-button" type="button" data-testid="down-${item.id}" data-id="${item.id}" data-dir="1" aria-label="Move ${escapeHtml(item.name)} down" ${i === order.length - 1 || checked ? 'disabled' : ''}>↓</button>
        </div>
      </div>`)
      .join('');

    list.querySelectorAll('button[data-dir]').forEach((button) => {
      button.addEventListener('click', () => {
        const from = order.findIndex((item) => item.id === button.dataset.id);
        const to = from + Number(button.dataset.dir);
        if (to < 0 || to >= order.length) return;
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        renderOrder();
        announce(`${moved.name} moved to position ${to + 1} of ${order.length}.`);
        const movedItem = root.querySelector(`[data-testid="order-item-${button.dataset.id}"]`);
        const movedButton = movedItem?.querySelector(`button[data-dir="${button.dataset.dir}"]:not([disabled])`)
          || movedItem?.querySelector('button[data-dir]:not([disabled])');
        (movedButton || movedItem)?.focus();
      });
    });

    list.querySelectorAll('.order-item').forEach((item) => {
      item.addEventListener('dragstart', (event) => {
        if (checked) {
          event.preventDefault();
          return;
        }
        dragId = item.dataset.testid.replace('order-item-', '');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragId);
        item.classList.add('is-dragging');
        announce(`Dragging ${item.querySelector('strong')?.textContent || 'tradition'}. Drop it on another card to move it.`);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('is-dragging');
        clearDropMark();
        dragId = null;
      });

      item.addEventListener('dragover', (event) => {
        if (!dragId || item.dataset.testid === `order-item-${dragId}`) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        clearDropMark();
        item.classList.add('is-drop-target');
      });

      item.addEventListener('dragleave', (event) => {
        if (!item.contains(event.relatedTarget)) item.classList.remove('is-drop-target');
      });

      item.addEventListener('drop', (event) => {
        event.preventDefault();
        if (!dragId) return;
        const targetId = item.dataset.testid.replace('order-item-', '');
        if (targetId === dragId) return;
        const from = order.findIndex((entry) => entry.id === dragId);
        const over = order.findIndex((entry) => entry.id === targetId);
        if (from < 0 || over < 0) return;
        const [moved] = order.splice(from, 1);
        order.splice(over, 0, moved);
        dragId = null;
        clearDropMark();
        renderOrder();
        announce(`${moved.name} moved to position ${over + 1} of ${order.length}.`);
        const movedItem = root.querySelector(`[data-testid="order-item-${moved.id}"]`);
        movedItem?.focus();
      });
    });
  }

  function check() {
    if (checked) return;
    checked = true;
    root.querySelectorAll('.order-item').forEach((item) => {
      item.draggable = false;
      item.classList.remove('is-drop-target', 'is-dragging');
    });
    root.querySelectorAll('button[data-dir]').forEach((button) => {
      button.disabled = true;
    });
    const years = order.map((item) => item.start_year);
    const sortedYears = [...years].sort((a, b) => a - b);
    const correctPositions = years.filter((year, i) => year === sortedYears[i]).length;
    const perfect = years.every((year, i) => i === 0 || years[i - 1] <= year);
    const score = perfect ? order.length : correctPositions;
    const record = recordChallenge('timeline', score, order.length);
    if (perfect) {
      const newBadges = awardBadges(evaluateBadges({ playable }));
      if (newBadges.length) toast('Badge unlocked: Timeline Master', { tone: 'gold' });
    }
    const sorted = [...order].sort((a, b) => a.start_year - b.start_year || a.name.localeCompare(b.name));
    const result = root.querySelector('#order-result');
    result.innerHTML = `<section class="result-card result-card--compact ${perfect ? 'is-pass' : 'is-fail'}" data-testid="order-result">
      <p class="eyebrow">${perfect ? 'Perfect order' : 'Close, but not quite'}</p>
      <h2 data-testid="order-score">${score} / ${order.length}</h2>
      <p>${perfect ? 'You placed every tradition in a valid chronological order.' : 'The correct order by approximate start date is shown below. Remember that traditions overlap for centuries.'}</p>
      <ol class="correct-order">
        ${sorted.map((item) => `<li><strong>${escapeHtml(item.name)}</strong> <span class="muted">${escapeHtml(rangeLabel(item.start_year, item.end_year))}</span></li>`).join('')}
      </ol>
      <p class="muted small">Start dates mark the approximate beginning of the surviving material, not a tradition's end. Period labels are regional; for example, the Iron Age begins around 1200 BCE in Anatolia, 800 BCE in central Europe and 500 BCE in Scandinavia.</p>
      <p class="muted small">Best so far: ${record.bestScore}/${record.bestTotal} · ${record.attempts} attempt${record.attempts === 1 ? '' : 's'}</p>
      <div class="result-actions">
        <button class="button button--primary" type="button" data-testid="timeline-retry">Try a new set</button>
        <a class="button button--ghost" href="#/challenges">Back to challenges</a>
      </div>
    </section>`;
    root.querySelector('[data-testid="timeline-retry"]').addEventListener('click', () => {
      order = shuffled(playable).slice(0, 6);
      checked = false;
      dragId = null;
      page();
    });
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    result.focus({ preventScroll: true });
  }

  page();
}

/* ------------------------------------------------------------------ */
/* Pantheon Match                                                      */
/* ------------------------------------------------------------------ */

export async function renderMatchChallenge(root) {
  const playable = await loadAllPlayable();
  let rounds = shuffled(playable)
    .slice(0, 5)
    .map((entry) => ({
      entry,
      character: entry.characters[Math.floor(Math.random() * entry.characters.length)],
    }));
  let roundIndex = 0;
  let score = 0;
  let pointsThisRound = 0;
  let cultureChoice = null;
  let stage = 'culture';

  function page() {
    root.innerHTML = `<div class="page page--narrow" data-testid="match-challenge">
      ${breadcrumb('Pantheon Match')}
      ${challengeHeader('Challenge 02', 'Name the figure', 'First choose the tradition the figure belongs to. Then choose the domain they rule. Each correct answer is one point.')}
      <div id="match-stage"></div>
      <p class="muted small">Round ${roundIndex + 1} of ${rounds.length} · score ${score}/10</p>
    </div>`;
    renderRound();
    focusPage();
  }

  function cultureOptions(entry) {
    const others = shuffled(playable.filter((item) => item.meta.id !== entry.meta.id)).slice(0, 3);
    return shuffled([entry.meta, ...others.map((item) => item.meta)]);
  }

  function domainOptions(character) {
    const pool = [...new Set(playable.flatMap((entry) => entry.characters.flatMap((c) => c.domain)))];
    const wrong = shuffled(pool.filter((domain) => domain !== character.domain[0])).slice(0, 3);
    return shuffled([character.domain[0], ...wrong]);
  }

  function renderRound() {
    const round = rounds[roundIndex];
    const stageHost = root.querySelector('#match-stage');
    const character = round.character;
    const meta = round.entry.meta;
    if (stage === 'culture') {
      stageHost.innerHTML = `<section class="question-card">
        <p class="eyebrow">Figure ${roundIndex + 1}</p>
        <div class="figure-card">
          ${icon(meta.id)}
          <div>
            <h2>${escapeHtml(character.name)}</h2>
            <p class="muted">${escapeHtml(character.role)}</p>
            <p class="small">Symbols: ${escapeHtml(character.symbols.join(', '))}</p>
          </div>
        </div>
        <h3>Which tradition does ${escapeHtml(character.name)} belong to?</h3>
        <div class="choices choices--grid" role="group" aria-label="Choose a tradition">
          ${cultureOptions(round.entry)
            .map((item) => `<button class="choice" type="button" data-testid="match-culture-${item.id}" data-culture="${item.id}"><span class="choice__text">${escapeHtml(item.name)}</span></button>`)
            .join('')}
        </div>
        <div id="match-feedback" aria-live="polite"></div>
      </section>`;
      stageHost.querySelectorAll('[data-culture]').forEach((button) => {
        button.addEventListener('click', () => chooseCulture(button.dataset.culture));
      });
    } else if (stage === 'domain') {
      stageHost.innerHTML = `<section class="question-card">
        <p class="eyebrow">Figure ${roundIndex + 1}</p>
        <div class="figure-card">
          ${icon(meta.id)}
          <div>
            <h2>${escapeHtml(character.name)}</h2>
            <p class="muted">${escapeHtml(meta.name)} · ${escapeHtml(character.role)}</p>
          </div>
        </div>
        <p class="pill ${cultureChoice === meta.id ? 'pill--gold' : 'pill--danger'}">${cultureChoice === meta.id ? 'Tradition correct' : `Tradition: ${escapeHtml(meta.name)}`}</p>
        <h3>Which domain belongs to ${escapeHtml(character.name)}?</h3>
        <div class="choices" role="group" aria-label="Choose a domain">
          ${domainOptions(character)
            .map((domain, i) => `<button class="choice" type="button" data-testid="match-domain-${i}" data-domain="${escapeHtml(domain)}"><span class="choice__text">${escapeHtml(domain)}</span></button>`)
            .join('')}
        </div>
        <div id="match-feedback" aria-live="polite"></div>
      </section>`;
      stageHost.querySelectorAll('[data-domain]').forEach((button) => {
        button.addEventListener('click', () => chooseDomain(button.dataset.domain));
      });
    } else {
      stageHost.innerHTML = `<section class="result-card result-card--compact" data-testid="match-result">
        <p class="eyebrow">Challenge complete</p>
        <h2 data-testid="match-score">${score} / 10</h2>
        <p>${score === 10 ? 'Every figure placed and every domain named.' : 'Each figure is worth a tradition point and a domain point. Try again to improve your score.'}</p>
        <div class="result-actions">
          <button class="button button--primary" type="button" data-testid="match-retry">Play again</button>
          <a class="button button--ghost" href="#/challenges">Back to challenges</a>
        </div>
      </section>`;
      stageHost.querySelector('[data-testid="match-retry"]').addEventListener('click', resetMatch);
    }
  }

  function resetMatch() {
    rounds = shuffled(playable)
      .slice(0, 5)
      .map((entry) => ({
        entry,
        character: entry.characters[Math.floor(Math.random() * entry.characters.length)],
      }));
    roundIndex = 0;
    score = 0;
    pointsThisRound = 0;
    cultureChoice = null;
    stage = 'culture';
    page();
  }

  function chooseCulture(cultureId) {
    if (stage !== 'culture') return;
    cultureChoice = cultureId;
    if (cultureId === rounds[roundIndex].entry.meta.id) {
      score += 1;
      pointsThisRound += 1;
    }
    stage = 'domain';
    renderRound();
  }

  function chooseDomain(domain) {
    if (stage !== 'domain') return;
    const round = rounds[roundIndex];
    const correctDomain = round.character.domain[0];
    const domainCorrect = domain === correctDomain;
    if (domainCorrect) {
      score += 1;
      pointsThisRound += 1;
    }
    stage = 'feedback';
    const feedback = root.querySelector('#match-feedback');
    feedback.innerHTML = `<div class="quiz-feedback is-visible ${pointsThisRound === 2 ? 'is-correct' : 'is-wrong'}">
      <p class="quiz-feedback__title">${pointsThisRound}/2 this round</p>
      <p class="quiz-feedback__body">${escapeHtml(round.character.name)} belongs to the <strong>${escapeHtml(round.entry.meta.name)}</strong> tradition. Their domain includes <strong>${escapeHtml(correctDomain)}</strong>.</p>
      <p class="quiz-feedback__correct">${escapeHtml(round.character.fun_fact)}</p>
      <button class="button button--primary" type="button" data-testid="match-next">${roundIndex + 1 === rounds.length ? 'See result' : 'Next figure'}</button>
    </div>`;
    feedback.querySelector('[data-testid="match-next"]').addEventListener('click', () => {
      if (roundIndex + 1 < rounds.length) {
        roundIndex += 1;
        pointsThisRound = 0;
        cultureChoice = null;
        stage = 'culture';
        page();
      } else {
        const record = recordChallenge('match', score, 10);
        if (score === 10) {
          awardBadges(evaluateBadges({ playable: playable.map((entry) => entry.meta) }));
          toast('Badge unlocked: Matchmaker', { tone: 'gold' });
        }
        stage = 'result';
        renderRound();
        const result = root.querySelector('[data-testid="match-result"]');
        if (result) {
          result.insertAdjacentHTML(
            'beforeend',
            `<p class="muted small">Best so far: ${record.bestScore}/${record.bestTotal} · ${record.attempts} attempt${record.attempts === 1 ? '' : 's'}</p>`,
          );
        }
      }
    });
    // Read the verdict before the next button takes focus.
    feedback.setAttribute('tabindex', '-1');
    feedback.focus();
  }

  page();
}

/* ------------------------------------------------------------------ */
/* Which Culture?                                                      */
/* ------------------------------------------------------------------ */

export async function renderCultureChallenge(root) {
  const playable = await loadAllPlayable();
  function makeRounds() {
    return shuffled(playable)
      .slice(0, 5)
      .map((entry) => {
        const story = entry.stories[Math.floor(Math.random() * entry.stories.length)];
        const paragraph = String(story.paragraphs[0] || '').trim();
        const snippet = paragraph.length > 230 ? `${paragraph.slice(0, 230).replace(/\s+\S*$/, '')}…` : paragraph;
        return { entry, story, snippet };
      });
  }
  let rounds = makeRounds();
  let roundIndex = 0;
  let score = 0;
  let stage = 'question';

  function page() {
    root.innerHTML = `<div class="page page--narrow" data-testid="culture-challenge">
      ${breadcrumb('Which Culture?')}
      ${challengeHeader('Challenge 03', 'Read the clue', 'Every line is quoted from one of the six stories in this game. Choose the tradition it belongs to.')}
      <div id="culture-stage"></div>
      <p class="muted small">Round ${roundIndex + 1} of ${rounds.length} · score ${score}/${rounds.length}</p>
    </div>`;
    renderRound();
    focusPage();
  }

  function optionsFor(entry) {
    const others = shuffled(playable.filter((item) => item.meta.id !== entry.meta.id)).slice(0, 3);
    return shuffled([entry.meta, ...others.map((item) => item.meta)]);
  }

  function renderRound() {
    const round = rounds[roundIndex];
    const host = root.querySelector('#culture-stage');
    if (stage === 'question') {
      host.innerHTML = `<section class="question-card">
        <p class="eyebrow">Clue ${roundIndex + 1}</p>
        <blockquote class="story-snippet" data-testid="culture-snippet">${escapeHtml(round.snippet)}</blockquote>
        <h2>Which tradition is this from?</h2>
        <div class="choices choices--grid" role="group" aria-label="Choose a tradition">
          ${optionsFor(round.entry)
            .map((item) => `<button class="choice" type="button" data-testid="culture-option-${item.id}" data-culture="${item.id}"><span class="choice__text">${escapeHtml(item.name)}</span></button>`)
            .join('')}
        </div>
        <div id="culture-feedback" aria-live="polite"></div>
      </section>`;
      host.querySelectorAll('[data-culture]').forEach((button) => {
        button.addEventListener('click', () => choose(button.dataset.culture));
      });
    } else if (stage === 'result') {
      host.innerHTML = `<section class="result-card result-card--compact" data-testid="culture-result">
        <p class="eyebrow">Challenge complete</p>
        <h2 data-testid="culture-score">${score} / ${rounds.length}</h2>
        <p>${score === rounds.length ? 'A perfect ear for story.' : 'Every snippet comes from a story in the game. Read the explanations and try again.'}</p>
        <div class="result-actions">
          <button class="button button--primary" type="button" data-testid="culture-retry">Play again</button>
          <a class="button button--ghost" href="#/challenges">Back to challenges</a>
        </div>
      </section>`;
      host.querySelector('[data-testid="culture-retry"]').addEventListener('click', resetCulture);
    }
  }

  function resetCulture() {
    rounds = makeRounds();
    roundIndex = 0;
    score = 0;
    stage = 'question';
    page();
  }

  function choose(cultureId) {
    if (stage !== 'question') return;
    const round = rounds[roundIndex];
    const correct = cultureId === round.entry.meta.id;
    if (correct) score += 1;
    stage = 'answered';
    const host = root.querySelector('#culture-stage');
    host.querySelectorAll('[data-culture]').forEach((button) => {
      button.disabled = true;
      if (button.dataset.culture === round.entry.meta.id) button.classList.add('is-correct');
      else if (button.dataset.culture === cultureId) button.classList.add('is-wrong');
      else button.classList.add('is-dimmed');
    });
    const feedback = root.querySelector('#culture-feedback');
    feedback.innerHTML = `<div class="quiz-feedback is-visible ${correct ? 'is-correct' : 'is-wrong'}">
      <p class="quiz-feedback__title">${correct ? 'Correct' : 'Not quite'}</p>
      <p class="quiz-feedback__body">This is from <strong>${escapeHtml(round.story.title)}</strong>, a ${escapeHtml(round.entry.meta.name)} story. Source: ${escapeHtml(round.story.source_ref)}.</p>
      <button class="button button--primary" type="button" data-testid="culture-next">${roundIndex + 1 === rounds.length ? 'See result' : 'Next clue'}</button>
    </div>`;
    feedback.querySelector('[data-testid="culture-next"]').addEventListener('click', () => {
      if (roundIndex + 1 < rounds.length) {
        roundIndex += 1;
        stage = 'question';
        page();
      } else {
        const record = recordChallenge('culture', score, rounds.length);
        if (score === rounds.length) {
          awardBadges(evaluateBadges({ playable: playable.map((entry) => entry.meta) }));
          toast('Badge unlocked: Culture Detective', { tone: 'gold' });
        }
        stage = 'result';
        renderRound();
        const result = root.querySelector('[data-testid="culture-result"]');
        if (result) {
          result.insertAdjacentHTML(
            'beforeend',
            `<p class="muted small">Best so far: ${record.bestScore}/${record.bestTotal} · ${record.attempts} attempt${record.attempts === 1 ? '' : 's'}</p>`,
          );
        }
      }
    });
    // Read the verdict before the next button takes focus.
    feedback.setAttribute('tabindex', '-1');
    feedback.focus();
  }

  page();
}

function breadcrumb(label) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#/challenges">Challenges</a><span aria-hidden="true">/</span>
    <span aria-current="page">${escapeHtml(label)}</span>
  </nav>`;
}

function icon(id) {
  return `<img class="sigil sigil--small" src="assets/svg/icons/${escapeHtml(id)}.svg" alt="" width="40" height="40">`;
}
