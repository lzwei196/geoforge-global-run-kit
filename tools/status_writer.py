#!/usr/bin/env python3
"""Write runs/<run_id>/live.json every 60 seconds while your run works (docs/GLOBAL_RUNS_FEED.md).

    python tools/status_writer.py --data /var/www/dams/data --run-id run_2026_10_20 \
        --pid-file /path/to/run.pid --activity /path/to/run.log

It only READS your run's files (the PID file and the newest log/output), so it cannot slow down or break the run.
Change progress() below to count what your run has finished. Set "finished", "paused" or "failed" yourself
with --status when the run ends or pauses: a dead process alone only means "stopped".
"finished" and "failed" are written once; "paused" keeps writing every 60 s (a paused card still needs a fresh file).
Only the Python standard library is used.
"""
import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path


def utc(t):
    return datetime.fromtimestamp(t, timezone.utc).isoformat(timespec="seconds")


def alive(pid_file):
    """True only when the PID in the file belongs to a running process (signal 0 checks without touching it)."""
    try:
        os.kill(int(Path(pid_file).read_text().strip()), 0)
        return True
    except (OSError, ValueError):
        return False


def newest_mtime(path):
    """The newest change time of a file, or of any file inside a folder: the last real sign of work."""
    p = Path(path)
    if p.is_file():
        return p.stat().st_mtime
    times = [f.stat().st_mtime for f in p.rglob("*") if f.is_file()] if p.is_dir() else []
    return max(times) if times else None


def progress():
    """CHANGE THIS: count what your run has finished, e.g. dams with a result file. Return None if unknown."""
    return None
    # example:
    # done = len(list(Path("/path/to/results").glob("*.json")))
    # return {"done": done, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)                       # atomic: nobody reads half a file


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--data", required=True, help="the data folder your page is served from")
    a.add_argument("--run-id", required=True)
    a.add_argument("--pid-file", required=True, help="file holding the run's process id")
    a.add_argument("--activity", required=True, help="a log file or output folder that changes while the run works")
    a.add_argument("--step-en", default=None); a.add_argument("--step-zh", default=None)
    a.add_argument("--status", choices=["finished", "paused", "failed"], help="finished/failed: write once and stop; paused: keep writing")
    a.add_argument("--note-en", default=None); a.add_argument("--note-zh", default=None)
    a.add_argument("--every", type=int, default=60, help="seconds between writes (keep it 60 or less)")
    args = a.parse_args()
    out = Path(args.data) / "runs" / args.run_id / "live.json"
    while True:
        now = time.time()
        is_alive = alive(args.pid_file)
        last = newest_mtime(args.activity)
        live = {
            "run_id": args.run_id,
            "status": args.status or ("running" if is_alive else "stopped"),
            "process_alive": is_alive,
            "exported_at": utc(now),
            "last_activity": utc(last if last else now),
        }
        if args.step_en and args.step_zh:
            live["step"] = {"en": args.step_en, "zh": args.step_zh}
        if args.note_en and args.note_zh:
            live["note"] = {"en": args.note_en, "zh": args.note_zh}
        p = progress()
        if p:
            live["progress"] = p
        write(out, live)
        if args.status in ("finished", "failed"):
            return
        time.sleep(args.every)


if __name__ == "__main__":
    main()
