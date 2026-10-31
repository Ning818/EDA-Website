"""add social links

Revision ID: 9c4f1e2a7b30
Revises: 7e3b9d4c1a56
Create Date: 2026-10-31 06:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9c4f1e2a7b30'
down_revision: Union[str, None] = '7e3b9d4c1a56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# the words the website had written in its code when this table was made: they are where the staff start from
START = {
    "youtube": {
        "label": "YouTube",
        "text": "Discover how our automated techniques are transforming complex systems through interdisciplinary research across VLSI-CAD, Bioinformatics, and Smart City domains. By collaborating closely with research institutions and industry experts, we develop innovative digital twin and co-simulation solutions. Explore our YouTube channel to see our tools in action and view our latest technical developments.",
        "cta": "Explore our YouTube channel",
        "url": "https://www.youtube.com/@edagrouppolito329/videos"
    },
    "linkedin": {
        "label": "LinkedIn",
        "text": "We invite you to connect and engage in academic exchange with us. Based in Turin, our team specializes in cutting-edge fields like Electronic Design Automation, Machine Learning, and Generative AI applications, and we look forward to networking with fellow scholars and industry experts.",
        "cta": "Explore our updates on LinkedIn",
        "url": "https://www.linkedin.com/company/edagroup-polito/posts/?feedView=all"
    }
}


def upgrade() -> None:
    table = op.create_table(
        'social_links',
        sa.Column('slug', sa.String(length=20), nullable=False),
        sa.Column('label', sa.String(length=30), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('cta', sa.String(length=60), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.PrimaryKeyConstraint('slug'),
    )
    op.bulk_insert(table, [{'slug': slug, **row} for slug, row in START.items()])


def downgrade() -> None:
    op.drop_table('social_links')
