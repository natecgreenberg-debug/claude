#!/usr/bin/env python3
"""
generate_video.py — Full Video Generation Pipeline

Input:  script text + persona face image
Output: final_video.mp4 (9:16, captioned, normalized audio)

Pipeline:
  Step 1: Chatterbox TTS → voiceover audio (.wav)
  Step 2: MuseTalk 1.5 → talking head video (.mp4)
  Step 3: FFmpeg → captions + 9:16 crop + audio normalization

Prerequisites:
  - RunPod instances running Chatterbox and MuseTalk (see runpod/ setup docs)
  - RUNPOD_CHATTERBOX_URL and RUNPOD_MUSSETALK_URL in .env
  - FFmpeg installed on VPS

Usage:
  python generate_video.py --script path/to/script.md --face path/to/face.png
  python generate_video.py --script-text "Your script here" --face path/to/face.png
  python generate_video.py --batch path/to/scripts/dir/ --face path/to/face.png

Cost: RunPod GPU time ~$0.40/hr. Each video ~2–5 min = ~$0.013–0.033/video.
Batch of 30 = ~$0.40–1.00. Script will confirm before batch runs.
"""

import argparse
import os
import sys
import time
import subprocess
import tempfile
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import httpx

load_dotenv()

RUNPOD_CHATTERBOX_URL = os.getenv("RUNPOD_CHATTERBOX_URL")  # e.g. https://[pod-id]-8080.proxy.runpod.net
RUNPOD_MUSSETALK_URL = os.getenv("RUNPOD_MUSSETALK_URL")    # e.g. https://[pod-id]-8081.proxy.runpod.net

QUEUE_DIR = Path(__file__).parent.parent.parent / "content" / "videos" / "queue"
PENDING_DIR = QUEUE_DIR / "pending"
APPROVED_DIR = QUEUE_DIR / "approved"
REJECTED_DIR = QUEUE_DIR / "rejected"

for d in [PENDING_DIR, APPROVED_DIR, REJECTED_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def extract_script_text(script_path: Path) -> str:
    """Extract spoken text from a script .md file (strips markdown headers/labels)."""
    content = script_path.read_text()
    lines = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Remove section labels like "HOOK:", "BODY:", "CTA:"
        for label in ("HOOK:", "BODY:", "CTA:"):
            if line.startswith(label):
                line = line[len(label):].strip()
        if line:
            lines.append(line)
    return " ".join(lines)


def generate_audio(script_text: str, output_path: Path) -> bool:
    """Step 1: Send script to Chatterbox TTS, save audio file."""
    if not RUNPOD_CHATTERBOX_URL:
        print("ERROR: RUNPOD_CHATTERBOX_URL not set in .env")
        print("  → Deploy Chatterbox on RunPod first (see runpod/chatterbox_setup.md)")
        return False

    print("  [1/3] Chatterbox TTS: generating audio...", end=" ", flush=True)
    try:
        response = httpx.post(
            f"{RUNPOD_CHATTERBOX_URL}/synthesize",
            json={"text": script_text, "voice": "default"},
            timeout=120.0,
        )
        response.raise_for_status()
        output_path.write_bytes(response.content)
        print(f"✓ {output_path.name}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def generate_talking_head(face_path: Path, audio_path: Path, output_path: Path) -> bool:
    """Step 2: Send face image + audio to MuseTalk, get talking head video."""
    if not RUNPOD_MUSSETALK_URL:
        print("ERROR: RUNPOD_MUSSETALK_URL not set in .env")
        print("  → Deploy MuseTalk on RunPod first (see runpod/museTalk_setup.md)")
        return False

    print("  [2/3] MuseTalk: generating talking head video...", end=" ", flush=True)
    try:
        with open(face_path, "rb") as f_img, open(audio_path, "rb") as f_audio:
            response = httpx.post(
                f"{RUNPOD_MUSSETALK_URL}/generate",
                files={
                    "face": (face_path.name, f_img, "image/png"),
                    "audio": (audio_path.name, f_audio, "audio/wav"),
                },
                timeout=300.0,
            )
        response.raise_for_status()
        output_path.write_bytes(response.content)
        print(f"✓ {output_path.name}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def postprocess_video(
    raw_video_path: Path,
    script_text: str,
    output_path: Path,
) -> bool:
    """
    Step 3: FFmpeg post-processing.
    - Crop/pad to 9:16 aspect ratio
    - Normalize audio (loudnorm)
    - Add auto-generated captions (via subtitles filter)
    """
    print("  [3/3] FFmpeg: post-processing (9:16, audio norm, captions)...", end=" ", flush=True)

    # Write a simple SRT subtitle file
    srt_path = raw_video_path.with_suffix(".srt")
    _write_simple_srt(script_text, srt_path)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_video_path),
        # Crop to 9:16 (1080x1920 for reels/shorts/tiktok)
        "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles={srt_path}",
        # Normalize audio
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        str(output_path),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR:\n{result.stderr[-500:]}")
        return False

    print(f"✓ {output_path.name}")
    return True


def _write_simple_srt(text: str, path: Path) -> None:
    """Write a basic SRT file — splits text into ~5-word chunks for caption display."""
    words = text.split()
    chunks = [words[i:i+5] for i in range(0, len(words), 5)]
    duration_per_chunk = 3.0  # seconds per caption chunk

    lines = []
    for i, chunk in enumerate(chunks):
        start = i * duration_per_chunk
        end = start + duration_per_chunk
        lines.append(f"{i+1}")
        lines.append(f"{_fmt_time(start)} --> {_fmt_time(end)}")
        lines.append(" ".join(chunk))
        lines.append("")

    path.write_text("\n".join(lines))


def _fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def process_single(script_source: str | Path, face_path: Path, job_id: str) -> bool:
    """Run the full pipeline for one script."""
    if isinstance(script_source, Path):
        script_text = extract_script_text(script_source)
        script_name = script_source.stem
    else:
        script_text = script_source
        script_name = "manual"

    print(f"\nProcessing: {script_name}")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        audio_path = tmp / "audio.wav"
        raw_video_path = tmp / "raw.mp4"

        if not generate_audio(script_text, audio_path):
            return False

        if not generate_talking_head(face_path, audio_path, raw_video_path):
            return False

        final_path = PENDING_DIR / f"{job_id}_{script_name}.mp4"
        if not postprocess_video(raw_video_path, script_text, final_path):
            return False

        # Save script alongside video for dashboard display
        (PENDING_DIR / f"{job_id}_{script_name}.txt").write_text(script_text)

    print(f"  → Ready for approval: {final_path.name}")
    return True


def confirm_batch(count: int) -> bool:
    """Confirm before batch GPU run."""
    min_cost = count * 0.013
    max_cost = count * 0.033
    print(f"\n{'='*50}")
    print(f"  SPEND CONFIRMATION REQUIRED")
    print(f"{'='*50}")
    print(f"  Videos to generate: {count}")
    print(f"  Estimated RunPod GPU cost: ${min_cost:.2f}–${max_cost:.2f}")
    print(f"  (Based on ~$0.40/hr, 2–5 min per video)")
    print(f"{'='*50}")
    response = input("  Proceed? (yes/no): ").strip().lower()
    return response in ("yes", "y")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate talking head videos from scripts")
    parser.add_argument("--script", type=Path, help="Path to a single script .md file")
    parser.add_argument("--script-text", help="Inline script text (quoted)")
    parser.add_argument("--batch", type=Path, help="Directory of script .md files to batch process")
    parser.add_argument("--face", type=Path, required=True, help="Path to persona face image (.png)")
    args = parser.parse_args()

    if not args.face.exists():
        print(f"ERROR: Face image not found: {args.face}")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if args.batch:
        scripts = sorted(args.batch.glob("*.md"))
        if not scripts:
            print(f"No .md scripts found in {args.batch}")
            sys.exit(1)

        if not confirm_batch(len(scripts)):
            print("Aborted.")
            sys.exit(0)

        results = []
        for i, script_path in enumerate(scripts, 1):
            job_id = f"{timestamp}_{i:03d}"
            ok = process_single(script_path, args.face, job_id)
            results.append({"script": script_path.name, "ok": ok})

        ok_count = sum(1 for r in results if r["ok"])
        print(f"\nBatch complete: {ok_count}/{len(scripts)} videos generated")
        print(f"Pending approval: {PENDING_DIR}")

    elif args.script:
        if not args.script.exists():
            print(f"ERROR: Script not found: {args.script}")
            sys.exit(1)
        process_single(args.script, args.face, timestamp)

    elif args.script_text:
        process_single(args.script_text, args.face, timestamp)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
