#!/usr/bin/env python3
"""Render the standard Sonia and Eric narrators for the whole site.

This is an offline authoring tool. The published site only receives ordinary
MP3s; it never contacts Edge TTS or loads a speech model.

    .venv/bin/python tools/build_edge_voices.py --voices sonia,eric
    .venv/bin/python tools/build_edge_voices.py --kind story --limit 3
    .venv/bin/python tools/build_edge_voices.py --samples-only
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = ROOT / "audio" / "voices"
SAMPLES = ROOT / "audio" / "samples"

VOICES = {
    "sonia": {
        "id": "en-GB-SoniaNeural",
        "label": "Sonia",
        "language": "British English",
        "license": "Microsoft Edge TTS output — see Microsoft terms",
    },
    "eric": {
        "id": "en-US-EricNeural",
        "label": "Eric",
        "language": "American English",
        "license": "Microsoft Edge TTS output — see Microsoft terms",
    },
}

SAMPLE_TEXT = "Hello. I am {label}. Let's read a myth together."


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def clean_text(text: str) -> str:
    return " ".join(str(text or "").split())


def fnv(text: str) -> str:
    value = 0x811C9DC5
    for byte in clean_text(text).encode("utf-8"):
        value ^= byte
        value = (value * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def add_job(jobs: list[dict], seen: set[tuple[str, str]], voice: str, relative: Path, text: str, meta: dict) -> None:
    clean = clean_text(text)
    if not clean:
        return
    key = (voice, str(relative))
    if key in seen:
        return
    seen.add(key)
    jobs.append({
        "voice": voice,
        "relative": relative,
        "text": clean,
        "meta": meta,
    })


def story_and_quiz_jobs(jobs: list[dict], seen: set[tuple[str, str]], voices: list[str], only: str, kinds: set[str]) -> None:
    for myth in load_json(CONTENT / "mythologies.json"):
        if not myth.get("mvp"):
            continue
        if only and myth.get("id") != only:
            continue
        story_file = CONTENT / myth["id"] / "stories.json"
        quiz_file = CONTENT / myth["id"] / "quiz.json"
        if "story" in kinds and story_file.exists():
            for story in load_json(story_file):
                for index, paragraph in enumerate(story.get("paragraphs", [])):
                    for voice in voices:
                        add_job(
                            jobs, seen, voice, Path("story") / f"{story['id']}-{index}.mp3",
                            paragraph, {"kind": "story", "myth": myth["id"], "id": story["id"], "index": index},
                        )
        if "quiz" in kinds and quiz_file.exists():
            for question in load_json(quiz_file):
                choices = question.get("choices", [])
                choice_text = " ".join(f"{'ABCD'[i]}: {choice}." for i, choice in enumerate(choices))
                text = f"{question['question']}. {choice_text}"
                for voice in voices:
                    add_job(
                        jobs, seen, voice, Path("quiz") / f"{question['id']}.mp3",
                        text, {"kind": "quiz", "myth": myth["id"], "id": question["id"]},
                    )


def saga_jobs(jobs: list[dict], seen: set[tuple[str, str]], voices: list[str], only: str) -> None:
    for path in sorted((CONTENT / "saga").glob("*.json")):
        data = load_json(path)
        if only and data.get("id") != only:
            continue
        default_name = data.get("default_name") or "Alex"
        names = list(dict.fromkeys([default_name, *(data.get("name_suggestions") or [])]))

        def add_saga_text(text: str, node: str) -> None:
            variants = [text.replace("{name}", name) for name in names] if "{name}" in text else [text]
            for resolved in variants:
                clip_id = fnv(resolved)
                for voice in voices:
                    add_job(
                        jobs, seen, voice, Path("saga") / f"{clip_id}.mp3", resolved,
                        {"kind": "saga", "saga": data["id"], "node": node},
                    )

        add_saga_text(data.get("intro", ""), "intro")
        for node_id, node in (data.get("nodes") or {}).items():
            for paragraph in node.get("text") or []:
                add_saga_text(paragraph, node_id)
            for variant in node.get("variants") or []:
                add_saga_text(variant.get("text", ""), node_id)
            lore = node.get("lore")
            if lore:
                add_saga_text(
                    f"{lore.get('title', '')}. {lore.get('body', '')}. Source: {lore.get('source', '')}",
                    node_id,
                )
            ending = node.get("ending")
            if ending:
                add_saga_text(ending.get("summary", ""), node_id)


def build_jobs(voices: list[str], kinds: set[str], only: str) -> list[dict]:
    jobs: list[dict] = []
    seen: set[tuple[str, str]] = set()
    if {"story", "quiz"} & kinds:
        story_and_quiz_jobs(jobs, seen, voices, only, kinds)
    if "saga" in kinds:
        saga_jobs(jobs, seen, voices, only)
    return jobs


async def render(job: dict, sem: asyncio.Semaphore, force: bool) -> tuple[str, float | None]:
    target = OUT / job["voice"] / job["relative"]
    if target.exists() and target.stat().st_size > 1000 and not force:
        return "skip", None
    target.parent.mkdir(parents=True, exist_ok=True)
    async with sem:
        for attempt in range(1, 4):
            started = time.monotonic()
            try:
                audio = edge_tts.Communicate(job["text"], VOICES[job["voice"]]["id"])
                await audio.save(str(target))
                if target.exists() and target.stat().st_size > 1000:
                    return "ok", time.monotonic() - started
                raise RuntimeError("empty output")
            except Exception as error:  # noqa: BLE001 - retry the service's transient failures
                try:
                    target.unlink(missing_ok=True)
                except OSError:
                    pass
                if attempt == 3:
                    return f"fail:{error}", None
                await asyncio.sleep(1.5 * attempt)
    return "fail:unknown", None


def write_manifest(voices: list[str]) -> None:
    for voice in voices:
        folder = OUT / voice
        clips = len(list(folder.rglob("*.mp3"))) if folder.exists() else 0
        manifest = {
            "voice": voice,
            "label": VOICES[voice]["label"],
            "language": VOICES[voice]["language"],
            "license": VOICES[voice]["license"],
            "model": f"Microsoft Edge TTS ({VOICES[voice]['id']})",
            "engine": "Microsoft Edge TTS",
            "clips": clips,
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


async def make_samples(voices: list[str]) -> None:
    SAMPLES.mkdir(parents=True, exist_ok=True)
    for voice in voices:
        target = SAMPLES / f"{voice}.mp3"
        if target.exists() and target.stat().st_size > 1000:
            continue
        audio = edge_tts.Communicate(SAMPLE_TEXT.format(label=VOICES[voice]["label"]), VOICES[voice]["id"])
        await audio.save(str(target))
        print(f"sample: {target.relative_to(ROOT)}", flush=True)


async def main_async(args: argparse.Namespace) -> int:
    for voice in args.voices:
        if voice not in VOICES:
            raise SystemExit(f"unknown voice: {voice}")
    if args.samples_only:
        await make_samples(args.voices)
        return 0
    await make_samples(args.voices)
    kinds = {kind.strip() for kind in args.kind.split(",") if kind.strip()} if args.kind else {"story", "quiz", "saga"}
    jobs = build_jobs(args.voices, kinds, args.only)
    if args.limit:
        jobs = jobs[:args.limit]
    print(f"Edge voices: {len(jobs)} clip(s), voices={','.join(args.voices)}, kinds={args.kind or 'all'}", flush=True)
    if not jobs:
        write_manifest(args.voices)
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(max(1, args.concurrency))
    done = skipped = failed = 0
    started = time.monotonic()
    tasks = [asyncio.create_task(render(job, sem, args.force)) for job in jobs]
    for index, (job, task) in enumerate(zip(jobs, tasks), start=1):
        result, seconds = await task
        if result == "ok":
            done += 1
        elif result == "skip":
            skipped += 1
        else:
            failed += 1
            print(f"[{index}/{len(jobs)}] {result} {job['voice']} {job['meta']}", flush=True)
        if index % 25 == 0 or index == len(jobs):
            elapsed = time.monotonic() - started
            print(
                f"{index}/{len(jobs)} clips · ok={done} skip={skipped} fail={failed} · {elapsed:.0f}s",
                flush=True,
            )
    write_manifest(args.voices)
    print(f"Finished: rendered={done}, skipped={skipped}, failed={failed}, elapsed={time.monotonic() - started:.1f}s", flush=True)
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voices", default="sonia,eric", help="comma-separated sonia,eric")
    parser.add_argument("--kind", default="", help="comma-separated story,quiz,saga; default all")
    parser.add_argument("--only", default="", help="one mythology or saga id")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--samples-only", action="store_true")
    parser.add_argument("--concurrency", type=int, default=12)
    args = parser.parse_args()
    args.voices = [voice.strip() for voice in args.voices.split(",") if voice.strip()]
    if args.kind:
        unknown = {kind for kind in args.kind.split(",")} - {"story", "quiz", "saga"}
        if unknown:
            raise SystemExit(f"unknown kind: {', '.join(sorted(unknown))}")
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    sys.exit(main())
