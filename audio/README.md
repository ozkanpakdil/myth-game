# Narration audio

Mythos ships three pre-generated narrators for story, quiz and saga clips. The
browser's SpeechSynthesis voice remains the fallback when a clip is missing or
cannot play.

## Voices

| Voice | Engine | Language | License |
| --- | --- | --- | --- |
| `joe` | Piper `en_US-joe-medium` | American English | CC0 |
| `cori` | Piper `en_GB-cori-high` | British English | Public-domain dataset |
| `morgan` | XTTS v2 (archive) + Piper (saga) | American English | **Non-commercial** |

`joe` and `cori` are open voices with permissive licences. `morgan` is a
fan-made clone of a public figure's voice. The archive clips use the XTTS v2
fine-tune from
[`drewThomasson/Morgan_freeman_xtts_model`](https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model);
the saga clips use the smaller Piper Morgan model so they can be regenerated
quickly.
Two limits apply and are disclosed in the voice dialog, the About page and
`CREDITS.md`:

- The checkpoint's MIT tag covers the repository, not the person's likeness. It
  is not made with the subject's consent, and it must never be used to imply his
  endorsement or to deceive a listener.
- The underlying XTTS v2 and Piper Morgan models are non-commercial, so the
  whole `morgan/` clip set is marked `Non-commercial (voice clone)` in its
  manifest. Ship it for an educational demo; strip it if the project ever goes
  commercial.

No cloud service and no API key are involved; every clip is generated on the
author's machine. The model files stay outside the repository; only the
generated MP3s are committed.

## Layout

```text
audio/
  samples/                 short audition files used by the voice dialog
  voices/
    joe/
      story/<story-id>-<paragraph>.mp3
      quiz/<question-id>.mp3
      saga/<text-hash>.mp3
      manifest.json
    cori/
      ...
    morgan/
      ...
```

The player derives these paths in `js/narration.js` (`studioAudioUrl`) from the
`STUDIO_VOICES` list in `js/storage.js`, so no large manifest lookup is needed
at runtime.

## Regenerate the Piper voices

Install Piper and download a voice model, then run the authoring script:

```bash
python3 -m venv /tmp/piper-venv
/tmp/piper-venv/bin/pip install piper-tts
/tmp/piper-venv/bin/python -m piper.download_voices \
  --download-dir /tmp/piper-voices en_US-joe-medium en_GB-cori-high

python3 tools/generate_piper_audio.py \
  --voice joe \
  --model /tmp/piper-voices/en_US-joe-medium.onnx \
  --config /tmp/piper-voices/en_US-joe-medium.onnx.json \
  --label Joe --license CC0 --language "American English" \
  --workers 3
```

Use `--voice cori` with the Cori model/config for the second narrator.
Add `--kind saga` to regenerate only the saga clips (story and quiz clips are
skipped when they already exist).

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

The same weights are also published as `7_epoches/model.zip` in
`drewThomasson/Morgan_freeman_xtts_model`; the fine-tuned-models copy is the
same epoch 7 checkpoint (identical `model.pth` hash) but ships as loose files,
so no unzip step is needed. The `fineTunedTTSModels` repository is tagged
Apache-2.0, which does not change the base XTTS licence or the voice-rights
caveat above.

Pass `--device mps` on Apple Silicon to try the GPU, `--limit 5` for a quick
smoke test, and `--shard 0/3 … 2/3` to split a full render across three
processes (roughly 3× faster on an 8–10 core laptop).

Existing files are skipped in both scripts, so they are safe to re-run after
content changes.

## Audition samples

The `samples/` folder holds short recordings of the same paragraph, played by
the in-dialog audition before a voice is selected:
`samples/en_GB-cori-high.mp3`, `samples/en_US-joe-medium.mp3` and
`samples/morgan-xtts.mp3`.
