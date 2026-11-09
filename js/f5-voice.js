// Lazy client for the experimental browser F5-TTS voice.
// The worker, the 425 MB model and the ONNX runtime only load after a person
// explicitly asks for this voice. Normal saga narration never imports this file.

const MAX_CHUNK = 110;
export const F5_CACHE_NAME = 'mythos-f5-model-v1';

export async function clearF5Cache() {
  if (typeof caches === 'undefined') return false;
  try {
    return await caches.delete(F5_CACHE_NAME);
  } catch {
    return false;
  }
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLong(sentence) {
  const parts = [];
  let rest = sentence;
  while (rest.length > MAX_CHUNK) {
    let cut = rest.lastIndexOf(' ', MAX_CHUNK);
    if (cut < 30) cut = rest.indexOf(' ', MAX_CHUNK);
    if (cut < 0) cut = MAX_CHUNK;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

export function chunkText(text) {
  const chunks = [];
  let current = '';
  for (const sentence of splitSentences(text)) {
    for (const part of sentence.length > MAX_CHUNK ? splitLong(sentence) : [sentence]) {
      if (!current) {
        current = part;
      } else if (current.length + 1 + part.length <= MAX_CHUNK) {
        current += ` ${part}`;
      } else {
        chunks.push(current);
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function f5BrowserNote() {
  if (typeof Worker === 'undefined') return 'This browser cannot run the experimental voice.';
  if (typeof WebAssembly === 'undefined') return 'This browser cannot run the experimental voice.';
  if (!navigator.gpu) return 'WebGPU is not available. The voice can run on CPU, but it will be very slow.';
  return '';
}

export async function canUseWebGPU() {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    return !!adapter;
  } catch {
    return false;
  }
}

export class F5Narrator {
  constructor({ onProgress = () => {} } = {}) {
    this.onProgress = onProgress;
    this.worker = null;
    this.ready = false;
    this.pending = null;
    this.source = null;
    this.audio = null;
    this.stopped = false;
    this.caps = null;
    this.warmed = false;
  }

  notify(progress) {
    try {
      this.onProgress(progress);
    } catch {
      // A UI callback must not break synthesis.
    }
  }

  handleMessage = (event) => {
    const message = event.data || {};
    if (message.type === 'progress') {
      this.notify(message);
      return;
    }
    if (message.type === 'ready') {
      this.ready = true;
      this.caps = { webgpu: !!message.webgpu };
      this.resolvePending(message);
      return;
    }
    if (message.type === 'audio') {
      this.resolvePending(message);
      return;
    }
    if (message.type === 'idle') {
      return;
    }
    if (message.type === 'error') {
      const error = new Error(message.message || 'The experimental voice failed.');
      this.rejectPending(error);
      this.notify({ stage: 'error', message: error.message });
      this.destroy();
    }
  };

  resolvePending(value) {
    const pending = this.pending;
    this.pending = null;
    pending?.resolve(value);
  }

  rejectPending(error) {
    const pending = this.pending;
    this.pending = null;
    pending?.reject(error);
  }

  request(message, { transfer = [] } = {}) {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker.postMessage(message, transfer);
    });
  }

  async ensureReady() {
    if (this.worker && this.ready) return this.caps;
    if (this.worker && this.initializing) return this.initializing;
    this.stopped = false;
    this.worker = new Worker(new URL('./f5/worker.js', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', this.handleMessage);
    this.worker.addEventListener('error', (event) => {
      this.ready = false;
      this.rejectPending(new Error(event.message || 'The F5 worker stopped.'));
    });
    this.initializing = this.request({ type: 'init' })
      .then((message) => {
        this.ready = true;
        this.caps = { webgpu: !!message.webgpu };
        return this.caps;
      })
      .catch((error) => {
        this.destroy();
        throw error;
      })
      .finally(() => {
        this.initializing = null;
      });
    return this.initializing;
  }

  async speak(text, { voiceId = 'cori' } = {}) {
    const chunks = chunkText(text);
    if (!chunks.length) throw new Error('There is no text to read.');
    const caps = await this.ensureReady();
    if (this.stopped) return;
    this.audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (this.audio.state === 'suspended') await this.audio.resume();
    const total = chunks.length;
    for (let index = 0; index < total; index += 1) {
      if (this.stopped) break;
      if (index === 0 && !this.warmed) {
        this.notify({ stage: 'warmup', message: 'Warming up the voice — the first line takes longer…' });
      }
      this.notify({ stage: 'chunk', index: index + 1, total, message: `Reading part ${index + 1} of ${total}` });
      const result = await this.request({ type: 'synthesize', text: chunks[index], voiceId });
      if (this.stopped) break;
      await this.play(result.pcm, result.sampleRate || 24000);
      this.warmed = true;
      this.notify({ stage: 'chunk-done', index: index + 1, total });
      if (index < total - 1) await new Promise((resolve) => setTimeout(resolve, 140));
    }
    if (!this.stopped) this.notify({ stage: 'complete', message: 'Finished', webgpu: caps.webgpu });
  }

  play(pcm, sampleRate) {
    return new Promise((resolve, reject) => {
      if (this.stopped) {
        resolve();
        return;
      }
      const buffer = this.audio.createBuffer(1, pcm.length, sampleRate);
      buffer.copyToChannel(pcm, 0);
      const source = this.audio.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audio.destination);
      this.source = source;
      source.addEventListener('ended', () => {
        if (this.source === source) this.source = null;
        resolve();
      }, { once: true });
      source.addEventListener('error', () => {
        if (this.source === source) this.source = null;
        reject(new Error('The generated audio could not be played.'));
      }, { once: true });
      source.start();
    });
  }

  stop() {
    this.stopped = true;
    try {
      this.source?.stop();
    } catch {
      // Already stopped.
    }
    this.source = null;
    this.rejectPending(new DOMException('Stopped', 'AbortError'));
    this.destroy();
    this.notify({ stage: 'stopped', message: 'Stopped' });
  }

  destroy() {
    this.ready = false;
    this.initializing = null;
    this.pending = null;
    if (this.worker) {
      this.worker.removeEventListener('message', this.handleMessage);
      this.worker.terminate();
      this.worker = null;
    }
    if (this.audio) {
      this.audio.close().catch(() => {});
      this.audio = null;
    }
  }
}
