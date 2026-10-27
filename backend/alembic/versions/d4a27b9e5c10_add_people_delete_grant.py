"""add the grant people_delete

The administrative staff may delete a person (for one added by mistake). The accounts that may change people (people_edit) keep what they could do and so get the new grant too.

Revision ID: d4a27b9e5c10
Revises: b81f3c6d0e47
Create Date: 2026-10-27 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'd4a27b9e5c10'
down_revision: Union[str, None] = 'b81f3c6d0e47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("INSERT INTO user_grants (user_id, area) SELECT user_id, 'people_delete' FROM user_grants WHERE area = 'people_edit' ON CONFLICT DO NOTHING")


def downgrade() -> None:
    op.execute("DELETE FROM user_grants WHERE area = 'people_delete'")
