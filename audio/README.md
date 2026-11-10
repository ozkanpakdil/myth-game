# Narration audio

Mythos ships three pre-generated narrators. Sonia and Eric cover every story,
quiz and saga clip; Morgan covers the archive stories and quizzes plus the
Norse saga. The browser's SpeechSynthesis voice remains the fallback when a
clip is missing or cannot play.

## Voices

| Voice | Engine | Language | License |
| --- | --- | --- | --- |
| `sonia` | Microsoft Edge TTS `en-GB-SoniaNeural` | British English | Microsoft terms |
| `eric` | Microsoft Edge TTS `en-US-EricNeural` | American English | Microsoft terms |
| `morgan` | XTTS v2 (archive) + Piper (saga) | American English | **Non-commercial** |

Sonia and Eric are the standard narrators for every story, quiz and saga. The
header voice picker is the only place to choose a studio voice; a saga has no
special player. Morgan remains an optional third voice.

Morgan is a fan-made clone of a public figure's voice. The archive clips use the
XTTS v2 fine-tune from
[`drewThomasson/Morgan_freeman_xtts_model`](https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model);
the saga clips use the smaller Piper Morgan model so they can be regenerated
quickly. Two limits apply and are disclosed in the voice dialog, the About page
and `CREDITS.md`:

- The checkpoint's MIT tag covers the repository, not the person's likeness. It
  is not made with the subject's consent, and it must never be used to imply his
  endorsement or to deceive a listener.
- The underlying XTTS v2 and Piper Morgan models are non-commercial, so the
  whole `morgan/` clip set is marked `Non-commercial (voice clone)` in its
  manifest. Ship it for an educational demo; strip it if the project ever goes
  commercial.

No cloud service and no API key are involved at play time; every clip is
generated on the author's machine. Model files stay outside the repository;
only the generated MP3s are committed.

## Layout

```text
audio/
  samples/                 short audition files used by the voice dialog
  voices/
    sonia/
      story/<story-id>-<paragraph>.mp3
      quiz/<question-id>.mp3
      saga/<text-hash>.mp3
      manifest.json
    eric/
      ...
    morgan/
      ...
```

The player derives these paths in `js/narration.js` (`studioAudioUrl`) from the
`STUDIO_VOICES` list in `js/storage.js`, so no large manifest lookup is needed
at runtime.

## Regenerate the standard Sonia and Eric voices

The Edge TTS package is a development dependency only:

```bash
python3 -m venv .venv
.venv/bin/pip install edge-tts
.venv/bin/python tools/build_edge_voices.py --voices sonia,eric
```

Useful options:

```bash
# only one kind, or one tradition/saga
.venv/bin/python tools/build_edge_voices.py --kind story
.venv/bin/python tools/build_edge_voices.py --only greek-olive

# resume a partial run with more workers
.venv/bin/python tools/build_edge_voices.py --concurrency 24
```

Existing files are skipped, so re-running is safe after content changes. The
script writes `audio/voices/<voice>/manifest.json` and the short audition files
in `audio/samples/`. It needs a network connection while rendering; the
published site only serves the MP3s.

## Regenerate the Morgan saga voice

The saga clips use Piper's Morgan model and take about a minute for the full
set. The archive Morgan clips use XTTS v2, which is much slower.

```bash
base=https://huggingface.co/drewThomasson/fineTunedTTSModels/resolve/main/piperTTS/en-US/MorganFreeman
mkdir -p /tmp/piper-morgan
for f in model.onnx model.onnx.json; do
  curl -L -o "/tmp/piper-morgan/$f" "$base/$f"
done

python3 tools/generate_piper_audio.py \
  --voice morgan --kind saga --bitrate 48k \
  --model-label "xtts-v2 (archive) + piper (saga)" \
  --model /tmp/piper-morgan/model.onnx \
  --config /tmp/piper-morgan/model.onnx.json \
  --label Morgan --license "Non-commercial (voice clone)" \
  --language "American English"
```

## Regenerate the Morgan archive voice

XTTS v2 is slow on CPU, so expect hours rather than minutes for the full set.
Use the community fork (`coqui-tts`); the original Coqui company is gone.

```bash
python3 -m venv /tmp/xtts-venv
/tmp/xtts-venv/bin/pip install coqui-tts torch torchaudio torchcodec six

# checkpoint + speaker reference (keep them outside the repo)
base=https://huggingface.co/drewThomasson/fineTunedTTSModels/resolve/main/xtts-v2/eng/MorganFreeman
mkdir -p /tmp/xtts/ckpt
for f in model.pth config.json vocab.json speakers_xtts.pth ref.wav; do
  curl -L -o "/tmp/xtts/ckpt/$f" "$base/$f"
done

/tmp/xtts-venv/bin/python tools/generate_xtts_audio.py \
  --voice morgan \
  --model /tmp/xtts/ckpt/model.pth \
  --config /tmp/xtts/ckpt/config.json \
  --reference /tmp/xtts/ckpt/ref.wav \
  --label "Morgan" --license "Non-commercial (voice clone)" \
  --language "American English"
```

Pass `--device mps` on Apple Silicon to try the GPU, `--limit 5` for a quick
smoke test, and `--shard 0/3 … 2/3` to split a full render across three
processes. Existing files are skipped in every script, so they are safe to
re-run after content changes.

## Audition samples

The `samples/` folder holds short recordings of the same paragraph, played by
the in-dialog audition before a voice is selected:
`samples/sonia.mp3`, `samples/eric.mp3` and `samples/morgan-xtts.mp3`.
