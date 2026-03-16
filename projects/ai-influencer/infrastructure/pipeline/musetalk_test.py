#!/usr/bin/env python3
"""
musetalk_test.py — Wait for MuseTalk pod to become ready, then run lipsync test.

Polls health endpoint every 60s for up to 60 minutes.
If healthy, runs the /generate test with kate_car.png + kate_audio.wav.
Saves output to test-outputs/kate_lipsync.mp4
ALWAYS stops the pod when done (success or failure).
"""

import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv('/root/projects/Agent/.env')

RUNPOD_API_KEY = os.environ['RUNPOD_API_KEY']
POD_ID = os.environ['RUNPOD_MUSETALK_POD_ID']
MUSETALK_URL = f"https://{POD_ID}-8000.proxy.runpod.net"
RUNPOD_API = "https://rest.runpod.io/v1"

TEST_ASSETS = Path("/root/projects/Agent/projects/ai-influencer/content/test-outputs")
OUTPUT_PATH = TEST_ASSETS / "kate_lipsync.mp4"

POLL_INTERVAL = 60   # seconds between health checks
MAX_WAIT = 3600      # 60 minutes max


def stop_pod() -> None:
    """Stop the pod — always called at end."""
    print(f"\nStopping pod {POD_ID}...", flush=True)
    try:
        resp = httpx.post(
            f"{RUNPOD_API}/pods/{POD_ID}/stop",
            headers={"Authorization": f"Bearer {RUNPOD_API_KEY}"},
            timeout=30,
        )
        data = resp.json()
        print(f"  Pod stopped: desiredStatus={data.get('desiredStatus')}", flush=True)
    except Exception as e:
        print(f"  WARNING: Failed to stop pod: {e}", flush=True)


def wait_for_health() -> bool:
    """Poll /health until 200 or timeout. Returns True if healthy."""
    print(f"\nWaiting for MuseTalk to become healthy (up to {MAX_WAIT//60} min)...", flush=True)
    print(f"  URL: {MUSETALK_URL}/health", flush=True)

    start = time.monotonic()
    attempt = 0

    while time.monotonic() - start < MAX_WAIT:
        attempt += 1
        elapsed = int(time.monotonic() - start)
        print(f"  [{elapsed:4d}s] Attempt {attempt}: checking /health...", flush=True)

        # First check pod status via API
        try:
            pod_resp = httpx.get(
                f"{RUNPOD_API}/pods/{POD_ID}",
                headers={"Authorization": f"Bearer {RUNPOD_API_KEY}"},
                timeout=15,
            )
            pod_data = pod_resp.json()
            pod_status = pod_data.get("desiredStatus", "unknown")
            print(f"           Pod status: {pod_status}", flush=True)
        except Exception as e:
            print(f"           Pod status check failed: {e}", flush=True)

        # Try health endpoint
        try:
            r = httpx.get(f"{MUSETALK_URL}/health", timeout=10)
            print(f"           HTTP {r.status_code}", flush=True)
            if r.status_code == 200:
                print(f"  ✓ MuseTalk is healthy after {elapsed}s!", flush=True)
                print(f"  Health response: {r.text[:200]}", flush=True)
                return True
        except Exception as e:
            print(f"           HTTP error: {type(e).__name__}: {str(e)[:80]}", flush=True)

        print(f"  Not ready yet — waiting {POLL_INTERVAL}s...", flush=True)
        time.sleep(POLL_INTERVAL)

    print(f"  TIMEOUT: Pod did not become healthy within {MAX_WAIT//60} minutes.", flush=True)
    return False


def run_lipsync_test() -> bool:
    """Run the /generate endpoint with test assets. Returns True on success."""
    print(f"\nRunning lipsync test...", flush=True)

    source_path = TEST_ASSETS / "kate_car.png"
    audio_path = TEST_ASSETS / "kate_audio.wav"

    if not source_path.exists():
        print(f"  ERROR: Source image not found: {source_path}", flush=True)
        return False
    if not audio_path.exists():
        print(f"  ERROR: Audio file not found: {audio_path}", flush=True)
        return False

    print(f"  Source: {source_path} ({source_path.stat().st_size:,} bytes)", flush=True)
    print(f"  Audio:  {audio_path} ({audio_path.stat().st_size:,} bytes)", flush=True)
    print(f"  Sending to {MUSETALK_URL}/generate ...", flush=True)

    try:
        with open(source_path, 'rb') as img, open(audio_path, 'rb') as audio:
            response = httpx.post(
                f"{MUSETALK_URL}/generate",
                files={
                    'source': ('kate_car.png', img, 'image/png'),
                    'audio': ('kate_audio.wav', audio, 'audio/wav'),
                },
                timeout=600.0,
            )

        print(f"  Response: HTTP {response.status_code}", flush=True)

        if response.status_code == 200:
            data = response.json()
            print(f"  Response body: {data}", flush=True)
            download_url = data.get('download_url')
            if download_url:
                # Download the video
                print(f"  Downloading result from {MUSETALK_URL}{download_url}...", flush=True)
                video_resp = httpx.get(f"{MUSETALK_URL}{download_url}", timeout=120)
                if video_resp.status_code == 200:
                    OUTPUT_PATH.write_bytes(video_resp.content)
                    print(f"  ✓ Saved: {OUTPUT_PATH} ({len(video_resp.content):,} bytes)", flush=True)
                    return True
                else:
                    print(f"  Download failed: HTTP {video_resp.status_code}", flush=True)
                    return False
            else:
                print(f"  No download_url in response", flush=True)
                return False
        else:
            print(f"  FAILED: HTTP {response.status_code}", flush=True)
            print(f"  Body: {response.text[:500]}", flush=True)
            return False

    except Exception as e:
        print(f"  ERROR: {type(e).__name__}: {e}", flush=True)
        return False


def main() -> None:
    print("=" * 60, flush=True)
    print("MuseTalk Lipsync Test", flush=True)
    print(f"Pod ID: {POD_ID}", flush=True)
    print(f"URL: {MUSETALK_URL}", flush=True)
    print("=" * 60, flush=True)

    success = False
    try:
        healthy = wait_for_health()
        if healthy:
            success = run_lipsync_test()
        else:
            print("\nPod never became healthy — skipping lipsync test.", flush=True)
    finally:
        stop_pod()

    print("\n" + "=" * 60, flush=True)
    if success:
        print("RESULT: SUCCESS — kate_lipsync.mp4 saved!", flush=True)
    else:
        print("RESULT: FAILED — see errors above", flush=True)
    print("=" * 60, flush=True)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
