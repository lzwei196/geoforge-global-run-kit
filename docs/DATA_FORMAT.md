# Data format (version 1)

The page reads plain JSON files from a `data/` folder next to its `index.html`. Your pipeline writes them; nothing
else is needed on the server. `tools/make_example_data.py` writes a full made-up set you can open and copy from, and
`tools/check_data.py` checks your real files before you publish.

```
data/
  manifest.json                 the project: texts, values, runs        (read by your page AND the Global Runs card)
  dams.json                     every dam, one list per column
  series/<lat>_<lon>.json       time series, one file per 5° square
  runs/<run_id>/live.json       how each run is doing right now        (read by your page AND the Global Runs card)
```

Rules for every file:

- UTF-8 JSON. Write each file to a temporary name first, then rename it (`os.replace`), so no reader ever sees half a file.
- Every text a reader sees is `{"en": "...", "zh": "..."}`, both filled in.
- Times are UTC with the zone: `2026-10-22T03:07:15+00:00`. Days are `YYYY-MM-DD`.
- `null` means "no value yet". Never write 0, -9999 or NaN for a missing value: the page would draw it as a real number.

## manifest.json

The top part is the Global Runs feed (see `GLOBAL_RUNS_FEED.md`); `page` holds what only your page needs.

| Field | Type | Meaning |
| --- | --- | --- |
| `feed_version` | `1` | format version |
| `project_id` | a–z, 0–9, `-` | your project's short id, agreed with GeoForge |
| `example` | `true` / absent | only in example data; the page shows a yellow banner and the checker refuses it |
| `updated_at` | UTC time | when the data last changed. The page re-reads `dams.json` only when this changes, so update it on every data write |
| `group` | text | your group's name |
| `title` | text, ≤ 80 | the page and card title |
| `text` | text, ≤ 400 | two sentences: what the agents do |
| `tags` | `{"en": [...], "zh": [...]}`, 1–6 | short labels |
| `facts` | list of text, ≤ 4 | short facts for the card, e.g. "1,200 dams" |
| `map_url` | https address | where your page lives (the card's "Open the map" button) |
| `runs` | list | `{"run_id", "name": text, "started": "YYYY-MM-DD"}`, newest first |
| `page.region` | text | the area, e.g. "China" |
| `page.method` | text, ≤ 400 | satellite, track, processing steps, in plain words |
| `page.period` | `["YYYY-MM-DD", "YYYY-MM-DD"]` | first and last image date |
| `page.values` | list | the values a reader can colour the map by (below) |
| `page.default_value` | a value id | the map's first colour; a dam with `null` here counts as "not processed yet" |
| `page.fields` | list | plain details shown for each dam: `{"id", "name": text, "unit"?}` |
| `page.series` | object | `{"unit": "mm", "what": text, "tile_deg": 5}` |

A value in `page.values`:

| Field | Meaning |
| --- | --- |
| `id` | short id, used as the key in `dams.json` |
| `name` | text, ≤ 40 |
| `unit` | e.g. `mm/yr` (empty for categories) |
| `kind` | `num` (a number) or `cat` (a category) |
| `scale` | `num` only: `diverging` (0 in the middle, red below, blue above; use it for displacement) or `sequential` |
| `classes` | `cat` only: the category names (text); a dam's value is the class number, starting at 0 |
| `note` | optional text under the legend, e.g. "Negative = moving away from the satellite." |

## dams.json

One list per column, all in the same order and the same length:

```json
{
  "id": ["CN00001", "CN00002"],
  "lat": [30.8231, 25.1102],
  "lon": [111.0034, 101.4410],
  "name_en": ["Dam A", ""],
  "name_zh": ["甲坝", "乙坝"],
  "values": { "rate": [-1.8, null], "total": [-14.2, null], "type": [1, 0] },
  "fields": { "height_m": [181, 42], "year_built": [2006, null] }
}
```

- `id` must be unique and stable: the same dam keeps its id in every update (links and series use it).
- An empty name falls back to the other language, then to the id.
- About 60,000 dams is fine (a few MB). If you plan more, tell us first.

## series/<lat>_<lon>.json

Time series are split into squares of `tile_deg` degrees so the page loads only what a reader clicks.
The file name is `floor(lat / tile_deg) * tile_deg` and the same for lon, as whole numbers:
a dam at 30.82° N, 111.00° E with `tile_deg` 5 lives in `series/30_110.json`; one at −12.3°, −45.7° in `series/-15_-50.json`.

```json
{
  "CN00001": {
    "t": ["2017-01-03", "2017-01-15", "2017-01-27"],
    "d": [0.0, -0.4, null],
    "e": [1.2, 1.1, null]
  }
}
```

- `t`: image dates, oldest first. `d`: displacement in `page.series.unit` (same length; `null` for a missing date).
- `e`: optional ± error, same length. The chart draws it as a light band.
- Keep one file under about 20 MB; use a smaller `tile_deg` if a square gets too big.

## runs/<run_id>/live.json

How one run is doing right now. Write it every 60 seconds; see `GLOBAL_RUNS_FEED.md` for every field and
`tools/status_writer.py` for a ready writer.

## Updating while the run goes on

The page is built for data that change while people look at it:

- `live.json` is read every 30 seconds; `manifest.json` every 2 minutes.
- When `manifest.updated_at` changes, the page reads `dams.json` again and forgets the series it had loaded.
- So the order for one update is: write series files, write `dams.json`, then write `manifest.json` with a new `updated_at` last.
