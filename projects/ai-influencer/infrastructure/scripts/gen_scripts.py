#!/usr/bin/env python3
"""
gen_scripts.py — Batch Video Script Generator

Reads product chapters / pain points and generates video scripts via Claude on OpenRouter.

Each script = hook (0–3 sec) + body (20–45 sec) + CTA (last 5 sec)
5 angle types per topic: education, how-to, myth-bust, quick-win, story

Usage:
  python gen_scripts.py --topic "sleep"              # generate all 5 angles for one topic
  python gen_scripts.py --all                        # generate all 60 scripts
  python gen_scripts.py --topic "sleep" --angle myth # one specific angle

Cost: ~$0.001–0.002 per script via Claude Haiku. 60 scripts ≈ $0.10–0.15
Script will show estimate and confirm before batch runs.
"""

import argparse
import os
import sys
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import httpx

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SCRIPTS_DIR = Path(__file__).parent.parent.parent / "content" / "scripts"
SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)

# Use cheap model for bulk script generation
SCRIPT_MODEL = "anthropic/claude-haiku-4-5"
COST_PER_SCRIPT = 0.02  # high-end estimate per script (~500 in / 500 out tokens)

PERSONA_CONTEXT = """
You are writing video scripts for an AI influencer named [NAME], a woman in her late 40s
who went through perimenopause at 47 and now shares what she learned.

Tone: warm, direct, relatable, evidence-lean. No toxic positivity. Occasionally self-deprecating.
Format:
  - HOOK (0–3 sec): Bold claim or relatable problem. Must stop the scroll.
  - BODY (20–45 sec): Teach the thing / bust the myth / walk through the fix.
  - CTA (last 5 sec): One of: "Link in bio for my full 30-day protocol" / "Follow for more" / "Save this"

Each script should read as natural spoken word — short sentences, pauses indicated by "..."
Total video length target: 30–60 seconds.
"""

TOPICS = {
    "sleep": {
        "description": "Why perimenopause wrecks sleep + what actually helps",
        "key_points": [
            "Progesterone drop affects GABA receptors — changes sleep architecture",
            "Night sweats disrupt deep sleep cycles",
            "Magnesium glycinate for sleep quality",
            "Sleep hygiene matters more, not less, in perimenopause",
            "When to consider progesterone for sleep",
        ],
    },
    "weight": {
        "description": "Why old rules don't work + what does (protein, strength, insulin)",
        "key_points": [
            "Estrogen drop changes where fat is stored (belly vs. hips)",
            "Insulin sensitivity decreases in perimenopause",
            "Muscle mass protects metabolism — strength training is non-negotiable",
            "Protein target: 0.7–1g per pound of body weight",
            "Calorie restriction alone backfires — why",
        ],
    },
    "brain_fog": {
        "description": "Root causes of perimenopause brain fog + fixes",
        "key_points": [
            "Estrogen supports acetylcholine production — brain fog is real",
            "Blood sugar dysregulation mimics brain fog",
            "B12 deficiency is common and overlooked",
            "Cortisol and stress response changes",
            "Sleep deprivation compounds cognitive symptoms",
        ],
    },
    "hormones_101": {
        "description": "Demystifying estrogen, progesterone, cortisol, thyroid",
        "key_points": [
            "What perimenopause actually is (erratic ovulation, not menopause)",
            "Estrogen dominance: what it is, what causes it",
            "Progesterone: the calming hormone and why it drops first",
            "Cortisol's relationship with sex hormones",
            "Thyroid: often confused with perimenopause symptoms",
        ],
    },
    "hrt_supplements": {
        "description": "What the research says about HRT and key supplements",
        "key_points": [
            "HRT timing hypothesis: why starting in perimenopause matters",
            "Bioidentical vs. synthetic — what the data shows",
            "Magnesium: the mineral most perimenopausal women are deficient in",
            "Vitamin D3+K2 combination benefits",
            "Adaptogens for cortisol support (ashwagandha, rhodiola)",
        ],
    },
}

ANGLES = {
    "education": "Explain what/why in simple terms. Teach the mechanism. End with the takeaway.",
    "how_to": "Step-by-step walkthrough of a specific action the viewer can take today.",
    "myth_bust": "Start with a common wrong belief, then reveal the truth with evidence.",
    "quick_win": "One simple thing they can do in 5 minutes or today that shows results.",
    "story": "Personal story format — 'I thought X, then Y happened, and here's what I learned'",
}


def confirm_spend(estimated_cost: float, count: int) -> bool:
    """Show cost estimate and get explicit confirmation."""
    print(f"\n{'='*50}")
    print(f"  SPEND CONFIRMATION REQUIRED")
    print(f"{'='*50}")
    print(f"  Scripts to generate: {count}")
    print(f"  Model: {SCRIPT_MODEL}")
    print(f"  Estimated cost: ~${estimated_cost:.2f}")
    print(f"{'='*50}")
    response = input("  Proceed? (yes/no): ").strip().lower()
    return response in ("yes", "y")


def generate_script(topic: str, angle: str, topic_data: dict) -> str:
    """Generate a single video script via OpenRouter."""
    prompt = f"""{PERSONA_CONTEXT}

Topic: {topic_data['description']}
Angle: {ANGLES[angle]}

Key points to potentially draw from:
{chr(10).join(f'- {p}' for p in topic_data['key_points'])}

Write ONE complete video script for this topic using the {angle.upper()} angle.
Label each section clearly: HOOK:, BODY:, CTA:
Keep it natural, conversational, and under 60 seconds when spoken aloud.
"""

    response = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": SCRIPT_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def save_script(topic: str, angle: str, content: str, index: int) -> Path:
    """Save a script to the scripts directory."""
    filename = f"{index:03d}_{topic}_{angle}.md"
    path = SCRIPTS_DIR / filename
    path.write_text(f"# Script: {topic.replace('_', ' ').title()} — {angle.replace('_', ' ').title()}\n\n{content}\n")
    return path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate video scripts for AI influencer")
    parser.add_argument("--topic", choices=list(TOPICS.keys()), help="Single topic to generate")
    parser.add_argument("--angle", choices=list(ANGLES.keys()), help="Single angle (requires --topic)")
    parser.add_argument("--all", action="store_true", help="Generate all 60 scripts")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated, no API calls")
    args = parser.parse_args()

    if not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set in .env")
        sys.exit(1)

    # Build job list
    jobs: list[tuple[str, str]] = []

    if args.all:
        for topic in TOPICS:
            for angle in ANGLES:
                jobs.append((topic, angle))
    elif args.topic and args.angle:
        jobs.append((args.topic, args.angle))
    elif args.topic:
        for angle in ANGLES:
            jobs.append((args.topic, angle))
    else:
        parser.print_help()
        sys.exit(1)

    if args.dry_run:
        print(f"Would generate {len(jobs)} scripts:")
        for topic, angle in jobs:
            print(f"  {topic} × {angle}")
        return

    estimated_cost = len(jobs) * COST_PER_SCRIPT
    if not confirm_spend(estimated_cost, len(jobs)):
        print("Aborted. No charges made.")
        sys.exit(0)

    print(f"\nGenerating {len(jobs)} scripts...")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results = []

    for i, (topic, angle) in enumerate(jobs, 1):
        print(f"  [{i}/{len(jobs)}] {topic} × {angle}...", end=" ", flush=True)
        try:
            content = generate_script(topic, angle, TOPICS[topic])
            path = save_script(topic, angle, content, i)
            print(f"✓ {path.name}")
            results.append({"topic": topic, "angle": angle, "file": path.name, "status": "ok"})
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"topic": topic, "angle": angle, "file": None, "status": f"error: {e}"})

    # Save run summary
    summary_path = SCRIPTS_DIR / f"_run_{timestamp}.json"
    summary_path.write_text(json.dumps(results, indent=2))

    ok_count = sum(1 for r in results if r["status"] == "ok")
    print(f"\nDone: {ok_count}/{len(jobs)} scripts generated → {SCRIPTS_DIR}")


if __name__ == "__main__":
    main()
