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

## Review checklist for new art

- [ ] 16 × 16, one-pixel outline, transparent padding.
- [ ] Only palette keys; no new hex values.
- [ ] Readable at 24 px and at 64 px.
- [ ] No faces of sacred figures; object/symbol preferred.
- [ ] Checked in dark and light themes.
- [ ] Map marker still readable over terrain and at mobile width.
- [ ] `npm run svg` and `npm test` pass.
- [ ] A human has reviewed the art for stereotypes or disrespect.
