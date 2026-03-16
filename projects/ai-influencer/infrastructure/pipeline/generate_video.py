#!/usr/bin/env python3
"""
generate_video.py — Full Video Generation Pipeline

Input:  script text + persona face image
Output: final_video.mp4 (9:16, captioned, normalized audio)

Pipeline:
  Step 1: Kokoro TTS → voiceover audio (.wav)
  Step 2: MuseTalk lipsync → talking head video (.mp4)
  Step 3: FFmpeg → captions + 9:16 crop + audio normalization

Model stack:
  TTS:     Kokoro FastAPI  (ghcr.io/remsky/kokoro-fastapi-gpu:latest, port 8880)
           POST /v1/audio/speech  {"model": "kokoro", "input": text, "voice": "af_sarah", "response_format": "wav"}
  Lipsync: MuseTalk API    (ghcr.io/natecgreenberg-debug/musetalk-api:latest, port 8000)
           POST /generate  multipart: source (image), audio (wav)

Prerequisites:
  - RunPod pods running Kokoro TTS and MuseTalk (see pod_manager.py)
  - RUNPOD_KOKORO_URL and RUNPOD_MUSETALK_URL in .env
  - FFmpeg installed on VPS

Usage:
  python generate_video.py --script path/to/script.md --face path/to/face.png
  python generate_video.py --script-text "Your script here" --face path/to/face.png
  python generate_video.py --batch path/to/scripts/dir/ --face path/to/face.png

Cost (RTX 3090/4090 on-demand):
  Kokoro TTS:  ~$0.46/hr RTX 3090
  MuseTalk:    ~$0.59/hr RTX 4090, ~3–5 min/video
  Batch of 30: ~$1.50–3.00 depending on script length
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

RUNPOD_KOKORO_URL = os.getenv("RUNPOD_KOKORO_URL")        # https://[pod-id]-8880.proxy.runpod.net
RUNPOD_MUSETALK_URL = os.getenv("RUNPOD_MUSETALK_URL")    # https://[pod-id]-8000.proxy.runpod.net

# Legacy env vars for backward compatibility
RUNPOD_CHATTERBOX_URL = os.getenv("RUNPOD_CHATTERBOX_URL")
RUNPOD_INFINITETALK_URL = os.getenv("RUNPOD_INFINITETALK_URL")

# Kokoro TTS voice for Kate Mercer persona
KOKORO_VOICE = "af_sarah"

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
    """Step 1: Send script to Kokoro TTS, save audio file as WAV."""
    kokoro_url = RUNPOD_KOKORO_URL or RUNPOD_CHATTERBOX_URL
    if not kokoro_url:
        print("ERROR: RUNPOD_KOKORO_URL not set in .env")
        print("  → Deploy Kokoro TTS on RunPod first (pod_manager.py --start-kokoro)")
        return False

    print("  [1/3] Kokoro TTS: generating audio...", end=" ", flush=True)
    try:
        response = httpx.post(
            f"{kokoro_url}/v1/audio/speech",
            json={
                "model": "kokoro",
                "input": script_text,
                "voice": KOKORO_VOICE,
                "response_format": "wav",
            },
            timeout=120.0,
        )
        response.raise_for_status()
        output_path.write_bytes(response.content)
        print(f"✓ {output_path.name}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def generate_talking_head(
    face_path: Path,
    audio_path: Path,
    output_path: Path,
    model: str = "musetalk",
) -> bool:
    """Step 2: Send face image + audio to MuseTalk lipsync, get talking head video.

    MuseTalk API endpoint: POST /generate
    Fields (multipart form):
      source: source image or video file
      audio:  driving audio file (WAV)
    Response: JSON with download_url, or direct video stream.
    """
    url = RUNPOD_MUSETALK_URL or RUNPOD_INFINITETALK_URL
    if not url:
        print("ERROR: RUNPOD_MUSETALK_URL not set in .env")
        print("  → Deploy MuseTalk on RunPod first (pod_manager.py --start-musetalk)")
        return False

    print(f"  [2/3] MuseTalk: generating talking head video...", end=" ", flush=True)
    try:
        with open(face_path, "rb") as f_img, open(audio_path, "rb") as f_audio:
            response = httpx.post(
                f"{url}/generate",
                files={
                    "source": (face_path.name, f_img, "image/png"),
                    "audio": (audio_path.name, f_audio, "audio/wav"),
                },
                timeout=600.0,  # MuseTalk can take up to 10 min for longer clips
            )
        response.raise_for_status()

        # MuseTalk returns JSON with download_url, then we fetch the video
        result = response.json()
        if "download_url" in result:
            download_url = f"{url}{result['download_url']}"
            video_response = httpx.get(download_url, timeout=120.0)
            video_response.raise_for_status()
            output_path.write_bytes(video_response.content)
        else:
            # Fallback: response body is the video directly
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

    srt_path = raw_video_path.with_suffix(".srt")
    _write_simple_srt(script_text, srt_path)

    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_video_path),
        "-vf", f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,subtitles={srt_path}",
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
    duration_per_chunk = 3.0

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


def process_single(
    script_source: str | Path,
    face_path: Path,
    job_id: str,
    lipsync_model: str = "musetalk",
) -> bool:
    """Run the full pipeline for one script."""
    if isinstance(script_source, Path):
        script_text = extract_script_text(script_source)
        script_name = script_source.stem
    else:
        script_text = script_source
        script_name = "manual"

    print(f"\nProcessing: {script_name} (lipsync: {lipsync_model})")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        audio_path = tmp / "audio.wav"
        raw_video_path = tmp / "raw.mp4"

        if not generate_audio(script_text, audio_path):
            return False

        if not generate_talking_head(face_path, audio_path, raw_video_path, model=lipsync_model):
            return False

        final_path = PENDING_DIR / f"{job_id}_{script_name}.mp4"
        if not postprocess_video(raw_video_path, script_text, final_path):
            return False

        (PENDING_DIR / f"{job_id}_{script_name}.txt").write_text(script_text)

    print(f"  → Ready for approval: {final_path.name}")
    return True


def confirm_batch(count: int, model: str) -> bool:
    """Confirm before batch GPU run."""
    # Kokoro TTS: $0.46/hr RTX 3090 + MuseTalk: $0.59/hr RTX 4090
    # ~3–5 min/video combined = $0.052–0.087/video
    min_cost = count * 0.052
    max_cost = count * 0.087
    rate = "Kokoro $0.46/hr RTX 3090 + MuseTalk $0.59/hr RTX 4090, ~3–5 min/video"

    print(f"\n{'='*50}")
    print(f"  SPEND CONFIRMATION REQUIRED")
    print(f"{'='*50}")
    print(f"  Videos to generate:  {count}")
    print(f"  Lip-sync model:      {model}")
    print(f"  Estimated GPU cost:  ${min_cost:.2f}–${max_cost:.2f}")
    print(f"  ({rate})")
    print(f"{'='*50}")
    response = input("  Proceed? (yes/no): ").strip().lower()
    return response in ("yes", "y")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate talking head videos from scripts")
    parser.add_argument("--script", type=Path, help="Path to a single script .md file")
    parser.add_argument("--script-text", help="Inline script text (quoted)")
    parser.add_argument("--batch", type=Path, help="Directory of script .md files to batch process")
    parser.add_argument("--face", type=Path, required=True, help="Path to persona face image (.png)")
    parser.add_argument(
        "--lipsync-model",
        choices=["musetalk"],
        default="musetalk",
        help="Lip-sync model: musetalk (default)",
    )
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

        if not confirm_batch(len(scripts), args.lipsync_model):
            print("Aborted.")
            sys.exit(0)

        results = []
        for i, script_path in enumerate(scripts, 1):
            job_id = f"{timestamp}_{i:03d}"
            ok = process_single(script_path, args.face, job_id, lipsync_model=args.lipsync_model)
            results.append({"script": script_path.name, "ok": ok})

        ok_count = sum(1 for r in results if r["ok"])
        print(f"\nBatch complete: {ok_count}/{len(scripts)} videos generated")
        print(f"Pending approval: {PENDING_DIR}")

    elif args.script:
        if not args.script.exists():
            print(f"ERROR: Script not found: {args.script}")
            sys.exit(1)
        process_single(args.script, args.face, timestamp, lipsync_model=args.lipsync_model)

    elif args.script_text:
        process_single(args.script_text, args.face, timestamp, lipsync_model=args.lipsync_model)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
