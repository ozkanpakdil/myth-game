/**
 * narration.js — optional, local speech synthesis.
 *
 * The browser's own SpeechSynthesis engine is the fallback. When a reader picks
 * a studio voice, pre-generated neural MP3s are played instead; if a clip is
 * missing or cannot play, the same text falls back to the system voice. Audio is
 * opt-in per click, stops on navigation, and degrades quietly.
 */

import { getSettings, updateSettings, STUDIO_VOICES } from './storage.js?v=20261107-10';

let generation = 0;
let currentAudio = null;

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

/**
 * Build the stable path for a generated studio clip. Paths mirror the authoring
 * scripts in tools/ (generate_piper_audio.py, generate_xtts_audio.py); no
 * manifest lookup is needed.
 */
export function studioAudioUrl(voice, kind, id, index = 0) {
  if (!voice || !STUDIO_VOICES.includes(voice) || !id) return '';
  if (kind === 'story') return `audio/voices/${voice}/story/${id}-${index}.mp3`;
  if (kind === 'quiz') return `audio/voices/${voice}/quiz/${id}.mp3`;
  return '';
}

export function narrationSupported(audioUrl = '') {
  const canPlayAudio = Boolean(audioUrl)
    && typeof window !== 'undefined'
    && typeof window.Audio === 'function';
  return canPlayAudio || speechSupported();
}

export function stopNarration() {
  generation += 1;
  if (currentAudio) {
    const audio = currentAudio;
    currentAudio = null;
    try {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.remove();
    } catch {
      /* the media element may already be detached */
    }
  }
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

function speak(clean, { token, onStart, onEnd, onError }) {
  if (!speechSupported()) {
    onError?.('unsupported');
    return false;
  }

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

export function narrate(text, { audioUrl = '', onStart, onEnd, onError } = {}) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    onError?.('empty');
    return false;
  }

  const canPlayAudio = Boolean(audioUrl)
    && typeof window !== 'undefined'
    && typeof window.Audio === 'function';
  if (!canPlayAudio && !speechSupported()) {
    onError?.('unsupported');
    return false;
  }

  stopNarration();
  const token = generation;

  if (canPlayAudio) {
    const audio = new window.Audio();
    audio.preload = 'auto';
    audio.src = audioUrl;
    audio.hidden = true;
    audio.setAttribute('aria-hidden', 'true');
    document.body.append(audio);
    currentAudio = audio;
    let finished = false;

    const dispose = () => {
      try {
        audio.remove();
      } catch {
        /* ignore */
      }
    };

    const fallback = () => {
      if (finished || token !== generation) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      dispose();
      speak(clean, { token, onStart, onEnd, onError });
    };

    audio.addEventListener('playing', () => {
      if (token !== generation) return;
      onStart?.();
    }, { once: true });
    audio.addEventListener('ended', () => {
      if (token !== generation) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
      dispose();
      onEnd?.();
    }, { once: true });
    audio.addEventListener('error', fallback, { once: true });

    try {
      const playback = audio.play();
      if (playback?.catch) playback.catch(fallback);
    } catch {
      fallback();
    }
    return true;
  }

  return speak(clean, { token, onStart, onEnd, onError });
}
