# Mythos — a world mythology game

A text-first educational game for ages 12+. Read short retellings from twenty-six
world traditions, answer quizzes, unlock a codex of figures and terms, and
explore a stylised world map and timeline. A separate branching saga,
**The Ash-Seed**, lets you walk a Norse myth as a mortal of your own naming,
choosing roads that lead to five different endings. Stories and questions carry
original pixel-art SVG scenes, and optional pre-generated narration reads the
text aloud.

There is no build step and no framework. Content lives in JSON, the interface is
HTML/CSS/vanilla ES modules, and every image is SVG. Progress stays in the
browser; the published site uses Google Analytics for aggregate usage and no
other third-party script.

## Quick start

Requires Node.js 20 or newer (only for the local server and tests).

```bash
npm install
npm start
```

Open <http://127.0.0.1:4180>. The server is deliberately dependency-free.

To use another port:

```bash
PORT=8080 npm start
# or
node tools/serve.js 8080
```

Opening `index.html` directly from disk will not work: the game fetches its
content JSON, which browsers block on `file://` URLs. Use the local server or
any static host.

## What is playable

| Tradition | Stories | Quiz questions | Characters | Glossary |
| --- | ---: | ---: | ---: | ---: |
| Greek | 6 | 20 | 10 | 10 |
| Norse | 6 | 20 | 10 | 10 |
| Egyptian | 6 | 20 | 10 | 10 |
| Mesopotamian | 6 | 20 | 10 | 10 |
| Hindu | 6 | 20 | 10 | 10 |
| Japanese | 6 | 20 | 10 | 10 |
| Maya | 6 | 20 | 10 | 10 |
| Celtic | 6 | 20 | 10 | 10 |
| Chinese | 6 | 20 | 10 | 10 |
| Roman | 6 | 20 | 10 | 10 |
| Persian / Zoroastrian | 6 | 20 | 10 | 10 |
| Canaanite | 6 | 20 | 10 | 10 |
| Minoan / Mycenaean | 6 | 20 | 10 | 10 |
| Hittite / Hurrian | 6 | 20 | 10 | 10 |
| Slavic | 6 | 20 | 10 | 10 |
| Etruscan | 6 | 20 | 10 | 10 |
| Baltic | 6 | 20 | 10 | 10 |
| Korean | 6 | 20 | 10 | 10 |
| Andean | 6 | 20 | 10 | 10 |
| Aztec / Mesoamerican | 6 | 20 | 10 | 10 |
| Akan / West African | 6 | 20 | 10 | 10 |
| Dogon & Mande | 6 | 20 | 10 | 10 |
| Bantu | 6 | 20 | 10 | 10 |
| Finnic / Sámi | 6 | 20 | 10 | 10 |
| Polynesian | 6 | 20 | 10 | 10 |
| Caucasian / Nart | 6 | 20 | 10 | 10 |

The timeline catalogues 35 traditions. The other 9 are marked as planned for
later editions and are not playable yet.

### The Ash-Seed (branching saga)

`#/saga` is a step-by-step choose-your-path retelling of Norse myth. You name
the protagonist (default **Michael**; suggestions include Jason, Astrid and
Eirik), then follow one of three roads — the Raven's Road, the Wolf's Road or
the Hammer's Road — through 20 hand-written scenes to one of five endings.
Prose is revealed one paragraph at a time, in short scenes. A Listen control
reads the scene aloud, and every visible paragraph has its own Listen button;
a myth note and a set of choices appear when the scene is complete. Some choices are gated by the gifts and
debts you have collected, and every choice is saved as a snapshot so the
in-game back button and browser history can rewind cleanly.

Saga progress is stored separately in `mythos.saga.v1`, so a saga run never
disturbs quiz, codex or challenge progress. The saga is English-only and uses
the common English spellings of Norse names. It is an original interactive
retelling, not a translation; its sources are the Poetic Edda and Prose Edda.

### Game rules

- Story 1 of each tradition is open. Passing a story quiz (70%, i.e. 3/4 or
  4/5) unlocks the next story.
- After all six story quizzes, the 20-question final challenge opens.
- Reading a story unlocks the characters who appear in it. Every read story
  also unlocks two glossary terms. A final-challenge pass opens the whole
  tradition's codex.
- Progress, quiz bests, challenge results and badges are stored in
  `localStorage` under `mythos.progress.v1`. Theme and text size are stored in
  `mythos.settings.v1`. Saga runs use `mythos.saga.v1`.
- The palette follows the OS `prefers-color-scheme` until the reader presses
  the theme button; that explicit light/dark choice is then stored as
  `themeMode` and wins on later visits. OS changes are mirrored live only while
  no explicit choice exists.
- The saga has no quiz gate: it is a story-first mode. Its choices filter on
  flags earned earlier in the same run, and its five endings are collected in a
  gallery on `#/saga`.
- The three challenges (Timeline Builder, Pantheon Match, Which Culture?) and
  the results/badges screen are optional practice.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Serve the game at `http://127.0.0.1:4180` |
| `npm run validate` | Validate all content JSON with zero dependencies |
| `npm run svg` | Compile `assets/sprites/icons/*.txt` into SVG |
| `npm test` | Run the Playwright end-to-end suite headlessly |
| `npm run test:headed` | Run Playwright with a visible browser |
| `npm run test:report` | Open the last HTML report |

The Playwright config uses an explicitly cached Chromium build when one is
available (see `playwright.config.js`), so it works in environments where the
browser revision expected by the package is not installed. Set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override the browser path.

The default test port is `4180`. The server is started automatically by
Playwright unless one is already running there.

## Project layout

```
index.html              app shell, header, footer, toast host
css/style.css           design system, screens, responsive rules
js/
  app.js                hash router + home, traditions, mythology, story,
                        codex, timeline, results and about screens
  content.js            JSON loading, caching and content helpers
  storage.js            defensive localStorage progress/settings
  progress.js           unlock and codex derivations
  quiz.js               story quizzes and the final challenge
  challenges.js         timeline, match and culture challenges
  badges.js             badge catalogue and evaluator
  map.js                accessible inline SVG world map
  scene.js              deterministic pixel-art story scenes, quiz clues,
                        answer icons and character portraits
  saga.js               The Ash-Seed landing, scene reader, choices and endings
  saga-art.js           14 animated inline-SVG saga scenes and path glyphs
  saga-state.js         defensive save/rewind/effects for the saga run
  narration.js          studio-clip playback with browser speech fallback
  ui.js                 shared escaping, formatting and dialog helpers
content/
  mythologies.json      35-tradition catalogue; `mvp: true` for the twenty-six
  greek/ ...            five JSON files per playable tradition
  saga/norse.json       the branching Ash-Seed story graph, paths and endings
schemas/                JSON Schema documents for every content file
audio/
  voices/               joe, cori and morgan narration clips
  samples/              short in-dialog audition files
assets/
  palette.json          16-key pixel palette
  sprites/icons/        16×16 text grids: mythology sigils and map markers
  svg/icons/            generated SVG sigils
  svg/logo.svg          wordmark/compass mark and favicon
  map/world.txt         64×36 terrain tile grid
  map/regions.json      region rectangles, labels, colours and markers
tools/
  serve.js              zero-dependency static server
  validate_content.js   content validator
  render_sprites.js     text-grid → SVG compiler
  make_map.js           regenerates assets/map/world.txt
  generate_piper_audio.py  offline authoring tool for studio narration clips
tests/                  Playwright end-to-end tests
```

## Content model

Each playable tradition has five files under `content/<id>/`:

- `info.json` — intro, timeline facts, sources, sensitivity, `verified`.
- `stories.json` — six stories with `id`, `title`, `source_ref`, `themes`,
  `characters`, `paragraphs`, `uncertain`, `notes` and `verified`.
- `quiz.json` — 20 questions with four choices, `correct_index`, an explanation,
  `story_id`, `difficulty` and `verified`.
- `characters.json` — ten figures with role, domains, symbols, a fun fact and
  `verified`.
- `glossary.json` — ten terms with definitions and `verified`.

IDs follow the pattern `<mythology-id>-01` for stories and
`<mythology-id>-q01` for questions. Character references in stories must exist in
that tradition's `characters.json`.

Branching sagas live under `content/saga/`. Each file declares its `start` node,
acts, named paths, a `boons` label map and an `endings` list. `nodes` is keyed by
scene id; a node contains prose paragraphs, an `art` scene key, an optional lore
note, and either 2–5 `choices` (`to`, `tag`, `effects`, `requires.anyFlags`) or
an `ending`. The validator checks targets, flags, stats, reachable scenes and
every route's ability to reach an ending.

### Adding a tradition

1. Add an entry to `content/mythologies.json` with `mvp: true` and unique `id`,
   `name`, period fields, `region`, `summary`, `sensitivity`, `verified: false`.
2. Copy an existing `content/<id>/` folder and rewrite the five files. Keep six
   stories, 20 questions, 10 characters and 10 glossary terms.
3. Run `npm run validate` and fix every error.
4. Add an icon grid at `assets/sprites/icons/<id>.txt`, run `npm run svg`, and
   add the tradition to the map regions/marker data.
5. Add it to the `REGION_ORDER`-driven lists automatically; the UI discovers
   playable traditions from `mythologies.json`.

## Content status — read before publishing

Every story, quiz, character and glossary entry currently has
`"verified": false`. The material was drafted with AI assistance and has **not
been checked line by line by a named human reviewer**. Do not present it as a
definitive or authoritative source.

- **Hindu** content is marked `high` sensitivity: a living tradition requiring
  a dedicated sensitivity review.
- **Japanese (Shinto)**, **Maya**, **Chinese**, **Korean**, **Andean**, **Aztec / Mesoamerican**, **Akan**, **Dogon & Mande**, **Bantu**, **Finnic / Sámi**, **Polynesian** and **Caucasian / Nart** content are marked `medium`: living traditions that need a sensitivity review.
- Other traditions are marked `low`, which still requires a fact-check.

The in-game About screen and each tradition page carry review and sensitivity
notes. See `CREDITS.md` for the source notes and `PLAN_AND_TODO.md` for the
remaining `NEEDS HUMAN` tasks.

## SVG art pipeline

All images are SVG. Icons are authored as 16×16 character grids:

```
assets/sprites/icons/greek.txt  →  node tools/render_sprites.js
                                →  assets/svg/icons/greek.svg
```

Each horizontal run of one palette key becomes a single `<rect>`, so the SVGs
stay small and crisp at any size. The map is not a bitmap: `js/map.js` reads
`assets/map/world.txt` and emits merged-run SVG tiles, with region overlays and
inline SVG markers. Story scenes, quiz clues and character portraits are
generated deterministically by `js/scene.js` from the same palette; they are
not fetched images. See `assets/STYLE_GUIDE.md` for the palette and grid rules.

## Accessibility notes

- Skip link; visible `:focus-visible` rings; native links and buttons.
- Route changes focus the page heading. Answering a quiz question moves focus to
  the result so screen readers read the verdict and explanation before the
  `Next question` button; reordering the timeline challenge is announced in a
  live region.
- Challenges are keyboard-operable with arrow buttons, not drag-and-drop.
- The map has focusable regions, a list view and a horizontally scrollable
  mobile view; region details are announced in a live region.
- Text-size control (`Aa`) cycles 100 / 112.5 / 125%, persisted locally.
- Optional narration uses pre-generated neural clips — open Piper voices (Joe,
  Cori) plus a fan-made, non-commercial Morgan clone — or the browser's
  SpeechSynthesis API as a fallback. Morgan is preselected; the first Listen
  opens the voice picker so the choice is explicit. It never autoplays and
  stops on navigation or when the voice is changed. The header speaker button
  opens a narration dialog with an on/off switch, a fallback system-voice
  picker and selectable studio voices. Selecting a studio voice applies
  immediately and is saved as `studioVoice`; each Listen button plays its clip
  and falls back to the system voice if the clip is unavailable.
  Premium/Enhanced/Natural system voices are grouped first with a ★.
- `prefers-reduced-motion` removes animations.
- All decorative sigils have empty `alt`; labels are in text.

## Testing

The suite covers the shell, every route, all twenty-six traditions, the Greek read →
quiz → unlock → persistence loop, failed quiz and retry, the final challenge,
codex unlocks, timeline, all three challenges, the map and its mobile scroll,
story and quiz SVG scenes, answer icons, narration controls, studio-clip playback,
system-voice selection, theme/font persistence, OS `prefers-color-scheme` defaults, reset confirmation, responsive overflow, skip
link and quiz keyboard feedback. The saga suite covers name entry and the
default protagonist, progressive reveal, scene and paragraph narration, the
myth note, gated choices, persistence and resume, in-game back, restart
confirmation, ending collection and mobile overflow.

```bash
npm test
```

If Chromium is not already cached, install it once with
`npx playwright install chromium`.

## Deployment

### GitHub Pages

The repository includes `.github/workflows/pages.yml`, which publishes the
static site through GitHub Actions on every push to `main`.

1. Push the repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Run the workflow (or push to `main`).

The local module and stylesheet URLs include a release query (`?v=...`). Bump
that value when changing CSS or JavaScript and redeploy, so visitors do not mix
an old cached module with a new page.

The public URL is `https://<user>.github.io/<repo>/` for a project repository,
or `https://<user>.github.io/` if the repository is named
`<user>.github.io`. All asset paths are relative, so both work without a base
path. To publish at `https://ozkanpakdil.github.io/`, the repository must be
named `ozkanpakdil.github.io`.

The workflow copies only the site and its two documentation links
(`index.html`, `css`, `js`, `content`, `assets`, `CREDITS.md`, `README.md`,
`.nojekyll`) into the Pages artifact. Any static host
(Netlify, S3, nginx) also works: upload those files and keep their relative
layout. Hash routes need no rewrite rules.

### Analytics and privacy

The published build loads Google Analytics 4 with measurement ID
`G-NSB9K61M5S`. The tag is deliberately skipped on `localhost`/`127.0.0.1` so
local development and the Playwright suite stay quiet. Progress and settings
remain in `localStorage`; no game progress is sent to analytics. Add a consent
banner before promoting the site if your audience or jurisdiction requires one.

## Licence and credits

Code and original SVG art: the Mythos project. Retellings are new summaries,
not translations; source notes are listed per tradition in `CREDITS.md` and in
the game. No third-party fonts or images are used. Google Analytics is the
only third-party script on the published site.
