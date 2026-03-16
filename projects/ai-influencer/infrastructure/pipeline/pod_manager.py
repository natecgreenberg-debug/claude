#!/usr/bin/env python3
"""
pod_manager.py — RunPod pod lifecycle management

Handles start/stop of Kokoro TTS (port 8880) and MuseTalk lipsync (port 8000) pods.
Uses the RunPod REST API directly (no templates required).
Pod IDs come from .env — pods persist between runs, we just start/stop them.

Model stack:
  TTS:     Kokoro FastAPI  (ghcr.io/remsky/kokoro-fastapi-gpu:latest, port 8880)
  Lipsync: MuseTalk API    (ghcr.io/natecgreenberg-debug/musetalk-api:latest, port 8000)

Pod IDs (set in .env):
  RUNPOD_KOKORO_POD_ID    — Kokoro TTS pod
  RUNPOD_MUSETALK_POD_ID  — MuseTalk lipsync pod

Usage (standalone test):
  python pod_manager.py --test              # start both pods, print URLs, stop them
  python pod_manager.py --test-tts-only     # start only the TTS pod
  python pod_manager.py --stop              # stop all pods
"""

import argparse
import os
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

RUNPOD_API_BASE = "https://rest.runpod.io/v1"

# Port assignments
KOKORO_PORT = 8880    # Kokoro TTS FastAPI
MUSETALK_PORT = 8000  # MuseTalk lipsync API

# Pricing reference (SECURE cloud, on-demand)
KOKORO_COST_HR = 0.59   # RTX 4090 (US-IL-1)
MUSETALK_COST_HR = 0.59  # RTX 4090 (US-IL-1)


def _api_key() -> str:
    key = os.getenv("RUNPOD_API_KEY")
    if not key:
        raise ValueError("RUNPOD_API_KEY not set in .env")
    return key


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}


def _proxy_url(pod_id: str, port: int) -> str:
    return f"https://{pod_id}-{port}.proxy.runpod.net"


def _pod_action(pod_id: str, action: str) -> dict:
    """Call start or stop on a pod. action: 'start' or 'stop'."""
    resp = httpx.post(
        f"{RUNPOD_API_BASE}/pods/{pod_id}/{action}",
        headers=_headers(),
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()


def _wait_until_ready(pod_id: str, proxy_url: str, health_path: str = "/health", timeout: int = 300) -> None:
    """Poll RunPod API until RUNNING, then probe HTTP until responsive."""
    deadline = time.monotonic() + timeout
    poll_interval = 10

    print(f"    Waiting for pod {pod_id} (up to {timeout}s)...", flush=True)

    while time.monotonic() < deadline:
        try:
            resp = httpx.get(f"{RUNPOD_API_BASE}/pods/{pod_id}", headers=_headers(), timeout=10.0)
            pod = resp.json()
            status = pod.get("desiredStatus", "").upper()
        except Exception as e:
            print(f"    Status check error: {e} — retrying...", flush=True)
            time.sleep(poll_interval)
            continue

        if status != "RUNNING":
            print(f"    Status: {status} — waiting...", flush=True)
            time.sleep(poll_interval)
            continue

        # RUNNING — probe HTTP
        try:
            r = httpx.get(f"{proxy_url}{health_path}", timeout=5.0)
            if r.status_code < 500:
                print(f"    ✓ Ready: {proxy_url}", flush=True)
                return
        except Exception:
            pass

        print(f"    RUNNING but HTTP not ready yet — retrying...", flush=True)
        time.sleep(poll_interval)

    raise RuntimeError(f"Pod {pod_id} did not become ready within {timeout}s.")


class PodURLs:
    """Live pod proxy URLs for injection into generate_video.py."""

    def __init__(self, kokoro_url: str, musetalk_url: str) -> None:
        self.kokoro_url = kokoro_url
        self.musetalk_url = musetalk_url

    def as_env(self) -> dict[str, str]:
        return {
            "RUNPOD_KOKORO_URL": self.kokoro_url,
            "RUNPOD_MUSETALK_URL": self.musetalk_url,
        }

    def __repr__(self) -> str:
        return (
            f"  RUNPOD_KOKORO_URL:   {self.kokoro_url}\n"
            f"  RUNPOD_MUSETALK_URL: {self.musetalk_url}"
        )


def start_pods(tts_only: bool = False) -> PodURLs:
    """
    Start Kokoro TTS and (optionally) MuseTalk pods from their saved pod IDs.
    Blocks until both pods pass health checks.
    Returns PodURLs with live proxy URLs.
    """
    kokoro_pod_id = os.getenv("RUNPOD_KOKORO_POD_ID")
    musetalk_pod_id = os.getenv("RUNPOD_MUSETALK_POD_ID")

    if not kokoro_pod_id:
        raise ValueError("RUNPOD_KOKORO_POD_ID not set in .env")
    if not tts_only and not musetalk_pod_id:
        raise ValueError("RUNPOD_MUSETALK_POD_ID not set in .env")

    kokoro_url = _proxy_url(kokoro_pod_id, KOKORO_PORT)
    musetalk_url = _proxy_url(musetalk_pod_id, MUSETALK_PORT) if musetalk_pod_id else ""

    print("\nStarting RunPod pods...", flush=True)

    _pod_action(kokoro_pod_id, "start")
    print(f"  Started Kokoro pod: {kokoro_pod_id}", flush=True)

    if not tts_only and musetalk_pod_id:
        _pod_action(musetalk_pod_id, "start")
        print(f"  Started MuseTalk pod: {musetalk_pod_id}", flush=True)

    _wait_until_ready(kokoro_pod_id, kokoro_url, health_path="/v1/audio/voices")

    if not tts_only and musetalk_pod_id:
        _wait_until_ready(musetalk_pod_id, musetalk_url, health_path="/health")

    return PodURLs(kokoro_url=kokoro_url, musetalk_url=musetalk_url)


def stop_pods() -> None:
    """Stop both pods. Logs errors but does not raise."""
    kokoro_pod_id = os.getenv("RUNPOD_KOKORO_POD_ID")
    musetalk_pod_id = os.getenv("RUNPOD_MUSETALK_POD_ID")

    print("\nStopping RunPod pods...", flush=True)

    for name, pod_id in [("kokoro", kokoro_pod_id), ("musetalk", musetalk_pod_id)]:
        if not pod_id:
            continue
        try:
            _pod_action(pod_id, "stop")
            print(f"  ✓ Stopped {name}: {pod_id}", flush=True)
        except Exception as e:
            print(f"  WARNING: Failed to stop {name} pod {pod_id}: {e}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage RunPod pods for the video pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true", help="Start both pods, print URLs, stop them")
    group.add_argument("--test-tts-only", action="store_true", help="Start only the TTS pod")
    group.add_argument("--stop", action="store_true", help="Stop all pods")
    args = parser.parse_args()

    if args.stop:
        stop_pods()
        return

    try:
        if args.test_tts_only:
            urls = start_pods(tts_only=True)
        else:
            urls = start_pods()

        print(f"\nAll pods live:\n{urls}")
        input("\nPress Enter to stop all pods...")
    finally:
        stop_pods()


if __name__ == "__main__":
    main()
