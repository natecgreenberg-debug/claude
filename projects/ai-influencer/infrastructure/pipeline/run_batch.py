#!/usr/bin/env python3
"""
run_batch.py — Top-level entry point for the AI influencer video pipeline.

Handles the full pod lifecycle: starts pods, runs generate_video.py, stops pods.
Pods are always stopped — even on crash or Ctrl+C (via finally block).

Usage:
  python run_batch.py --batch scripts/ --face face.png
  python run_batch.py --script path/to/script.md --face face.png
  python run_batch.py --script-text "Hello, I'm Kate." --face face.png
  python run_batch.py --batch scripts/ --face face.png --lipsync-model musetalk
  python run_batch.py --stop-pods    # emergency cleanup after SIGKILL

URL injection:
  Live pod URLs are passed to generate_video.py as environment variables.
  No changes needed to generate_video.py — it reads them via os.getenv() as normal.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

from pod_manager import start_pods, stop_pods

load_dotenv()

PIPELINE_DIR = Path(__file__).parent
GENERATE_VIDEO = PIPELINE_DIR / "generate_video.py"

# Pod startup adds ~3–4 min to the first run; 0 for subsequent runs (warm pod)
POD_STARTUP_MINUTES = 4


def _video_cost_estimate(count: int, model: str) -> tuple[float, float]:
    """Return (min_cost, max_cost) for the batch."""
    if model == "infinitetalk":
        return count * 0.011, count * 0.028
    else:
        return count * 0.013, count * 0.033


def _pod_cost_estimate() -> tuple[float, float]:
    """Return (min, max) pod startup overhead cost."""
    # TTS pod: T4 ~$0.22/hr, lipsync pod: 4090 ~$0.34/hr, running for ~4 min
    startup_hrs = POD_STARTUP_MINUTES / 60
    return (0.22 + 0.34) * startup_hrs, (0.30 + 0.34) * startup_hrs


def confirm_spend(count: int, model: str) -> bool:
    """Show cost estimate and require explicit confirmation."""
    vid_min, vid_max = _video_cost_estimate(count, model)
    pod_min, pod_max = _pod_cost_estimate()
    total_min = vid_min + pod_min
    total_max = vid_max + pod_max

    print(f"\n{'='*54}")
    print(f"  SPEND CONFIRMATION REQUIRED")
    print(f"{'='*54}")
    print(f"  Videos to generate:    {count}")
    print(f"  Lip-sync model:        {model}")
    print(f"  Video GPU cost:        ${vid_min:.2f}–${vid_max:.2f}")
    print(f"  Pod startup overhead:  ${pod_min:.2f}–${pod_max:.2f}  (~{POD_STARTUP_MINUTES} min warm-up)")
    print(f"  ─────────────────────────────────────────")
    print(f"  Total estimated cost:  ${total_min:.2f}–${total_max:.2f}")
    print(f"{'='*54}")
    response = input("  Proceed? (yes/no): ").strip().lower()
    return response in ("yes", "y")


def build_generate_video_cmd(args: argparse.Namespace) -> list[str]:
    """Build the subprocess command for generate_video.py."""
    cmd = [sys.executable, str(GENERATE_VIDEO), "--face", str(args.face)]

    if args.batch:
        cmd += ["--batch", str(args.batch)]
    elif args.script:
        cmd += ["--script", str(args.script)]
    elif args.script_text:
        cmd += ["--script-text", args.script_text]

    cmd += ["--lipsync-model", args.lipsync_model]
    return cmd


def run_emergency_stop() -> None:
    """--stop-pods: stop whatever pods are recorded in the /tmp file."""
    print("Emergency pod stop — reading saved pod IDs...")
    stop_pods()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="AI influencer video pipeline — manages pod lifecycle automatically"
    )
    parser.add_argument("--batch", type=Path, help="Directory of script .md files")
    parser.add_argument("--script", type=Path, help="Single script .md file")
    parser.add_argument("--script-text", help="Inline script text (quoted)")
    parser.add_argument("--face", type=Path, help="Persona face image (.png)")
    parser.add_argument(
        "--lipsync-model",
        choices=["infinitetalk", "musetalk"],
        default="infinitetalk",
        help="Lip-sync model (default: infinitetalk)",
    )
    parser.add_argument(
        "--stop-pods",
        action="store_true",
        help="Emergency cleanup: stop pods from /tmp/ai_influencer_pod_ids.json",
    )
    args = parser.parse_args()

    # Emergency stop — no other logic needed
    if args.stop_pods:
        run_emergency_stop()
        return

    # Validate inputs
    if not args.face:
        parser.error("--face is required")

    if not args.face.exists():
        print(f"ERROR: Face image not found: {args.face}")
        sys.exit(1)

    if not (args.batch or args.script or args.script_text):
        parser.error("One of --batch, --script, or --script-text is required")

    # Count scripts for cost estimate
    if args.batch:
        if not args.batch.exists():
            print(f"ERROR: Batch directory not found: {args.batch}")
            sys.exit(1)
        script_count = len(list(args.batch.glob("*.md")))
        if script_count == 0:
            print(f"ERROR: No .md scripts found in {args.batch}")
            sys.exit(1)
    else:
        script_count = 1

    # Spend confirmation before any API call
    if not confirm_spend(script_count, args.lipsync_model):
        print("Aborted.")
        sys.exit(0)

    # Start pods (validates .env vars first, raises ValueError if missing)
    include_musetalk = args.lipsync_model == "musetalk"
    try:
        urls = start_pods(include_musetalk=include_musetalk)
    except ValueError as e:
        print(f"\nCONFIG ERROR: {e}")
        sys.exit(1)
    except RuntimeError as e:
        print(f"\nPOD START ERROR: {e}")
        sys.exit(1)

    print(f"\nPods live:\n{urls}\n")

    # Build env for subprocess — current env + injected pod URLs
    subprocess_env = {**os.environ, **urls.as_env()}

    # Run generate_video.py — pods are always stopped in finally
    exit_code = 0
    try:
        cmd = build_generate_video_cmd(args)
        result = subprocess.run(cmd, env=subprocess_env)
        exit_code = result.returncode
    except KeyboardInterrupt:
        print("\n\nInterrupted — stopping pods before exit...")
        exit_code = 130
    finally:
        stop_pods()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
