# Changes

## 1.2.2 (2026-11-14)

- A dam detail may include `diagnostic_page_href`. The detail panel then shows a link to that already published page. The link appears only for a same-origin `/diagnostics/<package_id>/` path. A missing field leaves the panel unchanged. The page does not open or embed the diagnostic page, and it does not treat that page as a rate or a cloud map.
- `diagnostic_page_label`, when present, is plain text. Otherwise the link says it is an independent diagnostic display, not an official rate layer, and not scientifically accepted.

## 1.2.1 (2026-11-11)

- The map counts pins, actually processed dams, and queued-only dams separately. A filled colour class such as `layer_cat` is not “processed”. Queued dams stay out of the processed count. The counts come from `dam_detail/*/info.json` `processing_class` when that field is present.
- A null rate or null processing percent stays a gray “no outward number”. It is not drawn as zero and not shown as 100%.
- Each dam’s detail keeps the source acceptance status, field-validation flag, and every scope (batch, window, orbit), including quality failures and diagnostic windows. A main-layer pin no longer hides that note. Diagnostic pins are not moved to main. Stable dam ids and export aliases both resolve.
- A null cloud map or time series is an empty state. `deployment.json` next to the page decides whether a local-preview line is shown; it does not claim scientific validation. The page links to `/progress/` when that file says so.

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
