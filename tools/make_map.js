#!/usr/bin/env node
/**
 * make_map.js — generates the stylised 64x36 world tile grid.
 * The grid is deliberately blocky: one character per 16px tile.
 * Legend: ~ water, g grass, s sand, m mountain, i ice, f forest.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 64;
const H = 36;
const grid = Array.from({ length: H }, () => Array(W).fill('~'));

const set = (x, y, ch) => {
  if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = ch;
};
const rect = (x, y, w, h, ch) => {
  for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) set(xx, yy, ch);
};
const ellipse = (cx, cy, rx, ry, ch) => {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, ch);
    }
  }
};

/* Polar ice */
rect(7, 0, 48, 2, 'i');
rect(6, 34, 53, 2, 'i');
rect(10, 33, 45, 1, 'i');

/* North America */
ellipse(12, 9, 9, 6, 'g');
ellipse(7, 6, 3, 2, 'i');
ellipse(18, 6, 4, 2.5, 'f');
ellipse(9, 12, 3.5, 2.5, 's');
ellipse(15, 15, 2.5, 2, 's');
set(18, 15, 'g');
set(20, 16, 'g');
set(12, 7, 'm');
set(11, 8, 'm');
set(10, 9, 'm');
set(9, 10, 'm');
ellipse(23, 4, 2.5, 2, 'i');

/* South America */
ellipse(18, 24, 4.5, 7, 'f');
ellipse(14, 22, 2, 3, 's');
set(15, 19, 'm');
set(15, 20, 'm');
set(15, 21, 'm');
set(16, 22, 'm');
set(16, 23, 'm');
ellipse(19, 30, 2.2, 2, 's');
set(20, 17, 'g');
set(21, 18, 'g');

/* Europe */
ellipse(33, 8, 5, 4, 'g');
ellipse(35, 4, 2.5, 2.5, 'i');
set(28, 8, 'g');
set(28, 9, 'g');
set(26, 8, 'g');
ellipse(31, 6, 2, 1.5, 'f');
set(33, 11, 'm');
set(34, 11, 'm');
set(35, 11, 'm');
set(36, 10, 'f');
set(37, 8, 'f');

/* Africa */
ellipse(33, 20, 5.5, 7, 's');
ellipse(32, 21, 4, 3, 'f');
ellipse(34, 26, 3, 2, 'g');
set(35, 22, 'm');
set(36, 22, 'm');
set(36, 21, 'm');
set(41, 24, 'f');
set(29, 16, 'g');

/* Middle East */
ellipse(40, 14, 4, 3, 's');
set(40, 11, 'm');
set(41, 11, 'm');
set(42, 11, 'm');
set(38, 12, 'f');
set(43, 15, 'g');

/* Asia */
ellipse(49, 10, 10.5, 6, 'g');
ellipse(50, 3, 8, 2, 'i');
ellipse(48, 8, 7, 3, 'f');
for (let x = 43; x <= 52; x += 1) set(x, 12, 'm');
for (let x = 44; x <= 51; x += 1) set(x, 13, 'm');
ellipse(45, 10.5, 5, 1.8, 's');
ellipse(53, 14, 4, 3, 'g');
ellipse(46, 17, 3, 3.5, 's');
set(45, 16, 'f');
set(44, 17, 'f');
ellipse(52, 19, 3, 2, 'f');
set(60, 9, 'g');
set(60, 10, 'g');
set(61, 10, 'f');
set(60, 11, 'g');
ellipse(55, 21, 4, 1, 'f');
set(50, 18, 's');
set(51, 18, 's');

/* Oceania */
ellipse(56, 27, 6, 3, 's');
ellipse(56, 26, 5, 2, 'g');
set(53, 25, 'f');
set(54, 25, 'f');
set(59, 25, 'f');
set(62, 30, 'g');
set(63, 30, 'g');
set(62, 31, 'f');
set(8, 20, 'g');
set(10, 22, 'g');
set(12, 19, 'g');

/* Small island chains */
set(30, 13, 's');
set(44, 19, 'g');
set(47, 20, 'g');
set(58, 22, 'g');

const text = grid.map((row) => row.join('')).join('\n');
await mkdir(path.join(ROOT, 'assets', 'map'), { recursive: true });
await writeFile(path.join(ROOT, 'assets', 'map', 'world.txt'), `${text}\n`);
console.log(text);
console.log(`\nWrote ${W}x${H} tile map (${W * H} tiles).`);
