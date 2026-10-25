# Importing the models here puts their tables in Base.metadata, which Alembic reads.
from app.models.collaboration import Collaborator, JointProject  # noqa: F401
from app.models.page import PageText  # noqa: F401
from app.models.person import Person  # noqa: F401
from app.models.site import SiteContact  # noqa: F401
from app.models.theme import Highlight, Project, Theme, ThemeContact, Topic, TopicGroup, TopicGroupPerson  # noqa: F401
from app.models.user import LoginAttempt, User  # noqa: F401
