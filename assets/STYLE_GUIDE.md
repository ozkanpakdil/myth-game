# Mythos SVG & pixel-art style guide

All art in Mythos is SVG. There are no photographs, raster images, external
fonts, icon fonts or CDN assets. The style is a blocky "museum archive" pixel
mosaic: muted earth colours, a dark ink outline, and a single gold highlight.

## Palette

`assets/palette.json` is the source of truth. A grid may use at most these 16
keys (including transparent). Do not add colours to individual sprites.

| Key | Name | Hex | Typical use |
| --- | --- | --- | --- |
| `.` | transparent | — | background / holes |
| `#` | outline | `#171712` | one-pixel silhouette |
| `w` | bone | `#f2e6cf` | paper, bone, light stone |
| `c` | stone | `#c9bda5` | Maya limestone, masonry |
| `g` | gold | `#d6a84b` | main metal / sacred highlight |
| `l` | light gold | `#f2d37b` | highlight edge, lotus |
| `b` | teal | `#3f7f86` | water, patina |
| `d` | deep teal | `#24545c` | deep water shadow |
| `r` | terracotta | `#b5523b` | torii, clay |
| `o` | orange | `#d9824a` | warm accent |
| `e` | leaf | `#5d8148` | leaves, young growth |
| `n` | deep green | `#33502f` | shadowed foliage |
| `s` | sand | `#b08a55` | desert, parchment shadow |
| `k` | brown | `#6b4f33` | wood, handles |
| `p` | plum | `#7b4a6b` | rare accent |
| `v` | violet | `#9a6b9e` | rare accent |

The dark theme background is `#0e1310`; the light theme background is
`#f3ede0`. Gold must remain legible on both. Never rely on colour alone to carry
meaning: pair it with a label, shape or text.

## Icon grids

- Exactly **16 rows × 16 columns**, UTF-8, one palette character per pixel.
- One-pixel `#` outline; keep the silhouette readable at 24 px.
- Leave at least one transparent pixel of padding on every side.
- Prefer symbols and objects. Do **not** depict the faces of deities or sacred
  figures, especially in the Hindu, Shinto and Maya traditions.
- Name files after the tradition id: `greek.txt`, `norse.txt`, and so on.
  `marker.txt` and `marker-locked.txt` are the map pins.
- Output is compiled to `assets/svg/icons/<name>.svg`, scaled to 64 px with
  `shape-rendering="crispEdges"`. The source remains the text grid.

### Example 1 — Greek column (`assets/sprites/icons/greek.txt`)

```
................
...##########...
...#gggggggg#...
...##########...
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
....#g#gg#g#....
...##########...
...#gggggggg#...
...##########...
................
```

### Example 2 — Maya stepped pyramid (`assets/sprites/icons/maya.txt`)

```
................
.......##.......
......#cc#......
.....#cccc#.....
....#cccccc#....
...#cccccccc#...
..#cccccccccc#..
.##cccccccccc##.
################
#ccccc#gg#ccccc#
#ccccc#gg#ccccc#
################
......#gg#......
.....#gggg#.....
....########....
................
```

## Rendering rules

1. `node tools/render_sprites.js` reads every `*.txt` in
   `assets/sprites/icons/`, validates the dimensions and palette keys, and
   writes one SVG per grid.
2. Each horizontal run of the same colour becomes a single `<rect>`, which
   keeps the file small and the edges exact.
3. The script fails loudly on a wrong row length, unknown key or wrong row
   count. Fix the grid rather than editing generated SVG by hand.
4. Generated SVGs are committed so the site works without running the build.

## Map style

- `assets/map/world.txt` is **64 × 36** characters (2,304 tiles); each tile is
  16 × 16 SVG units, so the viewBox is 1024 × 576.
- Terrain keys: `~` water, `g` grass, `s` sand, `m` mountain, `i` ice,
  `f` forest. Flat SVG colours are intentional; the map is a diagram, not a
  satellite image.
- `assets/map/regions.json` supplies six region rectangles, label anchors,
  `--region-color` values, and the eight playable marker positions.
- The map shows **no modern borders** and is not to scale. Region rectangles
  are interaction targets, not political geography.
- Markers use the tradition's own 16×16 sigil inside a gold halo. The halo is
  decorative; the link has an accessible label with the tradition and period.
- A text list of all playable traditions must remain available as the
  accessible fallback and is rendered under the map.
- On narrow screens the map keeps a minimum width and scrolls horizontally
  rather than shrinking labels into illegibility.

## Typography and UI art

- Display type: Iowan Old Style / Palatino / Georgia (system serif stack).
- Interface type: system UI sans-serif stack.
- Gold `#d8a94f` is an accent, never the only signal for an action.
- Icons are `alt=""` and decorative; the adjacent text carries the meaning.
- Motion is limited to short fades and transforms; `prefers-reduced-motion`
  disables it.


## Story scenes, quiz clues and character portraits

`js/scene.js` extends the same palette into three deterministic SVG forms. They
are generated in the browser and are never fetched as image files.

### Story scenes

- A 64 × 36 grid at 5 px per cell (a 320 × 180 viewBox), built from a two-band
  sky, stars, a sun or moon, blocky peaks, ground/water and one foreground motif.
- `STORY_MOTIFS` maps every story id to a motif (dragon, gate, tree, boat,
  scales, labyrinth, hammer, lotus, maize, and so on). The motif must match the
  story's central image, not merely its tradition.
- The paragraph number shifts the sun and motif by a few cells, so the scene
  subtly changes as the reader moves through the telling. It is still the same
  symbolic place, not a new illustration for every paragraph.
- Always label the panel `A symbolic scene, not a literal illustration.` Do not
  imply that the pixel composition is a historical reconstruction.

### Quiz clues

- `questionScene()` checks the question, the correct answer and the explanation
  for concrete nouns (sun, sea, serpent, gate, hammer, scales, maize, bridge,
  etc.) and selects the matching motif. If there is no match it falls back to
  the story motif.
- The art is a clue, not an answer key. Do not render the correct choice's text
  inside the SVG.
- Quiz SVG art must have `role="img"` and an aria-label; the visible caption
  names the clue and the source story.

### Character portraits

- 16 × 16 grid at 2 px per cell (a 32 × 32 viewBox), transparent background.
- Six archetypes: crown, veil, hood, halo, horns, helm. They are chosen from the
  character's role/domain/symbols, then colour-varied by a stable hash.
- The portrait is an abstract bust with an emblem, **not a likeness**. Do not
  add faces to sacred figures, and do not use portraits as a claim about how a
  deity was depicted historically.
- Portraits appear in the codex and story figure chips. Every quiz choice also
  gets an SVG icon: a character portrait when the choice names a figure, or a
  compact motif glyph (sun, gate, tree, scales, seed, etc.) otherwise. The icon
  must never contain the answer text or a unique "correct" marker.

### Colour and contrast

- Keep to the table above; the only additions are the UI's dark background
  (`#0e1310`) and ink outline (`#171712`).
- Each scene needs one warm focal colour (gold, terracotta or light gold) so it
  reads at 320 px wide and on a phone.
- Check every new motif in both themes. A scene may look darker on the light
  theme's surrounding page; the art itself does not switch palettes.

### Audio

Listen buttons pair a play icon with the label; while speaking they switch to a
stop icon and `Stop narration` / `Stop`. The header speaker button opens the
narration dialog, where the reader can switch narration on or off, choose an
installed system voice, and preview it.

There is no audio art. Narration uses the browser's SpeechSynthesis engine only;
there are no voice files, no celebrity voices and no voice cloning. Never label
a system voice as a real person. The Voice dialog lists installed system voices, groups Premium/Enhanced/Natural
voices first with a ★, persists the chosen `voiceURI`, and previews it with a
neutral sample sentence. Two short Piper neural-voice samples are offered as an
audition; they are not the default narration.

## Review checklist for new art

- [ ] 16 × 16, one-pixel outline, transparent padding.
- [ ] Only palette keys; no new hex values.
- [ ] Readable at 24 px and at 64 px.
- [ ] No faces of sacred figures; object/symbol preferred.
- [ ] Checked in dark and light themes.
- [ ] Map marker still readable over terrain and at mobile width.
- [ ] `npm run svg` and `npm test` pass.
- [ ] A human has reviewed the art for stereotypes or disrespect.
