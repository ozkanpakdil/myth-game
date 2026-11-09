#!/usr/bin/env node
/**
 * Render the F5 saga clips offline and store them under assets/f5/clips/.
 *
 * The browser worker is an authoring runtime here, not a player dependency.
 * Start tools/serve.js first, then:
 *
 *   node tools/render_f5_audio.mjs
 *   node tools/render_f5_audio.mjs --voices sonia --limit 2
 *
 * Requires Playwright, ffmpeg and enough disk for the 425 MB model cache.
 * The model cache lives in /tmp by default; the profile is reusable.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAGA_DIR = path.join(ROOT, 'content', 'saga');
const CLIPS = path.join(ROOT, 'assets', 'f5', 'clips');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4180';
const PROFILE = process.env.F5_PROFILE || '/tmp/mythos-f5-render-profile';
const CHROME = process.env.CHROME_PATH || '';
const VOICES = new Set(['sonia', 'joe']);

function args() {
  const out = { voices: ['sonia', 'joe'], limit: 0, force: false, only: '' };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--voices') out.voices = String(argv[++i] || '').split(',').map((v) => v.trim()).filter(Boolean);
    else if (arg === '--limit') out.limit = Number(argv[++i] || 0);
    else if (arg === '--only') out.only = String(argv[++i] || '');
    else if (arg === '--force') out.force = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  for (const voice of out.voices) if (!VOICES.has(voice)) throw new Error(`unknown voice: ${voice}`);
  return out;
}

function hash(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  let value = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(clean)) {
    value ^= byte;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value.toString(16).padStart(8, '0');
}

function buildJobs(options) {
  const jobs = [];
  const seen = new Set();
  for (const file of fs.readdirSync(SAGA_DIR).filter((name) => name.endsWith('.json')).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(SAGA_DIR, file), 'utf8'));
    if (data.studio_clips !== false) continue;
    if (options.only && data.id !== options.only) continue;
    const defaultName = data.default_name || 'Alex';
    const names = [...new Set([defaultName, ...(data.name_suggestions || [])])];
    for (const [nodeId, node] of Object.entries(data.nodes || {})) {
      if ((node.variants || []).length) throw new Error(`${data.id}/${nodeId} has variants; extend the renderer before using it`);
      const hasName = (node.text || []).some((paragraph) => paragraph.includes('{name}'));
      const useNames = hasName ? names : [defaultName];
      for (const name of useNames) {
        const paragraphs = (node.text || []).map((paragraph) => paragraph.replaceAll('{name}', name));
        if (node.ending?.summary) paragraphs.push(node.ending.summary);
        const text = paragraphs.join(' ');
        const id = hash(text);
        for (const voice of options.voices) {
          const key = `${voice}:${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!options.force && fs.existsSync(path.join(CLIPS, voice, `${id}.mp3`))) continue;
          jobs.push({ voice, id, text, saga: data.id, node: nodeId, name });
        }
      }
    }
  }
  return options.limit ? jobs.slice(0, options.limit) : jobs;
}

function encode(job) {
  const wav = path.join(CLIPS, job.voice, `${job.id}.wav`);
  const mp3 = path.join(CLIPS, job.voice, `${job.id}.mp3`);
  if (!fs.existsSync(wav)) return false;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '48k', mp3]);
  fs.unlinkSync(wav);
  return fs.existsSync(mp3) && fs.statSync(mp3).size > 1000;
}

function manifest(jobs, options) {
  const generatedAt = new Date().toISOString();
  const voices = {};
  for (const voice of options.voices) {
    const dir = path.join(CLIPS, voice);
    voices[voice] = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((name) => name.endsWith('.mp3')).length
      : 0;
  }
  const out = {
    generatedAt,
    model: 'DownFlow/webasmr-f5tts dit_step_4s_int4.onnx + vocoder_4s_int4.onnx',
    references: {
      sonia: 'Microsoft Edge TTS en-GB-SoniaNeural sample from yaph/tts-samples',
      joe: 'project-owner supplied sample, first 7.0 s',
    },
    voices,
    requested: jobs.length,
    note: 'Clips are named with the FNV-1a hash of the exact scene text used by js/narration.js. The browser never loads the model.',
  };
  fs.mkdirSync(CLIPS, { recursive: true });
  fs.writeFileSync(path.join(CLIPS, 'manifest.json'), `${JSON.stringify(out, null, 2)}\n`);
}

async function main() {
  const options = args();
  const jobs = buildJobs(options);
  const words = jobs.reduce((sum, job) => sum + job.text.split(/\s+/).length, 0);
  console.log(`F5 render: ${jobs.length} clip(s), ${words} words, voices=${options.voices.join(',')}`);
  if (!jobs.length) {
    manifest(jobs, options);
    return;
  }
  for (const voice of options.voices) fs.mkdirSync(path.join(CLIPS, voice), { recursive: true });

  const launch = {
    headless: true,
    args: ['--enable-unsafe-webgpu', '--use-angle=metal', '--autoplay-policy=no-user-gesture-required'],
  };
  if (CHROME) launch.executablePath = CHROME;
  const context = await chromium.launchPersistentContext(PROFILE, launch);
  const page = await context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(0);
  page.on('pageerror', (error) => console.log(`F5-PAGEERROR ${error.message}`));

  await page.route('**/__f5_save/**', async (route) => {
    const url = new URL(route.request().url());
    const parts = url.pathname.split('/').filter(Boolean);
    const voice = parts[parts.length - 2];
    const file = parts[parts.length - 1];
    const body = route.request().postDataBuffer();
    if (!VOICES.has(voice) || !/^[0-9a-f]{8}\.wav$/.test(file) || !body) {
      await route.fulfill({ status: 400, body: 'bad clip' });
      return;
    }
    const target = path.join(CLIPS, voice, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
    await route.fulfill({ status: 200, body: 'ok' });
  });

  page.on('console', (message) => {
    const text = message.text();
    if (text.startsWith('F5-')) console.log(text);
  });

  await page.goto(`${BASE}/tools/f5-render.html`, { waitUntil: 'networkidle' });
  console.log('F5 page ready; starting model and jobs');
  await page.evaluate((list) => { window.renderJobs(list); }, jobs);
  await page.waitForFunction(() => window.__f5Done === true);
  const result = await page.evaluate(() => window.__f5Result);
  await context.close();

  let encoded = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      if (encode(job)) encoded += 1;
      else failed += 1;
    } catch (error) {
      failed += 1;
      console.log(`F5-ENCODE-FAIL ${job.voice}/${job.id}: ${error.message}`);
    }
  }
  manifest(jobs, options);
  console.log(`F5 finished: rendered=${result?.done ?? 0}, pageFailed=${result?.failed ?? 0}, encoded=${encoded}, failed=${failed}`);
  if (failed || (result?.failed ?? 0)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
