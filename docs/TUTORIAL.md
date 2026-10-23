# Tutorial: from your run to a live page on GeoForge Global Runs

This walks you through every step, from an empty computer to your live page with a card on
[geoforgehhu.com/global-runs.html](https://geoforgehhu.com/global-runs.html). It uses a dam-displacement run from
InSAR as the example; any project with points and a time series works the same way. 中文版：[TUTORIAL.zh.md](TUTORIAL.zh.md).

## The idea in one picture

```
the computer where your run is
  your run ──(results)──> csv_to_data.py ───> site/data/      map data          (step 8, then every hour)
  your run ──(PID, log)─> status_writer.py ─> site/data/runs/  "running now?"    (step 10, every 60 s)
  serve.py      serves site/ (the page + data/) on 127.0.0.1 only               (step 9)
  cloudflared   carries it out through the tunnel                               (step 11)
                                │
                                ▼
            https://<name>.geoforgehhu.com             your page, open to everyone
                                ▲
                                │ reads data/manifest.json and data/runs/*/live.json
            geoforgehhu.com/global-runs.html           your card (step 13)
```

- Your run is never touched: the tools only read its files.
- Nothing outside can reach the computer where your run is. The tunnel connects out to Cloudflare, and Cloudflare
  shows your page at the public address. No public IP, open port, domain or certificate is needed.
- GeoForge makes the address and sends you the tunnel key. Other ways (your own domain, your own web server) are in
  `HOSTING.md`.

Two parts:

| Part | Where | Steps | Time |
| --- | --- | --- | --- |
| A. Make the page | your own computer (a laptop is fine) | 1–7 | about half a day |
| B. Put it online | the computer where your run is | 8–13 | about an hour |

## Before you start

| You need | Where | Check |
| --- | --- | --- |
| Python 3.8 or newer (only the standard library) | both computers | `python3 --version` |
| Node.js 18 or newer (only to build the page) | your own computer | `node --version` |
| git | both computers | `git --version` |
| Outgoing connections to Cloudflare on port 7844 | the computer where your run is | step 11 shows the check |
| sudo rights, systemd | the computer where your run is | to start the three small services |

# Part A. Make the page (your own computer)

## Step 1. Get the kit

You have been invited to the private repository. Accept the invitation on GitHub, then:

```
git clone https://github.com/lzwei196/geoforge-global-run-kit.git
cd geoforge-global-run-kit
```

## Step 2. Try the example

```
python3 tools/make_example_data.py
(cd app && npm ci && npm run dev)
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
4. **`map_url`**: the address your page will have, e.g. `https://cn-dams.geoforgehhu.com/` (step 11).
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
| `runs/<run_id>/live.json: missing` | normal before step 10: no status yet. Check again once the status writer runs |
| `"example": true - this is example data` | the flag is still in your manifest |
| `"zh" text missing` (or `"en"`) | a text has only one language |
| `NaN is not allowed in JSON` | a file was written without `allow_nan=False` |
| `must be a list as long as "id"` | a column in `dams.json` is shorter or longer than `id` |
| `written ... s ago` (warning) | the status writer is not running, or stopped |

## Step 6. See your own data

```
(cd app && npm run dev)
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
(cd app && npm run build)
```

This writes `app/dist/` (`index.html` and `assets/`). You build again only when the page code changes, not when the
data change.

# Part B. Put it online (the computer where your run is)

In the examples below, the user that runs everything is `insar`, the run's folder is `/data/run`, its results are in
`/data/out`, and the run is `china_2026_10`. Change these to yours. If your run is on a cluster or the page should be
served from another computer, read "When the run is on another computer" in `HOSTING.md` first.

## Step 8. Set up the site folder

Make the two folders, the kit and the site (the page plus its data), and put the kit there:

```
sudo mkdir -p /opt/geoforge-global-run-kit /opt/geoforge-site
sudo chown insar /opt/geoforge-global-run-kit /opt/geoforge-site
git clone https://github.com/lzwei196/geoforge-global-run-kit.git /opt/geoforge-global-run-kit
```

The clone needs your GitHub login on this computer (a token or SSH key), because the repository is private. Without
one, copy the kit from your own computer instead:
`rsync -a --exclude node_modules ./ insar@run-computer:/opt/geoforge-global-run-kit/`.

Copy from your own computer: the built page into the site folder, and your manifest into the kit.

```
rsync -a app/dist/ insar@run-computer:/opt/geoforge-site/
scp my_manifest.json insar@run-computer:/opt/geoforge-global-run-kit/
```

Your pipeline writes `dams.csv` and `series.csv` (step 4) on this computer, here in `/data/out/`. Write the data
once and check it:

```
cd /opt/geoforge-global-run-kit
python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /opt/geoforge-site/data
python3 tools/check_data.py /opt/geoforge-site/data
```

Only the `live.json: missing` error is expected now; step 10 fixes it.

## Step 9. Start the page server

`tools/serve.py` serves the site folder with the right headers, on this computer only (`127.0.0.1`, port 8871).
Try it:

```
python3 tools/serve.py --site /opt/geoforge-site
curl -sI http://127.0.0.1:8871/data/manifest.json        # in a second terminal: must say 200
```

Stop it with Ctrl+C and make it a service, so it runs after every reboot. Save as
`/etc/systemd/system/geoforge-site.service`:

```ini
[Unit]
Description=GeoForge page server
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/serve.py --site /opt/geoforge-site
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-site
```

## Step 10. Start the status writer

The status writer tells readers and the Global Runs card whether your run is really working. It must run on the same
computer as your run's process, because it checks the process by its id. It needs two things from your run:

- **a PID file**: a file holding the process id of your run. If your run does not write one, start it like this:
  `nohup python3 run_dams.py > run.log 2>&1 & echo $! > run.pid`
- **an activity file**: a log file your run writes to while it works (here `run.log`). Use a file, not a big folder.

Try it (it keeps writing every 60 s until you press Ctrl+C):

```
python3 tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 \
    --pid-file /data/run/run.pid --activity /data/run/run.log \
    --step-en "time series" --step-zh "时间序列"
```

In a second terminal, look at `/opt/geoforge-site/data/runs/china_2026_10/live.json`: `status` is `running` only while
your run's process exists.

**Progress:** to show "340 / 1,200 dams", change the `progress()` function in `tools/status_writer.py` to count what
your run has finished, for example result files:

```python
def progress():
    done = len(list(Path("/data/out/results").glob("*.h5")))
    return {"done": done, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}
```

Make it a service. Save as `/etc/systemd/system/geoforge-status.service`:

```ini
[Unit]
Description=GeoForge status writer
After=network.target

[Service]
User=insar
ExecStart=/usr/bin/python3 /opt/geoforge-global-run-kit/tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --step-en "time series" --step-zh "时间序列"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```
sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-status
```

**When the run ends or pauses,** say so yourself; a dead process alone only means "stopped":

- **Finished:** switch the service off for good (otherwise it starts again after a reboot and writes "stopped" over
  "finished"), then write `finished` once:

  ```
  sudo systemctl disable --now geoforge-status
  python3 tools/status_writer.py --data /opt/geoforge-site/data --run-id china_2026_10 --pid-file /data/run/run.pid --activity /data/run/run.log --status finished
  ```

- **Paused:** add `--status paused --note-en "Waiting for new images" --note-zh "等待新影像"` to the service's
  `ExecStart` line, then run `sudo systemctl daemon-reload && sudo systemctl restart geoforge-status`. Take it out
  again (and reload, restart) when the run goes on.

## Step 11. Get your public address

1. Write to GeoForge (an issue in this repository, or as agreed) with your `project_id` and ask for an address. We
   make one like `https://cn-dams.geoforgehhu.com` and send you the tunnel key privately.
2. Check that this computer can reach Cloudflare's tunnel port (outgoing TCP and UDP 7844; nothing comes in):

   ```
   nc -vz region1.v2.argotunnel.com 7844        # must say "succeeded" or "open"
   ```

   (If `nc` is missing: `sudo apt install netcat-openbsd`.)

   If it fails, ask your network administrator to allow outgoing connections to Cloudflare on port 7844.
3. Install `cloudflared` 2025.4 or newer. GitHub downloads can be slow from mainland China, so download it on your
   own computer and copy it over (ARM computers: `cloudflared-linux-arm64.deb`; other systems: the
   [downloads page](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/)):

   ```
   curl -L -o cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   scp cloudflared.deb insar@run-computer:
   ```

   Then on the run's computer: `sudo dpkg -i cloudflared.deb && cloudflared --version`.
4. Save the key in a file only root can read. Never put it on a command line, where other users of the computer could
   see it:

   ```
   sudo mkdir -p /etc/cloudflared
   sudo sh -c 'umask 077; read -r k; printf %s "$k" > /etc/cloudflared/geoforge.token'    # paste the key, press Enter
   ```

5. Make the tunnel a service. Save as `/etc/systemd/system/geoforge-tunnel.service`:

   ```ini
   [Unit]
   Description=GeoForge tunnel
   After=network-online.target
   Wants=network-online.target

   [Service]
   ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token-file /etc/cloudflared/geoforge.token
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=multi-user.target
   ```

   ```
   sudo systemctl daemon-reload && sudo systemctl enable --now geoforge-tunnel
   systemctl status geoforge-tunnel        # "active (running)"; the log shows "Registered tunnel connection"
   ```

6. Open your address in a browser: your page appears.

Keep the key secret: not in code, chat or a repository. If it leaks, tell us; we make a new one and the old one stops
working. Your own domain or web server instead: `HOSTING.md`, ways 2 and 3. If you did not know the address in
step 3 (your manifest), put it in `map_url` of `my_manifest.json` now and run the export (step 8) again.

## Step 12. Check from outside

From any other computer:

```
curl -sI -H "Origin: https://geoforgehhu.com" https://cn-dams.geoforgehhu.com/data/manifest.json
```

It must show `200`, `Access-Control-Allow-Origin: https://geoforgehhu.com` and `Cache-Control: no-store`. On the run's
computer, `python3 tools/check_data.py /opt/geoforge-site/data` must now say "ready to publish". Open your page on a
phone. Then go through `CHECKLIST.md` and tick every box.

## Step 13. Join Global Runs

Send GeoForge:

1. your page address and `project_id`;
2. one picture for the card: JPG, 1200 × 800 px, under 300 KB, no text on it (a map screenshot works well);
3. the card text in English and Chinese: a title (up to 80 characters), two sentences, and up to 6 tags;
4. a contact for status questions (we will not publish it).

What happens then:

1. We read your files for a day to see that the status stays fresh and honest.
2. We show you the card in both languages and agree the wording.
3. We add the card and tell you it is live. It shows the first 3 `facts` and your runs' status, read from your
   address; the picture, title, text, tags and button address stay as agreed (send us changes).

When every run is `finished`, your card moves to the "Finished" section by itself. To take it down, set every run to
`finished` or `stopped` and tell us; it is removed the same day.

# After going live

## While the run goes on

New results: run the export again, for example every hour from cron (as the user `insar`, `crontab -e`):

```
0 * * * *  cd /opt/geoforge-global-run-kit && flock -n /tmp/geoforge-export.lock python3 tools/csv_to_data.py --manifest my_manifest.json --dams /data/out/dams.csv --series /data/out/series.csv --out /opt/geoforge-site/data >> /tmp/geoforge-export.log 2>&1
```

- `flock` skips a round while the last export is still going.
- Let your pipeline finish writing each CSV before the export reads it (write to a temporary name, then rename).
- Open pages pick new data up within 2 minutes (they look for a new `updated_at`). The status writer keeps going on
  its own.

A new run (for example the global one): add it at the top of `runs` in `my_manifest.json`, export again, and make a
second status writer service with the new `--run-id`.

## Going from China to the world

No code change is needed. Add the dams to `dams.csv` and `series.csv`. Check:

- one series file stays under about 20 MB; if a 5° square gets too big, set `tile_deg` to 2 or 1;
- the map's start view (step 6) suits your readers;
- up to about 60,000 dams is fine; tell us before you go beyond that.

## Getting fixes from GeoForge

We push fixes to this repository. On your own computer:

```
git pull
cat CHANGELOG.md                     # what changed
(cd app && npm ci && npm run build)
rsync -a app/dist/ insar@run-computer:/opt/geoforge-site/     # never add --delete: it would delete data/
```

On the run's computer, update the tools with `cd /opt/geoforge-global-run-kit && git pull`. If you changed
`progress()` in step 10, git keeps your change aside and puts it back: `git stash && git pull && git stash pop`. Then
`sudo systemctl restart geoforge-site`, and `sudo systemctl restart geoforge-status` only while the run is still going
(after `finished` it would write "stopped" again). Your data and `my_manifest.json` are not touched by a pull.

## When something is wrong

| You see | Likely reason | Fix |
| --- | --- | --- |
| Cloudflare "Error 1033" at your address | the tunnel is not connected | `systemctl status geoforge-tunnel`; the port 7844 check in step 11 |
| Cloudflare "502 Bad Gateway" | the tunnel works, but the page server does not answer | `systemctl status geoforge-site`; `curl -sI http://127.0.0.1:8871/` |
| "Status unknown (feed paused)" | `live.json` older than 3 minutes | `systemctl status geoforge-status`; check the clock is synced (NTP) |
| "Stopped" while the run works | the PID in the PID file is not the run's process | write the PID of the real run process (not a wrapper that exits) |
| "Running" after the run ended | an old PID file whose number is now used by another process | remove the PID file when the run ends; write `finished` (step 10) |
| The page says the data cannot be read | no `data/` yet, or a broken file | run the export (step 8) and `check_data.py` |
| The card on Global Runs shows no status | the browser cannot read your files from geoforgehhu.com | step 12's `curl` must show the `Access-Control-Allow-Origin` line |
| New data do not appear | `updated_at` did not change | export through `csv_to_data.py`; check `/tmp/geoforge-export.log` |
| A dam shows 0 where you expected nothing | a missing value written as 0 | write empty / `null`; use `--missing` for your marker |

Other questions: open an issue in this repository.
