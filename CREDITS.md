# Credits and sources

Mythos is an educational draft. The retellings are new, short summaries in modern English — not translations. Every entry is marked `verified: false` until a named human reviewer checks it against the sources below.

## Project

- Design, code and retellings: the Mythos project.
- Built with HTML, CSS and vanilla JavaScript. No frameworks, no build step. Google Analytics is the only third-party script and is disabled on localhost.
- All images are original SVG: 16×16 text-grid sigils compiled by `tools/render_sprites.js`, procedural story scenes and character portraits from `js/scene.js`, plus an inline SVG map generated from a text tile grid.
- Narration is optional and generated on the author's machine. The browser's
  SpeechSynthesis API is the fallback; the shipped clips come from three models:
  - **Joe** — Piper `en_US-joe-medium`, CC0.
  - **Cori** — Piper `en_GB-cori-high`, trained on a public-domain dataset.
  - **Morgan** — a fan-made clone of Morgan Freeman's voice. The archive clips
    use the XTTS v2 fine-tune
    [`drewThomasson/Morgan_freeman_xtts_model`](https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model);
    the saga clips use the Piper Morgan model from the same family of
    fine-tunes. The clone was not made with his consent, so it is used only as
    a non-commercial demonstration of narration, is labelled as a fan-made
    clone in the voice dialog, and must never be presented as his endorsement
    or used to deceive a listener. The `morgan` clips carry a
    `Non-commercial (voice clone)` manifest entry; remove them before any
    commercial distribution.
- Fonts are the operating system serif and sans-serif stacks. No external fonts or assets are loaded.

## Sources by tradition

### Mesopotamian

- **Epic of Gilgamesh, Standard Babylonian version, tablets I–XI** — The main surviving text, reconstructed from tablets found at Nineveh and other sites; it was copied and edited over many centuries and no single copy is complete.
- **Enuma Elish** — The Babylonian creation poem, known from copies made between roughly the ninth and second centuries BCE and recited at the New Year festival.
- **The Descent of Inanna** — A Sumerian poem about Inanna's journey to the underworld, preserved in copies from around 1900–1600 BCE that differ from one another.
- **Atrahasis** — An Old Babylonian poem about the creation of humans and the flood, with a hero called Atrahasis rather than Utnapishtim.
- **Sumerian King List** — A list of kings and dynasties that mixes legendary reigns of thousands of years with historical rulers, showing how Mesopotamians imagined their past.
- **Sumerian Gilgamesh poems** — Five Sumerian poems about Bilgames, including separate episodes about the Cedar Forest and the bull of heaven, older than the connected epic.
- **Andrew George, The Babylonian Gilgamesh Epic (2003)** — A modern critical edition and translation that sets out the surviving fragments and the debates about how they fit together.

### Egyptian

- **Pyramid Texts** — Old Kingdom spells carved in the pyramids of Saqqara from about 2400 BCE, including creation accounts and allusions to Osiris.
- **Coffin Texts** — Middle Kingdom funerary spells on coffins, which made elaborate afterlife hopes available to non-royal Egyptians.
- **Book of the Dead** — New Kingdom papyri of funerary spells, including spell 125 on the weighing of the heart before Osiris.
- **Book of Caverns** — A New Kingdom underworld book describing the sun god's nightly passage and the treatment of his enemies.
- **Plutarch, Isis and Osiris** — A Greek essay of the second century CE and the fullest connected narrative of Osiris, Set, and Horus; a late source.
- **Papyrus Chester Beatty I** — A Ramesside papyrus of about 1150 BCE preserving The Contendings of Horus and Set.
- **Papyrus Turin 1993** — A Ramesside magical papyrus containing the legend of Isis and the secret name of Ra.

### Greek

- **Hesiod, Theogony** — Composed around 700 BCE; the main early account of creation, the Titans and Zeus's rise to power.
- **Hesiod, Works and Days** — Roughly contemporary with the Theogony; it contains the story of Prometheus, Pandora and the origins of human hardship.
- **Homeric Hymn to Demeter** — A hexameter hymn probably from the seventh or sixth century BCE; the fullest early narrative of Persephone's abduction.
- **Homer, Odyssey** — An epic probably finalised in the eighth century BCE; Book 9 contains Odysseus's own account of the Cyclops.
- **Apollodorus, Library** — A mythographic handbook from perhaps the first or second century CE, written long after the stories; our fullest continuous account of Perseus.
- **Plutarch, Life of Theseus** — A biography written around 100 CE, many centuries after the supposed events, and openly sceptical about them.
- **Pausanias, Description of Greece** — A travel guide from the second century CE that records local cults, monuments and competing versions of the myths.

### Celtic

- **Cath Maige Tuired** — The Battle of Mag Tuired, the central account of the Tuatha Dé Danann and their wars with the Fir Bolg and the Fomorians. It survives in a sixteenth-century manuscript and partly in the twelfth-century Book of Leinster.
- **Lebor Gabála Érenn** — The Book of the Taking of Ireland, a medieval compilation of origin legends that places the Tuatha Dé Danann among the successive settlers of the island. It was assembled by Christian scholars from older poems and tales.
- **Táin Bó Cúailnge** — The Cattle Raid of Cooley, the central epic of the Ulster Cycle, preserved in twelfth-century manuscripts such as the Book of the Dun Cow and the Book of Leinster. The scribes who copied it worked centuries after the oral tales began.
- **Tochmarc Emire** — The Wooing of Emer, an Ulster Cycle tale that contains one of the earliest accounts of Cú Chulainn's boyhood and his training in arms.
- **Acallam na Senórach** — The Colloquy of the Ancients, a large twelfth- or thirteenth-century narrative in which Oisín and Caoilte tell the stories of Fionn and the Fianna to St Patrick. It preserves older Fenian material within a Christian frame.
- **The Mabinogion** — The modern title for eleven medieval Welsh prose tales, preserved in the White Book of Rhydderch and the Red Book of Hergest. They draw on British tradition that is related to, but distinct from, the Irish material.
- **The Book of the Dun Cow (Lebor na hUidre)** — A manuscript compiled around 1100 at Clonmacnoise and the oldest surviving collection of Irish narrative. It shows how Christian scribes copied and edited older oral and written material between the eighth and twelfth centuries.

### Norse

- **Poetic Edda, Völuspá** — The seeress's vision of creation and Ragnarök, and the main surviving poetic account of the world's end.
- **Poetic Edda, Hávamál** — A collection of wisdom sayings that includes Odin's own account of hanging on the tree to win the runes.
- **Poetic Edda, Þrymskviða** — The comic poem of Thor's stolen hammer, the bridal disguise, and the wedding feast in Jotunheim.
- **Poetic Edda, Lokasenna** — Loki's insult contest with the gods at Ægir's hall, the scene that leads to his binding.
- **Poetic Edda, Baldrs draumar** — Odin rides to the underworld and learns what the seeress knows about Baldr's coming death.
- **Prose Edda, Gylfaginning** — Snorri Sturluson's systematic retelling of creation, the gods, Baldr's death, and Ragnarök.
- **Prose Edda, Skáldskaparmál** — Snorri's guide to poetic language, which preserves many myths in the quotations it uses as examples.
- **Codex Regius manuscript** — The thirteenth-century manuscript that preserves most of the Poetic Edda, copied in Christian Iceland.

### The Ash-Seed

**The Ash-Seed** is an original interactive retelling, not a translation. Its plot, protagonist and choice structure are invented; the places, figures and stakes are drawn from the Norse material above. It follows the Poetic Edda and Prose Edda for the well of Urd, Odin's eye and runes, Thor's hammer and the giant wedding, Loki and Sigyn, Fenrir and Gleipnir, Heimdall and Bifrost, and the world after Ragnarök. The mortal protagonist is fictional, and no scene is presented as a historical reconstruction.

### Hindu

- **Rigveda** — The oldest surviving collection of Vedic hymns, composed in Sanskrit and transmitted orally for centuries before being written down.
- **Valmiki Ramayana** — The Sanskrit epic of Rama in seven books (kandas), from his boyhood to his exile, the war in Lanka and its aftermath.
- **Mahabharata** — A vast Sanskrit epic of the Pandava and Kaurava families, containing the Bhagavad Gita and the story of the churning of the ocean.
- **Bhagavad Gita** — A dialogue of about seven hundred verses within the Mahabharata, in which Krishna teaches Arjuna on the eve of battle.
- **Bhagavata Purana** — A major devotional Purana, especially loved for its tellings of Vishnu's avatars, the churning of the ocean and Krishna's life.
- **Devi Mahatmya (Markandeya Purana)** — The central Sanskrit text of the Goddess, telling how Durga defeats Mahishasura and other demons.
- **Regional retellings** — Works such as Tulsidas's Ramcharitmanas in Awadhi and Kamban's Ramavataram in Tamil show how living traditions reshape the same stories.

### Japanese

- **Kojiki (712 CE)** — Japan's oldest surviving chronicle and the main source for these stories; compiled for the imperial court and rich in older songs and variant details.
- **Nihon Shoki (720 CE)** — The court's official history, which often gives several versions of a single myth and preserves claims made by regional clans.
- **Engishiki (927 CE)** — A compendium of court procedure that lists shrines, taxes, offerings and purification prayers, useful for how the traditions were practised.
- **Donald L. Philippi, Kojiki (1968)** — A widely used English translation with a scholarly introduction that discusses the text's compilation and its uncertain readings.
- **Helen Hardacre, Shinto: A History (2017)** — A modern history that distinguishes living shrine practice from later nationalist uses of the word Shinto.
- **John Breen and Mark Teeuwen, A New History of Shinto (2010)** — Argues that Shinto as a single organised religion is relatively recent, while shrine traditions and kami worship are much older.

### Maya

- **Popol Vuh: The Definitive Edition of the Mayan Book of the Dawn of Life and the Glories of Gods and Kings, translated by Dennis Tedlock (1996)** — A widely used English translation with an introduction and notes on the K'iche' language and the oral performance of the text.
- **Popol Vuh: The Sacred Book of the Maya, translated by Allen J. Christenson (2003; revised 2007)** — A scholarly English translation with extensive notes on the K'iche' text, its poetics and its colonial context.
- **The Popol Vuh manuscript, transcribed by Father Francisco Ximénez in the early 18th century and held by the Newberry Library, Chicago** — The surviving manuscript is a later transcription and translation of the 16th-century K'iche' text, not the original document.
- **The Book of Chilam Balam of Chumayel, translated by Ralph L. Roys (1933)** — Colonial-period Yucatec Maya texts that preserve a different body of tradition from the K'iche' Popol Vuh.
- **Diego de Landa, Relación de las cosas de Yucatán (written about 1566)** — A colonial Spanish account of Yucatec Maya life, calendar and writing; valuable, but shaped by its author's hostile perspective.
- **David Freidel, Linda Schele and Joy Parker, Maya Cosmos: Three Thousand Years on the Shaman's Path (1993)** — A wide-ranging study of Maya cosmology and ritual that draws on archaeology, inscriptions and living communities.
- **Mary Miller and Karl Taube, An Illustrated Dictionary of the Gods and Symbols of Ancient Mexico and the Maya (1993)** — A reference work on Maya and central Mexican deities, symbols and iconography.

### Chinese

- **Shan Hai Jing (Classic of Mountains and Seas)** — A composite text compiled over several centuries, describing mountains, seas, creatures, gods and rituals; it preserves some of the oldest surviving mythic material.
- **Huainanzi, translated by John S. Major, Sarah A. Queen, Andrew Seth Meyer and Harold D. Roth (2010)** — A Han-dynasty philosophical compilation and the main early source for Nüwa repairing the sky and Hou Yi shooting the suns.
- **Chu Ci, 'Tianwen' (Questions of Heaven), translated by David Hawkes in The Songs of the South (1959; revised 1985)** — An ancient poem of cosmological questions that preserves early speculation about the suns, moon and ordering of the world.
- **Shujing (Book of Documents), 'Tribute of Yu'** — A classical text describing Yu's river work and the ordering of the land; its historical layers and dating are debated.
- **Shiji (Records of the Grand Historian) by Sima Qian** — The Han-dynasty history that retells the flood and the Xia dynasty, combining earlier traditions with a political narrative.
- **Journey to the West, translated by Anthony C. Yu (1977–1983; revised 2012)** — The sixteenth-century novel attributed to Wu Cheng'en, the main source for Sun Wukong's rebellion and pilgrimage.
- **Fengshen Yanyi (Investiture of the Gods)** — A sixteenth-century novel that develops the story of Nezha, the dragon kings and the war between the Shang and Zhou.
- **Sanwu Liji** — A third-century CE text, quoted in later encyclopedias, that provides the earliest surviving written form of the Pangu creation story.

### Roman

- **Virgil, Aeneid** — The Augustan epic of Aeneas' journey from Troy to Italy; the main literary source for Rome's Trojan origin story.
- **Ovid, Metamorphoses** — A poetic collection of transformation myths, including Ceres and Proserpina, told with Roman wit and learning.
- **Ovid, Fasti** — A poem on the Roman religious calendar, preserving festivals, temple dedications and etiological myths.
- **Livy, Ab Urbe Condita** — The history of Rome from its founding, preserving the legends of Romulus, the Sabine women and the Gallic sack.
- **Apuleius, The Golden Ass** — A second-century novel containing the tale of Cupid and Psyche, told as a story within a story.
- **Mary Beard, John North and Simon Price, Religions of Rome** — A standard modern study of Roman religious practice, priesthoods, festivals and the relationship between cult and politics.

### Persian / Zoroastrian

- **The Gathas (Avesta, Yasna 28–53)** — The oldest hymns of the Avesta, attributed to Zarathushtra; Yasna 30 is the key text for the two primordial spirits.
- **The Vendidad (Avesta)** — A book of law, purity and myth whose second fargard preserves the story of Yima and the vara.
- **The Bundahishn** — A Middle Persian account of creation, Ahriman's assault and the final renovation of the world.
- **Ferdowsi, Shahnameh** — The Persian Book of Kings, completed around 1010 CE, and the main source for Kaveh, Zahhak, Rostam and Zal.
- **Denkard and Zatspram** — Later Middle Persian texts that narrate Zarathushtra's birth, call and ministry; they are tradition, not contemporary biography.
- **Mary Boyce, Zoroastrians: Their Religious Beliefs and Practices** — A standard scholarly introduction written with attention to the living community.

## Review and sensitivity status

| Tradition | Sensitivity | Verified |
| --- | --- | --- |
| Mesopotamian | low | false |
| Egyptian | low | false |
| Greek | low | false |
| Celtic | low | false |
| Norse | low | false |
| Hindu | high | false |
| Japanese | medium | false |
| Maya | medium | false |
| Chinese | medium | false |
| Roman | low | false |
| Persian / Zoroastrian | low | false |

Hindu stories are a living sacred tradition and are marked **high** sensitivity. Shinto (Japanese), Maya and Chinese traditions are marked **medium**. All eleven traditions need a human fact-check of dates, names, spellings, answer keys and source notes before release. The Hindu, Shinto, Maya and Chinese material also needs a sensitivity review by someone with relevant community or scholarly knowledge.

If a retelling is inaccurate or disrespectful, the correct response is to revise or remove it — not to defend the text. See the `NEEDS HUMAN` tasks in `PLAN_AND_TODO.md`.

## What is deliberately not depicted

The game uses objects and symbols rather than faces of deities. It does not attempt to illustrate sacred figures, ritual practice or living communities. The map is a stylised diagram with no modern borders and is not to scale.

## Third-party licences

No third-party code, fonts, photographs or illustrations are bundled. `@playwright/test` is a development dependency only and is not shipped to players. The source texts listed above are cited as references; the retellings do not reproduce long passages.
