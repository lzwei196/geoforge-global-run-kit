# Hosting: getting your page to a public address

Your page is plain files: the built page (`index.html`, `assets/`) and the `data/` folder your tools keep writing.
On the computer where your run is, keep them together in one site folder:

```
/opt/geoforge-site/index.html, assets/    <- the contents of app/dist/ (after npm run build)
/opt/geoforge-site/data/                  <- written by csv_to_data.py and status_writer.py
```

Then choose one of three ways to make it public. The tutorial (`TUTORIAL.md`, steps 8–12) follows way 1.

| Way | You need | Good when |
| --- | --- | --- |
| 1. An address from GeoForge (recommended) | outgoing connections to Cloudflare on port 7844 | you want the least work: no domain, no open port, no certificate |
| 2. Your own Cloudflare tunnel | a domain in your own Cloudflare account | you want your own address, e.g. `dams.your-lab.org` |
| 3. Your own public web server | a server with a public address, a domain, HTTPS (and ICP filing in mainland China) | you already run a website |

Ways 1 and 2 work the same on your side: `tools/serve.py` serves the site folder on `127.0.0.1` only, and
`cloudflared` (the Cloudflare tunnel program) connects out to Cloudflare and carries the page to the public address.
Nothing connects in to your computer, so no incoming port is opened. The computer only needs outgoing connections to
Cloudflare on port 7844 (TCP and UDP); `TUTORIAL.md`, step 11 shows the check.

## Way 1: an address from GeoForge

`TUTORIAL.md`, step 11 has every command. In short:

1. You agree your `project_id` with GeoForge.
2. GeoForge makes a tunnel in its Cloudflare account. Its address `https://<name>.geoforgehhu.com` points to
   `http://127.0.0.1:8871` on your computer. We send you the tunnel key privately.
3. You install `cloudflared` 2025.4 or newer, save the key in a file only root can read
   (`/etc/cloudflared/geoforge.token`), and start the `geoforge-tunnel` service, which runs
   `cloudflared tunnel run --token-file ...`.
4. `tools/serve.py` runs as the `geoforge-site` service on port 8871 (`TUTORIAL.md`, step 9).

About the key: it lets a program put a page on your address and nothing else. Keep it in that root-only file, never on
a command line (other users of the computer could see it there), in code, chat or a repository. If it leaks, tell
GeoForge; we make a new one and the old one stops working. We can also switch the address off if something goes wrong.

## Way 2: your own Cloudflare tunnel

The same as way 1, but in your own Cloudflare account (your domain must use Cloudflare):

1. Cloudflare dashboard → Networking → Tunnels → Create a tunnel. Give it a name.
2. It shows an install command. Do not run it as shown: copy only the key (the long text after `service install`).
3. On the tunnel's Routes tab: Add route → Published application. Enter your address, e.g. `dams.your-lab.org`, and
   the service URL `http://127.0.0.1:8871`.
4. On the computer where your run is, do `TUTORIAL.md`, step 11, points 2–6, with your own key. Send GeoForge your address.

## Way 3: your own public web server (nginx)

Copy the site folder to your web server and serve it with nginx. `serve.py` is not needed here; nginx sends the
headers:

```nginx
server {
    listen 443 ssl;
    server_name your.domain;
    # ssl_certificate ... ; ssl_certificate_key ... ;     a valid certificate is required

    location /dams/ {
        alias /var/www/dams/;
        index index.html;
        add_header Cache-Control "no-cache" always;   # index.html: always ask for the newest (it names the asset files)
    }
    location /dams/assets/ {                    # file names change on every build: cache them long
        alias /var/www/dams/assets/;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location ~ \.tmp$ { return 404; }           # half-written files: never served
    location /dams/data/ {                      # changes all the time: never cache
        alias /var/www/dams/data/;
        default_type application/json;
        add_header Cache-Control "no-store" always;
        # the GeoForge Global Runs page reads manifest.json and runs/*/live.json from here
        add_header Access-Control-Allow-Origin "https://geoforgehhu.com" always;
        gzip on; gzip_types application/json;
    }
}
```

- The page works from any folder (here `https://your.domain/dams/`). Open it with the slash at the end.
- An `add_header` inside a `location` switches off every `add_header` set at the `server` level (e.g. HSTS). Repeat
  those lines inside each location if you use them.
- Apache or another server works the same way: no caching and the `Access-Control-Allow-Origin` line on `data/`,
  long caching on `assets/`.
- A public website on a domain from a mainland China server needs an ICP filing (ICP备案). Ask your university's
  network centre; many have a filed domain you can use a sub-path of.
- If the web server is not the computer where your run is, see the next section.

## The headers, whatever the way

| Path | Header | Why |
| --- | --- | --- |
| `data/` | `Cache-Control: no-store` | the data change all the time; readers must get the newest |
| `data/` | `Access-Control-Allow-Origin: https://geoforgehhu.com` | your card on Global Runs reads your files from geoforgehhu.com; without this line the browser refuses |
| `assets/` | `Cache-Control: public, max-age=31536000, immutable` | the file names change on every build |
| the rest | `Cache-Control: no-cache` | `index.html` names the newest asset files |

`serve.py` sends all of them. Check from any computer:

```
curl -sI -H "Origin: https://geoforgehhu.com" https://<your address>/data/manifest.json
```

It must show `200`, `Access-Control-Allow-Origin: https://geoforgehhu.com` and `Cache-Control: no-store`.

## When the run is on another computer

`status_writer.py` must run on the same computer as the run's process, because it checks the process by its id. On a
cluster, a batch job's process is on a compute node and cannot be seen from the login node: start the writer inside
the job, next to the run.

- **Shared disk:** if the run's computer and the computer with `serve.py` see the same disk, let both tools write
  straight into the site folder on that disk.
- **No shared disk:** let the tools write to a local folder (`--data /data/feed`, `--out /data/feed`) and push it from
  the run's computer every minute (cron). The run's computer only sends; nothing connects to it. Push in this order,
  never as one copy of the whole folder, so the manifest always arrives last:

  ```
  * * * * *  rsync -a --delay-updates /data/feed/runs/ web:/opt/geoforge-site/data/runs/
  0 * * * *  rsync -a --delay-updates --delete /data/feed/series/ web:/opt/geoforge-site/data/series/ && rsync -a /data/feed/dams.json web:/opt/geoforge-site/data/ && rsync -a /data/feed/manifest.json web:/opt/geoforge-site/data/
  ```

  Or copy your two CSV files and `my_manifest.json` to the web computer and run `csv_to_data.py` there.

## Things to know

- **Cloudflare from mainland China:** the tunnel connects out to Cloudflare. If your network blocks or slows it,
  tell GeoForge; way 3 is the fallback.
- **Basemap:** the map tiles come from Esri (`server.arcgisonline.com`). If they load slowly for your readers,
  change the two `L.tileLayer` lines in `app/src/MapView.tsx` (e.g. to Tianditu, which needs a free key). Keep a dark map.
- **Updates to the page code** (not the data) need `npm run build` and a copy of `dist/` again; the data keep flowing
  meanwhile. Copy with `rsync -a app/dist/ <site folder>/` and never add `--delete`: it would delete `data/`.
- **Getting fixes from GeoForge:** we push fixes to this repository. `git pull`, check `CHANGELOG.md`, rebuild.
- **`npm audit`** may list warnings for the dev server (vite/esbuild). They do not affect the built page, and the dev
  server only listens on 127.0.0.1.
