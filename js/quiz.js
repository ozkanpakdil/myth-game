/**
 * quiz.js — story quizzes and the 20-question final challenge.
 *
 * A story quiz is built from all questions tagged to that story plus up to two
 * review questions from the previous stories, so every quiz has 4–5 questions
 * and a passing mark of 70% (3/4 or 4/5). The final challenge uses all 20.
 */
import { escapeHtml, iconImg, progressBar, toast, focusPage, difficultyClass, percent, listenButtonContent } from './ui.js?v=20261107-5';
import { getQuizRecord, recordQuizResult, recordFinalQuiz, recordStoryRead, awardBadges, isStoryRead } from './storage.js?v=20261107-5';
import { loadMythology, loadMythologies, storyIndexById, nextStory } from './content.js?v=20261107-5';
import { allStoryQuizzesPassed, isStoryUnlocked } from './progress.js?v=20261107-5';
import { evaluateBadges } from './badges.js?v=20261107-5';
import { questionScene, choiceIcon } from './scene.js?v=20261107-5';
import { narrate, stopNarration, ensureNarration, speechSupported } from './narration.js?v=20261107-5';

const PASS_RATIO = 0.7;

function passMark(total) {
  return Math.ceil(total * PASS_RATIO);
}

function buildStoryQuiz(data, storyId) {
  const index = storyIndexById(data.stories, storyId);
  const own = data.quiz.filter((question) => question.story_id === storyId);
  const needed = Math.max(0, 5 - own.length);
  const review = [];
  for (let i = index - 1; i >= 0 && review.length < needed; i -= 1) {
    const candidates = data.quiz.filter((question) => question.story_id === data.stories[i].id);
    for (let j = candidates.length - 1; j >= 0 && review.length < needed; j -= 1) {
      review.push(candidates[j]);
    }
  }
  return [...own, ...review];
}

function breadcrumb(meta, label) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#/myths">Traditions</a><span aria-hidden="true">/</span>
    <a href="#/myth/${escapeHtml(meta.id)}">${escapeHtml(meta.name)}</a><span aria-hidden="true">/</span>
    <span aria-current="page">${escapeHtml(label)}</span>
  </nav>`;
}

function lockedScreen(root, meta, message, backLabel, backHref) {
  root.innerHTML = `<div class="page page--narrow" data-testid="quiz-locked">
    ${breadcrumb(meta, 'Quiz locked')}
    <div class="panel panel--center">
      <p class="eyebrow">Not yet</p>
      <h1 id="page-title">This quiz is still sealed.</h1>
      <p class="lede">${escapeHtml(message)}</p>
      <a class="button button--primary" href="${backHref}">${escapeHtml(backLabel)}</a>
    </div>
  </div>`;
  focusPage();
}

export async function renderQuiz(root, { mythId, storyId }) {
  const mythologies = await loadMythologies();
  const meta = mythologies.find((item) => item.id === mythId);
  if (!meta || !meta.mvp) {
    root.innerHTML = `<div class="page page--narrow"><div class="panel panel--center"><h1 id="page-title">Unknown tradition</h1><p>That tradition is not in this edition.</p><a class="button" href="#/myths">Back to traditions</a></div></div>`;
    return;
  }

  const data = await loadMythology(mythId);
  const isFinal = storyId === 'final';
  let story = null;
  let questions = [];
  let title = '';
  let quizLabel = '';

  if (isFinal) {
    if (!allStoryQuizzesPassed(mythId, data.stories)) {
      lockedScreen(
        root,
        meta,
        'Pass all six story quizzes to open the final challenge. Each quiz unlocks after you finish the story before it.',
        'Back to the tradition',
        `#/myth/${meta.id}`,
      );
      return;
    }
    questions = [...data.quiz];
    title = 'Final challenge';
    quizLabel = `${meta.name} · all 20 questions`;
  } else {
    const index = storyIndexById(data.stories, storyId);
    if (index < 0) {
      lockedScreen(root, meta, 'That story does not exist in this tradition.', 'Back to the tradition', `#/myth/${meta.id}`);
      return;
    }
    if (!isStoryUnlocked(mythId, data.stories, index)) {
      lockedScreen(
        root,
        meta,
        'Pass the previous story quiz to unlock this one.',
        'Back to the tradition',
        `#/myth/${meta.id}`,
      );
      return;
    }
    story = data.stories[index];
    questions = buildStoryQuiz(data, storyId);
    title = `Quiz · ${story.title}`;
    quizLabel = `${meta.name} · story ${index + 1} of ${data.stories.length}`;
  }

  const total = questions.length;
  const required = passMark(total);
  const previousRecord = isFinal ? null : getQuizRecord(mythId, storyId);

  let index = 0;
  let score = 0;
  let answered = false;
  let selectedIndex = -1;
  const answers = [];

  function header() {
    const currentStory = story;
    return `<div class="page page--quiz" data-testid="quiz-page">
      ${breadcrumb(meta, 'Quiz')}
      <header class="page-head">
        <p class="eyebrow">${escapeHtml(quizLabel)}</p>
        <h1 id="page-title">${escapeHtml(title)}</h1>
        <div class="quiz-meta">
          <span class="pill pill--quiet">${total} questions</span>
          <span class="pill pill--quiet">Pass mark ${required}/${total}</span>
          ${currentStory ? `<span class="pill pill--quiet">${escapeHtml(currentStory.themes.slice(0, 2).join(' · '))}</span>` : ''}
        </div>
        ${previousRecord ? `<p class="muted small">Previous best: ${previousRecord.bestScore}/${previousRecord.bestTotal || total}${previousRecord.passed ? ' · passed' : ''}</p>` : ''}
      </header>
      <div class="quiz-progress">
        <span class="quiz-progress__label" data-testid="quiz-progress-label">Question ${index + 1} of ${total}</span>
        ${progressBar(index, total, 'Quiz progress')}
      </div>
      <div id="quiz-stage"></div>
    </div>`;
  }

  function readQuestion(question, button) {
    if (!speechSupported()) {
      toast('Narration is not available in this browser. You can still read the question.', { tone: 'warn' });
      return;
    }
    if (button?.dataset.speaking === 'true') {
      stopNarration();
      button.dataset.speaking = 'false';
      button.innerHTML = listenButtonContent('Listen');
      return;
    }
    ensureNarration();
    const text = `Question ${index + 1} of ${total}. ${question.question}. ${question.choices
      .map((choice, i) => `${'ABCD'[i]}: ${choice}.`)
      .join(' ')}`;
    const started = narrate(text, {
      onEnd() {
        if (!button) return;
        button.dataset.speaking = 'false';
        button.innerHTML = listenButtonContent('Listen');
      },
      onError() {
        if (!button) return;
        button.dataset.speaking = 'false';
        button.innerHTML = listenButtonContent('Listen');
      },
    });
    if (!started) {
      toast('Narration could not start.', { tone: 'warn' });
      return;
    }
    if (button) {
      button.dataset.speaking = 'true';
      button.innerHTML = listenButtonContent('Stop', true);
    }
  }

  function renderQuestion() {
    stopNarration();
    root.innerHTML = header();
    const stage = root.querySelector('#quiz-stage');
    const question = questions[index];
    const questionStory = data.stories.find((item) => item.id === question.story_id);
    const art = questionScene(meta, question, questionStory);
    const choices = question.choices
      .map((choice, choiceIndex) => {
        const icon = choiceIcon(meta.id, choice, data.characters, art.motif);
        return `<button class="choice choice--icon" type="button" data-index="${choiceIndex}" data-testid="quiz-choice-${choiceIndex}">
              ${icon}
              <span class="choice__text">${escapeHtml(choice)}</span>
              <span class="choice__key" aria-hidden="true">${'ABCD'[choiceIndex]}</span>
            </button>`;
      })
      .join('');

    stage.innerHTML = `<section class="question-card question-card--visual" aria-labelledby="question-text">
      <div class="question-layout">
        <aside class="question-art" data-testid="quiz-scene" data-motif="${art.motif}">
          <figure class="pixel-frame pixel-frame--quiz">
            ${art.svg}
            <figcaption class="question-art__caption">
              <strong>${escapeHtml(art.caption)}</strong>
              <span>${questionStory ? escapeHtml(questionStory.title) : 'The final challenge'}</span>
            </figcaption>
          </figure>
          <p class="question-art__note">A clue, not the answer key.</p>
        </aside>
        <div class="question-main">
          <div class="question-card__top">
            <span class="pill ${difficultyClass(question.difficulty)}">${escapeHtml(question.difficulty)}</span>
            <div class="question-card__tools">
              <button class="button button--ghost button--small" type="button" data-testid="quiz-listen">${listenButtonContent('Listen')}</button>
              <span class="muted small">${index + 1} / ${total}</span>
            </div>
          </div>
          <h2 class="question-card__text" id="question-text" data-testid="quiz-question" tabindex="-1">${escapeHtml(question.question)}</h2>
          <div class="choices" role="group" aria-labelledby="question-text">
            ${choices}
          </div>
          <p class="key-hint" aria-hidden="true">Keys: A–D or 1–4 to answer · Enter for next</p>
          <div id="quiz-feedback" class="quiz-feedback" aria-live="polite"></div>
        </div>
      </div>
    </section>`;

    stage.querySelectorAll('.choice').forEach((button) => {
      button.addEventListener('click', () => choose(Number(button.dataset.index)));
    });
    stage.querySelector('[data-testid="quiz-listen"]')?.addEventListener('click', (event) => {
      readQuestion(question, event.currentTarget);
    });
    answered = false;
    selectedIndex = -1;
    root.onkeydown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      if (event.target.closest('button, a, input, textarea, select')) return;
      if (!answered && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        choose(Number(event.key) - 1);
      } else if (!answered && /^[a-d]$/i.test(event.key)) {
        event.preventDefault();
        choose(event.key.toUpperCase().charCodeAt(0) - 65);
      } else if (answered && event.key === 'Enter') {
        event.preventDefault();
        next();
      }
    };
    const heading = stage.querySelector('[data-testid="quiz-question"]');
    heading?.focus({ preventScroll: true });
  }

  function choose(choiceIndex) {
    if (answered) return;
    stopNarration();
    const listenButton = root.querySelector('[data-testid="quiz-listen"]');
    if (listenButton) {
      listenButton.dataset.speaking = 'false';
      listenButton.innerHTML = listenButtonContent('Listen');
    }
    answered = true;
    selectedIndex = choiceIndex;
    const question = questions[index];
    const correct = choiceIndex === question.correct_index;
    if (correct) score += 1;
    answers.push({ question, selected: choiceIndex, correct });

    const buttons = [...root.querySelectorAll('.choice')];
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (i === question.correct_index) button.classList.add('is-correct');
      else if (i === choiceIndex) button.classList.add('is-wrong');
      else button.classList.add('is-dimmed');
      button.setAttribute('aria-pressed', i === choiceIndex ? 'true' : 'false');
    });

    const progressLabel = root.querySelector('[data-testid="quiz-progress-label"]');
    if (progressLabel) progressLabel.textContent = `Question ${index + 1} of ${total} · score ${score}`;

    const feedback = root.querySelector('#quiz-feedback');
    feedback.className = `quiz-feedback is-visible ${correct ? 'is-correct' : 'is-wrong'}`;
    feedback.innerHTML = `<p class="quiz-feedback__title">${correct ? 'Correct' : 'Not quite'}</p>
      <p class="quiz-feedback__body">${escapeHtml(question.explanation)}</p>
      <p class="quiz-feedback__correct">The answer is <strong>${escapeHtml(question.choices[question.correct_index])}</strong>.</p>
      <button class="button button--primary" type="button" data-testid="quiz-next">
        ${index + 1 === total ? 'See results' : 'Next question'}
      </button>`;
    feedback.querySelector('[data-testid="quiz-next"]').addEventListener('click', next);
    feedback.querySelector('[data-testid="quiz-next"]').focus();
  }

  function next() {
    stopNarration();
    if (index + 1 < total) {
      index += 1;
      renderQuestion();
    } else {
      finish();
    }
  }

  async function finish() {
    stopNarration();
    root.onkeydown = null;
    const passed = score >= required;
    if (isFinal) {
      recordFinalQuiz({ mythId, score, total, passed });
    } else {
      recordQuizResult({ mythId, storyId, score, total, passed });
      if (!isStoryRead(mythId, storyId)) recordStoryRead(mythId, storyId);
    }

    const playable = mythologies.filter((item) => item.mvp);
    const newBadges = awardBadges(evaluateBadges({ playable }));
    if (newBadges.length) {
      const names = newBadges.slice(0, 2).join(' · ');
      toast(`Badge unlocked: ${names}${newBadges.length > 2 ? ` +${newBadges.length - 2}` : ''}`, { tone: 'gold' });
    }

    const next = story ? nextStory(data.stories, storyId) : null;
    const finalReady = !isFinal && allStoryQuizzesPassed(mythId, data.stories);
    const percentScore = percent(score, total);
    const record = isFinal ? null : getQuizRecord(mythId, storyId);

    root.innerHTML = `<div class="page page--narrow" data-testid="quiz-result">
      ${breadcrumb(meta, 'Results')}
      <section class="result-card ${passed ? 'is-pass' : 'is-fail'}">
        <p class="eyebrow">${isFinal ? 'Final challenge complete' : 'Quiz complete'}</p>
        <h1 id="page-title">${passed ? (percentScore === 100 ? 'Flawless.' : 'Well read.') : 'Not quite yet.'}</h1>
        <div class="result-score">
          <strong data-testid="quiz-score">${score}</strong><span>/ ${total}</span>
        </div>
        <p class="result-percent">${percentScore}% · ${passed ? 'passed' : `needs ${required}/${total}`}</p>
        <p class="status ${passed ? 'status--ok' : 'status--warn'}" data-testid="quiz-pass">${passed ? 'Passed' : 'Not passed yet'}</p>
        ${passed
          ? `<p class="lede">${isFinal ? 'You have completed the final challenge for this tradition.' : next ? `The next story is unlocked: <strong>${escapeHtml(next.title)}</strong>.` : 'You have finished the last story quiz in this tradition.'}</p>`
          : '<p class="lede">Read the explanations below, then try again. You can retake a quiz as many times as you like.</p>'}
        ${record?.perfect ? '<p class="pill pill--gold">Perfect score</p>' : ''}
        <div class="result-actions">
          <button class="button button--primary" type="button" data-testid="quiz-retry">Try again</button>
          <a class="button button--ghost" href="#/myth/${escapeHtml(meta.id)}">Back to ${escapeHtml(meta.name)}</a>
          ${passed && next ? `<a class="button button--ghost" href="#/myth/${escapeHtml(meta.id)}/story/${escapeHtml(next.id)}" data-testid="next-story">Next story</a>` : ''}
          ${finalReady && !isFinal ? `<a class="button button--ghost" href="#/myth/${escapeHtml(meta.id)}/quiz/final" data-testid="final-quiz-link">Final challenge</a>` : ''}
          ${isFinal && passed ? `<a class="button button--ghost" href="#/results">See your progress</a>` : ''}
        </div>
      </section>
      <details class="review">
        <summary>Review all ${total} answers</summary>
        <ol class="review-list">
          ${answers
            .map(
              (item, i) => `<li class="review-item ${item.correct ? 'is-correct' : 'is-wrong'}">
                <p class="review-item__q"><span>${i + 1}.</span> ${escapeHtml(item.question.question)}</p>
                <p class="review-item__a"><span class="review-item__tag">Your answer</span> ${escapeHtml(item.question.choices[item.selected])}</p>
                ${item.correct ? '' : `<p class="review-item__a"><span class="review-item__tag">Correct</span> ${escapeHtml(item.question.choices[item.question.correct_index])}</p>`}
                <p class="review-item__why">${escapeHtml(item.question.explanation)}</p>
              </li>`,
            )
            .join('')}
        </ol>
      </details>
    </div>`;

    root.querySelector('[data-testid="quiz-retry"]')?.addEventListener('click', retry);
    focusPage();
  }

  function retry() {
    stopNarration();
    index = 0;
    score = 0;
    answered = false;
    selectedIndex = -1;
    answers.length = 0;
    renderQuestion();
  }

  renderQuestion();
}
