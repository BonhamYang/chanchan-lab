"""Read-only site for Chanchan Lab. Never serves secrets, inbox or source data."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json
import os

ROOT = Path(__file__).resolve().parent
SNAPSHOT = ROOT / "data" / "snapshot.json"
CATALOG = ROOT / "data" / "catalog"

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/api/status":
            return self.send_json(self.status())
        if path == "/api/snapshot":
            return self.send_json(self.snapshot())
        if path.startswith("/api/catalog/"):
            season = path.removeprefix("/api/catalog/")
            if season not in ("nature", "ink"):
                return self.send_error(404, "Unknown season")
            try:
                return self.send_json(json.loads((CATALOG / (season+".json")).read_text(encoding="utf-8")))
            except (OSError, ValueError):
                return self.send_json({"season":season,"metadata":{"status":"unavailable"},"champions":[],"items":[]})
        if path in ("/", "/index.html", "/catalog.html", "/catalog.js"):
            self.path = "/index.html" if path == "/" else path
            return super().do_GET()
        return self.send_error(404, "Not found")

    def snapshot(self):
        try:
            data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
            return data if isinstance(data.get("comps"), list) and isinstance(data.get("items"), list) else {"metadata":{"status":"invalid"},"comps":[],"items":[]}
        except (OSError, ValueError):
            return {"metadata":{"status":"unavailable"},"comps":[],"items":[]}

    def status(self):
        data = self.snapshot()
        return {"status":data.get("metadata",{}).get("status","unknown"),"counts":{"comps":len(data["comps"]),"items":len(data["items"])}}

    def send_json(self, value):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

if __name__ == "__main__":
    port=int(os.getenv("PORT","8765"))
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
