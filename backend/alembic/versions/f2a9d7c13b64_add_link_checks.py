"""add the table of link checks

The addresses that the content links to, with what the last checks found, so that each user can be shown the broken links of the content they keep.

Revision ID: f2a9d7c13b64
Revises: e8c41a6f2b05
Create Date: 2026-10-31 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'f2a9d7c13b64'
down_revision: Union[str, None] = 'e8c41a6f2b05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'link_checks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=20), nullable=False),
        sa.Column('source_key', sa.String(length=100), nullable=False),
        sa.Column('field', sa.String(length=30), nullable=False),
        sa.Column('label', sa.String(length=400), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('area', sa.String(length=20), nullable=False),
        sa.Column('theme_id', sa.Integer(), nullable=True),
        sa.Column('state', sa.String(length=12), nullable=False),
        sa.Column('detail', sa.String(length=200), nullable=True),
        sa.Column('failures', sa.Integer(), nullable=False),
        sa.Column('first_failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_type', 'source_key', 'field'),
    )
    op.create_index(op.f('ix_link_checks_area'), 'link_checks', ['area'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_link_checks_area'), table_name='link_checks')
    op.drop_table('link_checks')
