#!/usr/bin/env python3
"""
sat_watcher.py — Watch a Satisfactory .sav file and auto-upload to SAT backend.

Polls the .sav file for modifications (via mtime) and uploads it to the
SAT FastAPI backend whenever it changes. No external dependencies beyond
httpx (already a backend dependency).

Usage:
    python sat_watcher.py --save /path/to/save.sav
    python sat_watcher.py --save /path/to/save.sav --api http://localhost:8000
    python sat_watcher.py --save /path/to/save.sav --interval 60

Environment variables (override CLI defaults):
    SAT_API_URL   Backend URL (default: http://localhost:8000)
    SAT_SAVE_PATH Path to .sav file (alternative to --save)

Windows save path (typical):
    C:\\Users\\<you>\\AppData\\Local\\FactoryGame\\Saved\\SaveGames\\<steamid>\\*.sav

Linux / Steam Proton path (typical):
    ~/.local/share/Steam/steamapps/compatdata/526870/pfx/users/steamuser/
      AppData/Local/FactoryGame/Saved/SaveGames/<steamid>/*.sav
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

try:
    import httpx
except ImportError:
    print(
        "Missing dependency: httpx\n"
        "Install it with:  pip install httpx\n"
        "Or, from the backend directory:  pip install -e .[dev]",
        file=sys.stderr,
    )
    sys.exit(1)


# ── Upload ───────────────────────────────────────────────────────────────────


def upload_save(save_path: Path, api_url: str) -> None:
    """Upload a .sav file to the SAT backend /api/v1/save/upload endpoint."""
    url = f"{api_url.rstrip('/')}/api/v1/save/upload"
    with save_path.open("rb") as fh:
        with httpx.Client(timeout=120) as client:
            response = client.post(
                url,
                files={"file": (save_path.name, fh, "application/octet-stream")},
            )

    if response.status_code == 200:
        data = response.json()
        print(f"[SAT Watcher] Already imported — id={data.get('id')}")
    elif response.status_code == 201:
        data = response.json()
        print(
            f"[SAT Watcher] ✅ Imported — save='{data.get('save_name')}' id={data.get('id')}"
        )
    else:
        print(
            f"[SAT Watcher] ❌ Upload failed — HTTP {response.status_code}: {response.text}",
            file=sys.stderr,
        )


# ── Watcher loop ──────────────────────────────────────────────────────────────


def watch(save_path: Path, api_url: str, interval: int) -> None:
    """Poll *save_path* for changes and upload to *api_url* on modification."""
    last_mtime: float = 0.0

    print(f"[SAT Watcher] Watching : {save_path}")
    print(f"[SAT Watcher] Backend  : {api_url}")
    print(f"[SAT Watcher] Interval : {interval}s  (Ctrl+C to stop)\n")

    # Immediate upload on first start if file exists
    try:
        last_mtime = save_path.stat().st_mtime
        print("[SAT Watcher] First run — uploading current save…")
        upload_save(save_path, api_url)
    except FileNotFoundError:
        print(f"[SAT Watcher] ⚠ File not found: {save_path}", file=sys.stderr)

    while True:
        time.sleep(interval)
        try:
            mtime = save_path.stat().st_mtime
            if mtime != last_mtime:
                last_mtime = mtime
                print(f"\n[SAT Watcher] Change detected — uploading…")
                upload_save(save_path, api_url)
        except FileNotFoundError:
            print(f"[SAT Watcher] ⚠ File not found: {save_path}", file=sys.stderr)
        except httpx.ConnectError:
            print(
                f"[SAT Watcher] ⚠ Cannot reach backend at {api_url} — will retry",
                file=sys.stderr,
            )
        except Exception as exc:  # noqa: BLE001 — intentional catch-all for robustness
            print(f"[SAT Watcher] ⚠ Error: {exc}", file=sys.stderr)


# ── CLI ───────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SAT Watcher — auto-upload Satisfactory saves to the SAT backend.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--save",
        default=os.environ.get("SAT_SAVE_PATH"),
        help="Path to the Satisfactory .sav file (or set SAT_SAVE_PATH env var)",
    )
    parser.add_argument(
        "--api",
        default=os.environ.get("SAT_API_URL", "http://localhost:8000"),
        help="SAT backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=30,
        help="Poll interval in seconds (default: 30)",
    )
    args = parser.parse_args()

    if not args.save:
        parser.error("--save is required (or set SAT_SAVE_PATH environment variable)")

    save_path = Path(args.save).expanduser().resolve()

    try:
        watch(save_path, args.api, args.interval)
    except KeyboardInterrupt:
        print("\n[SAT Watcher] Stopped.")


if __name__ == "__main__":
    main()
