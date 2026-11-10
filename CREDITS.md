# Credits and sources

Mythos is an educational draft. The retellings are new, short summaries in modern English — not translations. Every entry is marked `verified: false` until a named human reviewer checks it against the sources below.

## Project

- Design, code and retellings: the Mythos project.
- Built with HTML, CSS and vanilla JavaScript. No frameworks, no build step. Google Analytics is the only third-party script and is disabled on localhost.
- All images are original SVG: 16×16 text-grid sigils compiled by `tools/render_sprites.js`, procedural story scenes and character portraits from `js/scene.js`, plus an inline SVG map generated from a text tile grid.
- Narration is optional. The browser's SpeechSynthesis API is the fallback; the
  shipped clips were pre-rendered on the author's machine with the three voices
  below. Edge TTS uses Microsoft's service only while authoring, never at play
  time:
  - **Sonia** — Microsoft Edge TTS `en-GB-SoniaNeural`, British English. The
    standard narrator for every story, quiz and saga.
  - **Eric** — Microsoft Edge TTS `en-US-EricNeural`, American English. The
    second standard narrator across the site.
  - **Morgan** — an optional fan-made clone of Morgan Freeman's voice. The
    archive and saga clips use XTTS v2 / Piper fine-tunes from the
    [`drewThomasson/Morgan_freeman_xtts_model`](https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model)
    family. The clone was not made with his consent, so it is used only as a
    non-commercial demonstration of narration, is labelled as a fan-made
    clone in the voice dialog, and must never be presented as his endorsement
    or used to deceive a listener. The `morgan` clips carry a
    `Non-commercial (voice clone)` manifest entry; remove them before any
    commercial distribution.
- **Sonia and Eric clips.** Every story paragraph, quiz question and saga
  paragraph has a pre-recorded Sonia and Eric clip. The voice IDs are
  `en-GB-SoniaNeural` and `en-US-EricNeural`. The source samples are from
  [`yaph/tts-samples`](https://github.com/yaph/tts-samples) — that repository is
  MIT-licensed, but generated Edge TTS output is subject to Microsoft's terms.
  Confirm those terms before redistributing the clips or using them
  commercially.
  - The clips live in `audio/voices/sonia/` and `audio/voices/eric/`. They are
    ordinary MP3s served by the site; the browser never contacts Edge TTS or
    loads a speech model. The authoring script is
    `tools/build_edge_voices.py`; it runs only when the clips are rebuilt, not
    during deployment or at play time.
  - Sonia and Eric are fixed studio-style voices, not endorsements of this
    project. The stories remain child-friendly; the clips are not presented as
    a commercial voice service.
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

### Story paths

The five newer story paths — **The Olive Tree Contest** (Greek), **The Sun in the Cave** (Japanese), **The First Maize** (Maya), **Hanuman and the Sun** (Hindu) and **The Sun Boat** (Egyptian) — are original interactive retellings, not translations. Their child protagonists, supporting villagers and choice structure are invented for the game; the places, figures and stakes come from the sources named in each scene's myth note.

The Greek path follows Apollodorus, Pausanias, Herodotus, Thucydides, Aristotle and Plutarch on the contest for Athens, the sacred olive and the city's democratic life. The Japanese path follows the Kojiki, Nihon Shoki and Fudoki for Amaterasu, the rock cave, Uzume's dance and the mirror and jewels. The Maya path draws on the Popol Vuh, the Books of Chilam Balam, and archaeological and ethnographic knowledge of milpa farming, rain ceremonies and maize; its squirrel and feast episodes are openly marked as story additions rather than ancient text. The Hindu path follows the Valmiki Ramayana (including the Uttara Kanda and Sundara Kanda), the Gayatri mantra of the Rigveda and the Hanuman Chalisa; Hanuman's devotion to Rama and the many tellings of his childhood leap are treated with respect. The Egyptian path follows the Book of the Dead, the Amduat, the Book of Gates, the Coffin Texts, the Pyramid Texts and Egyptian star clocks for Ra's night journey, the Mesektet and the Duat.

These are teaching stories, not scripture, and they do not claim to settle disputed tellings.

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

### Canaanite

- **Ugaritic tablets (KTU / CAT)** — The primary texts from Ras Shamra, written in alphabetic cuneiform; many tablets are broken and readings are revised in later editions.
- **Mark S. Smith, The Ugaritic Baal Cycle, Volume I (1994)** — A translation and commentary on KTU 1.1–1.2, including the fragmentary opening and the conflict with Yam.
- **Mark S. Smith and Wayne T. Pitard, The Ugaritic Baal Cycle, Volume II (2009)** — The companion volume on KTU 1.3–1.4, covering Baal's palace, Anat, Athirat and the building of the house.
- **Simon B. Parker, ed., The Ugaritic Narrative Poetry (1997)** — Accessible translations of the Baal Cycle, Kirta, Aqhat and related narratives, with introductions to the textual problems.
- **Nick Wyatt, Religious Texts from Ugarit (2nd ed., 2002)** — A wide-ranging translation and commentary on the Ugaritic myths and rituals, including The Gracious Gods.
- **John Day, Yahweh and the Gods and Goddesses of Canaan (2000)** — A modern study of Canaanite deities and their reception in biblical religion.

### Minoan / Mycenaean

- **Linear B tablets** — Administrative records from Knossos, Pylos and other palaces, deciphered by Michael Ventris and John Chadwick; they preserve names, offerings and palace inventories, not myths.
- **Apollodorus, Library** — A later mythographic handbook preserving the connected stories of Europa, Minos, the Minotaur, Daedalus and Theseus.
- **Ovid, Metamorphoses** — The fullest surviving account of Daedalus and Icarus, and a major source for the Cretan stories.
- **Plutarch, Life of Theseus** — A biography that collects several versions of the Cretan expedition and Ariadne's fate.
- **Homer, Odyssey, and Aeschylus, Agamemnon** — Early and classical sources for the House of Atreus, set in the Mycenaean world but composed centuries later.
- **Nanno Marinatos, Minoan Religion** — A study of Cretan ritual, goddesses, bull imagery and the problems of interpreting Minoan art without readable texts.

### Hittite / Hurrian

- **Hittite cuneiform texts (CTH)** — The catalogue of Hittite texts, including the Kumarbi Cycle, the Song of Ullikummi, the Illuyanka myth and the Telipinu myth; many tablets are fragmentary.
- **Harry A. Hoffner, Hittite Myths (2nd ed.)** — A standard English translation of the Anatolian and Hurrian myths, with introductions to the textual problems.
- **Hans Gustav Güterbock, The Song of Ullikummi** — A foundational edition and study of the stone-giant myth.
- **Emmanuel Laroche, Catalogue des textes hittites (CTH)** — The reference catalogue for identifying and dating the Hittite texts.
- **Trevor Bryce, The Kingdom of the Hittites** — A historical study of the Hittite state, its archives and its religious culture.
- **Billie Jean Collins, The Hittites and Their World** — An accessible introduction to Hittite society, religion and textual remains.

### Slavic

- **The Primary Chronicle (Povest' vremennykh let)** — The earliest surviving East Slavic chronicle, preserving the oath formulas sworn by Perun and Veles but not a connected myth.
- **Alexander Afanasyev, Russian Fairy Tales** — The great nineteenth-century collection of Russian folktales, including Ivan and the Firebird, Vasilisa the Beautiful and Morozko.
- **The byliny** — Oral epic songs about Ilya Muromets and other bogatyrs, recorded from the eighteenth century onward in many variants.
- **Linda J. Ivanits, Russian Folk Belief** — A study of peasant beliefs about spirits, saints and the remnants of pre-Christian religion.
- **Natalie Kononenko, Slavic Folklore: A Handbook** — An introduction to the genres, collectors and regional variation of Slavic folk narrative.
- **Joanna Hubbs, Mother Russia: The Feminine Myth in Russian Culture** — A wide-ranging interpretation of the feminine figures in Russian myth and folklore, to be used critically.

### Etruscan

- **Etruscan bronze mirrors** — Engraved mirrors show gods and heroes with Etruscan names and attributes; they are a major source for iconography, not connected narrative.
- **Etruscan tomb painting** — The painted tombs at Tarquinia and elsewhere preserve banquets, games, demons and processions, but rarely explain them in words.
- **The Pyrgi tablets** — Three gold leaves from a sanctuary at Caere, written in Etruscan and Phoenician around 500 BCE, recording a dedication to Uni/Astarte.
- **Livy, Ab Urbe Condita** — The Roman history that preserves the stories of Tanaquil, Tarquinius Priscus and Servius Tullius.
- **The Liver of Piacenza** — A bronze model of a sheep's liver divided into regions named for gods, probably used in divination or teaching.
- **Massimo Pallottino, The Etruscans** — A foundational modern study of Etruscan civilisation, language and religion.
- **Larissa Bonfante, Etruscan Life and Afterlife** — A well-illustrated introduction to Etruscan daily life, tombs and afterlife beliefs.

### Baltic

- **Lithuanian dainos and Latvian dainas** — Large bodies of short folk songs preserving seasonal, agricultural, funeral and mythological material; the songs are poetic and variant, not a fixed canon.
- **The Sovijus tale in the Slavonic Chronograph (1261)** — A later compilation preserving the story of Sovijus, the gates of the dead and the origin of cremation.
- **Jan Łasicki, De diis Samagitarum (1582)** — An early modern account of Samogitian religion, valuable but shaped by a Christian humanist's assumptions.
- **Maironis, 'Jūratė ir Kastytis' in Pavasario balsai (1895)** — The literary ballad that fixed the modern amber-palace legend, drawing on older folk motifs.
- **Marija Gimbutas, The Balts** — A broad study of Baltic prehistory and culture, including religion, to be read alongside more recent archaeology.
- **Endre Bojtár, Foreword to the Past: A Cultural History of the Baltic People** — A critical introduction to the sources, folklore and modern national narratives of the Baltic region.

### Korean

- **Samguk Yusa (1281)** — The earliest surviving full account of Dangun, compiled by Iryeon more than a millennium after the traditional date.
- **Samguk Sagi (1145)** — The official history of the Three Kingdoms, preserving the Jumong foundation account and other early traditions.
- **Korean shamanic narratives (muga)** — Oral ritual narratives performed in gut, including the Princess Bari story; versions differ by region and performer.
- **Korean folktale collections** — Nineteenth- and twentieth-century collections of oral tales, including the woodcutter and heavenly maiden, the rabbit and the Dragon King, and Sim Cheong.
- **Laurel Kendall, Shamans, Housewives, and Other Restless Spirits** — An ethnographic study of Korean shamanism as a living practice.
- **Heinz Insu Fenkl and Bella Myong-wol Dalton-Fenkl, The Korean Myths** — A modern retelling and introduction to Korean myth and folklore.
- **Michael J. Pettid, Unyong-jon** — A study of a Korean narrative tradition that situates folk tales in their literary and social contexts.

### Andean

- **The Huarochirí Manuscript (early seventeenth century)** — A Quechua account of local myths and rituals from the highlands near Lima, probably compiled with Francisco de Ávila; the key surviving indigenous-language source.
- **Pedro Cieza de León, Crónica del Perú (1553)** — An early Spanish chronicle with important reports on Viracocha, Titicaca and Andean religious practice.
- **Pedro Sarmiento de Gamboa, Historia de los Incas (1572)** — A royal commission history of the Inka, useful for dynastic myth but shaped by its political purpose.
- **Felipe Guaman Poma de Ayala, Nueva corónica y buen gobierno (c. 1615)** — An illustrated account by an Andean nobleman, combining chronicle, protest and indigenous tradition.
- **Frank Salomon and George Urioste, The Huarochirí Manuscript** — A translation and study that makes the Quechua text accessible while marking its obscurities.
- **Michael J. Sallnow, Pilgrims of the Andes** — An ethnographic study of regional cults, pilgrimage and mountain veneration.
- **Gary Urton, The History of a Myth** — An analysis of how Andean origin narratives were shaped and transmitted.

### Aztec / Mesoamerican

- **Florentine Codex (Historia general de las cosas de Nueva España)** — A twelve-book Nahuatl and Spanish compendium compiled under Bernardino de Sahagún with Nahua scholars and artists; the fullest colonial source for Mexica religion.
- **Codex Chimalpopoca, including the Leyenda de los Soles** — A Nahuatl manuscript copied in 1558 preserving the creation ages, the earth-making and Quetzalcoatl's descent to Mictlan.
- **Crónica Mexicayotl** — A Nahuatl history attributed to Hernando Alvarado Tezozomoc, tracing the Mexica migration and the founding of Tenochtitlan.
- **Diego Durán, History of the Indies of New Spain** — A Dominican friar's history of the Mexica, rich in ritual detail but shaped by his own theological concerns.
- **Richard F. Townsend, The Aztecs** — A standard archaeological and historical introduction to Mexica society.
- **David Carrasco, City of Sacrifice** — A study of ritual, cosmology and urban life in Mesoamerica, useful for context and interpretation.
- **Karl Taube, Aztec and Maya Myths** — A concise comparative guide to Mesoamerican myth and iconography.

### Akan / West African

- **R. S. Rattray, Ashanti (1923) and Akan-Ashanti Folk-Tales (1930)** — Early colonial-era collections of Asante religion, law and Ananse tales; foundational but shaped by their time.
- **J. B. Danquah, The Akan Doctrine of God (1944)** — An early synthesis of Akan ideas of Nyame, the abosom and human destiny.
- **Peggy Appiah, Ananse the Spider** — A modern retelling of the Ananse cycle for general readers.
- **T. C. McCaskie, State and Society in Pre-Colonial Asante (1995)** — A detailed history of Asante politics and the place of the Golden Stool.
- **Ivor Wilks, Asante in the Nineteenth Century (1975)** — A standard history of the Asante kingdom.
- **Herbert M. Cole and Doran H. Ross, The Arts of Ghana (1977)** — A survey of Ghanaian art, including akua'ba figures and Adinkra.

### Dogon & Mande

- **Marcel Griaule and Germaine Dieterlen, Dieu d'eau (1948) and Le Renard pâle (1965)** — The famous but strongly contested ethnographic account of Dogon cosmology; presented here with a critical caveat.
- **Djibril Tamsir Niane, Sundiata: An Epic of Old Mali (1960)** — A widely read literary retelling of the Mande epic, based on a griot's performance.
- **Mande oral epic tradition (jeliw)** — The living performance tradition of hereditary griots, with many regional versions.
- **David C. Conrad, Sunjata: A West African Epic of the Mande Peoples (2004)** — A scholarly translation and performance-oriented edition of the epic.
- **Stephen Belcher, Epic Traditions of Africa (1999)** — A comparative study of African epic that situates Sunjata in a wider field.
- **Walter E. A. van Beek, 'Dogon Restudied' (Current Anthropology, 1991)** — The influential critique of the Griaule-Dieterlen synthesis.

### Bantu

- **Bunseki Fu-Kiau, African Cosmology of the Bantu-Kongo** — A Kongo-centred account of cosmology, personhood and the living world.
- **Daniel Biebuyck and Kahombo C. Mateene, The Mwindo Epic from the Banyanga** — The major recorded version of the Nyanga Mwindo epic, with performance context.
- **John Roscoe, The Baganda** — An early ethnographic account of Ganda religion and kingship, valuable but colonial in framing.
- **Thomas Q. Reefe, The Rainbow and the Kings** — A history of the Luba empire and its foundation traditions.
- **Jan Vansina, Paths in the Rainforests** — A broad history of Central African societies and their institutions.
- **Henry Callaway, Nursery Tales, Traditions, and Histories of the Zulus** — A nineteenth-century collection preserving Zulu tales, including the chameleon and death.
- **E. Jensen Krige and J. D. Krige, The Realm of a Rain-Queen** — A classic ethnographic study of the Balobedu and the Modjadji office.

### Finnic / Sámi

- **The Kalevala (Old Kalevala, 1835; New Kalevala, 1849)** — Elias Lönnrot's compilation of collected folk poems into a national epic; a literary construction as well as a source.
- **Elias Lönnrot's folk poetry collections** — The raw recorded poems and variants behind the Kalevala.
- **Sámi yoiks and oral accounts** — Living song and narrative traditions, not a fixed scripture.
- **Johannes Schefferus, Lapponia (1673)** — An early account of Sámi life and religion, shaped by a missionary and antiquarian agenda.
- **Anna-Leena Siikala, Mythic Images and Shamanism** — A study of Finnish-Karelian shamanic and mythical traditions.
- **Juha Pentikäinen, Kalevala Mythology** — An introduction to the Kalevala's sources, structure and interpretation.
- **Veli-Pekka Lehtola, The Sámi People: A History** — A modern history that centres Sámi perspectives.

### Polynesian

- **George Grey, Polynesian Mythology (1855)** — The colonial governor's influential English compilation, drawing heavily on Māori manuscripts; a Victorian shaping of the material.
- **Wiremu Maihi Te Rangikāheke, manuscripts and letters** — A Ngāti Rangiwewehi writer whose accounts supplied much of Grey's book and remain a primary source.
- **Kepelino Keauokalani, Kepelino's Traditions of Hawaii** — A nineteenth-century Hawaiian writer's account of Hawaiian religion and tradition.
- **Martha Beckwith, Hawaiian Mythology (1940)** — A large comparative collection of Hawaiian and wider Polynesian narratives.
- **Teuira Henry, Ancient Tahiti (1928)** — A compilation of Tahitian tradition, including the Hina and Te Tuna story.
- **Patrick Vinton Kirch, On the Road of the Winds** — A modern archaeological and historical overview of the Pacific.
- **Katharine Luomala, Voices on the Wind** — A popular but informed collection of Polynesian myths and chants.

### Caucasian / Nart

- **Ossetian Nart epic (Narty kaddzhytæ)** — The Ossetian cycle of sagas, transmitted orally and recorded in modern editions.
- **Circassian Nart epic (Narty)** — The Circassian/Adyghe cycle, with its own genealogies and episodes.
- **Georges Dumézil, Légendes sur les Nartes (1930)** — The comparative study that brought the Nart sagas to wider scholarly attention.
- **John Colarusso, Nart Sagas from the Caucasus (2002)** — A major English translation and introduction to the Circassian and related cycles.
- **Vasily Abaev, The Nart Epic of the Ossetians** — A foundational Ossetian scholarly study.
- **Asker Gadagatl, Narty: The Adyghe Epic (7 vols, 1968–71)** — A large collection and study of the Adyghe epic.
- **Richard Foltz, The Ossetes (2022)** — A modern historical and cultural overview of the Ossetes and their epic.

### Buddhist narratives

- **The Pali canon (Tipitaka)** — The early Buddhist scriptural collection, including the Buddha's life, the Jataka tales and the Angulimala and Kisa Gotami stories.
- **Ashvaghosha, Buddhacarita** — A Sanskrit poetic life of the Buddha that shaped later biographical tradition.
- **The Jataka tales and their commentary** — A large corpus of previous-life stories, didactic and variant.
- **Bhikkhu Bodhi, In the Buddha's Words** — A modern anthology and translation of the Pali discourses.
- **John S. Strong, The Buddha: A Beginner's Guide** — A study of the Buddha's life and its narrative traditions.
- **Donald S. Lopez Jr., The Story of Buddhism** — A critical introduction to Buddhist history and doctrine.

### Tibetan / Bon

- **The Buddhacarita** — The Sanskrit life of the Buddha, a major source for the birth and renunciation narratives.
- **The Hundred Thousand Songs of Milarepa** — The songs and life story of Milarepa, a foundational Tibetan Buddhist text.
- **The Padma bka' thang** — A revealed biography of Padmasambhava, hagiographic and legendary in character.
- **Bon cosmological texts** — The Bon accounts of Kuntu Zangpo and the elements, some of them restricted.
- **Matthew Kapstein, The Tibetan Assimilation of Buddhism** — A study of Buddhism's integration with Tibetan religion and culture.
- **Sam van Schaik, Tibet: A History** — A modern historical overview.
- **Samten Karmay, The Arrow and the Spindle** — Studies of Tibetan and Bon history and doctrine.

### Yoruba / Orisha

- **The Ifá literary corpus (Odu Ifá)** — The oral divination corpus, performed by trained babalawos; only part is public.
- **Yoruba oral tradition** — The living narrative and praise-poetry traditions of Yoruba communities.
- **Wande Abimbola, Ifá: An Exposition of Ifá Literary Corpus** — A major scholarly study by a Yoruba babalawo.
- **J. O. Awolalu, Yoruba Beliefs and Sacrificial Rites** — A study of Yoruba religion and ritual.
- **Karin Barber, I Could Speak Until Tomorrow** — A study of Yoruba oral literature and performance.
- **Jacob Olupona, City of 201 Gods** — A study of Yoruba religion and urban life.

### Mongolic & Turkic / Steppe

- **The Secret History of the Mongols** — The thirteenth-century Mongol chronicle, including the wolf-and-doe origin and the heavenly mandate.
- **The Geser epic** — A multi-language epic cycle in Tibetan, Mongol, Buryat and related traditions.
- **The Manas epic** — The Kyrgyz epic performed by manaschi, with many recorded variants.
- **The Orkhon Turkic inscriptions** — Eighth-century inscriptions invoking Tengri, the earth and the waters.
- **Walther Heissig, The Religions of the Mongols** — A standard introduction to Mongol religion.
- **Devin DeWeese, Islamization and Native Religion in the Golden Horde** — A study of Turkic religion and conversion.
- **Daniel Prior, The Manas of Wilhelm Radloff** — A study and translation of a foundational Manas record.

### Southeast Asian

- **The Ramakien** — The Thai court version of the Ramayana, completed around 1798.
- **The Reamker** — The Khmer version of the Ramayana.
- **The Manohara tale** — The Southeast Asian kinnari story, with Thai, Khmer and Malay variants.
- **Javanese and Balinese rice traditions** — The Dewi Sri complex, with lontar and ritual material.
- **S. Singaravelu, The Ramayana and the Malay Shadow-Play** — A study of the Ramayana in Southeast Asian performance.
- **Adrian Vickers, Bali: A Paradise Created** — A critical history of Balinese culture and its representations.
- **The Udana** — The Pali canon's Mucalinda episode.

### Siberian / Arctic

- **Waldemar Bogoras, The Chukchee** — An early ethnographic account of Chukchi life and religion.
- **Waldemar Jochelson, The Koryak** — A early account of Koryak culture and narrative.
- **Khanty and Mansi bear ceremonialism** — Recorded accounts of the bear festival and its songs.
- **Nenets and Evenki shamanic accounts** — Ethnographic records of practice, with regional variation.
- **Marjorie Mandelstam Balzer, Shamanism: Soviet Studies of Traditional Religion** — A collection of translations and studies.
- **Åke Hultkrantz, Shamanic Healing and Ritual Drama** — A comparative study of shamanic practice.

### North American Indigenous

- **Haudenosaunee oral tradition and the Thanksgiving Address** — The living creation and greeting tradition of the Haudenosaunee.
- **Karuk Fire Race** — A retelling by Jonathan London with Lanny Pinola and Julian Lang, used with a caveat about its mediated form.
- **John R. Swanton, Tlingit Myths and Texts** — A colonial-era collection of Tlingit narratives, including Raven.
- **Black Elk and Joseph Epes Brown, The Sacred Pipe** — A mediated account of Lakota ceremony.
- **Washington Matthews, Navaho Legends** — An early collection of Diné narratives.
- **Frank Speck, Penobscot Man** — An ethnographic study of Penobscot life.
- **Vine Deloria Jr., Paula Gunn Allen and Robin Wall Kimmerer** — Modern Native scholars whose work frames sovereignty, gender and reciprocity.

### Amazonian & Caribbean

- **Ramón Pané, Relación de las antigüedades de los indios (1498)** — The earliest written account of Taíno religion, mediated by a Spanish friar.
- **Davi Kopenawa and Bruce Albert, The Falling Sky** — Yanomami testimony and cosmology, in collaboration.
- **Yurupary and Tukanoan tradition** — The sacred-flute complex of the Uaupés/Negro region, with restricted material.
- **Shipibo-Konibo narrative** — The jaguar-woman tale type and its Pano-speaking neighbours.
- **Neil Whitehead, Dark Shamans** — A study of Amazonian warfare, shamanism and colonial history.
- **Jonathan Hill, Made-from-Bone** — A study of Tukanoan myth and history.
- **Peter Roe, The Cosmic Zygote** — A comparative study of Amazonian cosmology.

### Aboriginal Australian

- **Ngalyod and Kuninjku/Kunwinjku public accounts** — Public material from western Arnhem Land, including Maningrida Arts & Culture and the NGV Art Journal.
- **Seven Sisters songlines** — Public accounts from the National Museum of Australia and NPY Women's Council, with restricted knowledge respected.
- **Baiame accounts** — Records by Ridley (1875) and Howitt (1904), with a colonial caveat.
- **Wandjina accounts** — Mowaljarlai, Blundell and Woolagoodja, and the Mowanjum community.
- **Bunyip sources** — The 1845 Geelong Advertiser, Smyth (1878) and Holden (2001), with the label's problems noted.
- **K. Langloh Parker, Australian Legendary Tales (1896)** — A colonial-era collection from Euahlayi country, used with a caveat.
- **National Museum of Australia, Songlines (2017)** — A public exhibition and resource on songlines and Country.

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
| Canaanite | low | false |
| Minoan / Mycenaean | low | false |
| Hittite / Hurrian | low | false |
| Slavic | low | false |
| Etruscan | low | false |
| Baltic | low | false |
| Korean | medium | false |
| Andean | medium | false |
| Aztec / Mesoamerican | medium | false |
| Akan / West African | medium | false |
| Dogon & Mande | medium | false |
| Bantu | medium | false |
| Finnic / Sámi | medium | false |
| Polynesian | medium | false |
| Caucasian / Nart | medium | false |
| Buddhist narratives | medium | false |
| Tibetan / Bon | high | false |
| Yoruba / Orisha | high | false |
| Mongolic & Turkic / Steppe | medium | false |
| Southeast Asian | medium | false |
| Siberian / Arctic | medium | false |
| North American Indigenous | high | false |
| Amazonian & Caribbean | high | false |
| Aboriginal Australian | high | false |

Hindu, Yoruba, Tibetan/Bon, North American Indigenous, Amazonian/Caribbean and Aboriginal Australian stories are living sacred traditions and are marked **high** sensitivity. Shinto (Japanese), Maya, Chinese, Korean, Andean, Aztec / Mesoamerican, Akan, Dogon & Mande, Bantu, Finnic / Sámi, Polynesian, Caucasian / Nart, Buddhist narratives, Mongolic & Turkic / Steppe, Southeast Asian and Siberian / Arctic traditions are marked **medium**. All thirty-five traditions need a human fact-check of dates, names, spellings, answer keys and source notes before release. The Hindu, Shinto, Maya, Chinese, Korean, Andean, Aztec / Mesoamerican, Akan, Dogon & Mande, Bantu, Finnic / Sámi, Polynesian, Caucasian / Nart, Buddhist, Steppe, Southeast Asian and Siberian material also needs a sensitivity review by someone with relevant community or scholarly knowledge.

If a retelling is inaccurate or disrespectful, the correct response is to revise or remove it — not to defend the text. See the `NEEDS HUMAN` tasks in `PLAN_AND_TODO.md`.

## What is deliberately not depicted

The game uses objects and symbols rather than faces of deities. It does not attempt to illustrate sacred figures, ritual practice or living communities. The map is a stylised diagram with no modern borders and is not to scale.

## Third-party licences

No third-party fonts, photographs or illustrations are bundled. `@playwright/test` and the Edge TTS authoring package are development dependencies only and are not shipped to players. The source texts listed above are cited as references; the retellings do not reproduce long passages.

The Sonia and Eric clips were generated with Microsoft Edge TTS from the two declared samples. No speech model is shipped or downloaded by players. The sample repository is MIT-licensed, but the generated Edge TTS output remains subject to Microsoft's terms. Confirm those terms before redistributing the clips. The old Cori and Joe Piper clips are no longer shipped.
