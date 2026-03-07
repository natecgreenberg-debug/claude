"""
Content Calendar & Tracking for Affiliate Machine

Tracks: content pieces, platforms, keywords, publish dates, performance.
Uses only Python stdlib (no pip dependencies).
"""

import json
from pathlib import Path
from datetime import datetime, timedelta


PROJECTS_DIR = Path(__file__).parent
KEYWORDS_FILE = PROJECTS_DIR / "keywords.json"
PROGRAMS_FILE = PROJECTS_DIR / "programs.json"
CALENDAR_FILE = PROJECTS_DIR / "calendar.json"


def load_json(path: Path) -> list:
    """Load a JSON file, return empty list if missing."""
    if path.exists():
        return json.loads(path.read_text())
    return []


def save_json(path: Path, data: list) -> None:
    """Save data to JSON file."""
    path.write_text(json.dumps(data, indent=2))


def add_content_piece(
    title: str,
    keyword: str,
    content_type: str,
    platforms: list[str],
    programs: list[str],
) -> dict:
    """Add a new content piece to the calendar."""
    calendar = load_json(CALENDAR_FILE)
    piece = {
        "id": len(calendar) + 1,
        "title": title,
        "keyword": keyword,
        "content_type": content_type,
        "platforms": platforms,
        "programs": programs,
        "status": "draft",
        "created": datetime.now().isoformat(),
        "published": {},
        "metrics": {},
    }
    calendar.append(piece)
    save_json(CALENDAR_FILE, calendar)
    return piece


def mark_published(piece_id: int, platform: str, url: str) -> None:
    """Mark a content piece as published on a platform."""
    calendar = load_json(CALENDAR_FILE)
    for piece in calendar:
        if piece["id"] == piece_id:
            piece["published"][platform] = {
                "url": url,
                "date": datetime.now().isoformat(),
            }
            if len(piece["published"]) >= len(piece["platforms"]):
                piece["status"] = "published"
            else:
                piece["status"] = "partial"
            break
    save_json(CALENDAR_FILE, calendar)


def get_week_plan(weeks_ahead: int = 1) -> list[dict]:
    """Generate a content plan for the next N weeks based on keywords."""
    keywords = load_json(KEYWORDS_FILE)
    not_started = [k for k in keywords if k["status"] == "not_started"]

    plan = []
    for i, kw in enumerate(not_started[: weeks_ahead * 2]):  # 2 pieces/week
        week_num = (i // 2) + 1
        plan.append({
            "week": week_num,
            "keyword": kw["keyword"],
            "content_type": kw["content_type"],
            "programs": kw["programs"],
            "suggested_platforms": ["hashnode", "medium", "youtube"],
        })
    return plan


def print_status() -> None:
    """Print current calendar status."""
    calendar = load_json(CALENDAR_FILE)
    programs = load_json(PROGRAMS_FILE)
    keywords = load_json(KEYWORDS_FILE)

    print("=== Affiliate Machine Status ===\n")

    print(f"Programs tracked: {len(programs)}")
    applied = sum(1 for p in programs if p["status"] != "not_applied")
    print(f"Programs applied: {applied}/{len(programs)}\n")

    print(f"Keywords researched: {len(keywords)}")
    started = sum(1 for k in keywords if k["status"] != "not_started")
    print(f"Keywords with content: {started}/{len(keywords)}\n")

    print(f"Content pieces: {len(calendar)}")
    by_status = {}
    for piece in calendar:
        by_status[piece["status"]] = by_status.get(piece["status"], 0) + 1
    for status, count in by_status.items():
        print(f"  {status}: {count}")

    if not calendar:
        print("\n  No content yet. Run get_week_plan() to see what to write first.")
        print("  Then use add_content_piece() to track it.\n")

    # Show next actions
    print("\n=== Next Actions ===")
    plan = get_week_plan(2)
    for item in plan:
        print(f"  Week {item['week']}: {item['content_type'].upper()} - {item['keyword']}")
        print(f"    Programs: {', '.join(item['programs'])}")


if __name__ == "__main__":
    print_status()
