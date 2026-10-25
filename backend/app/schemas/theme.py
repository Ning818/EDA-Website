from pydantic import BaseModel

from app.core.media import media_url
from app.models.person import Person, Title
from app.models.theme import Highlight, HighlightKind, Project, ProjectStatus, Theme, TopicGroup
from app.schemas.person import PersonRead


class ProjectRead(BaseModel):
    code: str | None
    description: str
    url: str | None


class ProjectsRead(BaseModel):
    ongoing: list[ProjectRead]
    ended: list[ProjectRead]


class StatsRead(BaseModel):
    """The figures in the header of a theme's Funded Projects page and in the card of its Research page."""

    ongoing: int
    ended: int
    total: int


class HighlightRead(BaseModel):
    title: str
    subtitle: str | None
    authors_full: str | None
    authors_short: str | None
    venue: str | None
    tags: list[str]
    image_url: str | None
    text: str
    url: str


class TopicGroupRead(BaseModel):
    title: str
    topics: list[str]
    # the people involved, in the order the pages show them: by rank, and within a rank as they were written
    people: list[PersonRead]


class ThemeRead(BaseModel):
    slug: str
    name: str
    short_name: str | None
    home_summary: str | None
    intro: str
    funded_blurb: str
    highlight_paper: HighlightRead | None
    highlight_project: HighlightRead | None
    topic_groups: list[TopicGroupRead]
    projects: ProjectsRead
    stats: StatsRead
    refer_to: list[PersonRead]

    @classmethod
    def from_model(cls, theme: Theme) -> "ThemeRead":
        def highlight(kind: HighlightKind) -> HighlightRead | None:
            found = next((h for h in theme.highlights if h.kind == kind), None)
            return _highlight_read(found) if found else None

        def projects(status: ProjectStatus) -> list[ProjectRead]:
            return [_project_read(p) for p in theme.projects if p.status == status]

        ongoing, ended = projects(ProjectStatus.ONGOING), projects(ProjectStatus.ENDED)
        return cls(
            slug=theme.slug,
            name=theme.name,
            short_name=theme.short_name,
            home_summary=theme.home_summary,
            intro=theme.intro,
            funded_blurb=theme.funded_blurb,
            highlight_paper=highlight(HighlightKind.PAPER),
            highlight_project=highlight(HighlightKind.PROJECT),
            topic_groups=[_group_read(group) for group in theme.groups],
            projects=ProjectsRead(ongoing=ongoing, ended=ended),
            stats=StatsRead(ongoing=len(ongoing), ended=len(ended), total=len(ongoing) + len(ended)),
            refer_to=ranked([(c.position, c.person) for c in theme.contacts]),
        )


class ThemeSummary(BaseModel):
    """What every page needs of every theme: its name wherever it is written (the nav bar, the page titles, the home page's links and chapter dots) and its home-page paragraph."""

    slug: str
    name: str
    short_name: str | None
    home_summary: str | None


def ranked(members: list[tuple[int, Person]]) -> list[PersonRead]:
    """People as the small cards list them: by rank (full professors first, former members last), and within a rank in the order they were written."""
    order = list(Title)
    ordered = sorted(members, key=lambda m: (order.index(Title(m[1].title)), m[0]))
    return [PersonRead.from_model(person) for _, person in ordered]


def _group_read(group: TopicGroup) -> TopicGroupRead:
    return TopicGroupRead(
        title=group.title,
        topics=[t.text for t in group.topics],
        people=ranked([(m.position, m.person) for m in group.members]),
    )


def _project_read(project: Project) -> ProjectRead:
    return ProjectRead(code=project.code, description=project.description, url=project.url)


def _highlight_read(h: Highlight) -> HighlightRead:
    return HighlightRead(
        title=h.title,
        subtitle=h.subtitle,
        authors_full=h.authors_full,
        authors_short=h.authors_short,
        venue=h.venue,
        tags=list(h.tags or []),
        image_url=media_url(h.image),
        text=h.text,
        url=h.url,
    )
