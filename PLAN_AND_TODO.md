# Myth Game: Plan & TODO (for an AI agent to work through)

## 0. HOW TO USE THIS FILE (agent: read this first, every session)

1. Read this whole file. Then read `PROGRESS LOG` (Section 9) to see where you stopped.
2. Find the **first unchecked task** `- [ ]` in Section 7 (TODO). Do only that task.
3. Save your output to the file path named in the task.
4. Change `- [ ]` to `- [x]` for that task and add one line to the PROGRESS LOG (date, task id, notes).
5. Repeat from step 2. Stop only when asked, or when a task says `NEEDS HUMAN`.

**Rules**
- Never invent facts. Use only well-known, widely documented stories. If a date, name or detail is uncertain, write `"uncertain": true` and add a note. Do not guess.
- Every story, character and quiz item has `"verified": false` until a human changes it.
- Keep each task small. If a task feels too big, split it into sub-tasks in the TODO list.
- Never rewrite or delete finished files unless a task tells you to.
- Respect living traditions (Section 6). When unsure, leave it out and add a `NEEDS HUMAN` note.

---

## 1. Project Summary

An educational game about world myths. Players pick a mythology, read short stories, then answer quizzes and complete small challenges.

| Item | Decision |
|---|---|
| Version 1 (this plan, Phases 1–4) | **Text only.** No images, no audio. Runs in a browser |
| Version 2 (Phases 5–6) | World map for choosing a myth, plus simple pixel art |
| Audience | Ages 12+ |
| Tech | Static website: HTML + CSS + vanilla JavaScript. Content in JSON files. No server |
| MVP content | 8 mythologies, 6 stories each, 20 quiz questions each |

**Implementation note (this build):** images are delivered as **SVG** (not PNG).
Pixel-art sprites are authored as text grids and compiled to SVG by
`tools/render_sprites.js`. The world map is an inline, accessible SVG.

---

## 2. Mythology List (seed data, approximate)

Dates are approximate and must be treated as `verified: false`. "Record" means when stories were first written down, often much later than the oral tradition.

| # | Mythology | Active period | Earliest record / main sources | Region |
|---|---|---|---|---|
| 1 | Sumerian / Mesopotamian | ~3500–500 BCE | Gilgamesh poems (~2100 BCE), Enuma Elish | Middle East |
| 2 | Egyptian | ~3100 BCE–400 CE | Pyramid Texts (~2400 BCE) | Africa |
| 3 | Canaanite / Ugaritic | ~2000–500 BCE | Ugarit tablets (~1400–1200 BCE) | Middle East |
| 4 | Hittite / Hurrian | ~1700–1200 BCE | Hittite tablets | Middle East |
| 5 | Persian / Zoroastrian | ~1500 BCE–present | Avesta, Shahnameh (~1010 CE) | Asia |
| 6 | Minoan / Mycenaean | ~2000–1100 BCE | Linear B tablets | Europe |
| 7 | Greek | ~800 BCE–400 CE | Homer, Hesiod | Europe |
| 8 | Etruscan | ~800–100 BCE | Inscriptions, art | Europe |
| 9 | Roman | ~750 BCE–500 CE | Virgil, Ovid | Europe |
| 10 | Celtic | Iron Age–medieval | Irish texts (8th–12th c.), Mabinogion | Europe |
| 11 | Norse / Germanic | Iron Age–~1100 CE | Eddas (13th c.), sagas | Europe |
| 12 | Slavic | pre-Christian–~10th c.+ | Late chronicles, folklore | Europe |
| 13 | Baltic | pre-Christian–~14th c. | Chronicles, folk songs | Europe |
| 14 | Finnic / Sámi | ancient oral | Kalevala (compiled 1835) | Europe |
| 15 | Caucasian (Georgian, Armenian, Nart) | ancient oral | Nart sagas (collected 19th c.) | Europe/Asia |
| 16 | Vedic / Hindu | ~1500 BCE–present | Rigveda, Ramayana, Mahabharata, Puranas | Asia |
| 17 | Buddhist narratives | ~500 BCE–present | Jataka tales | Asia |
| 18 | Chinese | ~2000 BCE–present | Shan Hai Jing, Journey to the West | Asia |
| 19 | Japanese (Shinto) | ancient–present | Kojiki (712 CE) | Asia |
| 20 | Korean | ancient–present | Samguk Yusa (~1280s CE) | Asia |
| 21 | Tibetan / Bon | ancient–present | Bon and Buddhist texts | Asia |
| 22 | Mongolic & Turkic (Tengri) | ancient–medieval | Epics (Manas, Dede Korkut) | Asia |
| 23 | Southeast Asian | ancient–present | Inscriptions, chronicles, oral epics | Asia |
| 24 | Siberian / Arctic (incl. Inuit) | ancient–present | Oral, 19th–20th c. records | Asia/N. America |
| 25 | Yoruba / Orisha | ancient–present | Oral (Ifá), written from 19th c. | Africa |
| 26 | Akan / West African (Anansi) | ancient–present | Oral | Africa |
| 27 | Dogon & Mande | ancient–present | Oral, Sundiata epic | Africa |
| 28 | Bantu (Zulu, Shona, Kongo) | ancient–present | Oral | Africa |
| 29 | Maya | ~1000 BCE–present | Popol Vuh (16th c.) | Americas |
| 30 | Aztec / Mesoamerican | Olmec ~1200 BCE; Aztec 14th–16th c. | Codices | Americas |
| 31 | Andean (Chavín, Inca) | ~900 BCE–1533 CE | Colonial chronicles | Americas |
| 32 | North American Indigenous | very ancient, oral | Oral, 17th c.+ collections | Americas |
| 33 | Amazonian & Caribbean | ancient–present | Oral, colonial records | Americas |
| 34 | Polynesian (Māori, Hawaiian, etc.) | ~1000–1300 CE far Polynesia; older roots | Oral, 19th c.+ | Oceania |
| 35 | Aboriginal Australian (Dreaming) | 60,000+ years of occupation | Oral, art, song | Oceania |

Optional and sensitive (decide with a human before including): Abrahamic narratives. Use neutral wording such as "sacred narratives", or leave them out.

**MVP set (build these first):** Greek, Norse, Egyptian, Mesopotamian, Hindu, Japanese, Maya, Celtic.
Yoruba and other living-tradition content come later, after human review.

---

## 3. Version 1 Design (text only)

### Screens
1. **Home**: title, "Start", "Timeline", "Codex".
2. **Mythology list**: text list of mythologies (grouped by region), each with period and a one-line description.
3. **Mythology page**: intro, timeline facts, list of stories.
4. **Story reader**: one story, paragraph by paragraph, with a "Next" button.
5. **Quiz**: multiple-choice questions with instant feedback and explanations.
6. **Timeline challenge**: put 5–6 mythologies or events in order.
7. **Match challenge**: match deity ↔ domain ↔ culture.
8. **Codex**: unlocked characters and glossary terms (text cards).
9. **Results**: score and badges (text).

### Game rules
- Each mythology has 6 stories, 20 quiz questions, 10 character cards, 10 glossary terms.
- Passing a quiz (70%+) unlocks the next story or a codex card.
- Progress saves in the browser (`localStorage`).

### Design constraints for V1
- Plain, readable CSS. Dark/light theme optional.
- Mobile-friendly layout.
- All content loaded from JSON, never hard-coded in HTML.
- No images. Use text icons (emoji or symbols) only if wanted.

---

## 4. File & Data Structure

```
myth-game/
├── PLAN_AND_TODO.md              # this file
├── index.html
├── css/style.css
├── js/
│   ├── app.js                    # router / screens
│   ├── storage.js                # save/load progress
│   ├── quiz.js
│   └── challenges.js
├── content/
│   ├── mythologies.json          # list from Section 2
│   ├── greek/
│   │   ├── info.json
│   │   ├── stories.json
│   │   ├── quiz.json
│   │   ├── characters.json
│   │   └── glossary.json
│   ├── norse/ ...                # same five files per mythology
│   └── ...
├── schemas/                      # JSON structure descriptions
└── tools/
    └── validate_content.js       # checks all JSON files
```

### Content formats

**mythologies.json (one entry)**
```json
{
  "id": "norse",
  "name": "Norse",
  "region": "Europe",
  "period_text": "Iron Age to about 1100 CE",
  "earliest_record": "Eddas, 13th century CE",
  "start_year": -800,
  "end_year": 1100,
  "summary": "One or two sentences.",
  "mvp": true,
  "sensitivity": "low",
  "verified": false
}
```

**stories.json (one entry)**
```json
{
  "id": "norse-01",
  "title": "The Theft of Thor's Hammer",
  "source_ref": "Prymskviða (Poetic Edda)",
  "paragraphs": ["Paragraph 1...", "Paragraph 2...", "Paragraph 3..."],
  "characters": ["thor", "loki"],
  "themes": ["trickery"],
  "uncertain": false,
  "verified": false
}
```

**quiz.json (one entry)**
```json
{
  "id": "norse-q01",
  "story_id": "norse-01",
  "question": "Who dressed as a bride?",
  "choices": ["Loki", "Thor", "Odin", "Freyja"],
  "correct_index": 1,
  "explanation": "Thor disguised himself to trick the giant Thrym.",
  "difficulty": "easy",
  "verified": false
}
```

**characters.json (one entry)**
```json
{
  "id": "thor",
  "name": "Thor",
  "role": "God of thunder",
  "domain": ["thunder", "protection"],
  "symbols": ["Mjölnir"],
  "fun_fact": "One short sentence.",
  "verified": false
}
```

**glossary.json (one entry)**
```json
{ "term": "Ragnarök", "definition": "One or two sentences.", "verified": false }
```

---

## 5. Writing Guidelines for Content Tasks

- **Stories:** 150–300 words, 3–5 paragraphs, clear language for ages 12+. Retell in your own words. Do not copy translations that are still under copyright.
- **Tone:** engaging, neutral and respectful. Mention that many myths have more than one version.
- **Quiz questions:** 4 choices, one correct. Wrong choices must be plausible but clearly wrong. Mix easy (50%), medium (35%), hard (15%). Every question needs an explanation. Questions must be answerable from the story text or from the character/glossary entries.
- **Dates:** show as text ("about 1220 CE") and keep the numeric `start_year`/`end_year` only for sorting. Use negative numbers for BCE.
- **Violence / mature themes:** describe briefly and without graphic detail.
- **Uncertain facts:** set `"uncertain": true` and explain in a `notes` field. Never fill gaps with guesses.

---

## 6. Respect Guidelines (living traditions)

Hindu, Shinto, Yoruba/Orisha, Indigenous peoples, Aboriginal Australian and other living traditions are not "dead myths". For these:
- Write "traditions" or "sacred stories", not "false stories".
- Name the specific people or nation, not just "Native American".
- Use only stories that are publicly shared. Some are restricted in their communities.
- Do not draw or write sacred figures in a joking or disrespectful way.
- Mark such content `"sensitivity": "high"` and add a `NEEDS HUMAN` review task.

---

## 7. TODO LIST

Tasks are in order. Do the first unchecked one. IDs are used in the PROGRESS LOG.

### Phase 0: Setup
- [x] **T001** Create the folder structure from Section 4 with empty placeholder files.
- [x] **T002** Write `content/mythologies.json` from the Section 2 table (all 35 entries, `mvp: true` for the 8 MVP ones, `verified: false`).
- [x] **T003** Write `schemas/` files describing each JSON format in Section 4.
- [x] **T004** Write `tools/validate_content.js`: checks all JSON files for required fields, 4 quiz choices, valid `correct_index`, and that every `story_id` and character id exists. Prints a clear error list.

### Phase 1: Game shell (text only)
- [x] **T010** `index.html` + `css/style.css`: basic layout, readable typography, mobile-friendly.
- [x] **T011** `js/storage.js`: save and load progress (completed stories, quiz scores, unlocked codex items) with `localStorage`. Handle missing or broken data safely.
- [x] **T012** `js/app.js`: simple screen router (Home, Mythology list, Mythology page, Story reader, Quiz, Codex, Results).
- [x] **T013** Mythology list screen: load `mythologies.json`, group by region, show only entries that have content files.
- [x] **T014** Story reader screen with Next/Back and "Take the quiz" at the end.
- [x] **T015** `js/quiz.js`: quiz screen, instant feedback, explanation, score, 70% pass rule, unlocks.
- [x] **T016** Codex screen: unlocked characters and glossary terms.
- [x] **T017** Basic test pass: load the Greek sample content (from T020) and click through every screen. Fix bugs.

### Phase 2: Content, one mythology at a time (MVP)
Repeat this block for each mythology. Tasks use the id prefix of the mythology (`greek`, `norse`, `egypt`, `mesopotamia`, `hindu`, `japan`, `maya`, `celtic`).

**Greek**
- [x] **T020** `content/greek/info.json`: intro (100–150 words), timeline facts, 5 key sources.
- [x] **T021** `content/greek/stories.json`: stories 1–3.
- [x] **T022** `content/greek/stories.json`: stories 4–6.
- [x] **T023** `content/greek/quiz.json`: 20 questions (spread across the 6 stories).
- [x] **T024** `content/greek/characters.json`: 10 characters.
- [x] **T025** `content/greek/glossary.json`: 10 terms.
- [x] **T026** Run `validate_content.js` on Greek, fix all errors.

**Norse**
- [x] **T030** info.json
- [x] **T031** stories 1–3
- [x] **T032** stories 4–6
- [x] **T033** quiz (20)
- [x] **T034** characters (10)
- [x] **T035** glossary (10)
- [x] **T036** validate and fix

**Egyptian**
- [x] **T040** info.json
- [x] **T041** stories 1–3
- [x] **T042** stories 4–6
- [x] **T043** quiz (20)
- [x] **T044** characters (10)
- [x] **T045** glossary (10)
- [x] **T046** validate and fix

**Mesopotamian**
- [x] **T050** info.json
- [x] **T051** stories 1–3
- [x] **T052** stories 4–6
- [x] **T053** quiz (20)
- [x] **T054** characters (10)
- [x] **T055** glossary (10)
- [x] **T056** validate and fix

**Hindu** (sensitivity: high)
- [x] **T060** info.json
- [x] **T061** stories 1–3 (Ramayana/Mahabharata selections)
- [x] **T062** stories 4–6
- [x] **T063** quiz (20)
- [x] **T064** characters (10)
- [x] **T065** glossary (10)
- [x] **T066** validate and fix
- [ ] **T067** **NEEDS HUMAN**: sensitivity review

**Japanese** (sensitivity: medium)
- [x] **T070** info.json
- [x] **T071** stories 1–3
- [x] **T072** stories 4–6
- [x] **T073** quiz (20)
- [x] **T074** characters (10)
- [x] **T075** glossary (10)
- [x] **T076** validate and fix
- [ ] **T077** **NEEDS HUMAN**: sensitivity review

**Maya** (sensitivity: medium)
- [x] **T080** info.json
- [x] **T081** stories 1–3 (Popol Vuh)
- [x] **T082** stories 4–6
- [x] **T083** quiz (20)
- [x] **T084** characters (10)
- [x] **T085** glossary (10)
- [x] **T086** validate and fix
- [ ] **T087** **NEEDS HUMAN**: sensitivity review

**Celtic**
- [x] **T090** info.json
- [x] **T091** stories 1–3
- [x] **T092** stories 4–6
- [x] **T093** quiz (20)
- [x] **T094** characters (10)
- [x] **T095** glossary (10)
- [x] **T096** validate and fix

### Phase 3: Challenges and timeline (text only)
- [x] **T100** `js/challenges.js`: Timeline Builder (put 5–6 mythologies in order using `start_year`; show correct order and short explanation after).
- [x] **T101** Pantheon Match challenge (match deity ↔ domain ↔ culture, using `characters.json`).
- [x] **T102** "Which culture?" challenge: show a short story snippet or domain, pick the culture.
- [x] **T103** Timeline screen: scrollable text list of all mythologies sorted by period, showing "active period" and "earliest record".
- [x] **T104** Badges (text): e.g. "Finished Greek", "Perfect quiz", "Timeline master".
- [x] **T105** Results screen and overall progress view.

### Phase 4: V1 polish and release
- [x] **T110** Full playthrough of every MVP mythology; fix bugs and unclear questions.
- [x] **T111** Accessibility: keyboard navigation, readable font size option, good contrast.
- [x] **T112** `CREDITS.md` and in-game credits listing sources.
- [x] **T113** `README.md`: how to run (open `index.html` or run a simple local server) and how to add a new mythology.
- [ ] **T114** **NEEDS HUMAN**: fact-check pass (dates, names, answer keys) and set `verified: true`.
- [ ] **T115** **NEEDS HUMAN**: playtest with a few people and collect feedback.

### Phase 5: World map (Version 2, after V1 is released)
**Design:** a simple tile-based map drawn as **SVG**. Each region is a clickable group of shapes. Clicking a region shows the mythologies from that region; clicking one starts it (same flow as V1).

- [x] **T200** Define the map: a grid of 64 × 36 tiles, each tile 16 × 16 px, written as a text file `assets/map/world.txt` (one character per tile: `~` water, `g` grass, `s` sand, `m` mountain, `i` ice, `f` forest). Simplified and blocky.
- [x] **T201** Define region areas in `assets/map/regions.json`: for each region (Europe, Middle East, Africa, Asia, Americas, Oceania) list tile rectangles, a label position, and the mythology ids inside.
- [x] **T202** `js/map.js`: draw the map from the text grid, highlight a region on hover, click to open region → mythology list. *(Implemented as a stylised inline SVG map; see `js/map.js`.)*
- [x] **T203** Region markers: place one marker per MVP mythology on the map at a chosen tile.
- [x] **T204** Keep the V1 text list as a fallback/accessibility option ("List view").

### Phase 6: Pixel art (Version 2)

**How pixel art is made (keeps it realistic for a text-based AI):**
An AI that writes text can create pixel art as **text grids**, one character per pixel, and a script turns the grids into **SVG** files (the original plan said PNG; this build uses SVG).

**Style rules**
- Sprite sizes: **16 × 16** for icons and characters, **32 × 32** for bigger scenes or deity portraits.
- One shared palette of at most **16 colours** in `assets/palette.json`.
- Chunky, simple shapes, 1-pixel dark outline, flat colours, no gradients. Minecraft-like blockiness is the goal.
- Transparent background uses the character `.`.

**Tasks**
- [x] **T210** Create `assets/palette.json` (16 colours, each with a one-character key) and `assets/STYLE_GUIDE.md` with the rules above and 2 example sprites.
- [x] **T211** `tools/render_sprites.js`: reads `assets/sprites/*.txt` grids, validates size and palette keys, outputs SVG files to `assets/svg/`, scaled up 4× with crisp edges.
- [x] **T212** Map tile sprites (16 × 16): water, grass, sand, mountain, ice, forest.
- [x] **T213** Region marker icon (16 × 16) and a "locked" version.
- [x] **T214** One icon per MVP mythology (16 × 16), each with a simple symbol (Norse = hammer, Egyptian = ankh, Greek = column, Maya = stepped pyramid, Celtic = knot-like cross shape, Japanese = torii gate, Hindu = lotus, Mesopotamian = ziggurat).
- [x] **T215** Character sprites (16 × 16), simple blocky figures for the 10 characters of each MVP mythology (start with Greek, then one mythology per task). *(Implemented as abstract 16 × 16 portrait busts with archetype headgear; no sacred faces.)*
- [x] **T216** Show sprites in Codex cards and in the story reader header.
- [ ] **T217** **NEEDS HUMAN**: review art for stereotypes or disrespectful depictions, especially sacred figures. For sensitive traditions prefer symbols and objects over faces.
- [ ] **T218** Optional: simple 2-frame idle animation for the map markers.

### Phase 7: Later expansion
- [ ] **T300** Add the next mythologies from Section 2 (use the Phase 2 block as a template, 3–5 per round).
- [ ] **T301** "Compare myths" mode (creation myths, flood myths, trickster figures).
- [ ] **T302** Daily Myth screen.
- [ ] **T303** Audio (optional): simple sound effects and background music.
- [ ] **T304** Translation of the UI and content.

### Phase 8: Engineering additions requested for this build
- [x] **T400** Initialise a git repository and commit the project in logical, complete commits.
- [x] **T401** Add Playwright end-to-end tests covering every screen and the main game loops; run them headlessly and fix failures.
- [x] **T402** Use SVG for all images (mythology icons, map markers, map, wordmark); provide a build pipeline from text pixel grids to SVG.
- [x] **T403** Add npm scripts and a zero-dependency static dev server; document test and build commands.

### Phase 9: Visual storytelling, audio and publishing (follow-up request)
- [x] **T500** Add a deterministic pixel-art scene engine for story illustrations, quiz clues, per-answer icons and character portraits; keep every image SVG.
- [x] **T501** Add optional browser narration (SpeechSynthesis) with a header settings dialog (on/off plus a system-voice chooser with preview and persistence), play/stop icons, and per-story/per-question Listen controls; no recorded or celebrity voices.
- [x] **T502** Add Google Analytics 4 (`G-NSB9K61M5S`) on published hosts, with localhost disabled for development and tests.
- [x] **T503** Add a GitHub Actions Pages workflow and verify the assembled static artifact under a project-style path.
- [ ] **T504** **NEEDS HUMAN**: review the new symbolic scenes and portrait archetypes for cultural sensitivity and visual quality. Do not treat generated portraits as historical likenesses.

---

## 8. Definition of Done

**Version 1 (text):**
- [x] 8 MVP mythologies complete (6 stories, 20 quiz questions, 10 characters, 10 glossary terms each)
- [x] `validate_content.js` passes with no errors
- [x] All screens work on desktop and mobile
- [x] Progress saves and loads correctly
- [x] Credits and README written
- [ ] Human fact-check and sensitivity reviews completed

**Version 2 (graphics):**
- [x] Clickable pixel-art world map
- [x] Icons for all MVP mythologies, sprites for characters
- [ ] Art reviewed by a human
- [x] List view still works as fallback

---

## 9. PROGRESS LOG

Add one line per finished task. Newest at the bottom.

| Date | Task | Notes |
|---|---|---|
| 2026-11-07 | T001–T004 | Folder structure, full 35-tradition catalogue, JSON Schemas and zero-dependency validator. |
| 2026-11-07 | T010–T017 | App shell, defensive localStorage, hash router, traditions list, story reader, quiz engine, codex and end-to-end Greek smoke pass. |
| 2026-11-07 | T020–T026 | Greek pack: info, six stories, 20 questions, 10 characters, 10 terms; validator clean. |
| 2026-11-07 | T030–T036 | Norse pack complete; validator clean. |
| 2026-11-07 | T040–T046 | Egyptian pack complete; validator clean. |
| 2026-11-07 | T050–T056 | Mesopotamian pack complete; validator clean. |
| 2026-11-07 | T060–T066 | Hindu pack complete with high-sensitivity framing; validator clean; sensitivity review remains human work (T067). |
| 2026-11-07 | T070–T076 | Japanese (Shinto) pack complete with medium-sensitivity framing; validator clean; sensitivity review remains T077. |
| 2026-11-07 | T080–T086 | Maya pack complete with medium-sensitivity framing; validator clean; sensitivity review remains T087. |
| 2026-11-07 | T090–T096 | Celtic pack complete; validator clean. |
| 2026-11-07 | T100–T105 | Timeline Builder, Pantheon Match, Which Culture?, timeline screen, badges and results/progress. |
| 2026-11-07 | T110–T113 | Automated route pass across all eight traditions; accessibility controls; CREDITS.md, README.md and in-game credits/sources. |
| 2026-11-07 | T202–T204 | Accessible inline SVG map with focusable regions, eight markers and a text list fallback. |
| 2026-11-07 | T210–T214, T216 | 16-key palette and style guide, sprite compiler, eight mythology sigils, map markers, story/codex sigils. Character portrait sprites added (T215). |
| 2026-11-07 | T400–T403 | Git history, Playwright suite, all-SVG art and zero-dependency dev server documented. |
| 2026-11-07 | T500–T503 | Story/quiz scenes, answer portraits, browser narration, GA4 on published hosts, and GitHub Pages workflow. |
| 2026-11-07 | Verification | `node tools/validate_content.js` clean; 41 Playwright tests pass headlessly; no console errors on the checked routes; assembled Pages artifact verified. |
