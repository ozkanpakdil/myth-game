/**
 * narration.js — optional, local speech synthesis.
 *
 * There are no voice files and no celebrity voices. The browser's own
 * SpeechSynthesis engine reads the current paragraph or question. Audio is
 * opt-in per click, stops on navigation, and degrades quietly when a browser
 * has no speech support.
 */

import { getSettings, updateSettings } from './storage.js?v=20261107-4';

let generation = 0;

export function ensureNarration() {
  if (getSettings().audio) return;
  updateSettings({ audio: true });
  document.dispatchEvent(new CustomEvent('mythos:audio-change', { detail: { audio: true } }));
}

export function speechSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance === 'function';
}

export function narrationEnabled() {
  return getSettings().audio;
}

export function stopNarration() {
  generation += 1;
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* speech engines can throw when already idle */
  }
}

export function availableVoices() {
  if (!speechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .slice()
    .sort((a, b) => {
      const aEnglish = a.lang.toLowerCase().startsWith('en');
      const bEnglish = b.lang.toLowerCase().startsWith('en');
      if (aEnglish !== bEnglish) return aEnglish ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function chooseVoice() {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred = getSettings().voice;
  if (preferred) {
    const match = voices.find((voice) => voice.voiceURI === preferred || voice.name === preferred);
    if (match) return match;
  }

  return voices.find((voice) => voice.lang === 'en-GB' && voice.localService)
    || voices.find((voice) => voice.lang === 'en-GB')
    || voices.find((voice) => voice.lang.startsWith('en') && voice.localService)
    || voices.find((voice) => voice.lang.startsWith('en'))
    || voices[0];
}

export function narrate(text, { onStart, onEnd, onError } = {}) {
  if (!speechSupported()) {
    onError?.('unsupported');
    return false;
  }

  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    onError?.('empty');
    return false;
  }

  stopNarration();
  const token = generation;
  const utterance = new window.SpeechSynthesisUtterance(clean);
  const voice = chooseVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || 'en-GB';
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => {
    if (token !== generation) return;
    onStart?.();
  };
  utterance.onend = () => {
    if (token !== generation) return;
    onEnd?.();
  };
  utterance.onerror = (event) => {
    if (token !== generation) return;
    onError?.(event?.error || 'speech-error');
  };

  try {
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onError?.('speech-error');
    return false;
  }
}
