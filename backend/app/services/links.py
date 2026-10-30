"""Link checks: finds the addresses that the content links to, checks them, and tells each user which of them are broken in the content they keep. The check runs from the command line on a
schedule (`python -m app.manage check-links`, see the README); the admin only reads what it found and can check one address again at once.

Rules kept here, so that no way in can skip them:
- A link is reported only after `link_fail_threshold` failed checks in a row (three, by default), so that a site that was down for an hour is not blamed. A check that gets an answer that
  is good resets the count.
- A site that refuses programs (401, 403, 406, 429, and LinkedIn's 999) says nothing about whether the page exists: such a link is "blocked", never counted as broken and never reported.
- The checker fetches `http` and `https` addresses only, and only addresses on the public internet: a name that points to this computer, to a private network or to a reserved address is
  refused, and so is a redirect to one. It connects to the address it checked, so that the name cannot change its mind in between. It reads the answer's status and nothing of the page.
- Who sees a broken link is who keeps the content: a person's links the administrative staff (the grant `people_edit`), the collaborators' websites and the joint projects' records the staff
  with the grant `site`, the funded projects' websites the funded-projects owner, the highlight cards' addresses the theme owner (of that theme).
"""
import http.client
import ipaddress
import socket
import ssl
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from http import HTTPStatus
from urllib.parse import urljoin, urlsplit

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.collaboration import Collaborator, JointProject
from app.models.grant import Area
from app.models.link import LinkCheck
from app.models.person import Person
from app.models.theme import Highlight, Project, Theme
from app.models.user import User
from app.services.grants import NotAllowed, has_grant

OK, BROKEN, BLOCKED, UNCHECKED = "ok", "broken", "blocked", "unchecked"
BLOCKED_STATUSES = {401, 403, 406, 429, 999}
REDIRECTS = {301, 302, 303, 307, 308}
MAX_REDIRECTS = 5
USER_AGENT = "Mozilla/5.0 (compatible; EDA-Group-link-checker/1.0)"
PERSON_LINKS = {"polito": "Politecnico page", "orcid": "ORCID", "linkedin": "LinkedIn", "dept": "Department page", "iris": "IRIS profile"}


class LinkNotFound(LookupError):
    pass


@dataclass(frozen=True)
class Target:
    """An address in the content, and who keeps it."""

    source_type: str
    source_key: str
    field: str
    label: str
    url: str
    area: str
    theme_id: int | None = None


@dataclass(frozen=True)
class Outcome:
    state: str
    detail: str | None


@dataclass(frozen=True)
class Summary:
    links: int
    addresses: int
    ok: int
    broken: int
    blocked: int
    reported: int
    added: int
    removed: int


# --- what the content links to ------------------------------------------------------------------------------------------------------------------------------------------


def current_targets(db: Session) -> list[Target]:
    """Every address the content links to now."""
    found: list[Target] = []
    for person in db.scalars(select(Person).order_by(Person.id)):
        for key, name in PERSON_LINKS.items():
            url = getattr(person, f"{key}_url")
            if url:
                found.append(Target("person", person.slug, key, f"{person.name}: {name}", url, "people"))
    for collaborator in db.scalars(select(Collaborator).order_by(Collaborator.id)):
        if collaborator.url:
            found.append(Target("collaborator", str(collaborator.id), "url", f"{collaborator.name}: website", collaborator.url, "site"))
    for project in db.scalars(select(JointProject).order_by(JointProject.id)):
        found.append(Target("joint_project", str(project.id), "url", f"{project.code}: record on CORDIS", project.url, "site"))
    themes = {theme.id: theme for theme in db.scalars(select(Theme))}
    for project in db.scalars(select(Project).order_by(Project.id)):
        if project.url:
            found.append(Target("project", str(project.id), "url", f"{project.code or project.description}: project website ({themes[project.theme_id].name})", project.url, "projects", project.theme_id))
    for card in db.scalars(select(Highlight).order_by(Highlight.id)):
        theme = themes[card.theme_id]
        found.append(Target("highlight", f"{theme.slug}:{card.kind}", "url", f"{theme.name}: highlight {card.kind}", card.url, "theme", theme.id))
    return found


def sync_targets(db: Session) -> tuple[int, int]:
    """Make the rows follow the content: a new address gets a row, one that was changed starts again, one that is gone loses its row. Returns how many were added and removed."""
    wanted = {(t.source_type, t.source_key, t.field): t for t in current_targets(db)}
    rows = {(r.source_type, r.source_key, r.field): r for r in db.scalars(select(LinkCheck))}
    added = removed = 0
    for key, row in rows.items():
        if key not in wanted:
            db.delete(row)
            removed += 1
    for key, target in wanted.items():
        row = rows.get(key)
        if row is None:
            db.add(LinkCheck(source_type=target.source_type, source_key=target.source_key, field=target.field, label=target.label, url=target.url, area=target.area, theme_id=target.theme_id, state=UNCHECKED, failures=0))
            added += 1
        else:
            row.label, row.area, row.theme_id = target.label, target.area, target.theme_id
            if row.url != target.url:  # the address was changed: nothing is known of the new one
                row.url, row.state, row.detail, row.failures, row.first_failed_at, row.last_checked_at = target.url, UNCHECKED, None, 0, None, None
    db.flush()
    return added, removed


# --- fetching one address -----------------------------------------------------------------------------------------------------------------------------------------------


class _Refused(Exception):
    pass


def _public_address(host: str, port: int, allow_private: bool) -> str:
    """The address to connect to for this name: refused unless every address the name has is on the public internet."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise _Refused("The address cannot be found") from error
    addresses = [info[4][0] for info in infos]
    if not addresses:
        raise _Refused("The address cannot be found")
    if not allow_private and not all(ipaddress.ip_address(a).is_global for a in addresses):
        raise _Refused("The address is not on the public internet")
    return addresses[0]


def _connection(scheme: str, host: str, port: int, ip: str, timeout: float) -> http.client.HTTPConnection:
    """A connection that goes to `ip` (the one that was checked) whatever the name says, and for https asks for the certificate of `host`."""
    if scheme == "https":
        context = ssl.create_default_context()

        class Secure(http.client.HTTPSConnection):
            def connect(self) -> None:
                sock = socket.create_connection((ip, port), timeout)
                self.sock = context.wrap_socket(sock, server_hostname=host)

        return Secure(host, port, timeout=timeout, context=context)

    class Plain(http.client.HTTPConnection):
        def connect(self) -> None:
            self.sock = socket.create_connection((ip, port), timeout)

    return Plain(host, port, timeout=timeout)


def _words(status: int) -> str:
    try:
        return f"{status} {HTTPStatus(status).phrase}"
    except ValueError:
        return str(status)


def fetch(url: str, timeout: float | None = None, allow_private: bool = False) -> Outcome:
    """Ask for the address and say what came of it: `ok` for a good answer (a redirect is followed, up to five), `blocked` where the site refuses programs, `broken` for anything else - the
    status, or why there was no answer. Only the answer's status is read. `allow_private` is for the tests, which ask a server on this computer."""
    timeout = timeout or settings.link_timeout_seconds
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        parts = urlsplit(current)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            return Outcome(BROKEN, "Not a web address")
        port = parts.port or (443 if parts.scheme == "https" else 80)
        try:
            ip = _public_address(parts.hostname, port, allow_private)
            connection = _connection(parts.scheme, parts.hostname, port, ip, timeout)
            try:
                connection.request("GET", (parts.path or "/") + (f"?{parts.query}" if parts.query else ""), headers={"User-Agent": USER_AGENT, "Accept": "*/*", "Connection": "close"})
                response = connection.getresponse()
                status, location = response.status, response.getheader("Location")
            finally:
                connection.close()
        except _Refused as error:
            return Outcome(BROKEN, str(error))
        except TimeoutError:
            return Outcome(BROKEN, f"No answer in {int(timeout)} seconds")
        except ssl.SSLError:
            return Outcome(BROKEN, "The security certificate is not valid")
        except (OSError, http.client.HTTPException, ValueError):
            return Outcome(BROKEN, "Could not connect")
        if status in REDIRECTS and location:
            current = urljoin(current, location)
            continue
        if status in BLOCKED_STATUSES:
            return Outcome(BLOCKED, f"{_words(status)}: the site does not answer programs, so the link could not be checked")
        if status < 400:
            return Outcome(OK, None)
        return Outcome(BROKEN, _words(status))
    return Outcome(BROKEN, "Too many redirects")


# --- the check ----------------------------------------------------------------------------------------------------------------------------------------------------------


def _apply(row: LinkCheck, outcome: Outcome, now: datetime) -> None:
    row.last_checked_at = now
    row.state, row.detail = outcome.state, outcome.detail
    if outcome.state == BROKEN:
        row.failures += 1
        row.first_failed_at = row.first_failed_at or now
    else:
        row.failures, row.first_failed_at = 0, None


def check_all(db: Session, fetcher: Callable[[str], Outcome] = fetch, workers: int = 8, now: datetime | None = None) -> Summary:
    """Check every address of the content once (each distinct address once, whatever the number of places it is in) and record what was found."""
    now = now or datetime.now(UTC)
    added, removed = sync_targets(db)
    rows = list(db.scalars(select(LinkCheck).order_by(LinkCheck.id)))
    addresses = sorted({row.url for row in rows})
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        outcomes = dict(zip(addresses, pool.map(fetcher, addresses), strict=True))
    for row in rows:
        _apply(row, outcomes[row.url], now)
    db.commit()
    threshold = settings.link_fail_threshold
    states = [row.state for row in rows]
    return Summary(
        links=len(rows),
        addresses=len(addresses),
        ok=states.count(OK),
        broken=states.count(BROKEN),
        blocked=states.count(BLOCKED),
        reported=sum(1 for row in rows if row.state == BROKEN and row.failures >= threshold),
        added=added,
        removed=removed,
    )


# --- who sees what ------------------------------------------------------------------------------------------------------------------------------------------------------


def _may_see(db: Session, actor: User, row: LinkCheck) -> bool:
    if row.area == "people":
        return has_grant(db, actor, Area.PEOPLE_EDIT)
    if row.area == "site":
        return has_grant(db, actor, Area.SITE)
    if row.area == "projects":
        return has_grant(db, actor, Area.PROJECTS)
    return has_grant(db, actor, Area.THEME, row.theme_id)


def _is_current(row: LinkCheck, wanted: dict) -> bool:
    target = wanted.get((row.source_type, row.source_key, row.field))
    return target is not None and target.url == row.url


def problems_for(db: Session, actor: User) -> list[LinkCheck]:
    """The links that are reported (broken in `link_fail_threshold` checks in a row) in the content this user keeps, longest broken first. A row whose address was changed or removed since
    the check is left out at once, without waiting for the next check."""
    wanted = {(t.source_type, t.source_key, t.field): t for t in current_targets(db)}
    rows = db.scalars(select(LinkCheck).where(LinkCheck.state == BROKEN, LinkCheck.failures >= settings.link_fail_threshold).order_by(LinkCheck.first_failed_at, LinkCheck.id))
    return [row for row in rows if _is_current(row, wanted) and _may_see(db, actor, row)]


def last_check(db: Session) -> datetime | None:
    return db.scalar(select(func.max(LinkCheck.last_checked_at)))


def recheck(db: Session, actor: User, check_id: int, fetcher: Callable[[str], Outcome] = fetch, now: datetime | None = None) -> LinkCheck:
    """Check one address again now, for a user who has just mended it (or doubts the report): a good answer clears the report, a bad one counts as one more failure."""
    row = db.get(LinkCheck, check_id)
    wanted = {(t.source_type, t.source_key, t.field): t for t in current_targets(db)}
    if row is None or not _is_current(row, wanted):
        raise LinkNotFound(check_id)
    if not _may_see(db, actor, row):
        raise NotAllowed("May not check this link")
    _apply(row, fetcher(row.url), now or datetime.now(UTC))
    db.commit()
    return row

