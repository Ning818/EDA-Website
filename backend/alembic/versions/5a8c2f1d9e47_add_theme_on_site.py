"""add theme on_site

Revision ID: 5a8c2f1d9e47
Revises: 3b7d5e90a1c8
Create Date: 2026-10-31 02:10:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5a8c2f1d9e47'
down_revision: Union[str, None] = '3b7d5e90a1c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # the themes that exist are on the website
    op.add_column('themes', sa.Column('on_site', sa.Boolean(), server_default=sa.text('true'), nullable=False))


def downgrade() -> None:
    op.drop_column('themes', 'on_site')
