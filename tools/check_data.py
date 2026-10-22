#!/usr/bin/env python3
"""Check a data folder against docs/DATA_FORMAT.md before you publish it.

    python tools/check_data.py app/public/data        # or the folder your web server serves

Prints every problem it finds. Exit code 0 = ready to publish, 1 = errors (fix them first).
Only the Python standard library is used.
"""
import json
import math
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ERR, WARN = [], []
ID = re.compile(r"^[a-z0-9-]{1,64}$")
RUN_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")
STATUSES = {"running", "paused", "stopped", "finished", "failed"}


def err(where, msg): ERR.append(f"{where}: {msg}")
def warn(where, msg): WARN.append(f"{where}: {msg}")


def load(p, max_kb=None):
    if not p.is_file():
        err(p.name, "missing"); return None
    if max_kb and p.stat().st_size > max_kb * 1024:
        err(p.name, f"larger than {max_kb} KB")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:                      # noqa: BLE001 - report any read problem
        err(p.name, f"not valid UTF-8 JSON ({e})"); return None


def text2(where, v, maxlen=None, need=True):
    """{"en": "...", "zh": "..."}: both languages, not empty, not too long."""
    if v is None and not need:
        return
    if not isinstance(v, dict):
        return err(where, 'must be {"en": "...", "zh": "..."}')
    for lang in ("en", "zh"):
        s = v.get(lang)
        if not isinstance(s, str) or not s.strip():
            err(where, f'"{lang}" text missing')
        elif maxlen and len(s) > maxlen:
            err(where, f'"{lang}" text longer than {maxlen} characters')
        elif re.search(r"<[a-zA-Z/]", s):
            warn(where, f'"{lang}" looks like HTML; it is shown as plain text')


def utc_time(where, s):
    try:
        t = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return err(where, f"not a time like 2026-10-22T03:07:15+00:00: {s!r}")
    if t.tzinfo is None:
        return err(where, "time has no zone; write UTC with +00:00")
    return t


def is_day(s):
    try:
        return bool(DAY.match(s)) and date.fromisoformat(s) is not None
    except (TypeError, ValueError):
        return False


def check(root):
    m = load(root / "manifest.json", 256)
    if not isinstance(m, dict):
        return
    if m.get("feed_version") != 1:
        err("manifest", "feed_version must be 1")
    if not ID.match(str(m.get("project_id", ""))):
        err("manifest", "project_id: a-z, 0-9 and '-' only, at most 64")
    if m.get("example"):
        err("manifest", '"example": true - this is example data; remove the flag only when the data are real')
    utc_time("manifest.updated_at", m.get("updated_at"))
    text2("manifest.group", m.get("group"), 80)
    text2("manifest.title", m.get("title"), 80)
    text2("manifest.text", m.get("text"), 400)
    tags = m.get("tags") or {}
    for lang in ("en", "zh"):
        if not isinstance(tags.get(lang), list) or not 1 <= len(tags[lang]) <= 6:
            err("manifest.tags", f'"{lang}": a list of 1 to 6 short labels')
    for k, f in enumerate(m.get("facts") or []):
        text2(f"manifest.facts[{k}]", f, 40)
    if m.get("map_url") and not str(m["map_url"]).startswith("https://"):
        err("manifest.map_url", "must start with https://")
    runs = m.get("runs")
    if not isinstance(runs, list) or not runs:
        err("manifest.runs", "at least one run")
        runs = []
    seen = set()
    for k, r in enumerate(runs):
        rid = str(r.get("run_id", ""))
        if not RUN_ID.match(rid) or rid in seen:
            err(f"manifest.runs[{k}]", "run_id: A-Z a-z 0-9 _ -, unique")
        seen.add(rid)
        text2(f"manifest.runs[{k}].name", r.get("name"), 80)
        if not is_day(r.get("started")):
            err(f"manifest.runs[{k}].started", "date YYYY-MM-DD")

    p = m.get("page") or {}
    text2("page.region", p.get("region"), 80)
    text2("page.method", p.get("method"), 400)
    per = p.get("period")
    if not (isinstance(per, list) and len(per) == 2 and all(is_day(x) for x in per) and per[0] <= per[1]):
        err("page.period", '["YYYY-MM-DD", "YYYY-MM-DD"], first <= last')
    vdefs = p.get("values") or []
    vids = [v.get("id") for v in vdefs]
    if not vdefs or len(set(vids)) != len(vids):
        err("page.values", "at least one value, ids unique")
    for v in vdefs:
        w = f"page.values[{v.get('id')}]"
        text2(w + ".name", v.get("name"), 40)
        text2(w + ".note", v.get("note"), 160, need=False)
        if v.get("kind") not in ("num", "cat"):
            err(w, 'kind must be "num" or "cat"')
        if v.get("kind") == "cat":
            if not v.get("classes"):
                err(w, "a cat value needs classes")
            for c in v.get("classes") or []:
                text2(w + ".classes", c, 40)
        if v.get("kind") == "num" and v.get("scale") not in (None, "diverging", "sequential"):
            err(w, 'scale must be "diverging" or "sequential"')
    if p.get("default_value") not in vids:
        err("page.default_value", "must be one of the value ids")
    fdefs = p.get("fields") or []
    for f in fdefs:
        text2(f"page.fields[{f.get('id')}].name", f.get("name"), 40)
    s = p.get("series") or {}
    text2("page.series.what", s.get("what"), 80)
    td = s.get("tile_deg")
    if not (isinstance(td, int) and td > 0 and 180 % td == 0):
        err("page.series.tile_deg", "a whole number that divides 180, e.g. 5")
        td = None

    d = load(root / "dams.json")
    ids = {}
    if isinstance(d, dict):
        n = len(d.get("id") or [])
        cols = {k: d.get(k) for k in ("id", "lat", "lon", "name_en", "name_zh")}
        for k, c in cols.items():
            if not isinstance(c, list) or len(c) != n:
                err("dams", f'"{k}" must be a list as long as "id" ({n})')
        if ERR:
            return
        for i in range(n):
            did, la, lo = d["id"][i], d["lat"][i], d["lon"][i]
            if not isinstance(did, str) or not did or did in ids:
                err("dams.id", f"row {i}: empty or repeated id {did!r}")
            if not (isinstance(la, (int, float)) and -90 <= la <= 90 and isinstance(lo, (int, float)) and -180 <= lo <= 180):
                err("dams", f"row {i} ({did}): lat/lon out of range")
            if not (d["name_en"][i] or d["name_zh"][i]):
                warn("dams", f"row {i} ({did}): no name; the id is shown instead")
            ids[did] = (la, lo)
        vals = d.get("values") or {}
        for v in vdefs:
            col = vals.get(v.get("id"))
            if not isinstance(col, list) or len(col) != n:
                err("dams.values", f'"{v.get("id")}" must be a list of {n} numbers or null'); continue
            bad = [i for i, x in enumerate(col) if x is not None and not (isinstance(x, (int, float)) and math.isfinite(x))]
            if v.get("kind") == "cat":
                nc = len(v.get("classes") or [])
                bad += [i for i, x in enumerate(col) if x is not None and not (isinstance(x, int) and 0 <= x < nc)]
            if bad:
                err("dams.values", f'"{v.get("id")}": {len(bad)} bad entries, first at row {bad[0]}')
        for f in fdefs:
            col = (d.get("fields") or {}).get(f.get("id"))
            if not isinstance(col, list) or len(col) != n:
                err("dams.fields", f'"{f.get("id")}" must be a list of {n} entries (null for unknown)')

    tiles = list((root / "series").glob("*.json")) if (root / "series").is_dir() else []
    if not tiles:
        warn("series", "no series tiles yet; every dam shows 'no time series'")
    for tp in tiles:
        rows = load(tp, 20 * 1024)
        if not isinstance(rows, dict):
            continue
        for did, sr in rows.items():
            w = f"series/{tp.name}[{did}]"
            if did not in ids:
                err(w, "dam id not in dams.json"); continue
            la, lo = ids[did]
            if td and tp.stem != f"{math.floor(la / td) * td}_{math.floor(lo / td) * td}":
                err(w, f"belongs in tile {math.floor(la / td) * td}_{math.floor(lo / td) * td}.json")
            t, v = sr.get("t"), sr.get("d")
            if not isinstance(t, list) or not isinstance(v, list) or len(t) != len(v):
                err(w, '"t" and "d" must be lists of the same length'); continue
            if not all(is_day(x) for x in t) or t != sorted(t):
                err(w, '"t" must be YYYY-MM-DD dates, oldest first')
            if "e" in sr and (not isinstance(sr["e"], list) or len(sr["e"]) != len(t)):
                err(w, '"e" must be as long as "t"')

    now = datetime.now(timezone.utc)
    for r in runs:
        rid = str(r.get("run_id", ""))
        lv = load(root / "runs" / rid / "live.json", 64)
        if not isinstance(lv, dict):
            continue
        w = f"runs/{rid}/live.json"
        if lv.get("run_id") != rid:
            err(w, "run_id differs from the folder name")
        if lv.get("status") not in STATUSES:
            err(w, f"status must be one of {sorted(STATUSES)}")
        if not isinstance(lv.get("process_alive"), bool):
            err(w, "process_alive must be true or false")
        t = utc_time(w + ".exported_at", lv.get("exported_at"))
        utc_time(w + ".last_activity", lv.get("last_activity"))
        if t and lv.get("status") not in ("finished", "failed"):
            age = (now - t).total_seconds()
            if age > 180:
                warn(w, f"written {int(age)} s ago: the card shows 'status unknown' until it is written again (every 60 s)")
            if age < -60:
                err(w, "exported_at is in the future: sync the server clock (NTP)")
        if lv.get("status") == "running" and lv.get("process_alive") is False:
            warn(w, "status running but process_alive false: the card will not say running")
        text2(w + ".step", lv.get("step"), 40, need=False)
        text2(w + ".note", lv.get("note"), 120, need=False)
        pr = lv.get("progress")
        if pr is not None:
            if not isinstance(pr, dict) or not isinstance(pr.get("done"), (int, float)):
                err(w + ".progress", '{"done": n, "total": n, "what": {"en", "zh"}}')
            else:
                text2(w + ".progress.what", pr.get("what"), 30)


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "app/public/data")
    check(root)
    for x in WARN:
        print("WARNING ", x)
    for x in ERR:
        print("ERROR   ", x)
    print(f"\n{root}: {len(ERR)} errors, {len(WARN)} warnings -> {'NOT ready to publish' if ERR else 'ready to publish'}")
    sys.exit(1 if ERR else 0)
