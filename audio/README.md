# Narration audio

Mythos ships three pre-generated narrators for story and quiz clips. The
browser's SpeechSynthesis voice remains the fallback when a clip is missing or
cannot play.

## Voices

| Voice | Engine | Language | License |
| --- | --- | --- | --- |
| `joe` | Piper `en_US-joe-medium` | American English | CC0 |
| `cori` | Piper `en_GB-cori-high` | British English | Public-domain dataset |
| `morgan` | XTTS v2 fine-tune (epoch 7) | American English | **Non-commercial** |

`joe` and `cori` are open voices with permissive licences. `morgan` is a
fan-made fine-tune of a public figure's voice from
[`drewThomasson/Morgan_freeman_xtts_model`](https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model).
Two limits apply and are disclosed in the voice dialog, the About page and
`CREDITS.md`:

- The checkpoint's MIT tag covers the repository, not the person's likeness. It
  is not made with the subject's consent, and it must never be used to imply his
  endorsement or to deceive a listener.
- The underlying XTTS v2 model is licensed for non-commercial use only, so the
  whole `morgan/` clip set is marked `Non-commercial (XTTS v2)` in its manifest.
  Ship it for an educational demo; strip it if the project ever goes commercial.

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

## Regenerate the Morgan voice

XTTS v2 is slow on CPU, so expect hours rather than minutes for the full set.
Use the community fork (`coqui-tts`); the original Coqui company is gone.

```bash
python3 -m venv /tmp/xtts-venv
/tmp/xtts-venv/bin/pip install coqui-tts

# epoch 7 checkpoints + speaker reference (do not unzip inside the repo)
curl -L -o /tmp/xtts/model.zip https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model/resolve/main/7_epoches/model.zip
curl -L -o /tmp/xtts/ref.wav  https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model/resolve/main/7_epoches/ref.wav
unzip -q /tmp/xtts/model.zip -d /tmp/xtts/ckpt

/tmp/xtts-venv/bin/python tools/generate_xtts_audio.py \
  --voice morgan \
  --model /tmp/xtts/ckpt/model.pth \
  --config /tmp/xtts/ckpt/config.json \
  --reference /tmp/xtts/ref.wav \
  --label "Morgan" --license "Non-commercial (XTTS v2)" \
  --language "American English"
```

Pass `--device mps` on Apple Silicon to use the GPU, and `--limit 5` for a
quick smoke test.

Existing files are skipped in both scripts, so they are safe to re-run after
content changes.

## Audition samples

The `samples/` folder holds short recordings of the same paragraph, played by
the in-dialog audition before a voice is selected:
`samples/en_GB-cori-high.mp3`, `samples/en_US-joe-medium.mp3` and
`samples/morgan-xtts.mp3`.
