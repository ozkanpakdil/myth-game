/**
 * map.js — a stylised, accessible SVG map built from the text tile grid.
 * Regions are focusable buttons; markers are ordinary links into the game.
 */
import { escapeHtml, focusPage } from './ui.js?v=20261108-7';
import { loadMythologies, loadWorldMap, loadMapRegions, iconFor } from './content.js?v=20261108-7';

const TILE = 16;

function terrainRows(text, width, height) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (rows.length !== height) throw new Error(`Map has ${rows.length} rows; expected ${height}.`);
  rows.forEach((row, index) => {
    if (row.length !== width) throw new Error(`Map row ${index + 1} has ${row.length} tiles; expected ${width}.`);
  });
  return rows;
}

function buildTiles(rows, width, terrain) {
  const parts = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const key = row[x];
      let end = x + 1;
      while (end < width && row[end] === key) end += 1;
      const colors = terrain[key] || terrain['~'];
      parts.push(
        `<rect x="${x * TILE}" y="${y * TILE}" width="${(end - x) * TILE}" height="${TILE}" fill="${colors.color}" class="map-tile map-tile--${escapeHtml(colors.name.toLowerCase().replace(/\s+/g, '-'))}"></rect>`,
      );
      x = end;
    }
  });
  return parts.join('');
}

export async function renderMap(root) {
  const [mythologies, regionsData, worldText] = await Promise.all([
    loadMythologies(),
    loadMapRegions(),
    loadWorldMap(),
  ]);
  const metaById = new Map(mythologies.map((item) => [item.id, item]));
  const rows = terrainRows(worldText, regionsData.width, regionsData.height);
  const width = regionsData.width * TILE;
  const height = regionsData.height * TILE;

  function regionPanel(region) {
    if (!region) {
      return `<div class="map-panel__body" data-testid="map-panel">
        <p class="eyebrow">Explore</p>
        <h2>Choose a region</h2>
        <p>Click a region on the map, or use the list below. Markers open a tradition directly.</p>
        <ul class="region-legend">
          ${regionsData.regions
            .map(
              (item) => `<li><button class="region-chip" type="button" data-region-legend="${item.id}" style="--region-color:${item.color}">
                <span class="region-chip__dot" aria-hidden="true"></span>${escapeHtml(item.name)}
                <span class="muted small">${item.mythologies.length} ${item.mythologies.length === 1 ? 'tradition' : 'traditions'}</span>
              </button></li>`,
            )
            .join('')}
        </ul>
      </div>`;
    }
    const playable = region.mythologies.map((id) => metaById.get(id)).filter((m) => m?.mvp);
    const catalogued = region.mythologies.map((id) => metaById.get(id)).filter((m) => m && !m.mvp);
    return `<div class="map-panel__body" data-testid="map-panel" aria-live="polite">
      <p class="eyebrow">Region</p>
      <h2 data-testid="map-region-title">${escapeHtml(region.name)}</h2>
      <p class="muted">${playable.length} playable ${playable.length === 1 ? 'tradition' : 'traditions'} in this edition.</p>
      <div class="map-myth-list">
        ${playable
          .map(
            (m) => `<a class="map-myth" href="#/myth/${m.id}" data-testid="map-region-link-${m.id}">
              <img class="sigil sigil--small" src="${iconFor(m.id)}" alt="" width="32" height="32">
              <span><strong>${escapeHtml(m.name)}</strong><span class="muted small">${escapeHtml(m.period_text)}</span></span>
            </a>`,
          )
          .join('') || '<p class="muted">No playable traditions here yet.</p>'}
      </div>
      <details class="map-catalogue">
        <summary>Also catalogued here (${catalogued.length})</summary>
        <p class="small muted">${catalogued.map((m) => escapeHtml(m.name)).join(' · ') || 'Nothing else yet.'}</p>
      </details>
      <a class="text-link" href="#/myths">See the full list view</a>
    </div>`;
  }

  function page() {
    root.innerHTML = `<div class="page" data-testid="map-page">
      <header class="page-head">
        <p class="eyebrow">Atlas</p>
        <h1 id="page-title">A world of stories</h1>
        <p class="lede">A stylised map of the traditions catalogued in this game. It is not to scale and it does not show modern borders. Choose a region or a marker to begin.</p>
      </header>
      <div class="map-layout">
        <div class="map-frame">
          <div class="map-scroll" tabindex="0" role="group" aria-label="Scrollable map">
          <svg class="world-map" viewBox="0 0 ${width} ${height}" role="group" aria-label="Stylised world map with six regions">
            <defs>
              <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0d2028"></stop>
                <stop offset="100%" stop-color="#132f38"></stop>
              </linearGradient>
              <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
                <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
              </filter>
            </defs>
            <rect width="${width}" height="${height}" fill="url(#ocean)"></rect>
            <g class="map-graticule" aria-hidden="true">
              ${Array.from({ length: Math.floor(regionsData.width / 8) }, (_, i) => `<line x1="${(i + 1) * 8 * TILE}" y1="0" x2="${(i + 1) * 8 * TILE}" y2="${height}"></line>`).join('')}
              ${Array.from({ length: Math.floor(regionsData.height / 6) }, (_, i) => `<line x1="0" y1="${(i + 1) * 6 * TILE}" x2="${width}" y2="${(i + 1) * 6 * TILE}"></line>`).join('')}
            </g>
            <g class="map-terrain" aria-hidden="true">${buildTiles(rows, regionsData.width, regionsData.terrain)}</g>
            <g class="map-regions">
              ${regionsData.regions
                .map((region) => {
                  const [rx, ry, rw, rh] = region.bounds;
                  return `<g class="map-region" role="button" tabindex="0" data-region="${region.id}" data-testid="map-region-${region.id}" aria-label="Explore ${escapeHtml(region.name)}">
                    <rect x="${rx * TILE}" y="${ry * TILE}" width="${rw * TILE}" height="${rh * TILE}" rx="10" class="map-region__hit"></rect>
                    <text x="${region.label[0] * TILE}" y="${region.label[1] * TILE}" class="map-region__label" style="--region-color:${region.color}">${escapeHtml(region.name)}</text>
                  </g>`;
                })
                .join('')}
            </g>
            <g class="map-markers">
              ${Object.entries(regionsData.markers)
                .map(([id, [tx, ty]]) => {
                  const meta = metaById.get(id);
                  if (!meta) return '';
                  return `<a class="map-marker" href="#/myth/${id}" data-testid="map-marker-${id}" aria-label="Open ${escapeHtml(meta.name)}: ${escapeHtml(meta.period_text)}">
                    <circle cx="${(tx + 0.5) * TILE}" cy="${(ty + 0.5) * TILE}" r="16" class="map-marker__halo"></circle>
                    <circle cx="${(tx + 0.5) * TILE}" cy="${(ty + 0.5) * TILE}" r="34" fill="transparent"></circle>
                    <image href="${iconFor(id)}" x="${(tx + 0.5) * TILE - 14}" y="${(ty + 0.5) * TILE - 14}" width="28" height="28"></image>
                  </a>`;
                })
                .join('')}
            </g>
          </svg>
          </div>
          <p class="map-scroll-hint muted small">Scroll sideways to explore the whole map.</p>
          <p class="map-caption muted small">Terrain is simplified: green plains, sand deserts, dark forest, grey mountains, pale ice. Markers show the playable traditions.</p>
        </div>
        <aside class="map-panel" id="map-panel" aria-label="Region details">${regionPanel(null)}</aside>
      </div>
      <section class="panel panel--soft map-list" aria-labelledby="map-list-title">
        <div class="section-head">
          <div>
            <p class="eyebrow">List view</p>
            <h2 id="map-list-title">All playable traditions</h2>
          </div>
          <a class="text-link" href="#/myths">Open the full traditions page</a>
        </div>
        <div class="map-list__grid">
          ${mythologies
            .filter((m) => m.mvp)
            .map(
              (m) => `<a class="map-list__item" href="#/myth/${m.id}">
                <img class="sigil" src="${iconFor(m.id)}" alt="" width="36" height="36">
                <span><strong>${escapeHtml(m.name)}</strong><span class="muted small">${escapeHtml(m.region)} · ${escapeHtml(m.period_text)}</span></span>
              </a>`,
            )
            .join('')}
        </div>
      </section>
    </div>`;

    const select = (regionId) => {
      const region = regionsData.regions.find((item) => item.id === regionId);
      root.querySelectorAll('.map-region').forEach((group) => {
        group.classList.toggle('is-selected', group.dataset.region === regionId);
      });
      const panel = root.querySelector('#map-panel');
      panel.innerHTML = regionPanel(region);
      bindLegend(panel);
    };

    function bindLegend(scope) {
      scope.querySelectorAll('[data-region-legend]').forEach((button) => {
        button.addEventListener('click', () => select(button.dataset.regionLegend));
      });
    }

    root.querySelectorAll('.map-region').forEach((group) => {
      group.addEventListener('click', () => select(group.dataset.region));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(group.dataset.region);
        }
      });
    });
    bindLegend(root);
    focusPage();
  }

  page();
}
