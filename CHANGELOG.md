# Changes

## 1.0.1 (2026-10-22)

- check_data.py: broken dams columns no longer skip the live.json checks.
- status_writer.py: a one-time `finished`/`failed` write is retried (10 tries, then exit code 1).
- Page: the open dam shows "Loading…" while its series is read again after a data update.
- GLOBAL_RUNS_FEED.md: how the GeoForge card is built (sections, three facts, folded runs, what is agreed vs read live).

## 1.0.0 (2026-10-22)

- First version: points + time-series page, English/Chinese switch, Global Runs feed v1, example data, checker, status writer, docs.
