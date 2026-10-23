#!/usr/bin/env python3
"""Serve your page and its data folder on this computer, with the right headers (docs/HOSTING.md).

    python3 tools/serve.py --site /opt/geoforge-site            # then open http://127.0.0.1:8871/

The site folder holds the built page and the data:
    /opt/geoforge-site/index.html, assets/     <- the contents of app/dist/
    /opt/geoforge-site/data/                   <- written by csv_to_data.py and status_writer.py

It listens on 127.0.0.1 only: nothing outside this computer can reach it. The Cloudflare tunnel (cloudflared) runs on
the same computer and carries it to your public address. Headers it sends:
    data/      no caching, and Access-Control-Allow-Origin for the GeoForge Global Runs page
    assets/    cached for a year (the file names change on every build)
    the rest   no-cache (index.html always asks for the newest version)
Folder listings and half-written *.tmp files are never served. Only the Python standard library is used.
"""
import argparse
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    origin = "https://geoforgehhu.com"
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".json": "application/json; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                      ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8"}

    def _rel(self):
        """The asked-for file relative to the site folder, cleaned the same way the file is looked up
        (so tricks like /data/x.tmp/. or //data/ are judged on the real file)."""
        rel = os.path.relpath(self.translate_path(self.path), self.directory).replace(os.sep, "/")
        return "" if rel == "." else rel

    def send_response(self, code, message=None):
        self._code = code
        super().send_response(code, message)

    def send_head(self):
        if self._rel().endswith(".tmp"):
            self.send_error(404); return None
        return super().send_head()

    def list_directory(self, path):            # never show what is in a folder
        self.send_error(404); return None

    def end_headers(self):
        p = self._rel()
        if p == "data" or p.startswith("data/"):
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", self.origin)
        elif p.startswith("assets/") and getattr(self, "_code", 0) == 200:   # never cache a missing file for a year
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):         # one short line per request, without the visitor's address
        sys.stderr.write(f"{self.log_date_time_string()} {fmt % args}\n")


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--site", required=True, help="folder with index.html, assets/ and data/")
    a.add_argument("--port", type=int, default=8871)
    a.add_argument("--origin", default="https://geoforgehhu.com", help="the page allowed to read data/ (leave as is)")
    args = a.parse_args()
    site = Path(args.site).resolve()
    if not (site / "index.html").is_file():
        sys.exit(f"{site}: no index.html. Copy the contents of app/dist/ (after npm run build) into it")
    if not (site / "data").is_dir():
        print(f"note: {site}/data does not exist yet; the page shows an error until your data are written", file=sys.stderr)
    Handler.origin = args.origin
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=str(site)))
    print(f"serving {site} at http://127.0.0.1:{args.port}/ (this computer only; Ctrl+C stops it)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
