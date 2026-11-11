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
- `null` means "no value yet". Never write 0 or -9999 for a missing value: the page would draw it as a real number.
- Never write `NaN` or `Infinity`: they are not JSON, and a browser then cannot read the WHOLE file. In Python use
  `json.dumps(..., allow_nan=False)` and turn NaN into `None` first (numpy: `None if np.isnan(x) else float(x)`).

## manifest.json

The top part is the Global Runs feed (see `GLOBAL_RUNS_FEED.md`); `page` holds what only your page needs.

| Field | Type | Meaning |
| --- | --- | --- |
| `feed_version` | `1` | format version |
| `project_id` | a–z, 0–9, `-` | your project's short id, agreed with GeoForge |
| `example` | `true` / absent | only in example data; the page shows a yellow banner and the checker refuses it |
| `updated_at` | UTC time | when the data last changed. The page re-reads `dams.json` only when this changes, so update it on every data write |
| `group` | text, ≤ 80 | your group's name |
| `title` | text, ≤ 80 | your page's title (the Global Runs card title is agreed with GeoForge) |
| `text` | text, ≤ 400 | two sentences: what the agents do |
| `tags` | `{"en": [...], "zh": [...]}`, 1–6 | short labels |
| `facts` | up to 4 texts, each ≤ 40 | short facts, e.g. "1,200 dams"; the Global Runs card shows the first 3 |
| `map_url` | https address | where your page lives (for your own records; the card's button address is agreed with GeoForge) |
| `runs` | list | `{"run_id", "name": text, "started": "YYYY-MM-DD"}`, newest first |
| `page.region` | text | the area, e.g. "China" |
| `page.method` | text, ≤ 400 | satellite, track, processing steps, in plain words |
| `page.period` | `["YYYY-MM-DD", "YYYY-MM-DD"]` | first and last image date |
| `page.values` | list | the values a reader can colour the map by (below) |
| `page.default_value` | a value id | the map's first colour. A `null` is drawn as “no outward number”; it is not treated as zero, and it is not by itself “not processed”. When dam details include `processing_class`, the page counts displayed / actually processed / queued-only from that field instead of from how many colour values are filled in |
| `page.fields` | list | plain details shown for each dam: `{"id", "name": text, "unit"?}` |
| `page.series` | object | `{"unit": "mm", "what": text, "tile_deg": 5}`; `tile_deg` is a whole number that divides 180 (1, 2, 3, 5, 10, …) |

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
- Keep one file under about 20 MB; if a square gets too big, use a smaller whole `tile_deg` (e.g. 2 or 1).
- The page looks up a series by the stable dam id, then by `fields.export` in the same square. A missing file or a missing key is an empty series, not a made-up line.

## dam_detail/<id>/info.json (optional)

One JSON object per dam. The page tries `dam_detail/<stable id>/info.json`, then `dam_detail/<fields.export>/info.json`.
Either file is enough. It does not invent a rate, a cloud map, or a time series when those fields are null.

Fields the page reads, when present:

| Field | Meaning |
| --- | --- |
| `processing_class` | `actually_processed` or `draft_queued_only`. This is the processed / queued count. A queued dam is not counted as processed |
| `science_acceptance_status` | the source status, shown as written (`待验收`, `已数值核验_现场验证未建立`, `质量未通过`, `仅排队草稿`, `多窗口并存_不可推广全坝`, or any other token unchanged) |
| `field_validation` | shown as written. `not_established` stays “field validation not established” |
| `viewer_layer` | `main`, `diag` or `draft`: which display layer the pin uses. It is not an acceptance pass, and a diagnostic pin is not moved to main |
| `scopes` | every batch / window / orbit record, including ones that failed or are diagnostic. The page does not drop or merge them |
| `images` | relative paths under `data/`, or empty. A null or missing file is an empty state. No picture is invented |
| `points` | monitoring or reference points, or an empty list |

`deployment.json` sits next to `index.html`, not in `data/`. It only says whether this copy is a local preview (`local_only` or `unpublished`) and the path of the separate progress page (`progress_href`). It does not record scientific acceptance.

## runs/<run_id>/live.json

How one run is doing right now. Write it every 60 seconds; see `GLOBAL_RUNS_FEED.md` for every field and
`tools/status_writer.py` for a ready writer.

## Updating while the run goes on

The page is built for data that change while people look at it:

- `live.json` is read every 30 seconds; `manifest.json` every 2 minutes.
- When `manifest.updated_at` changes, the page reads `dams.json` again and forgets the series and dam details it had loaded.
- So the order for one update is: write series files, write `dams.json`, then write `manifest.json` with a new `updated_at` last.
