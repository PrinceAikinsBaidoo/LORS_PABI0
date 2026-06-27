"""Vercel serverless entry — mounts FastAPI backend at /api/*."""
import os
import sys
from typing import Any

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from main import app as fastapi_app  # noqa: E402


class _StripApiPrefix:
    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") == "http":
            path = scope.get("path", "")
            if path.startswith("/api"):
                scope = dict(scope)
                scope["path"] = path[4:] or "/"
        await self.app(scope, receive, send)


app = _StripApiPrefix(fastapi_app)
