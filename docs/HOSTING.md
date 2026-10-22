# Hosting your page

Your page is static files: no server program is needed. Your pipeline keeps writing the JSON in `data/`, and every
visitor's browser reads the newest files.

## 1. Build

```
cd app
npm ci               # once (Node 18 or newer); installs the exact versions in package-lock.json
npm run build        # writes app/dist/
```

Try it first on your own computer: `python3 tools/make_example_data.py`, then `cd app && npm run dev` and open
http://127.0.0.1:8870/. With your own data: copy it into `app/public/data/` instead.

## 2. Put it on your web server

```
/var/www/dams/               <- the contents of app/dist/ (index.html, assets/)
/var/www/dams/data/          <- the folder your pipeline writes (manifest.json, dams.json, series/, runs/)
```

The page works from any folder (here `https://your.domain/dams/`). Open it with the slash at the end.

## 3. nginx

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

nginx note: an `add_header` inside a `location` switches off every `add_header` set at the `server` level (e.g. HSTS).
Repeat those lines inside each location if you use them.

Apache or another server works the same way: the three rules are no-cache plus the `Access-Control-Allow-Origin`
line on `data/`, and long caching on `assets/`.

## 4. Check

```
python3 tools/check_data.py /var/www/dams/data
curl -sI -H "Origin: https://geoforgehhu.com" https://your.domain/dams/data/manifest.json
```

The first must say "ready to publish"; the second must show `200` and `Access-Control-Allow-Origin: https://geoforgehhu.com`.

## 5. Keep the status fresh

Start `tools/status_writer.py` next to your run (systemd, supervisor, tmux or cron's `@reboot`), pointing `--data`
at `/var/www/dams/data`. It writes `runs/<run_id>/live.json` every 60 seconds.

## Things to know

- **Mainland China servers:** a public website on a domain needs an ICP filing (ICP备案). Ask your university's
  network centre; many already have a filed domain you can use a sub-path of.
- **Basemap:** the map tiles come from Esri (`server.arcgisonline.com`). If they load slowly for your readers,
  change the two `L.tileLayer` lines in `app/src/MapView.tsx` (e.g. to Tianditu, which needs a free key). Keep a dark map.
- **Updates to the page code** (not the data) need `npm run build` and a copy of `dist/` again; the data keep flowing meanwhile.
- **Getting fixes from GeoForge:** we push fixes to this repository. `git pull`, check `CHANGELOG.md`, rebuild.
- **`npm audit`** may list warnings for the dev server (vite/esbuild). They do not affect the built page, and the dev
  server only listens on 127.0.0.1.
