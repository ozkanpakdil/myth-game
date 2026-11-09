/**
 * f5-voice.js — lookup for the pre-rendered F5 saga clips.
 *
 * The F5 model is an authoring tool, not a browser dependency. Every clip is
 * generated offline with the same text the saga shows, then named by the same
 * FNV-1a hash used for the Piper saga clips. If a chosen name has no matching
 * clip, the caller can fall back to the browser's Listen button.
 */

import { sagaTextId } from './narration.js?v=20261110-1';

export const F5_VOICES = Object.freeze([
  { id: 'sonia', label: 'Sonia', note: 'female, British English' },
  { id: 'joe', label: 'Joe', note: 'male, supplied sample' },
]);

export const F5_CLIP_VERSION = '20261110-1';

export function isF5Voice(voice) {
  return F5_VOICES.some((entry) => entry.id === voice);
}

export function f5VoiceLabel(voice) {
  return F5_VOICES.find((entry) => entry.id === voice)?.label || 'F5';
}

export function f5AudioUrl(voice, text) {
  if (!isF5Voice(voice)) return '';
  const id = sagaTextId(text);
  return id ? `assets/f5/clips/${voice}/${id}.mp3?v=${F5_CLIP_VERSION}` : '';
}
