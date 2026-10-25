from pydantic import BaseModel

from app.core.media import media_url
from app.models.person import GROUP_OF_TITLE, SHORT_TITLE, Group, Person, Title

LINK_KEYS = ("polito", "orcid", "linkedin", "dept", "iris")


class PersonRead(BaseModel):
    """A person as the People page and the small cards need them."""

    slug: str
    name: str
    # the name as the small cards write it (a middle name cut to its initial); the same as `name` for nearly everybody
    card_name: str
    title: Title
    title_short: str
    group: Group
    photo_url: str | None
    # only the links the person has, by kind: polito, orcid, linkedin, dept, iris
    links: dict[str, str]
    # the page a small card links to: the person's polito.it staff page, else their research profile on IRIS (also Politecnico's own site); none if they have neither.
    # `page_kind` says which it is: 'staff' or 'iris'
    page_url: str | None
    page_kind: str | None

    @classmethod
    def from_model(cls, person: Person) -> "PersonRead":
        title = Title(person.title)
        links = {key: getattr(person, f"{key}_url") for key in LINK_KEYS}
        page_url, page_kind = (person.polito_url, "staff") if person.polito_url else (person.iris_url, "iris") if person.iris_url else (None, None)
        return cls(
            slug=person.slug,
            name=person.name,
            card_name=person.card_name or person.name,
            title=title,
            title_short=SHORT_TITLE[title],
            group=GROUP_OF_TITLE[title],
            photo_url=media_url(person.photo),
            links={key: url for key, url in links.items() if url},
            page_url=page_url,
            page_kind=page_kind,
        )
