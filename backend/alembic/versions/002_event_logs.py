"""event_logs table — construction/state-change logging

Revision ID: 002
Revises: 001
Create Date: 2026-04-12
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "event_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("save_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["save_id"], ["world_states.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_event_logs_save_id", "event_logs", ["save_id"])
    op.create_index("idx_event_logs_category", "event_logs", ["category"])
    op.create_index("idx_event_logs_event_type", "event_logs", ["event_type"])
    op.create_index("idx_event_logs_occurred_at", "event_logs", ["occurred_at"])


def downgrade() -> None:
    op.drop_table("event_logs")
