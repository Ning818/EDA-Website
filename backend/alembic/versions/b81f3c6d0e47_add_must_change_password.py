"""add must_change_password

An account made by the administrative staff (or given a new password by them) starts with a temporary password that has to be changed at the first login.

Revision ID: b81f3c6d0e47
Revises: 7c41e9d2a5b8
Create Date: 2026-10-27 16:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b81f3c6d0e47'
down_revision: Union[str, None] = '7c41e9d2a5b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'must_change_password')
