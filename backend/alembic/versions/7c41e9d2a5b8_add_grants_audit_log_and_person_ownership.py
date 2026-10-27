"""add grants, the audit log and who added a person

What a user may do is decided by rows in user_grants instead of the single `role` column, which is dropped: an old `admin` becomes the administrative staff's grants and an old
`editor` the theme owner's (app/services/grants.py has the presets).

Revision ID: 7c41e9d2a5b8
Revises: 26280013c0e2
Create Date: 2026-10-27 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '7c41e9d2a5b8'
down_revision: Union[str, None] = '26280013c0e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('user_grants',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('area', sa.String(length=20), nullable=False),
    sa.Column('theme_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("area = 'theme' OR theme_id IS NULL", name='ck_user_grants_theme_only_for_theme'),
    sa.ForeignKeyConstraint(['theme_id'], ['themes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'area', 'theme_id', name='uq_user_grants', postgresql_nulls_not_distinct=True)
    )
    op.create_index(op.f('ix_user_grants_user_id'), 'user_grants', ['user_id'], unique=False)
    op.create_table('audit_log',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('user_email', sa.String(length=254), nullable=False),
    sa.Column('action', sa.String(length=60), nullable=False),
    sa.Column('entity_type', sa.String(length=40), nullable=False),
    sa.Column('entity_key', sa.String(length=200), nullable=False),
    sa.Column('before', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('after', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_action'), 'audit_log', ['action'], unique=False)
    op.create_index(op.f('ix_audit_log_at'), 'audit_log', ['at'], unique=False)
    op.add_column('people', sa.Column('created_by_id', sa.Integer(), nullable=True))
    op.add_column('people', sa.Column('photo_consent_by_id', sa.Integer(), nullable=True))
    op.add_column('people', sa.Column('photo_consent_at', sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key('people_created_by_id_fkey', 'people', 'users', ['created_by_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('people_photo_consent_by_id_fkey', 'people', 'users', ['photo_consent_by_id'], ['id'], ondelete='SET NULL')

    # the accounts that exist keep what they could do
    op.execute("""
        INSERT INTO user_grants (user_id, area)
        SELECT users.id, area FROM users, unnest(ARRAY['people_add', 'people_edit', 'site', 'accounts']) AS area WHERE users.role = 'admin'
    """)
    op.execute("""
        INSERT INTO user_grants (user_id, area)
        SELECT users.id, area FROM users, unnest(ARRAY['people_add', 'theme']) AS area WHERE users.role = 'editor'
    """)
    op.drop_column('users', 'role')


def downgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(length=20), server_default='editor', nullable=False))
    op.alter_column('users', 'role', server_default=None)
    op.execute("UPDATE users SET role = 'admin' WHERE id IN (SELECT user_id FROM user_grants WHERE area = 'accounts')")
    op.drop_constraint('people_photo_consent_by_id_fkey', 'people', type_='foreignkey')
    op.drop_constraint('people_created_by_id_fkey', 'people', type_='foreignkey')
    op.drop_column('people', 'photo_consent_at')
    op.drop_column('people', 'photo_consent_by_id')
    op.drop_column('people', 'created_by_id')
    op.drop_index(op.f('ix_audit_log_at'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_action'), table_name='audit_log')
    op.drop_table('audit_log')
    op.drop_index(op.f('ix_user_grants_user_id'), table_name='user_grants')
    op.drop_table('user_grants')
