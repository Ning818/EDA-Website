"""The audit log: who changed what, and when. `record` only adds the row; the caller commits it together with the change it describes, so a change and its row stand or fall
together."""
from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User

NO_ONE = "(command line)"


def record(db: Session, actor: User | None, action: str, entity_type: str, entity_key: str, before: dict | None = None, after: dict | None = None) -> AuditLog:
    """`actor` is the logged-in user; none for what the developer does from the command line. `before` and `after` are plain JSON values: never a password, a hash or a file's
    contents."""
    entry = AuditLog(
        user_id=actor.id if actor else None,
        user_email=actor.email if actor else NO_ONE,
        action=action,
        entity_type=entity_type,
        entity_key=entity_key,
        before=before,
        after=after,
    )
    db.add(entry)
    return entry
