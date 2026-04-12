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
from sat_backend.db.models import BuildingRecord, EventLogRecord, WorldStateRecord
from sat_backend.db.session import get_session
from sat_backend.extractor import ExtractorError, parse_save
from sat_backend.models import (
    Bottleneck,
    BottleneckSeverity,
    BottleneckType,
    BuildingState,
    ConsumerGroup,
    ConsumptionReport,
    EventCategory,
    EventLog,
    FactoryKPIs,
    KPIs,
    PowerKPIs,
    WorldState,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="SAT Backend", version="0.1.0")


# ── POST /api/v1/save/upload ─────────────────────────────────────────────────


@app.post(
    "/api/v1/save/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_save(
    file: UploadFile,
    session: AsyncSession = Depends(get_session),  # noqa: B008
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

    # ── Compute save-diff vs previous save ────────────────────────────────────
    prev_record = await session.scalar(
        select(WorldStateRecord)
        .where(WorldStateRecord.id != record.id)
        .order_by(WorldStateRecord.parsed_at.desc())
        .limit(1)
    )
    if prev_record is not None:
        events = _diff_world_states(
            record.id,
            WorldState.model_validate(prev_record.state_json),
            world_state,
        )
        session.add_all(events)

    await session.commit()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"id": record.id, "save_name": record.save_name},
    )


# ── Save-diff helper ─────────────────────────────────────────────────────────


def _building_key(b: object) -> tuple:
    """Stable key: (class_name, rounded x/y/z location)."""
    return (b.class_name, round(b.location.x, 0), round(b.location.y, 0), round(b.location.z, 0))  # type: ignore[attr-defined]


def _diff_world_states(
    new_save_id: int,
    prev: WorldState,
    curr: WorldState,
) -> list[EventLogRecord]:
    """Return EventLogRecord instances capturing the diff between two world states."""
    prev_map = {_building_key(b): b for b in prev.buildings}
    curr_map = {_building_key(b): b for b in curr.buildings}

    prev_keys = set(prev_map)
    curr_keys = set(curr_map)

    events: list[EventLogRecord] = []

    for key in curr_keys - prev_keys:
        b = curr_map[key]
        events.append(
            EventLogRecord(
                save_id=new_save_id,
                category=EventCategory.construction,
                event_type="machine_added",
                payload={
                    "className": b.class_name,
                    "friendlyName": b.friendly_name,
                    "recipe": b.recipe,
                    "floorId": b.floor_id,
                    "location": {"x": b.location.x, "y": b.location.y, "z": b.location.z},
                },
            )
        )

    for key in prev_keys - curr_keys:
        b = prev_map[key]
        events.append(
            EventLogRecord(
                save_id=new_save_id,
                category=EventCategory.construction,
                event_type="machine_removed",
                payload={
                    "className": b.class_name,
                    "friendlyName": b.friendly_name,
                    "recipe": b.recipe,
                    "floorId": b.floor_id,
                    "location": {"x": b.location.x, "y": b.location.y, "z": b.location.z},
                },
            )
        )

    for key in prev_keys & curr_keys:
        pb, cb = prev_map[key], curr_map[key]
        if pb.recipe != cb.recipe:
            events.append(
                EventLogRecord(
                    save_id=new_save_id,
                    category=EventCategory.state_change,
                    event_type="recipe_changed",
                    payload={
                        "className": cb.class_name,
                        "friendlyName": cb.friendly_name,
                        "floorId": cb.floor_id,
                        "previousRecipe": pb.recipe,
                        "newRecipe": cb.recipe,
                        "location": {"x": cb.location.x, "y": cb.location.y, "z": cb.location.z},
                    },
                )
            )

    # Power grid changes
    prev_grids = {pg.id: pg for pg in prev.power_grids}
    curr_grids = {pg.id: pg for pg in curr.power_grids}
    for gid, cpg in curr_grids.items():
        ppg = prev_grids.get(gid)
        if ppg is None:
            events.append(
                EventLogRecord(
                    save_id=new_save_id,
                    category=EventCategory.state_change,
                    event_type="power_grid_added",
                    payload={"gridId": gid, "productionMw": cpg.production, "consumptionMw": cpg.consumption},
                )
            )
        elif abs(cpg.production - ppg.production) > 0.5 or abs(cpg.consumption - ppg.consumption) > 0.5:
            events.append(
                EventLogRecord(
                    save_id=new_save_id,
                    category=EventCategory.state_change,
                    event_type="power_grid_changed",
                    payload={
                        "gridId": gid,
                        "prevProductionMw": ppg.production,
                        "newProductionMw": cpg.production,
                        "prevConsumptionMw": ppg.consumption,
                        "newConsumptionMw": cpg.consumption,
                    },
                )
            )

    return events


# ── GET /api/v1/save/latest ──────────────────────────────────────────────────


@app.get("/api/v1/save/latest", response_model=WorldState)
async def get_latest_save(
    session: AsyncSession = Depends(get_session),  # noqa: B008
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
    session: AsyncSession = Depends(get_session),  # noqa: B008
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
    session: AsyncSession = Depends(get_session),  # noqa: B008
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


# ── GET /api/v1/kpis ─────────────────────────────────────────────────────────


@app.get("/api/v1/kpis", response_model=KPIs)
async def get_kpis(
    save_id: int | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> KPIs:
    """Return KPI snapshot for the latest save (or a specific save_id).

    KPIs computed:
    - Power: produced/consumed/surplus MW, fuse state
    - Factory: building counts by state, global efficiency %, somersloops slotted
    """
    if save_id is not None:
        record = await session.get(WorldStateRecord, save_id)
    else:
        record = await session.scalar(
            select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
        )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")

    state = WorldState.model_validate(record.state_json)

    # ── Power KPIs ────────────────────────────────────────────────────────────
    total_produced = sum(pg.production for pg in state.power_grids)
    total_consumed = sum(pg.consumption for pg in state.power_grids)
    any_fuse       = any(pg.fuse_tripped for pg in state.power_grids)

    power = PowerKPIs(
        producedMw=round(total_produced, 2),
        consumedMw=round(total_consumed, 2),
        surplusMw=round(total_produced - total_consumed, 2),
        fuseTripped=any_fuse,
        gridCount=len(state.power_grids),
    )

    # ── Factory KPIs ──────────────────────────────────────────────────────────
    active_buildings  = [b for b in state.buildings if b.state == BuildingState.active]
    idle_buildings    = [b for b in state.buildings if b.state == BuildingState.idle]
    paused_buildings  = [b for b in state.buildings if b.state == BuildingState.paused]
    off_buildings     = [b for b in state.buildings if b.state == BuildingState.off]
    somersloops_total = sum(b.somersloops for b in state.buildings)

    efficiency = (
        sum(b.overclock for b in active_buildings) / len(active_buildings)
        if active_buildings
        else 0.0
    )

    factory = FactoryKPIs(
        totalBuildings=len(state.buildings),
        activeBuildings=len(active_buildings),
        idleBuildings=len(idle_buildings),
        pausedBuildings=len(paused_buildings),
        offBuildings=len(off_buildings),
        efficiencyPct=round(efficiency, 1),
        somersloopsSlotted=somersloops_total,
    )

    return KPIs(
        saveName=state.save_name,
        saveId=record.id,
        playTimeHours=round(state.play_time / 3600, 2),
        power=power,
        factory=factory,
    )


# ── GET /api/v1/analyze/bottlenecks ──────────────────────────────────────────


@app.get("/api/v1/analyze/bottlenecks", response_model=list[Bottleneck])
async def get_bottlenecks(
    save_id: int | None = None,
    overclock_threshold: int = 70,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[Bottleneck]:
    """Identify production bottlenecks in the latest (or specified) save.

    Detects:
    - idle_with_recipe: building has a recipe but state is idle (input starvation)
    - underclocked: building running below *overclock_threshold*% (default 70)
    - paused: building explicitly paused
    - fuse_tripped: any power grid has its fuse tripped

    Results are sorted by severity (critical first).
    """
    if save_id is not None:
        record = await session.get(WorldStateRecord, save_id)
    else:
        record = await session.scalar(
            select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
        )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")

    state = WorldState.model_validate(record.state_json)
    bottlenecks: list[Bottleneck] = []

    # Power fuse trips (one entry per tripped grid)
    for pg in state.power_grids:
        if pg.fuse_tripped:
            bottlenecks.append(
                Bottleneck(
                    type=BottleneckType.fuse_tripped,
                    severity=BottleneckSeverity.critical,
                    className="PowerGrid",
                    friendlyName=f"Réseau électrique #{pg.id}",
                    recipeName=None,
                    floorId=None,
                    overclock=None,
                    message=(
                        f"Fusible déclenché sur le réseau #{pg.id} "
                        f"({pg.consumption:.0f} MW consommés / {pg.production:.0f} MW produits)"
                    ),
                )
            )

    # Building-level bottlenecks
    for b in state.buildings:
        if b.state == BuildingState.idle and b.recipe:
            bottlenecks.append(
                Bottleneck(
                    type=BottleneckType.idle_with_recipe,
                    severity=BottleneckSeverity.critical,
                    className=b.class_name,
                    friendlyName=b.friendly_name,
                    recipeName=b.recipe_name,
                    floorId=b.floor_id,
                    overclock=b.overclock,
                    message=(
                        f"{b.friendly_name} inactif — recette «{b.recipe_name}» non alimentée"
                        if b.recipe_name
                        else f"{b.friendly_name} inactif (recette manquante)"
                    ),
                )
            )
        elif b.state == BuildingState.paused and b.recipe:
            bottlenecks.append(
                Bottleneck(
                    type=BottleneckType.paused,
                    severity=BottleneckSeverity.warning,
                    className=b.class_name,
                    friendlyName=b.friendly_name,
                    recipeName=b.recipe_name,
                    floorId=b.floor_id,
                    overclock=b.overclock,
                    message=f"{b.friendly_name} en pause",
                )
            )
        elif b.state == BuildingState.active and b.overclock < overclock_threshold:
            bottlenecks.append(
                Bottleneck(
                    type=BottleneckType.underclocked,
                    severity=BottleneckSeverity.warning,
                    className=b.class_name,
                    friendlyName=b.friendly_name,
                    recipeName=b.recipe_name,
                    floorId=b.floor_id,
                    overclock=b.overclock,
                    message=(
                        f"{b.friendly_name} sous-cadencé à {b.overclock}% "
                        f"(seuil: {overclock_threshold}%)"
                    ),
                )
            )

    severity_order = {
        BottleneckSeverity.critical: 0,
        BottleneckSeverity.warning:  1,
        BottleneckSeverity.info:     2,
    }
    bottlenecks.sort(key=lambda x: severity_order[x.severity])

    return bottlenecks


# ── GET /api/v1/analyze/consumption ──────────────────────────────────────────


@app.get("/api/v1/analyze/consumption", response_model=ConsumptionReport)
async def get_consumption(
    save_id: int | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> ConsumptionReport:
    """Return a power-consumption waste report for the latest (or specified) save.

    For each (machine-type, recipe) group the report provides:
    - active vs idle building counts
    - average overclock of active buildings
    - idle_waste_score: sum of overclock% across idle machines (higher = more wasted capacity)
    - idle_waste_pct: fraction of the group that is idle

    Groups are sorted by idle_waste_score descending so the biggest wasters appear first.
    """
    if save_id is not None:
        record = await session.get(WorldStateRecord, save_id)
    else:
        record = await session.scalar(
            select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
        )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")

    state = WorldState.model_validate(record.state_json)

    from collections import defaultdict

    groups: dict[tuple, list] = defaultdict(list)
    for b in state.buildings:
        groups[(b.class_name, b.recipe)].append(b)

    consumer_groups: list[ConsumerGroup] = []
    for (class_name, recipe), members in groups.items():
        active = [b for b in members if b.state == BuildingState.active]
        idle   = [b for b in members if b.state == BuildingState.idle]

        avg_overclock    = sum(b.overclock for b in active) / len(active) if active else 0.0
        idle_waste_score = sum(b.overclock for b in idle)
        idle_waste_pct   = round(len(idle) / len(members) * 100, 1)

        representative = members[0]
        consumer_groups.append(
            ConsumerGroup(
                className=class_name,
                friendlyName=representative.friendly_name,
                recipeName=representative.recipe_name if recipe else None,
                totalCount=len(members),
                activeCount=len(active),
                idleCount=len(idle),
                avgOverclock=round(avg_overclock, 1),
                idleWasteScore=float(idle_waste_score),
                idleWastePct=idle_waste_pct,
            )
        )

    consumer_groups.sort(key=lambda g: (-g.idle_waste_score, g.class_name))

    total_buildings = len(state.buildings)
    idle_buildings  = sum(1 for b in state.buildings if b.state == BuildingState.idle)
    global_idle_pct = round(idle_buildings / total_buildings * 100, 1) if total_buildings else 0.0

    return ConsumptionReport(
        saveId=record.id,
        saveName=state.save_name,
        totalBuildings=total_buildings,
        idleBuildings=idle_buildings,
        idleWastePct=global_idle_pct,
        groups=consumer_groups,
    )


# ── GET /api/v1/events ────────────────────────────────────────────────────────


@app.get("/api/v1/events", response_model=list[EventLog])
async def list_events(
    save_id: int | None = None,
    category: EventCategory | None = None,
    event_type: str | None = None,
    limit: int = 100,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[EventLog]:
    """Query the event log with optional filters.

    Useful NL queries this supports:
    - "What did I build last session?" → category=construction, event_type=machine_added
    - "What recipes changed?" → event_type=recipe_changed
    - "What happened in save 5?" → save_id=5
    """
    q = select(EventLogRecord).order_by(EventLogRecord.occurred_at.desc()).limit(limit)
    if save_id is not None:
        q = q.where(EventLogRecord.save_id == save_id)
    if category is not None:
        q = q.where(EventLogRecord.category == category.value)
    if event_type is not None:
        q = q.where(EventLogRecord.event_type == event_type)

    rows = (await session.scalars(q)).all()
    return [
        EventLog(
            id=r.id,
            saveId=r.save_id,
            category=r.category,
            eventType=r.event_type,
            payload=r.payload,
            occurredAt=r.occurred_at,
        )
        for r in rows
    ]


# ── GET /api/v1/events/diff/{save_id} ────────────────────────────────────────


@app.get("/api/v1/events/diff/{save_id}", response_model=list[EventLog])
async def get_save_diff(
    save_id: int,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> list[EventLog]:
    """Return the diff events computed when save_id was uploaded.

    These events represent what changed since the previous save
    (machines added/removed, recipes changed, power grid changes).
    """
    record = await session.get(WorldStateRecord, save_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Save {save_id} not found"
        )

    rows = (
        await session.scalars(
            select(EventLogRecord)
            .where(EventLogRecord.save_id == save_id)
            .where(
                EventLogRecord.category.in_([
                    EventCategory.construction.value,
                    EventCategory.state_change.value,
                ])
            )
            .order_by(EventLogRecord.occurred_at.asc())
        )
    ).all()

    return [
        EventLog(
            id=r.id,
            saveId=r.save_id,
            category=r.category,
            eventType=r.event_type,
            payload=r.payload,
            occurredAt=r.occurred_at,
        )
        for r in rows
    ]
