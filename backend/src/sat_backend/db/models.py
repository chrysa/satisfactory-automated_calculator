from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship



class Base(DeclarativeBase):
    pass


class WorldStateRecord(Base):
    __tablename__ = "world_states"
    __table_args__ = (
        Index("idx_world_states_save_hash", "save_hash"),
        Index("idx_world_states_parsed_at", "parsed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    save_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    save_name: Mapped[str] = mapped_column(Text, nullable=False)
    play_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parsed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    state_json: Mapped[dict] = mapped_column(JSONB, nullable=False)

    buildings: Mapped[list[BuildingRecord]] = relationship(
        "BuildingRecord",
        back_populates="world_state",
        cascade="all, delete-orphan",
    )


class BuildingRecord(Base):
    __tablename__ = "buildings"
    __table_args__ = (
        Index("idx_buildings_world_id", "world_id"),
        Index("idx_buildings_recipe", "recipe"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    world_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("world_states.id", ondelete="CASCADE"),
        nullable=False,
    )
    class_name: Mapped[str] = mapped_column(Text, nullable=False)
    friendly_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str | None] = mapped_column(Text, nullable=True)
    overclock: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    recipe: Mapped[str | None] = mapped_column(Text, nullable=True)
    floor_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    power_mw: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    somersloops: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)

    world_state: Mapped[WorldStateRecord] = relationship(
        "WorldStateRecord", back_populates="buildings"
    )


class EventLogRecord(Base):
    """One logged event (state-change diff, construction, etc.) tied to a save upload."""

    __tablename__ = "event_logs"
    __table_args__ = (
        Index("idx_event_logs_save_id", "save_id"),
        Index("idx_event_logs_category", "category"),
        Index("idx_event_logs_event_type", "event_type"),
        Index("idx_event_logs_occurred_at", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    save_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("world_states.id", ondelete="CASCADE"),
        nullable=False,
    )
    # category: state_change | construction | unlock | objective | recommendation
    category: Mapped[str] = mapped_column(Text, nullable=False)
    # event_type: machine_added | machine_removed | recipe_changed | power_grid_changed | …
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
