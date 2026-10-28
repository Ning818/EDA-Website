"""add the text alternative of a highlight card's picture

A picture on the site needs a text alternative for those who cannot see it. The admin asks for one with every picture it takes; the cards that exist keep none, and the site writes one from
the card's title until the card is saved again.

Revision ID: e8c41a6f2b05
Revises: d4a27b9e5c10
Create Date: 2026-10-28 09:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'e8c41a6f2b05'
down_revision: Union[str, None] = 'd4a27b9e5c10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('highlights', sa.Column('image_alt', sa.String(length=300), nullable=True))


def downgrade() -> None:
    op.drop_column('highlights', 'image_alt')
