# Narration audio

The site currently uses the browser's SpeechSynthesis voices for all narration.
This directory holds short **audition samples** of open-licensed, locally generated
neural voices. They are not yet wired into the story or quiz players.

| File | Voice | Language | License |
| --- | --- | --- | --- |
| `samples/en_GB-cori-high.mp3` | Piper `en_GB-cori-high` | British English | Public-domain dataset |
| `samples/en_US-joe-medium.mp3` | Piper `en_US-joe-medium` | American English | CC0 |

Generated with [Piper](https://github.com/rhasspy/piper) 1.8.0 from the sample
paragraph of *The War of the Titans*. No cloud service was called, and no
recording of a real person was imitated.

To regenerate a sample:

```bash
python3 -m venv /tmp/piper-venv
/tmp/piper-venv/bin/pip install piper-tts
/tmp/piper-venv/bin/python -m piper.download_voices \
  --download-dir /tmp/piper-voices en_GB-cori-high en_US-joe-medium
/tmp/piper-venv/bin/python -m piper \
  -m /tmp/piper-voices/en_GB-cori-high.onnx \
  -c /tmp/piper-voices/en_GB-cori-high.onnx.json \
  -i paragraph.txt -f /tmp/cori.wav --length-scale 1.06 --sentence-silence 0.35
ffmpeg -y -i /tmp/cori.wav -ac 1 -codec:a libmp3lame -b:a 64k \
  audio/samples/en_GB-cori-high.mp3
```

The dialog lets the reader audition and choose Cori or Joe. The choice is saved
as `studioVoice` in the settings blob, but it is not yet connected to playback.
Before generating the full library, decide which voice to use and add an audio
player/fallback path in `js/narration.js`. Full narration also needs an audio player/fallback path in
`js/narration.js`.
