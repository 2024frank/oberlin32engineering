#!/usr/bin/env python3
"""Serve the built site locally with the same clean URLs used in production."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def send_head(self):  # type: ignore[no-untyped-def]
        request = urlsplit(self.path)
        if request.path != "/" and not Path(request.path).suffix:
            candidate = SITE / f"{request.path.lstrip('/')}.html"
            if candidate.is_file():
                self.path = urlunsplit((request.scheme, request.netloc, f"{request.path}.html", request.query, request.fragment))
        return super().send_head()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8010)
    args = parser.parse_args()
    handler = partial(CleanUrlHandler, directory=SITE)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Local preview: http://127.0.0.1:{args.port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
