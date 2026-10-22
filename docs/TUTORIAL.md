# Tutorial: from your run to a live page on GeoForge Global Runs

This walks you through every step, from an empty computer to your live page with a card on
[geoforgehhu.com/global-runs.html](https://geoforgehhu.com/global-runs.html). It uses a dam-displacement run from
InSAR as the example; any project with points and a time series works the same way. 中文版：[TUTORIAL.zh.md](TUTORIAL.zh.md).

Plan about one day for the first time: half for steps 1–7 on your own computer, half for steps 8–11 on your server.

## What you build

```
your InSAR run ──(results)──> tools/csv_to_data.py ──> data/manifest.json, dams.json, series/
your InSAR run ──(PID, log)─> tools/status_writer.py ─> data/runs/<run_id>/live.json   (every 60 s)

your web server serves:  index.html + assets/  (the page, built once)
                         data/                  (the files above, always changing)

readers' browsers ──> your page                  reads everything in data/
GeoForge Global Runs card ──> your data/         reads only manifest.json and runs/*/live.json
```

Your run is never touched: both tools only read its files. GeoForge only reads two kinds of small files from your
web server. Nothing from outside has to reach the computer your run is on.

`status_writer.py` must run on the same computer as your run's process (it checks the process by its id). If your
web server is another computer, step 8 shows how to copy the status files over.

## Before you start

| You need | Version | Check |
| --- | --- | --- |
| Python | 3.8 or newer (only the standard library) | `python3 --version` |
| Node.js + npm | 18 or newer (only to build the page) | `node --version` |
| git | any | `git --version` |
| A web server with HTTPS | nginx, Apache or similar | your address opens with a valid certificate |

The page can be built on any computer (your laptop is fine) and copied to the server. Node is not needed on the
server.

## Step 1. Get the kit

You have been invited to the private repository. Accept the invitation on GitHub, then:

```
git clone https://github.com/lzwei196/geoforge-global-run-kit.git
cd geoforge-global-run-kit
```

## Step 2. Try the example

```
python3 tools/make_example_data.py
cd app && npm ci && npm run dev
```

Open http://127.0.0.1:8870/ and look around:

- a yellow "Example data" banner (all 80 dams are made up);
- the dots coloured by displacement rate; click one to see its time series with the error band;
- the layer box (top left) to colour by another value;
- the language button: every word switches, also the texts from `manifest.json`;
- the status badge says "Stopped" at first, and "Status unknown (feed paused)" after 3 minutes: the example run is not
  running anything and nothing keeps writing its status. That is the honest-status rule at work, not a fault.

Stop the dev server with Ctrl+C. The example files are in `app/public/data/`; open them in an editor. Your pipeline
will write the same shapes.

## Step 3. Write your manifest

The manifest is the one file you write by hand. It holds your texts, the values a reader can colour the map by,
the details shown for each dam, and your runs.

```
cp app/public/data/manifest.json my_manifest.json
```

Open `my_manifest.json` and change it:

1. **Delete** the lines `"example": true` and `"updated_at": ...` (the converter sets `updated_at` for you).
2. **`project_id`**: a short id like `cn-dam-insar`. Agree it with GeoForge (it names your card).
3. **`group`, `title`, `text`, `tags`, `facts`**: your own words in English and Chinese. `text` is two plain
   sentences on what the agents do. `facts` are up to 4 short facts like "1,200 dams"; the first 3 show on the card.
4. **`map_url`**: the address your page will have, e.g. `https://your.domain/dams/`.
5. **`runs`**: one entry per run, newest first. `run_id` uses letters, numbers, `_` and `-`, e.g. `china_2026_10`.
6. **`page.region`, `page.method`, `page.period`**: the area, your method in plain words (satellite, track, steps),
   and the first and last image date.
7. **`page.values`**: what a reader can colour the map by. Keep `rate` and `total` if they suit your data; add or remove values.
   Use `"scale": "diverging"` for displacement (0 in the middle). For a category, use `"kind": "cat"` with `classes`.
8. **`page.default_value`**: the value the map starts with. A dam with no value here counts as "not processed yet".
9. **`page.fields`**: plain details shown for each dam (height, year built, river, ...).
10. **`page.series`**: the unit and name of your time series. Keep `tile_deg` at 5 for China.

All rules for each field are in `DATA_FORMAT.md`. Wording rules (plain words, "calibrate", "validation", the fixed
Chinese terms) are in `STYLE.md`.

## Step 4. Turn your results into the page's data

Most InSAR pipelines can write two plain tables. Write them as UTF-8 CSV files with a header row (from Excel:
Save as > "CSV UTF-8"):

`dams.csv`: one row per dam. `id`, `lat`, `lon`, `name_en`, `name_zh`, then one column per value id in
`page.values` and one per field id in `page.fields`. Other columns are ignored.

```
id,lat,lon,name_en,name_zh,rate,total,type,height_m,year_built
CN00001,30.8231,111.0034,Dam A,甲坝,-1.8,-14.2,1,181,2006
CN00002,25.1102,101.4410,,乙坝,,,0,42,
```

`series.csv`: one row per dam and image date. `dam_id`, `date`, `d` (displacement in your series unit), and `e`
(the ± error) if you have it.

```
dam_id,date,d,e
CN00001,2017-01-03,0.0,1.2
CN00001,2017-01-15,-0.4,1.1
```

Then remove the example data once, and convert:

```
rm -rf app/public/data
python3 tools/csv_to_data.py --manifest my_manifest.json --dams dams.csv --series series.csv --out app/public/data
```

Things to know:

- **Missing values:** leave the cell empty. Empty, `NaN` and `NA` become `null` ("no value yet"). If your pipeline
  writes `-9999` for missing, add `--missing -9999` (this also catches `-9999.0`). Never let a missing value become 0: the map would show it as real.
- **Ids:** every dam needs its own id, and the same dam must keep its id in every update.
- **Categories** (like dam type) are class numbers 0, 1, 2, ... in the order of `classes` (`1.0` is read as 1).
- **Write order:** the converter writes series first, then `dams.json`, then `manifest.json`, so a reader never sees
  half an update. It also removes series files of squares that have no dam any more.
- **Your own converter:** if you prefer to write the JSON directly from your pipeline, follow `DATA_FORMAT.md` and use
  `tools/make_example_data.py` as a model. Keep the same write order, and never write `NaN` (use `allow_nan=False`).

## Step 5. Check your data

```
python3 tools/check_data.py app/public/data
```

It lists every problem and ends with "ready to publish" (0 errors) or "NOT ready to publish". Common first errors:

| Message | Fix |
| --- | --- |
| `runs/<run_id>/live.json: missing` | normal before step 8: no status yet. Check again once the status writer runs |
| `"example": true - this is example data` | the flag is still in your manifest |
| `"zh" text missing` (or `"en"`) | a text has only one language |
| `NaN is not allowed in JSON` | a file was written without `allow_nan=False` |
| `must be a list as long as "id"` | a column in `dams.json` is shorter or longer than `id` |
| `written ... s ago` (warning) | the status writer is not running, or stopped |

## Step 6. See your own data

```
cd app && npm run dev
```

Open http://127.0.0.1:8870/ again. Check:

- the dots are where your dams are; if the map starts in the wrong place, change `map.setView([33, 105], 4)` in
  `app/src/MapView.tsx` (latitude, longitude, zoom);
- click a few dams: names, details, time series and units look right;
- switch to 中文 and read every text once more;
- make the window narrow (about 390 px, like a phone): everything is still usable.

What you may change in the page code and what must stay is in `STYLE.md` (keep the header, colours and the status rule).

## Step 7. Build the page

```
cd app && npm run build
```

This writes `app/dist/` (`index.html` and `assets/`). You build again only when the page code changes, not when the
data change.

## Step 8. Start the status writer

The status writer tells readers and the Global Runs card whether your run is really working.

**Where it runs:** on the computer where your run's process lives. Put the kit there once
(clone it as your own user, since the repository is private, then move it:
`git clone https://github.com/lzwei196/geoforge-global-run-kit.git && sudo mv geoforge-global-run-kit /opt/`) and copy
your `my_manifest.json` into that folder. On a cluster, a batch job's process is on a compute node and cannot be seen
from the login node: run the writer inside the job, next to the run.

It needs two things from your run:

- **a PID file**: a file holding the process id of your run. If your run does not write one, start it like this:
  `nohup python3 run_dams.py > run.log 2>&1 & echo $! > run.pid`
- **an activity file**: a log file your run writes to while it works (here `run.log`). Use a file, not a big folder.

Try it in a terminal first (it keeps writing every 60 s until you press Ctrl+C; look at the file from a second terminal):

```
python3 tools/status_writer.py --data app/public/data --run-id china_2026_10 \
    --pid-file /path/to/run.pid --activity /path/to/run.log \
    --step-en "time series" --step-zh "时间序列"
```

Look at `app/public/data/runs/china_2026_10/live.json`: `status` is `running` only while your run's process exists.

**Progress:** to show "340 / 1,200 dams", change the `progress()` function in `tools/status_writer.py` to count what
your run has finished, for example result files:

```python
def progress():
    done = len(list(Path("/path/to/results").glob("*.h5")))
    return {"done": done, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}
```

**Keep it running after a reboot** with systemd. Use one user for the status writer and the export (step "While the
run goes on"), and let that user write to the data folder. Save as `/etc/systemd/system/dam-status.service` (change the paths and user):

```ini
[Unit]
Description=Status writer for the dam InSAR run
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/status_writer.py --data /var/www/dams/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --step-en "time series" --step-zh "时间序列"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now dam-status
```

**When the run ends or pauses,** say so yourself; a dead process alone only means "stopped":

```
python3 tools/status_writer.py ... --status finished                       # writes once, then exits
python3 tools/status_writer.py ... --status paused --note-en "Waiting for new images" --note-zh "等待新影像"
```

Before `finished`, switch the service off for good, or it starts again after the next reboot and writes "stopped"
over "finished": `sudo systemctl disable --now dam-status`. Before `paused`, add `--status paused` and the note to
the service's `ExecStart` line, then run `sudo systemctl daemon-reload && sudo systemctl restart dam-status` (a plain
`stop` lasts only until the next reboot), so the two writers do
not take turns.

**If your web server is another computer,** let the writer write to a local folder (`--data /data/feed`) and push the
status files from the run's computer every minute (cron). The run's computer only sends; nothing connects to it:

```
* * * * *  rsync -a --delay-updates /data/feed/runs/ webuser@your.domain:/var/www/dams/data/runs/
```

The map data (`manifest.json`, `dams.json`, `series/`) must reach the web server too. The simplest way: copy your two
CSV files and `my_manifest.json` to the web server and run the export there (section "While the run goes on"). If you
export on the run's computer instead (`--out /data/feed`), push in this order, never as one copy of the whole folder,
so the manifest arrives last:

```
rsync -a --delay-updates --delete /data/feed/series/ webuser@your.domain:/var/www/dams/data/series/ \
  && rsync -a /data/feed/dams.json webuser@your.domain:/var/www/dams/data/ \
  && rsync -a /data/feed/manifest.json webuser@your.domain:/var/www/dams/data/
```

## Step 9. Put it on your web server

```
/var/www/dams/          <- the contents of app/dist/
/var/www/dams/data/     <- where csv_to_data.py and status_writer.py write (use --out / --data /var/www/dams/data)
```

Copy the page with `rsync -a app/dist/ server:/var/www/dams/` and never add `--delete` there: it would delete `data/`.

Set up nginx as in `HOSTING.md`: no caching for `index.html` and `data/`, long caching for `assets/`, and this line
on `data/` so the GeoForge card can read your files:

```
add_header Access-Control-Allow-Origin "https://geoforgehhu.com" always;
```

On a mainland China server, a public site on a domain needs an ICP filing (ICP备案). Ask your university's network
centre; many have a filed domain you can use a sub-path of.

## Step 10. Check it from outside

From any other computer:

```
curl -sI -H "Origin: https://geoforgehhu.com" https://your.domain/dams/data/manifest.json
python3 tools/check_data.py /var/www/dams/data          # on the server
```

The first must show `200`, `Access-Control-Allow-Origin: https://geoforgehhu.com` and `Cache-Control: no-store`. The
second must say "ready to publish". Then open your page on a phone. Finally, go through `CHECKLIST.md` and tick every box.

## Step 11. Join Global Runs

Send GeoForge (by an issue in this repository, or as agreed):

1. your page address and `project_id`;
2. one picture for the card: JPG, 1200 × 800 px, under 300 KB, no text on it (a map screenshot works well);
3. the card text in English and Chinese: a title (up to 80 characters), two sentences, and up to 6 tags;
4. a contact for status questions (we will not publish it).

What happens then:

1. We read your files for a day to see that the status stays fresh and honest.
2. We show you the card in both languages and agree the wording.
3. We add the card and tell you it is live. It shows the first 3 `facts` and your runs' status, read from your
   server; the picture, title, text, tags and button address stay as agreed (send us changes).

When every run is `finished`, your card moves to the "Finished" section by itself. To take it down, set every run to
`finished` or `stopped` and tell us; it is removed the same day.

## While the run goes on

New results: run step 4 again with `--out /var/www/dams/data`, for example after each batch or every hour from cron:

```
0 * * * *  cd /opt/geoforge-global-run-kit && flock -n /tmp/dams-export.lock python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /var/www/dams/data >> /var/log/dams-export.log 2>&1
```

`flock` skips a round while the last export is still going. Let your pipeline finish writing each CSV before the
export reads it (write to a temporary name, then rename). Open pages pick new data up within 2 minutes (they look for a new `updated_at`). The status writer keeps going on its own.

A new run (for example the global one): add it at the top of `runs` in `my_manifest.json`, export again, and start a
second status writer with the new `--run-id`.

## Going from China to the world

No code change is needed. Add the dams to `dams.csv` and `series.csv`. Check:

- one series file stays under about 20 MB; if a 5° square gets too big, set `tile_deg` to 2 or 1;
- the map's start view (step 6) suits your readers;
- up to about 60,000 dams is fine; tell us before you go beyond that.

## Getting fixes from GeoForge

We push fixes to this repository. To use them:

```
git pull
cat CHANGELOG.md                     # what changed
cd app && npm ci && npm run build    # then copy app/dist/ to the server again (no --delete, step 9)
```

Your data folder and `my_manifest.json` are not touched by a pull. If you changed page code, git tells you about any
clash.

## When something is wrong

| You see | Likely reason | Fix |
| --- | --- | --- |
| "Status unknown (feed paused)" | `live.json` older than 3 minutes | the status writer stopped: `systemctl status dam-status`; check the server clock (NTP) |
| "Stopped" while the run works | the PID in the PID file is not the run's process | write the PID of the real run process (not a wrapper that exits) |
| "Running" after the run ended | an old PID file whose number is now used by another process | remove the PID file when the run ends; set `--status finished` |
| The page is blank | `index.html` opened without the slash, or old cached files | open `https://your.domain/dams/`; check the `no-cache` line |
| The card on Global Runs shows no status | the browser cannot read your files from geoforgehhu.com | the `Access-Control-Allow-Origin` line, HTTPS certificate |
| New data do not appear | `updated_at` did not change | write through `csv_to_data.py`, or write `manifest.json` last with a new `updated_at` |
| A dam shows 0 where you expected nothing | a missing value written as 0 | write empty / `null`; use `--missing` for your marker |

Other questions: open an issue in this repository.
