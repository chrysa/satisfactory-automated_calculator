from __future__ import annotations

import hashlib
import logging
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sat_backend.config import get_settings
from sat_backend.db.models import BuildingRecord, WorldStateRecord
from sat_backend.db.session import get_session
from sat_backend.extractor import ExtractorError, parse_save
from sat_backend.models import WorldState

logger = logging.getLogger(__name__)

app = FastAPI(title="SAT Backend", version="0.1.0")


# ── POST /api/v1/save/upload ─────────────────────────────────────────────────


@app.post(
    "/api/v1/save/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_save(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> JSONResponse:
    """Upload a Satisfactory .sav file, parse it and store the world state."""
    raw = await file.read()
    save_hash = hashlib.sha256(raw).hexdigest()

    # Deduplication
    existing = await session.scalar(
        select(WorldStateRecord).where(WorldStateRecord.save_hash == save_hash)
    )
    if existing is not None:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"id": existing.id, "detail": "already imported"},
        )

    # Write to temp file for the Node.js subprocess
    settings = get_settings()
    with tempfile.NamedTemporaryFile(suffix=".sav", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = Path(tmp.name)

    try:
        world_state = parse_save(
            tmp_path,
            node_bin=settings.node_bin,
            script_path=settings.node_script_path,
        )
    except ExtractorError as exc:
        logger.exception("Extractor failed for upload %s", save_hash[:8])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    record = WorldStateRecord(
        save_hash=save_hash,
        save_name=world_state.save_name,
        play_time=int(world_state.play_time),
        state_json=world_state.model_dump(by_alias=True),
    )
    session.add(record)
    await session.flush()  # populate record.id

    buildings = [
        BuildingRecord(
            world_id=record.id,
            class_name=b.class_name,
            friendly_name=b.friendly_name,
            state=b.state.value,
            overclock=b.overclock,
            recipe=b.recipe,
            floor_id=b.floor_id,
            somersloops=b.somersloops,
        )
        for b in world_state.buildings
    ]
    session.add_all(buildings)
    await session.commit()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"id": record.id, "save_name": record.save_name},
    )


# ── GET /api/v1/save/latest ──────────────────────────────────────────────────


@app.get("/api/v1/save/latest", response_model=WorldState)
async def get_latest_save(
    session: AsyncSession = Depends(get_session),
) -> WorldState:
    """Return the most recently imported world state."""
    record = await session.scalar(
        select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")
    return WorldState.model_validate(record.state_json)


# ── GET /api/v1/save/{save_id} ───────────────────────────────────────────────


@app.get("/api/v1/save/{save_id}", response_model=WorldState)
async def get_save(
    save_id: int,
    session: AsyncSession = Depends(get_session),
) -> WorldState:
    """Return a specific world state by its database ID."""
    record = await session.get(WorldStateRecord, save_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Save {save_id} not found"
        )
    return WorldState.model_validate(record.state_json)


# ── GET /api/v1/buildings ────────────────────────────────────────────────────


@app.get("/api/v1/buildings")
async def list_buildings(
    world_id: int | None = None,
    recipe: str | None = None,
    state: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Query buildings with optional filters."""
    q = select(BuildingRecord)
    if world_id is not None:
        q = q.where(BuildingRecord.world_id == world_id)
    if recipe is not None:
        q = q.where(BuildingRecord.recipe == recipe)
    if state is not None:
        q = q.where(BuildingRecord.state == state)

    rows = (await session.scalars(q)).all()
    return [
        {
            "id": r.id,
            "world_id": r.world_id,
            "class_name": r.class_name,
            "friendly_name": r.friendly_name,
            "state": r.state,
            "overclock": r.overclock,
            "recipe": r.recipe,
            "floor_id": r.floor_id,
            "somersloops": r.somersloops,
        }
        for r in rows
    ]
