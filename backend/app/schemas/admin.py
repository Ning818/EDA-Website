"""What the admin routes (app/internal) send, beyond what the public routes already do."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.media import media_url
from app.models.collaboration import Collaborator, JointProject
from app.models.grant import Area
from app.models.person import SHORT_TITLE, Person, Title
from app.models.theme import Highlight, Project, Theme, TopicGroup
from app.models.user import User
from app.schemas.collaboration import JointProjectRead
from app.schemas.person import PersonRead
from app.schemas.user import GrantRead
from app.services.grants import Preset, preset_of


class AffectedRead(BaseModel):
    """A theme whose "Refer to" contacts lose the person when they leave; `contacts_left` are the contacts it keeps (none: its Refer to section disappears)."""

    theme_slug: str
    theme_name: str
    contacts_left: int


class TopicMembershipRead(BaseModel):
    """A research topic group a person is listed under."""

    theme_slug: str
    theme_name: str
    group_title: str


class ResearchAreaRead(BaseModel):
    """A research area of a theme that the user may list people under (`id` is what `topic_group_id` takes when a person is added)."""

    id: int
    title: str
    theme_slug: str
    theme_name: str


class AdminProjectRead(BaseModel):
    """A funded project as the admin shows it: with the theme it belongs to, which the public pages do not need to say."""

    id: int
    theme_slug: str
    theme_name: str
    status: str
    code: str | None
    description: str
    url: str | None

    @classmethod
    def from_model(cls, project: Project) -> "AdminProjectRead":
        return cls(
            id=project.id,
            theme_slug=project.theme.slug,
            theme_name=project.theme.name,
            status=project.status,
            code=project.code,
            description=project.description,
            url=project.url,
        )


class ProjectIn(BaseModel):
    """A new project. `status` is ongoing unless said; `code` and `url` may be left out."""

    model_config = ConfigDict(extra="forbid")

    theme: str
    description: str
    status: str = "ongoing"
    code: str | None = None
    url: str | None = None


class ProjectPatch(BaseModel):
    """What to change in a project: only the fields sent. A `code` or `url` sent as null or empty is removed."""

    model_config = ConfigDict(extra="forbid")

    theme: str | None = None
    status: str | None = None
    description: str | None = None
    code: str | None = None
    url: str | None = None


class FundedBlurbIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str


class FundedBlurbRead(BaseModel):
    """The sentence of a theme page about the theme's funded projects."""

    theme_slug: str
    theme_name: str
    text: str


class AdminCollaboratorRead(BaseModel):
    """A collaborator of a logo wall as the admin shows it: with its id and its place in the wall."""

    id: int
    kind: str
    name: str
    url: str | None
    logo_url: str | None
    position: int

    @classmethod
    def from_model(cls, collaborator: Collaborator) -> "AdminCollaboratorRead":
        return cls(id=collaborator.id, kind=collaborator.kind, name=collaborator.name, url=collaborator.url, logo_url=media_url(collaborator.logo), position=collaborator.position)


class JointProjectIn(BaseModel):
    """A new joint project: every field but the partners is required."""

    model_config = ConfigDict(extra="forbid")

    code: str
    name: str
    funding: str
    years: str
    coordinator: str
    url: str
    partners: list[str] = []


class JointProjectPatch(BaseModel):
    """What to change in a joint project: only the fields sent."""

    model_config = ConfigDict(extra="forbid")

    code: str | None = None
    name: str | None = None
    funding: str | None = None
    years: str | None = None
    coordinator: str | None = None
    url: str | None = None
    partners: list[str] | None = None


class AdminJointProjectRead(JointProjectRead):
    id: int
    position: int

    @classmethod
    def from_model(cls, project: JointProject) -> "AdminJointProjectRead":
        return cls(**JointProjectRead.from_model(project).model_dump(), id=project.id, position=project.position)


class SiteContactPatch(BaseModel):
    """What to change in the footer's numbers: only the fields sent; a number sent as null or empty is removed."""

    model_config = ConfigDict(extra="forbid")

    phone: str | None = None
    fax: str | None = None


class PageIntroIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intro: str


class PageIntroRead(BaseModel):
    """The paragraph under the title of a page."""

    slug: str
    intro: str


class PersonRefRead(BaseModel):
    """A person as a theme's pages list them (a contact, an involved person): who they are, with the title as it is written on the small cards."""

    slug: str
    name: str
    title: str
    title_short: str

    @classmethod
    def from_model(cls, person: Person) -> "PersonRefRead":
        return cls(slug=person.slug, name=person.name, title=person.title, title_short=SHORT_TITLE[Title(person.title)])


class AdminTopicRead(BaseModel):
    id: int
    text: str


class AdminAreaRead(BaseModel):
    """A research area with its topics and involved people, each in the order they are kept (the pages show the people by rank first)."""

    id: int
    title: str
    topics: list[AdminTopicRead]
    people: list[PersonRefRead]

    @classmethod
    def from_model(cls, area: TopicGroup) -> "AdminAreaRead":
        return cls(
            id=area.id,
            title=area.title,
            topics=[AdminTopicRead(id=t.id, text=t.text) for t in sorted(area.topics, key=lambda t: (t.position, t.id))],
            people=[PersonRefRead.from_model(m.person) for m in sorted(area.members, key=lambda m: m.position)],
        )


class AdminHighlightRead(BaseModel):
    kind: str
    title: str
    subtitle: str | None
    authors_full: str | None
    authors_short: str | None
    venue: str | None
    tags: list[str]
    text: str
    url: str
    image_url: str | None
    image_alt: str | None

    @classmethod
    def from_model(cls, card: Highlight) -> "AdminHighlightRead":
        return cls(
            kind=card.kind,
            title=card.title,
            subtitle=card.subtitle,
            authors_full=card.authors_full,
            authors_short=card.authors_short,
            venue=card.venue,
            tags=list(card.tags or []),
            text=card.text,
            url=card.url,
            image_url=media_url(card.image),
            image_alt=card.image_alt,
        )


class AdminThemeRead(BaseModel):
    """Everything of a theme that the theme owner keeps, with the ids the routes for its parts take."""

    slug: str
    name: str
    short_name: str | None
    home_summary: str | None
    intro: str
    areas: list[AdminAreaRead]
    contacts: list[PersonRefRead]
    highlight_paper: AdminHighlightRead | None
    highlight_project: AdminHighlightRead | None

    @classmethod
    def from_model(cls, theme: Theme) -> "AdminThemeRead":
        card = {h.kind: h for h in theme.highlights}
        return cls(
            slug=theme.slug,
            name=theme.name,
            short_name=theme.short_name,
            home_summary=theme.home_summary,
            intro=theme.intro,
            areas=[AdminAreaRead.from_model(a) for a in sorted(theme.groups, key=lambda a: (a.position, a.id))],
            contacts=[PersonRefRead.from_model(c.person) for c in sorted(theme.contacts, key=lambda c: c.position)],
            highlight_paper=AdminHighlightRead.from_model(card["paper"]) if "paper" in card else None,
            highlight_project=AdminHighlightRead.from_model(card["project"]) if "project" in card else None,
        )


class ThemeWordsPatch(BaseModel):
    """What to change in a theme's words: only the fields sent; `short_name` and `home_summary` sent as null or empty are removed."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    short_name: str | None = None
    home_summary: str | None = None
    intro: str | None = None


class PeopleIn(BaseModel):
    """People from the People list, by their addresses, in the order they are to be kept."""

    model_config = ConfigDict(extra="forbid")

    people: list[str]


class AreaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str


class TopicIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str


class MoveIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    direction: str


class AreaImpactRead(BaseModel):
    """What removing a research area takes with it."""

    topics: int
    people: int


class LinkProblemRead(BaseModel):
    """A link of the content that does not work, with where it is: `source_type` and `source_key` say which page of the admin changes it (a person's slug, an id, or "<theme>:<kind>")."""

    id: int
    source_type: str
    source_key: str
    field: str
    label: str
    url: str
    detail: str | None
    failures: int
    first_failed_at: datetime | None
    last_checked_at: datetime | None


class LinkProblemsRead(BaseModel):
    problems: list[LinkProblemRead]
    # when the last check ran (none: there has been none), and how many failed checks in a row a link needs to be reported
    last_check: datetime | None
    threshold: int


class LinkRecheckRead(BaseModel):
    state: str
    detail: str | None
    # whether the link is still reported after this check
    reported: bool


class DeleteImpactRead(BaseModel):
    """What deleting a person takes with them: the contacts and the topic groups they are in."""

    refer_to: list[AffectedRead]
    topics: list[TopicMembershipRead]


class AdminPersonRead(PersonRead):
    """A person as the admin shows them: what the public page shows, and whether this user may change or delete the entry."""

    can_edit: bool
    can_delete: bool
    # set where the user may change or delete the entry only because they added it: until when (a day after it was made)
    editable_until: datetime | None


class AccountRead(BaseModel):
    """An account as the staff see it in the list of accounts. Never the password or its hash."""

    id: int
    email: str
    name: str
    is_active: bool
    must_change_password: bool
    created_at: datetime
    last_login_at: datetime | None
    # the preset whose grants the account has exactly (none: it has other grants, or none at all)
    preset: Preset | None
    grants: list[GrantRead]

    @classmethod
    def from_model(cls, user: User) -> "AccountRead":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            must_change_password=user.must_change_password,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
            preset=preset_of(user),
            grants=[GrantRead(area=Area(g.area), theme=g.theme.slug if g.theme else None) for g in user.grants],
        )


class AccountCreateIn(BaseModel):
    email: str = Field(max_length=254)
    name: str = Field(max_length=150)
    # none: the account may do nothing
    preset: Preset | None = None


class AccountPatchIn(BaseModel):
    """What may change; only what is sent does (a `preset` sent as null takes every grant away)."""

    name: str | None = Field(default=None, max_length=150)
    preset: Preset | None = None
    is_active: bool | None = None


class TemporaryPasswordRead(BaseModel):
    """The account and the temporary password that was just set. This is the only time the password is shown."""

    account: AccountRead
    temporary_password: str


class RequestIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(max_length=5000)
    # the page of the admin the asker came from
    page: str | None = Field(default=None, max_length=500)


class RequestCloseIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str | None = Field(default=None, max_length=5000)


class RequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_name: str
    user_email: str
    message: str
    page: str | None
    status: str
    answer: str | None
    created_at: datetime
    handled_at: datetime | None
    handled_by: str | None


class RequestsRead(BaseModel):
    requests: list[RequestRead]
    # how many are waiting for an answer
    open: int


