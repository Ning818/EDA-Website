from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.person import GROUP_OF_TITLE, Group, Person, Title, titles_in
from app.schemas.person import PersonRead

router = APIRouter(prefix="/people", tags=["people"])

GROUP_ORDER = list(Group)


def _page_order(person: Person) -> tuple[int, int, int]:
    """The order of the People page: group by group, and within a group by position."""
    return (GROUP_ORDER.index(GROUP_OF_TITLE[Title(person.title)]), person.position, person.id)


@router.get("", response_model=list[PersonRead])
def list_people(group: Group | None = None, db: Session = Depends(get_db)):
    """The people, in the order of the People page; `group` keeps only one of its three groups."""
    statement = select(Person)
    if group is not None:
        statement = statement.where(Person.title.in_([t.value for t in titles_in(group)]))
    people = sorted(db.scalars(statement), key=_page_order)
    return [PersonRead.from_model(person) for person in people]


@router.get("/{slug}", response_model=PersonRead)
def get_person(slug: str, db: Session = Depends(get_db)):
    person = db.scalar(select(Person).where(Person.slug == slug))
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return PersonRead.from_model(person)
