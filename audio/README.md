# Narration audio

Mythos ships two open-voice narrators and uses them for the pre-generated story
and quiz clips. The browser's SpeechSynthesis voice remains the fallback when a
clip is missing or cannot play.

## Voices

| Voice | Piper model | Language | License |
| --- | --- | --- | --- |
| `joe` | `en_US-joe-medium` | American English | CC0 |
| `cori` | `en_GB-cori-high` | British English | Public-domain dataset |

No cloud service, API key or voice cloning is involved. The model files stay
outside the repository; only the generated MP3s are committed.

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
```

The player derives these paths in `js/narration.js` (`studioAudioUrl`), so no
large manifest lookup is needed at runtime.

## Regenerate

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

Use `--voice cori` with the Cori model/config for the second narrator. Existing
files are skipped, so the script is safe to re-run after content changes.

## Audition samples

`samples/en_GB-cori-high.mp3` and `samples/en_US-joe-medium.mp3` are short
recordings of the same paragraph, used for the in-dialog audition before a voice
is selected.
