"""Fetch only explicitly configured, authorized JSON snapshots.
No scraping, crawling, session cookies, or invented game statistics.
"""
import json
import os
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from validate_snapshot import validate

MAX_BYTES = 5_000_000
URL = os.getenv("AUTHORIZED_SNAPSHOT_URL", "").strip()
EXPECTED_HOST = os.getenv("AUTHORIZED_DATA_HOST", "").strip().lower()
OUTPUT = Path("data/snapshot.json")

def main():
    if not URL or not EXPECTED_HOST:
        print("SKIP: No approved data provider configured. Existing snapshot unchanged.")
        return 0
    parts = urlsplit(URL)
    if parts.scheme != "https" or parts.hostname != EXPECTED_HOST or parts.username or parts.password:
        print("REJECTED: HTTPS provider URL must match explicitly approved host", file=sys.stderr)
        return 1
    req = urllib.request.Request(URL, headers={"Accept":"application/json","User-Agent":"chanchan-lab-authorized-client/1.0"})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            raise ValueError("Redirects are disabled: verify provider URL explicitly")
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=20) as response:
            size = response.headers.get("Content-Length")
            if size and int(size) > MAX_BYTES:
                raise ValueError("Snapshot exceeds 5 MB")
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("Snapshot exceeds 5 MB")
        data = json.loads(raw.decode("utf-8"))
        errors = validate(data)
        if errors:
            raise ValueError("; ".join(errors))
        # A validated JSON schema does not prove legal entitlement; provider is pre-approved manually.
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        temporary = OUTPUT.with_suffix(".pending")
        temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(OUTPUT)
        print("PASS: downloaded and validated authorized snapshot")
        return 0
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print("REJECTED: "+str(exc), file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
