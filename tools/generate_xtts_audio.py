#!/usr/bin/env python3
"""Generate static XTTS narration clips for stories and quiz questions.

This is the second authoring path next to tools/generate_piper_audio.py. It
drives a Coqui XTTS v2 checkpoint (normally the community fork, `coqui-tts`,
because the original coqui-ai/TTS repository is unmaintained) and writes the
same compact mono MP3s into audio/voices/<voice>/, so the player in
js/narration.js needs no changes.

The Morgan narrator is a fan-made fine-tune of a public figure's voice:
https://huggingface.co/drewThomasson/Morgan_freeman_xtts_model (epoch 7 is the
better checkpoint). XTTS v2 itself is licensed for non-commercial use, so the
generated clips are marked `non-commercial` in the manifest. Use this voice for
an educational demo, not for anything that implies the person's endorsement.

Usage:
  python3 tools/generate_xtts_audio.py \
    --voice morgan \
    --model /tmp/xtts/morgan-freeman-epoch7/model.pth \
    --config /tmp/xtts/morgan-freeman-epoch7/config.json \
    --reference /tmp/xtts/morgan-freeman-epoch7/ref.wav \
    --label "Morgan" --license "Non-commercial (XTTS v2)" \
    --language "American English"

Setup (macOS/Linux, Python 3.10+):
  python3 -m venv /tmp/xtts-venv
  /tmp/xtts-venv/bin/pip install coqui-tts
  # then download 7_epoches/model.zip and 7_epoches/ref.wav from the model repo
  # and unzip the checkpoint next to ref.wav

Existing clips are skipped, so the script is safe to re-run after content
changes. Requires ffmpeg on PATH.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_piper_audio import narration_jobs  # noqa: E402  (shared job list)

ROOT = Path(__file__).resolve().parent.parent

_tts = None


def load_tts(args):
    """Load the XTTS checkpoint once; the model is far too big to reload."""
    global _tts
    if _tts is not None:
        return _tts
    from TTS.api import TTS  # imported late so --help stays fast

    print(f"loading {args.model} on {args.device}", flush=True)
    _tts = TTS(model_path=args.model, config_path=args.config).to(args.device)
    return _tts


def synthesize(job, args, output_root):
    target = output_root / args.voice / job["relative"]
    if target.exists() and target.stat().st_size > 1000:
        return target, 0.0
    target.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    tts = load_tts(args)
    with tempfile.TemporaryDirectory(prefix="mythos-xtts-") as tmp:
        wav_file = Path(tmp) / "clip.wav"
        tts.tts_to_file(
            text=job["text"],
            speaker_wav=args.reference,
            language=args.language_code,
            file_path=str(wav_file),
            speed=args.speed,
        )
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_file),
            "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame",
            "-b:a", args.bitrate, str(target),
        ]
        subprocess.run(ffmpeg_cmd, check=True)
    if not target.exists() or target.stat().st_size < 1000:
        raise RuntimeError(f"empty output for {job['id']}")
    return target, time.monotonic() - started


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True, help="short voice id, e.g. morgan")
    parser.add_argument("--model", required=True, help="path to model.pth")
    parser.add_argument("--config", required=True, help="path to config.json")
    parser.add_argument("--reference", required=True, help="speaker reference wav")
    parser.add_argument("--label", required=True)
    parser.add_argument("--license", required=True)
    parser.add_argument("--language", required=True, help="human-readable language label")
    parser.add_argument("--language-code", default="en", help="XTTS language code")
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda", "mps"])
    parser.add_argument("--speed", type=float, default=0.96)
    parser.add_argument("--bitrate", default="48k")
    parser.add_argument("--workers", type=int, default=1,
                        help="parallel processes; XTTS is already multi-threaded, keep this at 1")
    parser.add_argument("--limit", type=int, default=0, help="debug: only first N clips")
    parser.add_argument("--only", default="", help="debug: only clips whose id contains this text")
    parser.add_argument("--shard", default="", metavar="I/N",
                        help="split the job list across N parallel processes and take shard I")
    args = parser.parse_args()

    if not Path(args.reference).exists():
        raise SystemExit(f"reference wav not found: {args.reference}")

    output_root = ROOT / "audio" / "voices"
    output_root.mkdir(parents=True, exist_ok=True)
    jobs = narration_jobs()
    if args.only:
        jobs = [job for job in jobs if args.only in job["id"]]
    if args.shard:
        index, count = (int(part) for part in args.shard.split("/"))
        if count < 1 or not 0 <= index < count:
            raise SystemExit(f"bad --shard {args.shard}, expected I/N with 0 <= I < N")
        jobs = jobs[index::count]
    if args.limit:
        jobs = jobs[:args.limit]
    print(f"{args.voice}: {len(jobs)} clips, {sum(len(j['text'].split()) for j in jobs)} words", flush=True)

    completed = 0
    failed = 0
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(synthesize, job, args, output_root): job for job in jobs}
        for future in concurrent.futures.as_completed(futures):
            job = futures[future]
            try:
                _, seconds = future.result()
            except Exception as exc:  # keep going so one bad clip does not kill the batch
                failed += 1
                print(f"FAILED {job['id']}: {exc}", flush=True)
                continue
            completed += 1
            if completed % 10 == 0 or completed == len(jobs):
                elapsed = time.monotonic() - started
                rate = elapsed / completed if completed else 0
                print(f"{args.voice}: {completed}/{len(jobs)} clips in {elapsed:.0f}s "
                      f"({rate:.1f}s/clip)", flush=True)

    manifest_path = output_root / args.voice / "manifest.json"
    written = len(list((output_root / args.voice).rglob("*.mp3")))
    manifest_path.write_text(json.dumps({
        "voice": args.voice,
        "label": args.label,
        "language": args.language,
        "license": args.license,
        "model": Path(args.model).name,
        "engine": "xtts-v2",
        "clips": written,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2) + "\n", encoding="utf-8")
    print(f"done: {manifest_path} ({failed} failed)" if failed else f"done: {manifest_path}", flush=True)


if __name__ == "__main__":
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    main()
