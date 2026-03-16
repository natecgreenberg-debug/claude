#!/usr/bin/env python3
"""
pod_manager.py — RunPod pod lifecycle management

Handles start/stop of Chatterbox (TTS) and InfiniteTalk (lip-sync) pods.
Pod IDs are saved to /tmp/ai_influencer_pod_ids.json immediately after creation
for crash-safety — run `python run_batch.py --stop-pods` to clean up if needed.

Usage (standalone test):
  python pod_manager.py --test              # start both pods, print URLs, stop them
  python pod_manager.py --test-tts-only     # start only the TTS pod
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
import runpod

load_dotenv()

POD_IDS_FILE = Path("/tmp/ai_influencer_pod_ids.json")

# GPU type for each pod — change here if you want a different GPU
TTS_GPU = "NVIDIA RTX 3080"       # lighter model, T4 or 3080 is fine
LIPSYNC_GPU = "NVIDIA RTX 4090"   # InfiniteTalk needs 24GB


def _get_api_key() -> str:
    """Return API key or raise ValueError before any API call."""
    key = os.getenv("RUNPOD_API_KEY")
    if not key:
        raise ValueError(
            "RUNPOD_API_KEY not set in .env — add it before running the pipeline."
        )
    return key


def _get_template_ids(include_musetalk: bool = False) -> dict[str, str]:
    """Return required template IDs or raise ValueError listing what's missing."""
    required = {
        "tts": ("RUNPOD_TTS_TEMPLATE_ID", "Chatterbox/Kokoro TTS pod template"),
        "lipsync": ("RUNPOD_LIPSYNC_TEMPLATE_ID", "InfiniteTalk lip-sync pod template"),
    }
    if include_musetalk:
        required["musetalk"] = ("RUNPOD_MUSETALK_TEMPLATE_ID", "MuseTalk pod template")

    ids: dict[str, str] = {}
    missing: list[str] = []

    for key, (env_var, desc) in required.items():
        val = os.getenv(env_var)
        if not val:
            missing.append(f"  {env_var}  ({desc})")
        else:
            ids[key] = val

    if missing:
        raise ValueError(
            "Missing .env variables — add these before running the pipeline:\n"
            + "\n".join(missing)
        )

    return ids


def _get_network_volume_id() -> str | None:
    """Return network volume ID if configured (optional)."""
    return os.getenv("RUNPOD_NETWORK_VOLUME_ID")


def _save_pod_ids(pod_ids: dict[str, str]) -> None:
    """Write pod IDs to /tmp file immediately — crash safety."""
    POD_IDS_FILE.write_text(json.dumps(pod_ids, indent=2))


def _load_pod_ids() -> dict[str, str]:
    """Load pod IDs from /tmp file."""
    if not POD_IDS_FILE.exists():
        return {}
    return json.loads(POD_IDS_FILE.read_text())


def _delete_pod_ids_file() -> None:
    if POD_IDS_FILE.exists():
        POD_IDS_FILE.unlink()


def _proxy_url(pod_id: str, port: int) -> str:
    return f"https://{pod_id}-{port}.proxy.runpod.net"


def _wait_until_ready(pod_id: str, proxy_url: str, timeout: int = 300) -> None:
    """
    Poll until pod is RUNNING in RunPod API AND HTTP health probe succeeds.
    Raises RuntimeError on timeout.
    """
    deadline = time.monotonic() + timeout
    poll_interval = 10  # seconds

    print(f"    Waiting for pod {pod_id} to be ready (up to {timeout}s)...", flush=True)

    while time.monotonic() < deadline:
        try:
            pod = runpod.get_pod(pod_id)
            status = pod.get("desiredStatus", "").upper()
        except Exception as e:
            print(f"    RunPod status check error: {e} — retrying...", flush=True)
            time.sleep(poll_interval)
            continue

        if status != "RUNNING":
            print(f"    Status: {status} — waiting...", flush=True)
            time.sleep(poll_interval)
            continue

        # Pod is RUNNING — now probe HTTP
        try:
            resp = httpx.get(f"{proxy_url}/health", timeout=5.0)
            if resp.status_code < 500:
                print(f"    ✓ Pod ready: {proxy_url}", flush=True)
                return
        except Exception:
            pass

        print(f"    Pod RUNNING but HTTP not ready yet — retrying...", flush=True)
        time.sleep(poll_interval)

    raise RuntimeError(
        f"Pod {pod_id} did not become ready within {timeout}s. "
        f"Run `python run_batch.py --stop-pods` to clean up."
    )


def _start_pod(name: str, template_id: str, gpu_type: str, port: int) -> tuple[str, str]:
    """
    Create and start a RunPod pod from a template.
    Returns (pod_id, proxy_url).
    """
    volume_id = _get_network_volume_id()

    pod_config: dict = {
        "name": f"ai-influencer-{name}",
        "image_name": "",          # overridden by template
        "gpu_type_id": gpu_type,
        "template_id": template_id,
        "container_disk_in_gb": 20,
        "cloud_type": "SECURE",    # on-demand
    }

    if volume_id:
        pod_config["network_volume_id"] = volume_id

    pod = runpod.create_pod(**pod_config)
    pod_id: str = pod["id"]

    proxy = _proxy_url(pod_id, port)
    print(f"    Created pod {pod_id} ({name})", flush=True)

    return pod_id, proxy


class PodURLs:
    """Container for live pod proxy URLs, injected into generate_video.py via env."""

    def __init__(
        self,
        chatterbox_url: str,
        infinitetalk_url: str,
        musetalk_url: str | None = None,
    ) -> None:
        self.chatterbox_url = chatterbox_url
        self.infinitetalk_url = infinitetalk_url
        self.musetalk_url = musetalk_url

    def as_env(self) -> dict[str, str]:
        """Return dict suitable for subprocess env injection."""
        env: dict[str, str] = {
            "RUNPOD_CHATTERBOX_URL": self.chatterbox_url,
            "RUNPOD_INFINITETALK_URL": self.infinitetalk_url,
        }
        if self.musetalk_url:
            env["RUNPOD_MUSETALK_URL"] = self.musetalk_url
        return env

    def __repr__(self) -> str:
        lines = [
            f"  RUNPOD_CHATTERBOX_URL:   {self.chatterbox_url}",
            f"  RUNPOD_INFINITETALK_URL: {self.infinitetalk_url}",
        ]
        if self.musetalk_url:
            lines.append(f"  RUNPOD_MUSETALK_URL:     {self.musetalk_url}")
        return "\n".join(lines)


def start_pods(include_musetalk: bool = False) -> PodURLs:
    """
    Start Chatterbox (TTS) and InfiniteTalk (lip-sync) pods.
    Saves pod IDs to /tmp immediately after creation for crash safety.
    Blocks until both pods pass health checks.
    Returns PodURLs with live proxy URLs.

    Raises:
        ValueError: if required .env vars are missing (before any API call)
        RuntimeError: if a pod fails to become ready within 5 minutes
    """
    api_key = _get_api_key()
    template_ids = _get_template_ids(include_musetalk=include_musetalk)
    runpod.api_key = api_key

    print("\nStarting RunPod pods...", flush=True)

    # Start both pods (serially — simpler error handling, fast enough)
    tts_pod_id, tts_url = _start_pod(
        name="tts",
        template_id=template_ids["tts"],
        gpu_type=TTS_GPU,
        port=8080,
    )
    lipsync_pod_id, lipsync_url = _start_pod(
        name="lipsync",
        template_id=template_ids["lipsync"],
        gpu_type=LIPSYNC_GPU,
        port=8081,
    )

    pod_ids: dict[str, str] = {
        "tts": tts_pod_id,
        "lipsync": lipsync_pod_id,
    }

    musetalk_url: str | None = None
    if include_musetalk:
        mt_pod_id, musetalk_url = _start_pod(
            name="musetalk",
            template_id=template_ids["musetalk"],
            gpu_type=LIPSYNC_GPU,
            port=8082,
        )
        pod_ids["musetalk"] = mt_pod_id

    # Save immediately — crash safety
    _save_pod_ids(pod_ids)
    print(f"  Pod IDs saved to {POD_IDS_FILE}", flush=True)

    # Wait for readiness
    try:
        _wait_until_ready(tts_pod_id, tts_url)
        _wait_until_ready(lipsync_pod_id, lipsync_url)
        if include_musetalk and musetalk_url:
            _wait_until_ready(pod_ids["musetalk"], musetalk_url)
    except RuntimeError:
        # Clean up any pods we started before re-raising
        stop_pods()
        raise

    return PodURLs(
        chatterbox_url=tts_url,
        infinitetalk_url=lipsync_url,
        musetalk_url=musetalk_url,
    )


def stop_pods(pod_ids: dict[str, str] | None = None) -> None:
    """
    Stop running pods. Uses provided pod_ids dict or loads from /tmp file.
    Logs errors but does not raise — always best-effort on cleanup.
    """
    api_key = os.getenv("RUNPOD_API_KEY")
    if not api_key:
        print("WARNING: RUNPOD_API_KEY not set — cannot stop pods automatically.")
        return

    runpod.api_key = api_key

    if pod_ids is None:
        pod_ids = _load_pod_ids()

    if not pod_ids:
        print("No pod IDs found — nothing to stop.")
        return

    print("\nStopping RunPod pods...", flush=True)
    for name, pod_id in pod_ids.items():
        try:
            runpod.terminate_pod(pod_id)
            print(f"  ✓ Stopped {name} pod: {pod_id}", flush=True)
        except Exception as e:
            print(f"  WARNING: Failed to stop {name} pod {pod_id}: {e}", flush=True)

    _delete_pod_ids_file()


def main() -> None:
    parser = argparse.ArgumentParser(description="Test pod lifecycle standalone")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true", help="Start both pods, print URLs, stop them")
    group.add_argument("--test-tts-only", action="store_true", help="Start only the TTS pod")
    args = parser.parse_args()

    if args.test_tts_only:
        # Quick TTS-only smoke test
        api_key = _get_api_key()
        template_ids = _get_template_ids()
        runpod.api_key = api_key

        print("Starting TTS pod only...", flush=True)
        pod_id, url = _start_pod("tts", template_ids["tts"], TTS_GPU, 8080)
        _save_pod_ids({"tts": pod_id})

        try:
            _wait_until_ready(pod_id, url)
            print(f"\nTTS pod live: {url}")
            input("\nPress Enter to stop the pod...")
        finally:
            stop_pods({"tts": pod_id})

    else:
        urls = start_pods()
        print(f"\nAll pods live:\n{urls}")
        input("\nPress Enter to stop all pods...")
        stop_pods()


if __name__ == "__main__":
    main()
