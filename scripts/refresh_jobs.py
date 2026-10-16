#!/usr/bin/env python3
"""Sync public campus-recruitment leads without login, secrets or scraping."""
import json
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = "https://raw.githubusercontent.com/xixicc186/xixicc2027/main/jobs.json"
TARGET = Path("data/jobs.json")


def refresh():
    request = Request(SOURCE, headers={
        "User-Agent": "CareerRadar/1.0 (public GitHub job-feed sync)",
        "Accept": "application/json",
    })
    with urlopen(request, timeout=35) as response:
        raw = response.read(5_000_001)
    if len(raw) > 5_000_000:
        raise RuntimeError("Unexpectedly large job feed; previous snapshot retained")
    jobs = json.loads(raw.decode("utf-8-sig"))
    if not isinstance(jobs, list) or len(jobs) < 100:
        raise RuntimeError("Job feed missing or unusually small")
    if not all(isinstance(j, dict) and isinstance(j.get("company"), str) for j in jobs):
        raise RuntimeError("Unexpected job data structure")
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(jobs, ensure_ascii=False, indent=2) + "\n"
    if TARGET.exists() and TARGET.read_text(encoding="utf-8") == body:
        print(f"Unchanged: {len(jobs)} public job leads")
        return
    TARGET.write_text(body, encoding="utf-8")
    print(f"Synced {len(jobs)} public job leads")


if __name__ == "__main__":
    refresh()
