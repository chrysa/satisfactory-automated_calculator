"""initial schema: world_states and buildings tables

Revision ID: 001
Revises:
Create Date: 2026-04-06
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "world_states",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("save_hash", sa.String(length=64), nullable=False),
        sa.Column("save_name", sa.Text(), nullable=False),
        sa.Column("play_time", sa.Integer(), nullable=True),
        sa.Column(
            "parsed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("state_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("save_hash"),
    )
    op.create_index("idx_world_states_save_hash", "world_states", ["save_hash"])
    op.create_index("idx_world_states_parsed_at", "world_states", ["parsed_at"])

    op.create_table(
        "buildings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("world_id", sa.Integer(), nullable=False),
        sa.Column("class_name", sa.Text(), nullable=False),
        sa.Column("friendly_name", sa.Text(), nullable=True),
        sa.Column("state", sa.Text(), nullable=True),
        sa.Column("overclock", sa.SmallInteger(), nullable=True),
        sa.Column("recipe", sa.Text(), nullable=True),
        sa.Column("floor_id", sa.Text(), nullable=True),
        sa.Column("power_mw", sa.Numeric(10, 2), nullable=True),
        sa.Column("somersloops", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["world_id"], ["world_states.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_buildings_world_id", "buildings", ["world_id"])
    op.create_index("idx_buildings_recipe", "buildings", ["recipe"])


def downgrade() -> None:
    op.drop_table("buildings")
    op.drop_table("world_states")
