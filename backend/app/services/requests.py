"""The "I can't find what I need" requests: a user who cannot do something with the screens says what they need, and the developer answers. The admin's routes
(app/internal/requests.py) call it, and so could a script. It checks who may do what, validates every field and writes the audit row in the same transaction as the change.

Rules kept here, so that no way in can skip them:
- Any user who is logged in, past the temporary password and has at least one grant may ask. An account with no grants may do nothing in the admin, and so cannot ask either; it
  has to turn to the people who made the account by other means.
- A request is plain text of at most 1500 characters and is never empty; the page it came from is a path of the admin (it starts with "/"), cut to what fits, and is dropped if it is
  anything else. At most 5 requests of one user are open at the same time, so that a stuck key or a script cannot fill the staff's list.
- A user sees their own requests and the answers; the holders of the grant `system` (the developer: what no screen covers is something only they can build or change) see all of
  them and close them, with an answer of at most 1000 characters. A request that is closed stays closed, and cannot be answered twice.
- A request is kept (with who asked) after it is closed; closing one writes an audit row, and so does asking.
"""
from datetime import UTC, datetime

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.core.validation import clean_text
from app.models.grant import Area
from app.models.request import HelpRequest
from app.models.user import User
from app.services import audit
from app.services.grants import NotAllowed, require

MESSAGE_MAX = 1500
ANSWER_MAX = 1000
OPEN_MAX = 5
OPEN, DONE = "open", "done"


class RequestNotFound(LookupError):
    pass


class RequestError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _page(value: str | None) -> str | None:
    text = " ".join(str(value or "").split())
    if not text.startswith("/") or text.startswith("//") or "<" in text or ">" in text or any(ord(c) < 32 for c in text):
        return None
    return text[:200]


def create(db: Session, actor: User, message: str | None, page: str | None = None) -> HelpRequest:
    if not actor.grants:
        raise NotAllowed("No grants")
    clean = clean_text(message, "message", label="The request", max_length=MESSAGE_MAX, required=True)
    already = db.scalars(select(HelpRequest.id).where(HelpRequest.user_id == actor.id, HelpRequest.status == OPEN)).all()
    if len(already) >= OPEN_MAX:
        raise RequestError("too_many_open", f"You have {OPEN_MAX} requests that have not been answered yet. Wait for an answer before asking for more.")
    row = HelpRequest(user_id=actor.id, user_name=actor.name, user_email=actor.email, message=clean, page=_page(page), status=OPEN)
    db.add(row)
    db.flush()
    audit.record(db, actor, "request.create", "request", str(row.id), after={"message": clean, "page": row.page})
    db.commit()
    return row


def mine(db: Session, actor: User) -> list[HelpRequest]:
    """The user's own requests, newest first."""
    return list(db.scalars(select(HelpRequest).where(HelpRequest.user_id == actor.id).order_by(HelpRequest.created_at.desc(), HelpRequest.id.desc())))


def list_all(db: Session, actor: User) -> list[HelpRequest]:
    """Every request, the ones waiting first and the oldest of those first, then the answered ones, newest first."""
    require(db, actor, Area.SYSTEM)
    waiting = case((HelpRequest.status == OPEN, 0), else_=1)
    rows = db.scalars(select(HelpRequest).order_by(waiting, HelpRequest.id))
    open_rows, done_rows = [], []
    for row in rows:
        (open_rows if row.status == OPEN else done_rows).append(row)
    return open_rows + sorted(done_rows, key=lambda r: r.id, reverse=True)


def count_open(db: Session, actor: User) -> int:
    require(db, actor, Area.SYSTEM)
    return len(db.scalars(select(HelpRequest.id).where(HelpRequest.status == OPEN)).all())


def close(db: Session, actor: User, request_id: int, answer: str | None, now: datetime | None = None) -> HelpRequest:
    require(db, actor, Area.SYSTEM)
    row = db.get(HelpRequest, request_id)
    if row is None:
        raise RequestNotFound(request_id)
    if row.status == DONE:
        raise RequestError("already_done", "This request has been answered already.")
    clean = clean_text(answer, "answer", label="The answer", max_length=ANSWER_MAX)
    row.status = DONE
    row.answer = clean
    row.handled_at = now or datetime.now(UTC)
    row.handled_by = actor.email
    audit.record(db, actor, "request.close", "request", str(row.id), before={"status": OPEN}, after={"status": DONE, "answer": clean})
    db.commit()
    return row
