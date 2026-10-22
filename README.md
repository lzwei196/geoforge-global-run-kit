# GeoForge Global Runs: page kit

Everything you need to build a live map page for your global run in the GeoForge style, and to show it on
[geoforgehhu.com/global-runs.html](https://geoforgehhu.com/global-runs.html). 中文说明见 [README.zh.md](README.zh.md).

The starter page is made for **points with a time series**, such as dams with InSAR displacement. It already has the
GeoForge header with the back button, an English/Chinese switch, the honest run status, a map of every point
coloured by a value, a time-series chart and the project panel. You fill in data and texts.

**New here? Start with the step-by-step [tutorial](docs/TUTORIAL.md)** (中文：[docs/TUTORIAL.zh.md](docs/TUTORIAL.zh.md)).

## Try it in 2 minutes

```
python3 tools/make_example_data.py    # made-up example data (clearly marked) into app/public/data/
cd app && npm ci && npm run dev      # Node 18+; open http://127.0.0.1:8870/
```

## What is inside

| Path | What it is |
| --- | --- |
| `app/` | the page (React + Leaflet + TypeScript, built with Vite) |
| `tools/csv_to_data.py` | turns your results (two CSV files) into the page's data |
| `tools/make_example_data.py` | writes example data: copy its shapes for your own pipeline |
| `tools/check_data.py` | checks your data folder before you publish |
| `tools/status_writer.py` | writes your run's live status every 60 s |
| `docs/TUTORIAL.md` | every step from an empty computer to a live page and card |
| `docs/DATA_FORMAT.md` | every file and field the page reads |
| `docs/GLOBAL_RUNS_FEED.md` | how your card on the Global Runs page works, and the status rules |
| `docs/HOSTING.md` | build, nginx, headers, checks |
| `docs/STYLE.md` | look, wording and what you may publish |
| `docs/CHECKLIST.md` | the list to tick before going live |

## The path to going live

1. Run the example and read `docs/DATA_FORMAT.md`.
2. Make your pipeline write the same files (start with China; the world needs no code change).
3. Adapt texts and values in `manifest.json`; change page code only where `docs/STYLE.md` allows.
4. Host it (`docs/HOSTING.md`), start the status writer, tick `docs/CHECKLIST.md`.
5. Send GeoForge your address and a card picture. We check it and add your card to Global Runs.

Questions and fixes: open an issue in this repository.
