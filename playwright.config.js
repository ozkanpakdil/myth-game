import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * The harness has a Chromium build in the Playwright cache whose revision does
 * not match the one this package expects. Prefer an explicitly configured
 * executable, then the newest cached Chromium, then Playwright's own lookup.
 */
function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  const versions = readdirSync(cache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const version of versions) {
    const bases = [
      path.join(cache, version, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(cache, version, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(cache, version, 'chrome-linux', 'chrome'),
      path.join(cache, version, 'chrome-win', 'chrome.exe'),
    ];
    const found = bases.find((candidate) => existsSync(candidate));
    if (found) return found;
  }
  return undefined;
}

const executablePath = findChromium();

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4180',
    viewport: { width: 1280, height: 900 },
    // Tests start from a dark OS preference unless a test emulates light.
    colorScheme: 'dark',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'node tools/serve.js 4180',
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
