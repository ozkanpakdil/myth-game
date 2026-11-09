#!/usr/bin/env python3
"""Render the two pre-recorded saga narrators with Microsoft Edge TTS.

This is an authoring tool. The published site only receives the MP3s; it never
talks to Edge TTS or loads a speech model.

    .venv/bin/python tools/build_saga_voices.py
    .venv/bin/python tools/build_saga_voices.py --voices eric --limit 1
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import sys
import time
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
SAGA_DIR = ROOT / "content" / "saga"
OUT = ROOT / "audio" / "saga"
VOICES = {
    "sonia": {
        "id": "en-GB-SoniaNeural",
        "sample": "https://github.com/yaph/tts-samples/blob/main/mp3/English/en-GB-SoniaNeural.mp3",
        "note": "female, British English",
    },
    "eric": {
        "id": "en-US-EricNeural",
        "sample": "https://github.com/yaph/tts-samples/blob/main/mp3/English/en-US-EricNeural.mp3",
        "note": "male, American English",
    },
}


def fnv(text: str) -> str:
    clean = " ".join(str(text or "").split())
    value = 0x811C9DC5
    for byte in clean.encode("utf-8"):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def jobs_for(voices: list[str], only: str, limit: int) -> list[dict]:
    jobs: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for path in sorted(SAGA_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("studio_clips") is not False:
            continue
        if only and data.get("id") != only:
            continue
        default_name = data.get("default_name") or "Alex"
        names = list(dict.fromkeys([default_name, *(data.get("name_suggestions") or [])]))
        for node_id, node in (data.get("nodes") or {}).items():
            if node.get("variants"):
                raise SystemExit(f"{data['id']}/{node_id} has variants; extend this tool first")
            has_name = any("{name}" in part for part in node.get("text") or [])
            use_names = names if has_name else [default_name]
            for name in use_names:
                paragraphs = [part.replace("{name}", name) for part in node.get("text") or []]
                if node.get("ending", {}).get("summary"):
                    paragraphs.append(node["ending"]["summary"])
                text = " ".join(paragraphs)
                clip_id = fnv(text)
                for voice in voices:
                    key = (voice, clip_id)
                    if key in seen:
                        continue
                    seen.add(key)
                    jobs.append({
                        "voice": voice,
                        "id": clip_id,
                        "text": text,
                        "saga": data["id"],
                        "node": node_id,
                        "name": name,
                    })
    return jobs[:limit] if limit else jobs


async def render(job: dict, sem: asyncio.Semaphore, force: bool) -> tuple[str, float | None]:
    target = OUT / job["voice"] / f"{job['id']}.mp3"
    if target.exists() and target.stat().st_size > 1000 and not force:
        return "skip", None
    target.parent.mkdir(parents=True, exist_ok=True)
    async with sem:
        for attempt in range(1, 4):
            started = time.monotonic()
            try:
                communicate = edge_tts.Communicate(job["text"], VOICES[job["voice"]]["id"])
                await communicate.save(str(target))
                if target.exists() and target.stat().st_size > 1000:
                    return "ok", time.monotonic() - started
                raise RuntimeError("empty output")
            except Exception as error:  # noqa: BLE001 - retry the service's transient failures
                if attempt == 3:
                    return f"fail:{error}", None
                await asyncio.sleep(1.5 * attempt)
    return "fail:unknown", None


async def main_async(args: argparse.Namespace) -> int:
    for voice in args.voices:
        if voice not in VOICES:
            raise SystemExit(f"unknown voice: {voice}")
    jobs = jobs_for(args.voices, args.only, args.limit)
    print(f"Saga voices: {len(jobs)} clip(s), voices={','.join(args.voices)}", flush=True)
    if not jobs:
        write_manifest(args.voices)
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(max(1, args.concurrency))
    done = failed = 0
    started = time.monotonic()
    tasks = [asyncio.create_task(render(job, sem, args.force)) for job in jobs]
    for index, (job, task) in enumerate(zip(jobs, tasks), start=1):
        result, seconds = await task
        if result == "ok":
            done += 1
            print(f"[{index}/{len(jobs)}] ok {job['voice']} {job['saga']}/{job['node']} {seconds:.1f}s", flush=True)
        elif result == "skip":
            print(f"[{index}/{len(jobs)}] skip {job['voice']} {job['saga']}/{job['node']}", flush=True)
        else:
            failed += 1
            print(f"[{index}/{len(jobs)}] {result} {job['voice']} {job['saga']}/{job['node']}", flush=True)
    write_manifest(args.voices)
    print(f"Finished: rendered={done}, failed={failed}, elapsed={time.monotonic() - started:.1f}s", flush=True)
    return 1 if failed else 0


def write_manifest(voices: list[str]) -> None:
    counts = {}
    for voice in VOICES:
        directory = OUT / voice
        counts[voice] = len(list(directory.glob("*.mp3"))) if directory.exists() else 0
    manifest = {
        "engine": "Microsoft Edge TTS",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "voices": counts,
        "voice_ids": {voice: VOICES[voice]["id"] for voice in VOICES},
        "samples": {voice: VOICES[voice]["sample"] for voice in VOICES},
        "format": "48 kbps mono MP3, 24 kHz",
        "note": "Clips use the exact scene text and FNV-1a hash from js/narration.js. The site only serves the MP3s; no speech model is shipped.",
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voices", default="sonia,eric", help="comma-separated sonia,eric")
    parser.add_argument("--only", default="", help="one saga id, e.g. greek-olive")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--concurrency", type=int, default=3)
    args = parser.parse_args()
    args.voices = [voice.strip() for voice in args.voices.split(",") if voice.strip()]
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
