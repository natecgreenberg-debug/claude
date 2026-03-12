#!/usr/bin/env python3
"""
gen_face.py — AI Influencer Face Generation

Two-stage process:
  Stage 1 (ideation): Cheap/free model to explore looks (no quality pressure)
  Stage 2 (lock-in):  Google Gemini image model via OpenRouter for final quality

Usage:
  python gen_face.py --stage 1            # cheap ideation run
  python gen_face.py --stage 2 --count 4  # final quality pass (COSTS MONEY — will prompt)
  python gen_face.py --stage 2 --count 9  # up to 9 variations in one call

IMPORTANT: Stage 2 costs money. Script will show estimated cost and wait for confirmation.
"""

import argparse
import os
import sys
import json
import httpx
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OUTPUT_DIR = Path(__file__).parent.parent / "content" / "persona" / "faces"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Persona prompt — edit to adjust look
PERSONA_PROMPT = """
A photorealistic portrait of a woman in her late 40s (47-49 years old).
She has a warm, approachable appearance — naturally attractive but not overly polished.
Warm skin tone, natural hair (not overly styled, some natural gray acceptable).
She looks like a knowledgeable friend, not a celebrity or model.
Smile lines visible, natural aging — she looks her age and owns it.
Expression: warm, confident, approachable — like she's about to share something helpful.
Lighting: soft natural light, home office or kitchen background (blurred).
Style: casual but put-together — sweater or casual blouse.
NOT: heavily filtered, Instagram-perfected, or obviously AI-generated looking.
""".strip()

# Model configs
STAGE_1_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"  # cheap ideation
# NOTE: gemini-2.0-flash-exp:free is TEXT ONLY — cannot generate images
# For image generation via Google, use the Gemini image preview model below
STAGE_2_MODEL = "google/gemini-2.5-flash-preview"  # actual image gen model — verify ID at openrouter.ai/collections/image-models

# Approximate costs (USD) — erring HIGH, verify at openrouter.ai before each session
STAGE_2_COST_PER_IMAGE = 0.10  # high-end estimate per image — actual may be lower


def confirm_spend(estimated_cost: float) -> bool:
    """Show cost estimate and get explicit confirmation before spending."""
    print(f"\n{'='*50}")
    print(f"  SPEND CONFIRMATION REQUIRED")
    print(f"{'='*50}")
    print(f"  Estimated cost: ${estimated_cost:.2f}")
    print(f"  Model: {STAGE_2_MODEL}")
    print(f"{'='*50}")
    response = input("  Proceed? (yes/no): ").strip().lower()
    return response in ("yes", "y")


def generate_stage1(count: int = 4) -> None:
    """Stage 1: cheap ideation — explore looks without quality pressure."""
    print(f"\n[Stage 1] Ideation run — {count} rough drafts")
    print("NOTE: Stage 1 uses free/cheap models. No spend confirmation needed.")

    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set in .env")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    for i in range(count):
        print(f"  Generating image {i+1}/{count}...")
        try:
            response = httpx.post(
                "https://openrouter.ai/api/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": STAGE_1_MODEL,
                    "prompt": PERSONA_PROMPT,
                    "n": 1,
                    "size": "512x512",
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

            # Save image URL or base64 data
            image_data = data["data"][0]
            out_path = OUTPUT_DIR / f"stage1_{timestamp}_{i+1:02d}.json"
            out_path.write_text(json.dumps(image_data, indent=2))
            print(f"  Saved: {out_path.name}")

        except Exception as e:
            print(f"  ERROR on image {i+1}: {e}")

    print(f"\n[Stage 1] Done. Review images in: {OUTPUT_DIR}")
    print("Next: confirm the look direction with Nate, then run Stage 2.")


def generate_stage2(count: int = 4) -> None:
    """Stage 2: high-quality lock-in. Prompts for spend confirmation first."""
    if count > 9:
        print("ERROR: Maximum 9 images per call for Gemini grid view.")
        sys.exit(1)

    estimated_cost = count * STAGE_2_COST_PER_IMAGE

    print(f"\n[Stage 2] High-quality face generation — {count} variations")

    if not confirm_spend(estimated_cost):
        print("Aborted. No charges made.")
        sys.exit(0)

    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set in .env")
        sys.exit(1)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print(f"\nGenerating {count} high-quality variations...")
    try:
        response = httpx.post(
            "https://openrouter.ai/api/v1/images/generations",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": STAGE_2_MODEL,
                "prompt": PERSONA_PROMPT,
                "n": count,
                "size": "1024x1024",
            },
            timeout=120.0,
        )
        response.raise_for_status()
        data = response.json()

        for i, image_data in enumerate(data["data"]):
            out_path = OUTPUT_DIR / f"stage2_{timestamp}_{i+1:02d}.json"
            out_path.write_text(json.dumps(image_data, indent=2))
            print(f"  Saved: {out_path.name}")

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    print(f"\n[Stage 2] Done. Approve keepers in: {OUTPUT_DIR}")
    print("Rename your chosen face image to: persona_face_final.png")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate AI influencer face images")
    parser.add_argument(
        "--stage",
        type=int,
        choices=[1, 2],
        required=True,
        help="Stage 1 = cheap ideation, Stage 2 = quality lock-in (costs money)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=4,
        help="Number of images to generate (default: 4, max 9 for stage 2)",
    )
    args = parser.parse_args()

    if args.stage == 1:
        generate_stage1(args.count)
    else:
        generate_stage2(args.count)


if __name__ == "__main__":
    main()
