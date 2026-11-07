#!/usr/bin/env node
/**
 * render_sprites.js — compile 16x16 text grids into crisp SVG.
 *
 * Each grid is 16 rows of 16 palette keys. Horizontal runs of the same colour
 * become one <rect>, so the output stays tiny and pixel-perfect at any size.
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPRITE_DIR = path.join(ROOT, 'assets', 'sprites', 'icons');
const OUT_DIR = path.join(ROOT, 'assets', 'svg', 'icons');
const SIZE = 16;

const palette = JSON.parse(await readFile(path.join(ROOT, 'assets', 'palette.json'), 'utf8'));
const colors = palette.colors;
const transparent = palette.transparent || '.';

function validate(name, rows) {
  const errors = [];
  if (rows.length !== SIZE) errors.push(`${name}: ${rows.length} rows (expected ${SIZE})`);
  rows.forEach((row, y) => {
    if (row.length !== SIZE) errors.push(`${name}: row ${y + 1} has ${row.length} columns (expected ${SIZE})`);
    [...row].forEach((key, x) => {
      if (key !== transparent && !colors[key]) {
        errors.push(`${name}: unknown palette key "${key}" at ${x + 1},${y + 1}`);
      }
    });
  });
  return errors;
}

function toSvg(name, rows) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < SIZE) {
      const key = row[x];
      let end = x + 1;
      while (end < SIZE && row[end] === key) end += 1;
      if (key !== transparent) {
        const color = colors[key].hex;
        rects.push(`<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${color}"/>`);
      }
      x = end;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="64" height="64" shape-rendering="crispEdges" role="img" aria-label="${name} sigil">
  <title>${name} sigil</title>
  ${rects.join('\n  ')}
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });
const files = (await readdir(SPRITE_DIR)).filter((file) => file.endsWith('.txt')).sort();
if (!files.length) {
  console.error('No .txt sprites found in assets/sprites/icons/.');
  process.exit(1);
}

const allErrors = [];
for (const file of files) {
  const name = file.replace(/\.txt$/, '');
  const rows = (await readFile(path.join(SPRITE_DIR, file), 'utf8')).replace(/\r/g, '').split('\n');
  if (rows.at(-1) === '') rows.pop();
  const errors = validate(name, rows);
  if (errors.length) {
    allErrors.push(...errors);
    continue;
  }
  await writeFile(path.join(OUT_DIR, `${name}.svg`), toSvg(name, rows));
  console.log(`✓ assets/svg/icons/${name}.svg`);
}

if (allErrors.length) {
  console.error(`\n${allErrors.length} sprite error${allErrors.length === 1 ? '' : 's'}:`);
  for (const error of allErrors) console.error(`  ✗ ${error}`);
  process.exit(1);
}
console.log(`\nRendered ${files.length} SVG sigils from text grids.`);
