// Experimental browser F5-TTS worker for Mythos.
//
// This runs the 4-step reflow-distilled int4 F5-TTS graphs published by
// DownFlow/webasmr-f5tts with ONNX Runtime Web. It is deliberately isolated
// from the normal narration path: nothing here is loaded until someone presses
// the experimental F5 button on a new saga.
//
// Model: https://huggingface.co/DownFlow/webasmr-f5tts
// Runtime: onnxruntime-web (MIT), vendored under ./vendor/ort.

import * as ort from './vendor/ort/ort.mjs';

const SAMPLE_RATE = 24_000;
const MEL_BINS = 100;
const N_FFT = 1024;
const HOP = 256;
const SPEC_BINS = N_FFT / 2 + 1;
const STEPS = 4;
const MAX_GEN_FRAMES = 640;
const MIN_GEN_FRAMES = 16;
const MAX_REF_FRAMES = 768;
const MODEL_BASE = 'https://huggingface.co/DownFlow/webasmr-f5tts/resolve/main';
const GRAPHS = {
  dit: 'dit_step_4s_int4.onnx',
  vocoder: 'vocoder_4s_int4.onnx',
};
const REF_BASE = new URL('../../assets/f5/refs/', import.meta.url).href;
const VOICES = new Set(['sonia', 'joe']);
const REF_VERSION = '20261109-2';
const CACHE_NAME = 'mythos-f5-model-v1';
const CACHE_CHUNK = 48 * 1024 * 1024;

ort.env.wasm.wasmPaths = new URL('./vendor/ort/', import.meta.url).href;
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = 'warning';

let vocab = null;
let pinyin = null;
let ditSession = null;
let vocoderSession = null;
let webgpu = false;
const voiceCache = new Map();
let busy = false;

const post = (message, transfer = []) => self.postMessage(message, transfer);
const progress = (stage, message, extra = {}) => post({ type: 'progress', stage, message, ...extra });

function fail(error) {
  post({ type: 'error', message: String(error?.message || error) });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json();
}

async function readCache(url, label) {
  if (!('caches' in self)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const metaResponse = await cache.match(`${url}?mythos-meta=1`);
    if (!metaResponse) return null;
    const meta = await metaResponse.json();
    if (!meta?.chunks || !meta?.size) return null;
    const data = new Uint8Array(meta.size);
    let offset = 0;
    for (let index = 0; index < meta.chunks; index += 1) {
      const part = await cache.match(`${url}?mythos-chunk=${index}`);
      if (!part) return null;
      const bytes = new Uint8Array(await part.arrayBuffer());
      data.set(bytes, offset);
      offset += bytes.length;
      progress('cache', `Loading the saved copy of ${label}`, { label, loaded: offset, total: meta.size });
    }
    if (offset !== meta.size) return null;
    return data;
  } catch {
    return null;
  }
}

async function saveCache(url, data, label) {
  if (!('caches' in self)) return;
  let cache = null;
  let count = 0;
  try {
    cache = await caches.open(CACHE_NAME);
    count = Math.ceil(data.length / CACHE_CHUNK);
    await cache.delete(`${url}?mythos-meta=1`);
    for (let index = 0; index < count; index += 1) {
      const start = index * CACHE_CHUNK;
      const end = Math.min(start + CACHE_CHUNK, data.length);
      await cache.put(
        `${url}?mythos-chunk=${index}`,
        new Response(data.subarray(start, end), { headers: { 'Content-Type': 'application/octet-stream' } }),
      );
      progress('cache', `Saving ${label} for next time`, { label, loaded: end, total: data.length });
    }
    await cache.put(
      `${url}?mythos-meta=1`,
      new Response(JSON.stringify({ chunks: count, size: data.length }), { headers: { 'Content-Type': 'application/json' } }),
    );
    progress('cache', `Saved ${label} for next time`, { label, loaded: data.length, total: data.length });
  } catch (error) {
    // Private mode, a full disk, or a browser entry limit: keep going without the cache.
    if (cache) {
      for (let index = 0; index < count; index += 1) {
        await cache.delete(`${url}?mythos-chunk=${index}`).catch(() => {});
      }
      await cache.delete(`${url}?mythos-meta=1`).catch(() => {});
    }
    progress('cache', `Could not save ${label}: ${error?.message || error}`);
  }
}

async function fetchGraph(url, label) {
  const cached = await readCache(url, label);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${label} (${response.status})`);
  const total = Number(response.headers.get('content-length') || 0);
  if (!response.body?.getReader) {
    const data = new Uint8Array(await response.arrayBuffer());
    progress('download', `${label} ready`, { label, loaded: data.length, total: data.length });
    await saveCache(url, data, label);
    return data;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  let last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const now = performance.now();
    if (now - last > 120) {
      progress('download', `Downloading ${label}`, { label, loaded, total });
      last = now;
    }
  }
  progress('download', `${label} downloaded`, { label, loaded, total });
  const data = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.length;
  }
  await saveCache(url, data, label);
  return data;
}

async function createSession(url, label, providers) {
  const data = await fetchGraph(url, label);
  progress('session', `Starting ${label} (${(data.length / 1e6).toFixed(0)} MB)`, { label });
  const started = performance.now();
  const session = await ort.InferenceSession.create(data, {
    executionProviders: providers,
    graphOptimizationLevel: providers.includes('webgpu') ? 'basic' : 'all',
  });
  progress('session', `${label} ready in ${((performance.now() - started) / 1000).toFixed(1)}s`, { label });
  return session;
}

async function hasWebGPU() {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    return !!adapter;
  } catch {
    return false;
  }
}

async function init() {
  if (ditSession && vocoderSession) {
    post({ type: 'ready', webgpu });
    return;
  }
  progress('boot', 'Checking this browser');
  webgpu = await hasWebGPU();
  progress('boot', webgpu ? 'WebGPU found' : 'No WebGPU; trying CPU (slow)');

  const providers = webgpu ? ['webgpu', 'wasm'] : ['wasm'];
  try {
    ditSession = await createSession(`${MODEL_BASE}/${GRAPHS.dit}`, 'story voice model', providers);
  } catch (error) {
    if (!webgpu) throw error;
    progress('fallback', 'WebGPU could not start the model; retrying on CPU');
    webgpu = false;
    ditSession = await createSession(`${MODEL_BASE}/${GRAPHS.dit}`, 'story voice model', ['wasm']);
  }
  vocoderSession = await createSession(
    `${MODEL_BASE}/${GRAPHS.vocoder}`,
    'voice decoder',
    webgpu ? ['webgpu', 'wasm'] : ['wasm'],
  );

  progress('boot', 'Loading the word list');
  [vocab, pinyin] = await Promise.all([
    fetchJson(`${MODEL_BASE}/vocab.json`),
    fetchJson(`${MODEL_BASE}/pinyin.json`).catch(() => ({})),
  ]);
  post({ type: 'ready', webgpu });
}

// ---------------------------------------------------------------------------
// Text tokens (English-first; CJK falls back to the model's pinyin map)
// ---------------------------------------------------------------------------

const isCjk = (character) => {
  const code = character.codePointAt(0);
  return code >= 12544 && code <= 40959;
};
const asciiWord = /[A-Za-z0-9]+/y;
const QUOTE_MAP = { '；': ',', '，': ',', '“': '"', '”': '"', '‘': "'", '’': "'", '—': '-' };

function splitText(text) {
  const normalized = Array.from(String(text || ''), (character) => QUOTE_MAP[character] ?? character).join('');
  const tokens = [];
  let index = 0;
  while (index < normalized.length) {
    if (isCjk(normalized[index])) {
      while (index < normalized.length && isCjk(normalized[index])) {
        tokens.push(' ');
        tokens.push(pinyin[normalized[index]] ?? normalized[index]);
        index += 1;
      }
      continue;
    }
    asciiWord.lastIndex = index;
    const word = asciiWord.exec(normalized);
    if (word && word.index === index && word[0].length > 1) {
      const previous = tokens.length ? tokens[tokens.length - 1] : '';
      if (tokens.length && !` :'"`.includes(previous)) tokens.push(' ');
      tokens.push(...Array.from(word[0]));
      index += word[0].length;
      continue;
    }
    tokens.push(normalized[index]);
    index += 1;
  }
  return tokens;
}

function tokenize(text) {
  const tokens = splitText(text);
  const ids = new Int32Array(tokens.length);
  const unknown = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === ' ' || vocab.index[token] !== undefined) {
      ids[i] = vocab.index[token];
    } else {
      ids[i] = 0;
      if (isCjk(token[0]) && !unknown.includes(token[0])) unknown.push(token[0]);
    }
  }
  return { ids, unknown };
}

// ---------------------------------------------------------------------------
// Voice references
// ---------------------------------------------------------------------------

async function loadVoice(voiceId) {
  const id = VOICES.has(voiceId) ? voiceId : 'sonia';
  if (voiceCache.has(id)) return voiceCache.get(id);
  const meta = await fetchJson(`${REF_BASE}${id}.json?v=${REF_VERSION}`);
  const raw = await (await fetch(`${REF_BASE}${id}.bin?v=${REF_VERSION}`)).arrayBuffer();
  if (raw.byteLength !== meta.mel_shape[0] * meta.mel_shape[1] * 2) {
    throw new Error(`Voice reference ${id} has an unexpected size`);
  }
  const halves = new Uint16Array(raw);
  const mel = new Float32Array(halves.length);
  for (let i = 0; i < halves.length; i += 1) mel[i] = halfToFloat(halves[i]);
  const voice = {
    id,
    mel,
    bins: meta.mel_shape[0],
    frames: meta.mel_shape[1],
    refText: meta.ref_text,
    name: meta.name || id,
  };
  voiceCache.set(id, voice);
  return voice;
}

function halfToFloat(bits) {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const mantissa = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (mantissa / 1024);
  if (exponent === 0x1f) return mantissa ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + mantissa / 1024);
}

function toFloat32(data) {
  if (data instanceof Float32Array) return data;
  if (data instanceof Float16Array) return Float32Array.from(data);
  if (data instanceof Uint16Array) {
    const out = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 1) out[i] = halfToFloat(data[i]);
    return out;
  }
  return new Float32Array(data);
}

function halfTensor(source, dims) {
  const values = source instanceof Float32Array ? source : Float32Array.from(source);
  return new ort.Tensor('float16', new Float16Array(values), dims);
}

function referenceIds(voice) {
  if (!voice.idSet) voice.idSet = Array.from(tokenize(voice.refText).ids);
  return voice.idSet;
}

function paddedReference(voice, refFrames, frames) {
  const out = new Float32Array(frames * MEL_BINS);
  for (let frame = 0; frame < refFrames; frame += 1) {
    for (let bin = 0; bin < MEL_BINS; bin += 1) {
      out[frame * MEL_BINS + bin] = voice.mel[bin * voice.frames + frame];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Flow matching
// ---------------------------------------------------------------------------

function schedule(steps, sway) {
  const times = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i += 1) {
    let t = i / steps;
    if (sway != null) t += sway * (Math.cos((Math.PI / 2) * t) - 1 + t);
    times[i] = t;
  }
  return times;
}

function gaussianNoise(length, seed = 1234) {
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  const out = new Float32Array(length);
  for (let i = 0; i < out.length; i += 2) {
    const u = Math.max(next(), 1e-7);
    const v = next();
    const radius = Math.sqrt(-2 * Math.log(u));
    out[i] = radius * Math.cos(2 * Math.PI * v);
    if (i + 1 < out.length) out[i + 1] = radius * Math.sin(2 * Math.PI * v);
  }
  return out;
}

function inputs(x, frames, textLength, cond, textIds, time) {
  const ids = BigInt64Array.from({ length: textLength }, (_, i) => BigInt(textIds?.[i] ?? -1));
  return {
    x: halfTensor(x, [1, frames, MEL_BINS]),
    cond: halfTensor(cond, [1, frames, MEL_BINS]),
    text_ids: new ort.Tensor('int64', ids, [1, textLength]),
    time: halfTensor(Float32Array.from([time]), [1]),
    mask: new ort.Tensor('bool', new Uint8Array(frames).fill(1), [1, frames]),
  };
}

function dispose(tensors) {
  for (const tensor of Object.values(tensors)) tensor?.dispose?.();
}

async function step(x, time, cond, ids, textLength, frames) {
  const feeds = inputs(x, frames, textLength, cond, ids, time);
  const result = await ditSession.run(feeds);
  const velocity = toFloat32(result.velocity.data);
  dispose(result);
  dispose(feeds);
  return velocity;
}

async function flow(cond, ids, frames, seed) {
  const times = schedule(STEPS, -1);
  const x = gaussianNoise(frames * MEL_BINS, seed);
  for (let i = 0; i < STEPS; i += 1) {
    post({ type: 'progress', stage: 'flow', step: i + 1, steps: STEPS, message: `Voice step ${i + 1}/${STEPS}` });
    const velocity = await step(x, times[i], cond, ids, Math.min(ids.length, frames), frames);
    const dt = times[i + 1] - times[i];
    for (let j = 0; j < x.length; j += 1) x[j] += dt * velocity[j];
  }
  return x;
}

// ---------------------------------------------------------------------------
// Vocoder tail: [magnitude | phase] planes -> inverse STFT
// ---------------------------------------------------------------------------

let window = null;
let twiddleCos = null;
let twiddleSin = null;

function initISTFT() {
  if (window) return;
  window = new Float64Array(N_FFT);
  for (let i = 0; i < N_FFT; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N_FFT);
  twiddleCos = new Float64Array(N_FFT / 2);
  twiddleSin = new Float64Array(N_FFT / 2);
  for (let i = 0; i < N_FFT / 2; i += 1) {
    twiddleCos[i] = Math.cos((2 * Math.PI * i) / N_FFT);
    twiddleSin[i] = Math.sin((2 * Math.PI * i) / N_FFT);
  }
}

function inverseFFT(real, imag, out) {
  initISTFT();
  const re = new Float64Array(N_FFT);
  const im = new Float64Array(N_FFT);
  for (let i = 0; i < SPEC_BINS; i += 1) {
    re[i] = real[i];
    im[i] = imag[i];
  }
  for (let i = SPEC_BINS; i < N_FFT; i += 1) {
    re[i] = re[N_FFT - i];
    im[i] = -im[N_FFT - i];
  }
  for (let i = 1, j = 0; i < N_FFT; i += 1) {
    let bit = N_FFT >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let swap = re[i];
      re[i] = re[j];
      re[j] = swap;
      swap = im[i];
      im[i] = im[j];
      im[j] = swap;
    }
  }
  for (let size = 2; size <= N_FFT; size <<= 1) {
    const half = size >> 1;
    const step = N_FFT / size;
    for (let start = 0; start < N_FFT; start += size) {
      for (let k = 0; k < half; k += 1) {
        const angle = k * step;
        const wr = twiddleCos[angle];
        const wi = twiddleSin[angle];
        const a = start + k;
        const b = a + half;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
  for (let i = 0; i < N_FFT; i += 1) out[i] = re[i] / N_FFT;
}

function istft(planes, frames) {
  initISTFT();
  const length = (frames - 1) * HOP + N_FFT;
  const acc = new Float64Array(length);
  const norm = new Float64Array(length);
  const real = new Float64Array(SPEC_BINS);
  const imag = new Float64Array(SPEC_BINS);
  const frame = new Float64Array(N_FFT);
  for (let t = 0; t < frames; t += 1) {
    for (let bin = 0; bin < SPEC_BINS; bin += 1) {
      const magnitude = Math.min(Math.exp(planes[bin * frames + t]), 100);
      const phase = planes[SPEC_BINS * frames + bin * frames + t];
      real[bin] = magnitude * Math.cos(phase);
      imag[bin] = magnitude * Math.sin(phase);
    }
    inverseFFT(real, imag, frame);
    const offset = t * HOP;
    for (let i = 0; i < N_FFT; i += 1) {
      acc[offset + i] += frame[i] * window[i];
      norm[offset + i] += window[i] * window[i];
    }
  }
  const trim = N_FFT >> 1;
  const out = new Float32Array(length - 2 * trim);
  for (let i = 0; i < out.length; i += 1) {
    const divisor = norm[i + trim];
    out[i] = divisor > 1e-11 ? acc[i + trim] / divisor : 0;
  }
  return out;
}

async function vocode(mel, frames) {
  const chunkFrames = 375;
  const chunks = [];
  for (let start = 0; start < frames; start += chunkFrames) {
    const length = Math.min(chunkFrames, frames - start);
    const input = new Float32Array(MEL_BINS * length);
    for (let bin = 0; bin < MEL_BINS; bin += 1) {
      for (let frame = 0; frame < length; frame += 1) {
        input[bin * length + frame] = mel[(start + frame) * MEL_BINS + bin];
      }
    }
    const feeds = { mel: halfTensor(input, [1, MEL_BINS, length]) };
    const output = await vocoderSession.run(feeds);
    const planes = toFloat32(output.stft_planes.data);
    dispose(output);
    dispose(feeds);
    chunks.push(istft(planes, length));
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    pcm.set(chunk, offset);
    offset += chunk.length;
  }
  let energy = 0;
  for (let i = 0; i < pcm.length; i += 1) energy += pcm[i] * pcm[i];
  const rms = Math.sqrt(energy / Math.max(pcm.length, 1));
  if (rms > 1e-6) {
    const scale = 0.1 / rms;
    for (let i = 0; i < pcm.length; i += 1) pcm[i] *= scale;
  }
  return pcm;
}

// ---------------------------------------------------------------------------
// One chunk
// ---------------------------------------------------------------------------

async function synthesize(message) {
  if (!ditSession || !vocoderSession) throw new Error('The F5 model is not ready yet');
  if (busy) throw new Error('A voice line is already being made');
  const text = String(message.text || '').trim();
  if (!text) throw new Error('There is no text to read');
  busy = true;
  const started = performance.now();
  try {
    const voice = await loadVoice(message.voiceId);
    const generated = tokenize(text);
    if (!generated.ids.length) throw new Error('The model could not read that text');
    const refIds = referenceIds(voice);
    const ids = [...refIds, ...generated.ids];
    const refFrames = Math.min(voice.frames, MAX_REF_FRAMES);
    const refBytes = Math.max(new TextEncoder().encode(voice.refText).length, 1);
    const generatedBytes = Math.max(new TextEncoder().encode(text).length, 1);
    let genFrames = Math.round((refFrames / refBytes) * generatedBytes);
    genFrames = Math.max(MIN_GEN_FRAMES, Math.min(genFrames, MAX_GEN_FRAMES));
    const frames = refFrames + genFrames;
    const cond = paddedReference(voice, refFrames, frames);

    post({ type: 'progress', stage: 'flow', step: 0, steps: STEPS, message: 'Warming up the voice' });
    const mel = await flow(cond, ids, frames, message.seed ?? 1234);
    post({ type: 'progress', stage: 'vocode', message: 'Making the audio' });
    const pcm = await vocode(mel.subarray(refFrames * MEL_BINS), genFrames);
    post({
      type: 'audio',
      pcm,
      sampleRate: SAMPLE_RATE,
      seconds: pcm.length / SAMPLE_RATE,
      ms: performance.now() - started,
      unknown: generated.unknown,
    }, [pcm.buffer]);
  } finally {
    busy = false;
  }
}

self.onmessage = async (event) => {
  const message = event.data || {};
  try {
    if (message.type === 'init') {
      await init();
      return;
    }
    if (message.type === 'synthesize') {
      await synthesize(message);
      post({ type: 'idle' });
      return;
    }
  } catch (error) {
    fail(error);
  }
};
