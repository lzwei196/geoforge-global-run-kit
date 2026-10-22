# Your card on GeoForge Global Runs

[geoforgehhu.com/global-runs.html](https://geoforgehhu.com/global-runs.html) shows one card per project, in two
sections: "Ongoing" (most active first) and "Finished". Every card has the same shape: picture with a status badge,
tags, "by <your group>", title, two sentences, three facts, the most active run (other runs fold under "+ N more
runs") and an "Open the live map" button.

What comes from where:

| On the card | Comes from |
| --- | --- |
| picture, tags, title, text, "by" line, map button address | agreed with GeoForge when we add you, kept on our page (send us changes) |
| the three facts | the first 3 `facts` of your `data/manifest.json`, read live (each cut at 40 characters) |
| runs and their status | `runs` in your `manifest.json` (at most 20) + each `data/runs/<run_id>/live.json`, read live |

So your server only has to serve those files; your run is never touched by us. Everything is shown as plain text.
When every run is `finished`, your card moves to "Finished".

## live.json fields

| Field | Needed | Meaning |
| --- | --- | --- |
| `run_id` | yes | the same id as in `manifest.json` and the folder name |
| `status` | yes | `running`, `paused`, `stopped`, `finished` or `failed` |
| `process_alive` | yes | `true` only when you checked that the run's process exists right now (e.g. by its PID) |
| `exported_at` | yes | UTC time this file was written |
| `last_activity` | yes | UTC time of the newest real sign of work: a log line, an output file, a finished step |
| `step` | no | text, ≤ 40: the step now, e.g. "unwrapping" / "解缠" |
| `progress` | no | `{"done": 340, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}` (`what` ≤ 30); leave `total` out if unknown |
| `note` | no | text, ≤ 120: one line, e.g. why the run is paused |

```json
{
  "run_id": "china_2026_10",
  "status": "running",
  "process_alive": true,
  "exported_at": "2026-10-22T03:07:15+00:00",
  "last_activity": "2026-10-22T03:06:45+00:00",
  "step": {"en": "time series", "zh": "时间序列"},
  "progress": {"done": 340, "total": 1200, "what": {"en": "dams", "zh": "座大坝"}}
}
```

## Status rules

The card and your page say "Running now" only when `status` is `running`, `process_alive` is `true` and
`exported_at` is less than 3 minutes old. Write the file every 60 seconds so one missed write does not flip it.

| `status` | Use it when | Shown as (EN / 中文) | Needs a fresh file |
| --- | --- | --- | --- |
| `running` | the process is alive and working | Running now · step · progress / 正在运行 · 步骤 · 进度 | yes |
| `paused` | stopped on purpose, will go on | Paused / 已暂停 | yes |
| `stopped` | not running, not finished | Stopped · last activity / 已停止 · 最近活动 | yes |
| `finished` | complete | Finished / 已完成 | no |
| `failed` | ended with an error, will not go on | Ended with an error / 出错结束 | no |

A file that is older than 3 minutes or more than 1 minute in the future shows "Status unknown (feed paused)" /
"状态未知（数据暂停更新）"; a missing or unreadable file shows "Status not available right now" / "暂时无法读取状态" on the card
(and "No status yet" / "暂无状态" on your page). Nothing ever guesses that a
run is still going.
Keep the server clock synced (NTP).

Point `tools/status_writer.py --activity` at a log file the run writes to, not at a big output folder (walking a
large folder every minute is slow). Remove the PID file when the run ends: a stale PID file whose number is later
reused by another process would look alive.

## What your server must send

The Global Runs page runs in the visitor's browser on `geoforgehhu.com` and reads your files from your address, so
`manifest.json` and every `live.json` need these headers (see `HOSTING.md` for the nginx lines):

```
Access-Control-Allow-Origin: https://geoforgehhu.com
Cache-Control: no-store
```

Check: `curl -sI -H "Origin: https://geoforgehhu.com" https://<your address>/data/manifest.json` must answer 200 and
show the `Access-Control-Allow-Origin` line.

## Joining

1. Agree your `project_id` with GeoForge.
2. Publish your page and data (`HOSTING.md`), pass `tools/check_data.py`, and run `tools/status_writer.py`.
3. Send GeoForge your page address and one picture for the card: JPG, 1200 × 800 px, under 300 KB, no text on it.
4. GeoForge checks your files for a day, reviews the card with you in both languages, then adds it.

To take the card down, set every run to `finished` or `stopped` and tell GeoForge; it is removed the same day.
