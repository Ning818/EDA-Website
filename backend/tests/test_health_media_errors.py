import pytest
from sqlalchemy.exc import OperationalError

from app.dependencies import get_db
from app.main import app


def test_the_api_is_up(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_the_api_reaches_the_database(client):
    assert client.get("/api/health/db").json() == {"status": "ok"}


def test_a_file_that_is_not_there_is_not_found(client):
    assert client.get("/media/people/nobody.jpg").status_code == 404


@pytest.mark.parametrize("path", ["/media/../.env", "/media/%2e%2e/.env", "/media/people/../../.env", "/media/%2e%2e%2f.env"])
def test_files_outside_the_media_folder_are_not_reachable(client, path):
    answer = client.get(path)
    assert answer.status_code in (400, 404)
    assert "POSTGRES" not in answer.text


def test_with_the_database_down_every_route_answers_503_not_500(client):
    def database_down():
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))
        yield  # pragma: no cover - makes this a generator, like the dependency it stands in for

    app.dependency_overrides[get_db] = database_down
    try:
        for path in ("/api/people", "/api/people/enrico-macii", "/api/themes", "/api/themes/vlsi-cad", "/api/collaborations", "/api/pages/people", "/api/health/db"):
            answer = client.get(path)
            assert answer.status_code == 503, path
            assert answer.json() == {"detail": "Database unreachable"}, path
    finally:
        app.dependency_overrides.clear()


def test_only_the_front_end_may_call_from_a_browser(client):
    allowed = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    refused = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "access-control-allow-origin" not in refused.headers
