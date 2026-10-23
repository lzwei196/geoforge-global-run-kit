# GeoForge Global Runs: page kit

Show your global run as a live map page in the GeoForge style, with a card on
[geoforgehhu.com/global-runs.html](https://geoforgehhu.com/global-runs.html). 中文说明见 [README.zh.md](README.zh.md).

## How it works

Everything runs on the computer where your run is. Nothing outside can reach that computer; a Cloudflare tunnel
carries your page out to a public address.

```
the computer where your run is
  your run ──(results)──> csv_to_data.py ───> site/data/      map data
  your run ──(PID, log)─> status_writer.py ─> site/data/runs/  "running now?" every 60 s
  serve.py      serves site/ (the page + data/) on 127.0.0.1 only
  cloudflared   carries it out through the tunnel
                                │
                                ▼
            https://<project>.geoforgehhu.com          your page, open to everyone
                                ▲
                                │ reads data/manifest.json and data/runs/*/live.json
            geoforgehhu.com/global-runs.html           your card, with an "Open the live map" button
```

You do not need a public IP, an open port, your own domain or a certificate. GeoForge makes the address and sends you
a tunnel key. If you prefer your own domain or your own web server, `docs/HOSTING.md` shows those ways too.

The starter page is made for **points with a time series**, such as dams with InSAR displacement. It already has the
GeoForge header with the back button, an English/Chinese switch, the honest run status, the map, a time-series chart
and the project panel. You fill in data and texts.

## Start here

**[The tutorial](docs/TUTORIAL.md)** (中文：[docs/TUTORIAL.zh.md](docs/TUTORIAL.zh.md)) walks through every step, in two parts:

1. **On your own computer (about half a day):** try the example, write your texts, turn your results into the page's
   data, check them, build the page.
2. **On the computer where your run is (about an hour):** copy the page there, start three small services (the page
   server, the status writer and the tunnel), check from outside, and ask GeoForge for your card.

Try the example now (Python 3.8+ and Node 18+):

```
python3 tools/make_example_data.py    # made-up example data (clearly marked) into app/public/data/
(cd app && npm ci && npm run dev)    # open http://127.0.0.1:8870/
```

## What is inside

| Path | What it is |
| --- | --- |
| `app/` | the page (React + Leaflet + TypeScript, built with Vite) |
| `tools/csv_to_data.py` | turns your results (two CSV files) into the page's data |
| `tools/check_data.py` | checks your data before you publish |
| `tools/status_writer.py` | writes your run's live status every 60 s |
| `tools/serve.py` | serves the page and data on this computer with the right headers |
| `tools/make_example_data.py` | writes made-up example data |
| `docs/TUTORIAL.md` | every step, from an empty computer to a live page and card |
| `docs/HOSTING.md` | the three ways to get a public address, and the headers |
| `docs/DATA_FORMAT.md` | every file and field the page reads |
| `docs/GLOBAL_RUNS_FEED.md` | how your card on Global Runs works, and the status rules |
| `docs/STYLE.md` | look, wording and what you may publish |
| `docs/CHECKLIST.md` | the list to tick before going live |

Questions and fixes: open an issue in this repository.
