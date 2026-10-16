#!/usr/bin/env python3
"""Refresh public recruitment leads from two GitHub projects and official Greenhouse job boards.

No credentials, LinkedIn/JobsDB scraping, or applicant data required.
These are leads: display of a job here does not verify personal eligibility.
"""
import datetime as dt
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OUT = Path("data/jobs.json")
GITHUB_PRIMARY = "https://raw.githubusercontent.com/xixicc186/xixicc2027/main/jobs.json"
GITHUB_SECONDARY = "https://raw.githubusercontent.com/namewyf/Campus2027/main/README.md"
GREENHOUSE_BOARDS = {
    "nex": "Nex",
    "moneyherogroup": "MoneyHero Group",
    "fgsglobal": "FGS Global",
    "veritiongroupllcinternships": "Verition Internships",
    "thinkacademyhk": "Think Academy HK",
}
PLACE = re.compile(r"香港|深圳|广州|东莞|珠海|佛山|惠州|中山|澳门|hong[\s-]?kong|shenzhen|guangzhou|dongguan|zhuhai|foshan|national|全国", re.I)
STARTER = re.compile(r"\b(intern(ship)?|graduate|trainee|analyst|associate|coordinator|assistant|junior)\b|实习|管培|毕业生|应届|校招|分析师|助理|专员", re.I)
SENIOR = re.compile(r"\b(senior|staff|principal|director|head of|vice president|manager|lead|chief|vp)\b|总监|高级经理|资深|负责人", re.I)
LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
MAX_FILE_BYTES = 8_000_000


def download(url):
    req = Request(url, headers={
        "User-Agent": "CareerRadar/2.0 (+public-job-feed; low-frequency)",
        "Accept": "application/json,text/plain,text/markdown;q=0.9,*/*;q=0.1",
    })
    with urlopen(req, timeout=35) as response:
        body = response.read(MAX_FILE_BYTES + 1)
    if len(body) > MAX_FILE_BYTES:
        raise ValueError("Refusing unusually large feed")
    return body.decode("utf-8-sig")


def base_feed():
    data = json.loads(download(GITHUB_PRIMARY))
    if not isinstance(data, list) or len(data) < 100:
        raise ValueError("Primary job feed missing or too small, keep previous snapshot")
    if not all(isinstance(x, dict) and isinstance(x.get("company"), str) for x in data):
        raise ValueError("Unexpected primary feed schema")
    # Do not assign new ids to these records: existing local application statuses rely on them.
    return [dict(x, source=x.get("source") or "GitHub校招汇总 · xixicc2027") for x in data]


def markdown_feed():
    body = download(GITHUB_SECONDARY)
    if not body.startswith("<script") and "# " not in body:
        raise ValueError("Not a Markdown recruitment index")
    records = []
    for line in body.splitlines():
        if not line.startswith("|") or line.count("|") < 5 or "---" in line:
            continue
        cells = [x.strip() for x in line.strip().strip("|").split("|")]
        if len(cells) < 5:
            continue
        company, application, when, locations, note = cells[:5]
        if company in ("公司", "Company") or not company:
            continue
        match = LINK.search(application)
        if not match:
            continue
        program, url = match.groups()
        if not url.startswith("https://"):
            continue
        # Only supplement leads with Bay Area or mainland-wide location.
        if not PLACE.search(locations) and locations not in ("不限", "未知"):
            continue
        if "2026届" in note and "2027届" not in note:
            continue
        status = "实习" if "实习" in program else "正式批"
        records.append({
            "id": "campus2027-" + re.sub(r"[^0-9A-Za-z]+", "-", company + "-" + program).strip("-")[:90],
            "company": company,
            "program": program,
            "positions": [],
            "locations": [locations],
            "cohort": "2027届" if "2027" in note else "",
            "batch": status,
            "industry": "校园招聘项目（职位未明确）",
            "apply_url": url,
            "first_seen": "",
            "deadline": None,
            "source": "GitHub校招目录 · Campus2027",
        })
    if not records:
        raise ValueError("No supported table rows found in secondary feed")
    return records


class HtmlToText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.blocked = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.blocked += 1
        elif tag in ("p", "br", "li", "h1", "h2", "h3", "div"):
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.blocked:
            self.blocked -= 1

    def handle_data(self, data):
        if not self.blocked:
            self.parts.append(data)


def extract_text(raw):
    parser = HtmlToText()
    parser.feed(raw or "")
    return re.sub(r"\s+", " ", html.unescape(" ".join(parser.parts))).strip()[:3200]


def greenhouse_feed(token, company):
    # Greenhouse documents unauthenticated GET access to public job boards.
    url = "https://boards-api.greenhouse.io/v1/boards/" + token + "/jobs?content=true"
    payload = json.loads(download(url))
    jobs = payload.get("jobs")
    if not isinstance(jobs, list):
        raise ValueError("Greenhouse board response did not contain jobs")
    records = []
    for j in jobs:
        if not isinstance(j, dict):
            continue
        title = str(j.get("title") or "").strip()
        loc_obj = j.get("location") or {}
        place = loc_obj.get("name") if isinstance(loc_obj, dict) else ""
        place = str(place or "").strip()
        if not title or not PLACE.search(place) or not STARTER.search(title) or SENIOR.search(title):
            continue
        jid = str(j.get("id") or "")
        if not jid.isdigit():
            continue
        url = str(j.get("absolute_url") or "").strip()
        if not url.startswith("https://"):
            continue
        published = str(j.get("first_published") or "")[:10]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", published):
            published = ""
        updated = str(j.get("updated_at") or "")[:10]
        # An internship taking place in summer 2027 is not necessarily for the class of 2027.
        # Only infer an eligibility cohort from explicit graduation / class terminology.
        cohort = ""
        if re.search(r"(?:class of\s*2027|graduat(?:ing|ion)\s*(?:in\s*)?2027|2027届|2027\s+graduates?)", title, re.I):
            cohort = "2027届"
        elif re.search(r"(?:class of\s*2026|graduat(?:ing|ion)\s*(?:in\s*)?2026|2026届|2026\s+graduates?)", title, re.I):
            cohort = "2026届"
        batch = "实习" if re.search(r"intern|实习", title, re.I) else "正式批"
        dept = j.get("departments") or []
        industry = str(dept[0].get("name") or "") if dept and isinstance(dept[0], dict) else ""
        records.append({
            "id": "greenhouse-" + token + "-" + jid,
            "company": company,
            "title": title,
            "positions": [title],
            "locations": [place],
            "cohort": cohort,
            "batch": batch,
            "industry": industry,
            "apply_url": url,
            "deadline": None,
            "first_seen": published,
            "last_seen": updated,
            "description": extract_text(j.get("content") or ""),
            "source": "企业公开招聘 · Greenhouse",
        })
    return records


def identity(row):
    # Keep the identity of the original primary feed unchanged.
    if row.get("id"):
        return str(row["id"]).lower()
    fields = ("company", "program", "title", "cohort", "batch")
    return "|".join(str(row.get(f) or "").strip() for f in fields).lower() + "|" + str(row.get("apply_url") or "").split("?")[0]


def refresh():
    jobs = base_feed()  # A failure here preserves the last committed snapshot.
    seen = {identity(x) for x in jobs}
    existing_urls = set()
    for job in jobs:
        url = str(job.get("apply_url") or "").split("?")[0].strip().lower()
        if url:
            existing_urls.add(url)

    def add(rows, name):
        new = 0
        for row in rows:
            key = identity(row)
            url = str(row.get("apply_url") or "").split("?")[0].strip().lower()
            if key in seen or (url and url in existing_urls):
                continue
            seen.add(key)
            if url:
                existing_urls.add(url)
            jobs.append(row)
            new += 1
        print(name + ": " + str(new) + " additional leads")

    try:
        add(markdown_feed(), "Campus2027 Markdown directory")
    except (URLError, HTTPError, ValueError, TimeoutError) as exc:
        print("Secondary GitHub feed unavailable; skipped:", type(exc).__name__, str(exc)[:140])
    for token, company in GREENHOUSE_BOARDS.items():
        try:
            add(greenhouse_feed(token, company), "Official Greenhouse: " + company)
        except (URLError, HTTPError, ValueError, TimeoutError) as exc:
            print("Greenhouse board skipped:", token, type(exc).__name__, str(exc)[:140])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(jobs, ensure_ascii=False, indent=2) + "\n"
    if OUT.exists() and OUT.read_text(encoding="utf-8") == content:
        print("No data changes; total leads:", len(jobs))
    else:
        OUT.write_text(content, encoding="utf-8")
        print("Updated public job leads:", len(jobs))


if __name__ == "__main__":
    refresh()
