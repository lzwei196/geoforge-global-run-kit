# Changes

## 1.2.0 (2026-10-23)

- New default way to go online: everything runs on the computer where your run is, and a Cloudflare tunnel carries
  the page to an address GeoForge gives you (`https://<name>.geoforgehhu.com`). No public IP, open port, domain or
  certificate needed.
- tools/serve.py: serves the page and data on 127.0.0.1 with the right headers (no folder listings, no *.tmp files).
- TUTORIAL (EN + 中文) rewritten in two parts: A. make the page (steps 1–7), B. put it online (steps 8–13), with
  systemd services for the page server, the status writer and the tunnel (its key kept in a file only root can read).
- HOSTING.md: the three ways (address from GeoForge, your own Cloudflare tunnel, your own nginx server), the headers,
  and what to do when the run is on another computer.
- README, CHECKLIST and GLOBAL_RUNS_FEED.md follow the new way.

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
