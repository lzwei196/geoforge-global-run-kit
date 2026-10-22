#!/usr/bin/env python3
"""Turn your results in two CSV files into the page's data folder (docs/TUTORIAL.md, step 4).

    python3 tools/csv_to_data.py --manifest my_manifest.json --dams dams.csv --series series.csv --out app/public/data

Inputs (UTF-8 CSV with a header row):
  my_manifest.json  your texts and settings, written by hand once (copy the example's manifest.json)
  dams.csv          one row per dam: id, lat, lon, name_en, name_zh, then one column per value id in
                    page.values and one per field id in page.fields. Other columns are ignored.
  series.csv        one row per dam and image date: dam_id, date (YYYY-MM-DD), d, and e (optional ± error).
                    Any order; rows of a dam are sorted by date here. Optional: leave --series out if you have none yet.

Empty cells, NaN and NA become null ("no value yet"). If your pipeline writes another marker for "missing",
add it with --missing (e.g. --missing -9999). The script writes series files first, then dams.json, then
manifest.json with a new updated_at, so the page never sees a half update. Series files of squares that no
longer have any dam are removed at the end. Only the Python standard library is used.
"""
import argparse
import csv
import json
import math
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

MISSING = {"", "nan", "na", "n/a", "null", "none"}


def write(path, obj):
    """Write JSON atomically: a temporary file first, then rename, so a reader never sees half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    os.replace(tmp, path)


MISSING_NUM = set()        # numbers that mean "no value" (from --missing), so -9999, -9999.0 and -9999.00 all match


def num(text, where, missing):
    """A number, or None for an empty or missing cell. Stops with a clear message on anything else
    (with where="" it raises ValueError instead, so the caller can keep the cell as text)."""
    t = (text or "").strip()
    if t.lower() in missing:
        return None
    try:
        if "_" in t:                                  # float() would read "1_000" as 1000
            raise ValueError(t)
        x = float(t)
    except ValueError:
        if not where:
            raise
        sys.exit(f"{where}: '{t}' is not a number (use an empty cell for 'no value yet')")
    if not math.isfinite(x) or x in MISSING_NUM:
        return None
    return int(x) if x.is_integer() and "." not in t and "e" not in t.lower() else x


class open_csv:
    """Open a CSV as UTF-8 (with or without BOM); stop with a plain message if it cannot be read."""
    def __init__(self, path):
        self.path = path

    def __enter__(self):
        try:
            self.fh = open(self.path, newline="", encoding="utf-8-sig")
        except OSError as e:
            sys.exit(f"{self.path}: cannot open it ({e.strerror})")
        return self

    def __iter__(self):
        try:
            yield from self.fh
        except UnicodeDecodeError:
            sys.exit(f"{self.path}: not UTF-8 text. Save it as CSV UTF-8 (Excel: Save as > 'CSV UTF-8')")

    def __exit__(self, *exc):
        self.fh.close()


def day(text, where):
    t = (text or "").strip()
    try:
        return date.fromisoformat(t).isoformat()
    except ValueError:
        sys.exit(f"{where}: '{t}' is not a date YYYY-MM-DD")


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--manifest", required=True, help="your hand-written manifest (texts, values, fields, runs)")
    a.add_argument("--dams", required=True, help="CSV, one row per dam")
    a.add_argument("--series", help="CSV, one row per dam and date (optional)")
    a.add_argument("--out", required=True, help="the data folder to write (the one your page is served from)")
    a.add_argument("--missing", action="append", default=[], help="another text that means 'no value', e.g. -9999 (can repeat)")
    args = a.parse_args()
    missing = MISSING | {m.strip().lower() for m in args.missing}
    for m in args.missing:
        try:
            MISSING_NUM.add(float(m))
        except ValueError:
            pass
    out = Path(args.out)

    try:
        manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        sys.exit(f"{args.manifest}: cannot read it as JSON ({e})")
    if not isinstance(manifest, dict) or not isinstance(manifest.get("page"), dict):
        sys.exit(f"{args.manifest}: needs the 'page' part (copy the example's manifest.json and change it)")
    if manifest.get("example"):
        sys.exit(f"{args.manifest}: still has \"example\": true; remove it for your real data")
    page = manifest["page"]
    values = [v for v in page.get("values") or [] if isinstance(v, dict) and v.get("id")]
    fields = [f for f in page.get("fields") or [] if isinstance(f, dict) and f.get("id")]
    td = (page.get("series") or {}).get("tile_deg", 5)
    if not isinstance(td, int) or isinstance(td, bool) or td <= 0 or 180 % td:
        sys.exit(f"{args.manifest}: page.series.tile_deg must be a whole number that divides 180 (1, 2, 3, 5, 10, ...)")

    # ---- dams.csv -> dams.json (one list per column) ----------------------------------------------------------------
    dams = {"id": [], "lat": [], "lon": [], "name_en": [], "name_zh": [],
            "values": {v["id"]: [] for v in values}, "fields": {f["id"]: [] for f in fields}}
    tile_of = {}
    with open_csv(args.dams) as fh:
        rows = csv.DictReader(fh)
        head = set(rows.fieldnames or [])
        need = {"id", "lat", "lon"} | {v["id"] for v in values}
        if need - head:
            sys.exit(f"{args.dams}: missing columns {sorted(need - head)} (value ids come from page.values)")
        for c in sorted({f["id"] for f in fields} - head):
            print(f"note: {args.dams} has no column '{c}'; that detail is left empty", file=sys.stderr)
        for n, r in enumerate(rows, start=2):
            where = f"{args.dams} line {n}"
            did = (r["id"] or "").strip()
            if not did:
                sys.exit(f"{where}: empty id")
            if did in tile_of:
                sys.exit(f"{where}: id '{did}' appears twice; every dam needs its own id")
            lat, lon = num(r["lat"], where + " lat", missing), num(r["lon"], where + " lon", missing)
            if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                sys.exit(f"{where}: lat/lon missing or outside the globe")
            dams["id"].append(did); dams["lat"].append(lat); dams["lon"].append(lon)
            dams["name_en"].append((r.get("name_en") or "").strip()); dams["name_zh"].append((r.get("name_zh") or "").strip())
            for v in values:
                x = num(r[v["id"]], f"{where} {v['id']}", missing)
                if v.get("kind") == "cat" and x is not None:
                    if isinstance(x, float) and x.is_integer():   # pandas writes 1.0 for an int column with gaps
                        x = int(x)
                    if not isinstance(x, int) or not 0 <= x < len(v.get("classes") or []):
                        sys.exit(f"{where} {v['id']}: a category is a class number 0 to "
                                 f"{len(v.get('classes') or []) - 1} (got {x})")
                dams["values"][v["id"]].append(x)
            for f in fields:
                cell = (r.get(f["id"]) or "").strip()
                try:
                    if len(cell) > 1 and cell[0] == "0" and cell[1].isdigit():
                        raise ValueError(cell)               # "0012" is a code, not the number 12
                    dams["fields"][f["id"]].append(num(cell, "", missing))
                except ValueError:                           # not a number: keep it as plain text
                    dams["fields"][f["id"]].append(cell)
            tile_of[did] = f"{math.floor(lat / td) * td}_{math.floor(lon / td) * td}"
    if not dams["id"]:
        sys.exit(f"{args.dams}: no dams")

    # ---- series.csv -> series/<lat>_<lon>.json --------------------------------------------------------------------
    tiles, unknown, twice = {}, set(), 0
    if args.series:
        per_dam = {}
        with open_csv(args.series) as fh:
            rows = csv.DictReader(fh)
            head = set(rows.fieldnames or [])
            if {"dam_id", "date", "d"} - head:
                sys.exit(f"{args.series}: needs the columns dam_id, date, d (and e if you have errors)")
            has_e = "e" in head
            for n, r in enumerate(rows, start=2):
                where = f"{args.series} line {n}"
                did = (r["dam_id"] or "").strip()
                if did not in tile_of:
                    unknown.add(did); continue
                when = day(r["date"], where)
                if when in per_dam.setdefault(did, {}):
                    twice += 1
                per_dam[did][when] = (
                    num(r["d"], where + " d", missing), num(r["e"], where + " e", missing) if has_e else None)
        for did, by_day in per_dam.items():
            t = sorted(by_day)
            s = {"t": t, "d": [by_day[x][0] for x in t]}
            if has_e:
                s["e"] = [by_day[x][1] for x in t]
            tiles.setdefault(tile_of[did], {})[did] = s
        if twice:
            print(f"note: {twice} row(s) in {args.series} repeat a dam and date; the later row was kept", file=sys.stderr)
        if unknown:
            print(f"note: {len(unknown)} dam id(s) in {args.series} are not in {args.dams} and were skipped, "
                  f"e.g. {sorted(unknown)[:3]}", file=sys.stderr)

    # ---- write: series first, then dams, then the manifest with a new updated_at (the page reloads on it) ---------
    for name, rows in tiles.items():
        write(out / "series" / f"{name}.json", rows)
    write(out / "dams.json", dams)
    manifest["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write(out / "manifest.json", manifest)
    if args.series:
        for old in (out / "series").glob("*.json"):
            if old.stem not in tiles:
                old.unlink()
    print(f"written to {out}: {len(dams['id'])} dams, {sum(len(v) for v in tiles.values())} with a time series, "
          f"{len(tiles)} series file(s). Next: python3 tools/check_data.py {out}")


if __name__ == "__main__":
    main()
