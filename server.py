"""Read-only site for Chanchan Lab. Never serves secrets, inbox or source data."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json
import os
from validate_snapshot import validate
from datetime import datetime, timezone

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
        if path in ("/", "/index.html", "/catalog.html", "/catalog.js", "/official-data.js", "/official-lineups.html", "/official-lineups.js", "/item-analyzer.html", "/item-analyzer.js", "/import-stats.html", "/import-stats.js", "/match-journal.html", "/match-journal.js", "/match-data.js"):
            self.path = "/index.html" if path == "/" else path
            return super().do_GET()
        return self.send_error(404, "Not found")

    def do_HEAD(self):
        path = urlsplit(self.path).path
        if path.startswith("/api/"):
            return self.do_GET()
        if path not in ("/", "/index.html", "/catalog.html", "/catalog.js", "/official-data.js", "/official-lineups.html", "/official-lineups.js", "/item-analyzer.html", "/item-analyzer.js", "/import-stats.html", "/import-stats.js", "/match-journal.html", "/match-journal.js", "/match-data.js"):
            return self.send_error(404, "Not found")
        self.path = "/index.html" if path == "/" else path
        return super().do_HEAD()

    def snapshot(self):
        try:
            data = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
            if isinstance(data,dict) and isinstance(data.get("metadata"),dict):
                if data["metadata"].get("status")=="empty" and data.get("comps")==[] and data.get("items")==[]:
                    return data
                if not validate(data):
                    return data
            return {"metadata":{"status":"invalid"},"comps":[],"items":[]}
        except (OSError, ValueError):
            return {"metadata":{"status":"unavailable"},"comps":[],"items":[]}

    def status(self):
        data = self.snapshot()
        metadata=data.get("metadata",{})
        generated=metadata.get("generated_at")
        age=None
        if generated:
            try: age=max(0,(datetime.now(timezone.utc)-datetime.fromisoformat(generated.replace("Z","+00:00"))).total_seconds())
            except (ValueError,TypeError): pass
        return {"status":metadata.get("status","unknown"),"generated_at":generated,"stale":age is not None and age>172800,"counts":{"comps":len(data["comps"]),"items":len(data["items"])}}

    def send_json(self, value):
        payload = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

if __name__ == "__main__":
    port=int(os.getenv("PORT","8765"))
    ThreadingHTTPServer(("0.0.0.0",port),Handler).serve_forever()
