# Changes

## 1.1.0 (2026-10-22)

- docs/TUTORIAL.md and docs/TUTORIAL.zh.md: the full walk-through, from an empty computer to a live page and a Global Runs card.
- tools/csv_to_data.py: turns two CSV files (dams, time series) into the data folder, in the safe write order.
- make_example_data.py: the example manifest.json has one field per line, so it can be copied and edited by hand.

## 1.0.1 (2026-10-22)

- check_data.py: broken dams columns no longer skip the live.json checks.
- status_writer.py: a one-time `finished`/`failed` write is retried (10 tries, then exit code 1).
- Page: the open dam shows "Loading…" while its series is read again after a data update.
- Page: a slow series read for an earlier dam can no longer replace the dam opened after it.
- GLOBAL_RUNS_FEED.md / DATA_FORMAT.md: how the GeoForge card is built (sections, three facts, folded runs, what is agreed vs read live).

## 1.0.0 (2026-10-22)

- First version: points + time-series page, English/Chinese switch, Global Runs feed v1, example data, checker, status writer, docs.
