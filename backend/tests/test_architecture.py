"""The shape that keeps the apps apart. The public site only reads; the admin is a separate application that talks to this API like any other client and has its own routes, which
nothing public imports and all of which need a login. These tests fail if that drifts."""
import ast
import re
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import BACKEND_DIR
from app.main import app

APP = BACKEND_DIR / "app"
ADMIN_PREFIX = "/api/admin"


def imported_modules(file: Path) -> set[str]:
    modules = set()
    for node in ast.walk(ast.parse(file.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module)
            modules.update(f"{node.module}.{alias.name}" for alias in node.names)
    return modules


def test_nothing_public_imports_the_admin():
    for file in (APP / "routers").glob("*.py"):
        assert not [m for m in imported_modules(file) if m.startswith("app.internal")], file.name


def test_the_admin_does_not_reach_into_the_public_routes():
    for file in (APP / "internal").glob("*.py"):
        assert not [m for m in imported_modules(file) if m.startswith("app.routers")], file.name


def api_paths() -> dict[str, dict]:
    """Every path the API answers, with its operations: read from the OpenAPI document, which lists what is really mounted."""
    return app.openapi()["paths"]


def test_every_admin_route_needs_a_login():
    admin = {path: ops for path, ops in api_paths().items() if path.startswith(ADMIN_PREFIX)}
    assert admin, "there are no admin routes"
    visitor = TestClient(app)  # nobody logged in
    for path, operations in admin.items():
        for method, operation in operations.items():
            assert all(tag.startswith("admin") for tag in operation["tags"]), (method, path)
            answer = visitor.request(method.upper(), re.sub(r"\{[^}]+\}", "x", path))
            assert answer.status_code == 401, (method, path)


def test_nothing_outside_the_admin_changes_anything_but_the_login():
    for path, operations in api_paths().items():
        if not path.startswith(ADMIN_PREFIX) and path not in ("/api/auth/login", "/api/auth/logout"):
            assert set(operations) == {"get"}, (path, sorted(operations))
