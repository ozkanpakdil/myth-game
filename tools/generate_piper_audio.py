#!/usr/bin/env python3
"""Generate static Piper narration clips for stories and quiz questions.

This is an offline authoring tool, not part of the deployed site. It expects a
Piper model and config outside the repository (the model files are large), and
writes compact mono MP3s into audio/voices/<voice>/.

Usage:
  python3 tools/generate_piper_audio.py \
    --voice joe \
    --model /tmp/piper-voices/en_US-joe-medium.onnx \
    --config /tmp/piper-voices/en_US-joe-medium.onnx.json \
    --label "Joe" --license CC0 --language "American English"

Requires `piper` on PATH (or pass --piper) and ffmpeg.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import subprocess
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def saga_text_id(text):
    clean = " ".join(str(text or "").split())
    if not clean:
        return ""
    value = 0x811C9DC5
    for byte in clean.encode("utf-8"):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def narration_jobs():
    myths = load_json(CONTENT / "mythologies.json")
    jobs = []
    for myth in myths:
        if not myth.get("mvp"):
            continue
        story_file = CONTENT / myth["id"] / "stories.json"
        quiz_file = CONTENT / myth["id"] / "quiz.json"
        if story_file.exists():
            for story in load_json(story_file):
                for index, paragraph in enumerate(story.get("paragraphs", [])):
                    jobs.append({
                        "kind": "story",
                        "id": story["id"],
                        "index": index,
                        "text": paragraph,
                        "relative": Path("story") / f"{story['id']}-{index}.mp3",
                    })
        if quiz_file.exists():
            for question in load_json(quiz_file):
                choices = question.get("choices", [])
                text = " ".join([
                    question["question"].strip(),
                    " ".join(f"{'ABCD'[i]}: {choice}." for i, choice in enumerate(choices)),
                ]).strip()
                jobs.append({
                    "kind": "quiz",
                    "id": question["id"],
                    "index": None,
                    "text": text,
                    "relative": Path("quiz") / f"{question['id']}.mp3",
                })

    saga_file = CONTENT / "saga" / "norse.json"
    if saga_file.exists():
        saga = load_json(saga_file)
        default_name = saga.get("default_name", "Michael")
        seen = set()

        def add_saga(text):
            resolved = str(text or "").replace("{name}", default_name)
            clip_id = saga_text_id(resolved)
            if not clip_id or clip_id in seen:
                return
            seen.add(clip_id)
            jobs.append({
                "kind": "saga",
                "id": clip_id,
                "index": None,
                "text": resolved,
                "relative": Path("saga") / f"{clip_id}.mp3",
            })

        add_saga(saga.get("intro", ""))
        for node in saga.get("nodes", {}).values():
            for paragraph in node.get("text", []):
                add_saga(paragraph)
            for variant in node.get("variants", []):
                add_saga(variant.get("text", ""))
            lore = node.get("lore")
            if lore:
                add_saga(f"{lore.get('title', '')}. {lore.get('body', '')}. Source: {lore.get('source', '')}")
            ending = node.get("ending")
            if ending:
                add_saga(ending.get("summary", ""))
        for name in saga.get("name_suggestions", []):
            for paragraph in saga.get("nodes", {}).get(saga.get("start", "prologue"), {}).get("text", []):
                if "{name}" in paragraph:
                    add_saga(paragraph.replace("{name}", name))
    return jobs


def synthesize(job, args, output_root):
    target = output_root / args.voice / job["relative"]
    if target.exists() and target.stat().st_size > 1000:
        return target, 0.0
    target.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix="mythos-piper-") as tmp:
        tmp = Path(tmp)
        text_file = tmp / "text.txt"
        wav_file = tmp / "clip.wav"
        text_file.write_text(job["text"], encoding="utf-8")
        piper_cmd = [
            *args.piper, "-m", args.model, "-c", args.config,
            "-i", str(text_file), "-f", str(wav_file),
            "--length-scale", str(args.length_scale),
            "--sentence-silence", str(args.sentence_silence),
        ]
        subprocess.run(piper_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_file),
            "-ac", "1", "-ar", "22050", "-codec:a", "libmp3lame",
            "-b:a", args.bitrate, str(target),
        ]
        subprocess.run(ffmpeg_cmd, check=True)
    if not target.exists() or target.stat().st_size < 1000:
        raise RuntimeError(f"empty output for {job['id']}")
    return target, time.monotonic() - started


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", required=True, help="short voice id, e.g. joe")
    parser.add_argument("--model", required=True)
    parser.add_argument("--config", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--license", required=True)
    parser.add_argument("--language", required=True)
    parser.add_argument("--piper", default="/tmp/piper-venv/bin/python -m piper")
    parser.add_argument("--bitrate", default="48k")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--length-scale", type=float, default=1.04)
    parser.add_argument("--sentence-silence", type=float, default=0.32)
    parser.add_argument("--kind", default="", help="only jobs of this kind (story, quiz, saga)")
    parser.add_argument("--limit", type=int, default=0, help="debug: only first N clips")
    args = parser.parse_args()
    args.piper = args.piper.split()
    output_root = ROOT / "audio" / "voices"
    output_root.mkdir(parents=True, exist_ok=True)
    jobs = narration_jobs()
    if args.kind:
        jobs = [job for job in jobs if job['kind'] == args.kind]
    if args.limit:
        jobs = jobs[:args.limit]
    print(f"{args.voice}: {len(jobs)} clips, {sum(len(j['text'].split()) for j in jobs)} words", flush=True)
    completed = 0
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(synthesize, job, args, output_root): job for job in jobs}
        for future in concurrent.futures.as_completed(futures):
            job = futures[future]
            try:
                target, seconds = future.result()
            except Exception as exc:  # keep going so one bad clip does not kill the batch
                print(f"FAILED {job['id']}: {exc}", flush=True)
                continue
            completed += 1
            if completed % 10 == 0 or completed == len(jobs):
                elapsed = time.monotonic() - started
                print(f"{args.voice}: {completed}/{len(jobs)} clips in {elapsed:.0f}s", flush=True)
    manifest_path = output_root / args.voice / "manifest.json"
    written = len(list((output_root / args.voice).rglob("*.mp3")))
    manifest_path.write_text(json.dumps({
        "voice": args.voice,
        "label": args.label,
        "language": args.language,
        "license": args.license,
        "model": Path(args.model).name,
        "clips": written,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2) + "\n", encoding="utf-8")
    print(f"done: {manifest_path}", flush=True)


if __name__ == "__main__":
    main()
