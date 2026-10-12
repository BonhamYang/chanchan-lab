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
from datetime import datetime, timezone
from tempfile import NamedTemporaryFile

MAX_BYTES = 5_000_000
URL = os.getenv("AUTHORIZED_SNAPSHOT_URL", "").strip()
EXPECTED_HOST = os.getenv("AUTHORIZED_DATA_HOST", "").strip().lower()
OUTPUT = Path(__file__).resolve().parent / "data/snapshot.json"
EXPECTED_PROVIDER = os.getenv("AUTHORIZED_DATA_PROVIDER", "").strip()
EXPECTED_LICENSE = os.getenv("AUTHORIZED_LICENSE_REFERENCE", "").strip()

def check_update(data, previous=None):
    errors=validate(data)
    if errors: raise ValueError("; ".join(errors))
    metadata=data["metadata"]
    if metadata.get("game") != "jcc-cn": raise ValueError("Provider must explicitly identify jcc-cn; TFT is not accepted")
    if metadata["provider"] != EXPECTED_PROVIDER or metadata["license_reference"] != EXPECTED_LICENSE:
        raise ValueError("Provider or license differs from approved configuration")
    timestamp=datetime.fromisoformat(metadata["generated_at"].replace("Z","+00:00"))
    if (datetime.now(timezone.utc)-timestamp).total_seconds()>172800:
        raise ValueError("Provider snapshot is older than 48 hours")
    if not data["comps"] and not data["items"]: raise ValueError("Refusing empty update")
    if isinstance(previous,dict) and isinstance(previous.get("metadata"),dict) and previous["metadata"].get("generated_at"):
        old=datetime.fromisoformat(previous["metadata"]["generated_at"].replace("Z","+00:00"))
        if timestamp<old: raise ValueError("Refusing timestamp rollback")

def main():
    if not URL or not EXPECTED_HOST:
        print("SKIP: No approved data provider configured. Existing snapshot unchanged.")
        return 0
    if not EXPECTED_PROVIDER or not EXPECTED_LICENSE:
        print("REJECTED: approved provider and license must be configured", file=sys.stderr)
        return 1
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
        previous=None
        if OUTPUT.exists(): previous=json.loads(OUTPUT.read_text(encoding="utf-8"))
        check_update(data,previous)
        # A validated JSON schema does not prove legal entitlement; provider is pre-approved manually.
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        with NamedTemporaryFile(mode="w",encoding="utf-8",dir=OUTPUT.parent,delete=False) as pending:
            temporary=Path(pending.name)
            json.dump(data,pending,ensure_ascii=False,indent=2)
            pending.write("\n")
        try: temporary.replace(OUTPUT)
        finally: temporary.unlink(missing_ok=True)
        print("PASS: downloaded and validated authorized snapshot")
        return 0
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print("REJECTED: "+str(exc), file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
