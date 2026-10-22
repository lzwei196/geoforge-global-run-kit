#!/usr/bin/env python3
"""Write MADE-UP example data so the page can be tried before your real results exist.

    python tools/make_example_data.py            # writes app/public/data/

Every dam here is invented ("Example dam 01"), every number is generated, and manifest.json carries
"example": true, so the page shows a yellow "Example data" banner and tools/check_data.py refuses it for publishing.
Use this file as a picture of the SHAPES your own pipeline must write (docs/DATA_FORMAT.md has every field).
Only the Python standard library is used.
"""
import json
import math
import os
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "app" / "public" / "data"
TILE_DEG = 5
rng = random.Random(7)


def write(rel, obj):
    """Write JSON atomically: a temporary file first, then rename, so a reader never sees half a file."""
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    os.replace(tmp, p)


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def tile(lat, lon):
    return f"{math.floor(lat / TILE_DEG) * TILE_DEG}_{math.floor(lon / TILE_DEG) * TILE_DEG}"


# ---- the dams (invented positions inside China's rough box) --------------------------------------------------------
N = 80
TYPES = [{"en": "Earth-fill", "zh": "土石坝"}, {"en": "Concrete gravity", "zh": "混凝土重力坝"}, {"en": "Arch", "zh": "拱坝"}]
dams = {"id": [], "lat": [], "lon": [], "name_en": [], "name_zh": [],
        "values": {"rate": [], "total": [], "type": []}, "fields": {"height_m": [], "year_built": []}}
series_by_tile = {}
start, end = date(2017, 1, 1), date(2026, 9, 30)
for k in range(N):
    lat, lon = round(rng.uniform(22, 45), 4), round(rng.uniform(98, 122), 4)
    did = f"EX{k + 1:03d}"
    dams["id"].append(did); dams["lat"].append(lat); dams["lon"].append(lon)
    dams["name_en"].append(f"Example dam {k + 1:02d}"); dams["name_zh"].append(f"示例大坝 {k + 1:02d}")
    dams["values"]["type"].append(rng.randrange(len(TYPES)))
    dams["fields"]["height_m"].append(rng.randrange(15, 180))
    dams["fields"]["year_built"].append(rng.randrange(1958, 2016))
    if k % 7 == 6:                                   # some dams not processed yet: values null, no series
        dams["values"]["rate"].append(None); dams["values"]["total"].append(None)
        continue
    rate = round(rng.gauss(-2.0, 4.0), 2)           # mm per year, made up
    amp = rng.uniform(1, 6)
    t, d, e = [], [], []
    day = start
    while day <= end:
        yrs = (day - start).days / 365.25
        t.append(day.isoformat())
        d.append(round(rate * yrs + amp * math.sin(2 * math.pi * yrs) + rng.gauss(0, 1.5), 2))
        e.append(round(rng.uniform(1.0, 3.0), 2))
        day += timedelta(days=12)                    # one image every 12 days
    dams["values"]["rate"].append(rate)
    dams["values"]["total"].append(d[-1])
    series_by_tile.setdefault(tile(lat, lon), {})[did] = {"t": t, "d": d, "e": e}

# ---- manifest: the project (also read by the GeoForge Global Runs card) ---------------------------------------------
manifest = {
    "feed_version": 1,
    "project_id": "example-dam-insar",
    "example": True,
    "updated_at": utc_now(),
    "group": {"en": "Example Group", "zh": "示例课题组"},
    "title": {"en": "Dam displacement from InSAR (example)", "zh": "基于 InSAR 的大坝形变（示例）"},
    "text": {"en": "KI agents process satellite radar images for each dam and track how it moves over time.",
             "zh": "知识基础设施智能体逐座处理卫星雷达影像，跟踪每座大坝随时间的形变。"},
    "tags": {"en": ["InSAR", "Dams", "Displacement", "China"], "zh": ["InSAR", "大坝", "形变", "中国"]},
    "facts": [{"en": f"{N} dams", "zh": f"{N} 座大坝"}],
    "map_url": "https://example.org/dams/",
    "runs": [{"run_id": "example_run", "name": {"en": "Example run", "zh": "示例运行"}, "started": "2026-10-01"}],
    "page": {
        "region": {"en": "China (example area)", "zh": "中国（示例范围）"},
        "method": {"en": "Made-up numbers for this example. Your text: satellite, track, processing steps.",
                   "zh": "本示例为虚构数据。请填写：卫星、轨道、处理步骤。"},
        "period": [start.isoformat(), end.isoformat()],
        "values": [
            {"id": "rate", "name": {"en": "Displacement rate", "zh": "形变速率"}, "unit": "mm/yr", "kind": "num", "scale": "diverging",
             "note": {"en": "Negative = moving away from the satellite.", "zh": "负值 = 远离卫星方向。"}},
            {"id": "total", "name": {"en": "Total displacement", "zh": "累计形变"}, "unit": "mm", "kind": "num", "scale": "diverging"},
            {"id": "type", "name": {"en": "Dam type", "zh": "坝型"}, "unit": "", "kind": "cat", "classes": TYPES},
        ],
        "default_value": "rate",
        "fields": [{"id": "height_m", "name": {"en": "Height", "zh": "坝高"}, "unit": "m"},
                   {"id": "year_built", "name": {"en": "Year built", "zh": "建成年份"}}],
        "series": {"unit": "mm", "what": {"en": "Displacement over time (line of sight)", "zh": "形变时间序列（视线向）"}, "tile_deg": TILE_DEG},
    },
}

write("manifest.json", manifest)
write("dams.json", dams)
for name, rows in series_by_tile.items():
    write(f"series/{name}.json", rows)
# the example run is not running anything, so it says "stopped" (never fake "running")
write("runs/example_run/live.json", {"run_id": "example_run", "status": "stopped", "process_alive": False,
                                     "exported_at": utc_now(), "last_activity": utc_now()})
print(f"example data written to {OUT}: {N} dams, {len(series_by_tile)} series tiles")
