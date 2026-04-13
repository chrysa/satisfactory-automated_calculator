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
from sat_backend.models import (
    Bottleneck,
    BottleneckSeverity,
    BottleneckType,
    BuildingState,
    FactoryKPIs,
    KPIs,
    PowerKPIs,
    Recommendation,
    RecommendationCategory,
    RecommendationReport,
    RecommendationUrgency,
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
    await session.commit()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"id": record.id, "save_name": record.save_name},
    )


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


# ── Recommendation engine helper ──────────────────────────────────────────────

_URGENCY_ORDER = {
    RecommendationUrgency.foundational: 0,
    RecommendationUrgency.urgent:       1,
    RecommendationUrgency.optional:     2,
    RecommendationUrgency.future:       3,
}


def _build_recommendations(state: WorldState, overclock_threshold: int = 70) -> list[Recommendation]:
    """Synthesise factory-wide recommendations from a WorldState."""
    recs: list[Recommendation] = []

    # ── Power analysis ────────────────────────────────────────────────────────
    total_produced = sum(pg.production for pg in state.power_grids)
    total_consumed = sum(pg.consumption for pg in state.power_grids)
    surplus        = total_produced - total_consumed
    tripped_grids  = [pg for pg in state.power_grids if pg.fuse_tripped]

    for pg in tripped_grids:
        recs.append(Recommendation(
            urgency=RecommendationUrgency.foundational,
            category=RecommendationCategory.power,
            title=f"Fuse tripped — power grid #{pg.id}",
            message=(
                f"Grid #{pg.id} fuse has tripped: {pg.consumption:.0f} MW consumed "
                f"but only {pg.production:.0f} MW produced "
                f"({pg.consumption - pg.production:.0f} MW deficit). "
                "Add generators or shut down non-essential machines immediately."
            ),
            trigger="fuse_tripped",
            affected=[f"PowerGrid#{pg.id}"],
        ))

    if total_produced > 0 and not tripped_grids:
        surplus_pct = surplus / total_produced * 100
        if surplus_pct < 10:
            recs.append(Recommendation(
                urgency=RecommendationUrgency.urgent,
                category=RecommendationCategory.power,
                title=f"Power margin critical ({surplus_pct:.1f}% free)",
                message=(
                    f"Only {surplus:.0f} MW of headroom out of {total_produced:.0f} MW produced. "
                    "Any new machine risk tripping the fuse. Add generators before expanding."
                ),
                trigger="low_power_margin",
                affected=[f"PowerGrid#{pg.id}" for pg in state.power_grids],
            ))
        elif surplus_pct < 25:
            recs.append(Recommendation(
                urgency=RecommendationUrgency.optional,
                category=RecommendationCategory.power,
                title=f"Power margin below 25% ({surplus_pct:.1f}% free)",
                message=(
                    f"{surplus:.0f} MW free out of {total_produced:.0f} MW. "
                    "Consider adding generators before the next factory expansion."
                ),
                trigger="low_power_margin",
                affected=[f"PowerGrid#{pg.id}" for pg in state.power_grids],
            ))

    # ── Production analysis ───────────────────────────────────────────────────
    active  = [b for b in state.buildings if b.state == BuildingState.active]
    idle    = [b for b in state.buildings if b.state == BuildingState.idle]
    paused  = [b for b in state.buildings if b.state == BuildingState.paused]
    total   = len(state.buildings)

    idle_with_recipe   = [b for b in idle   if b.recipe]
    paused_with_recipe = [b for b in paused if b.recipe]

    if idle_with_recipe:
        idle_pct  = len(idle_with_recipe) / total * 100 if total else 0
        urgency   = (
            RecommendationUrgency.foundational if idle_pct > 20
            else RecommendationUrgency.urgent
        )
        floors    = sorted({b.floor_id for b in idle_with_recipe if b.floor_id})
        recs.append(Recommendation(
            urgency=urgency,
            category=RecommendationCategory.production,
            title=f"{len(idle_with_recipe)} machine(s) starved of input",
            message=(
                f"{len(idle_with_recipe)} machines have a recipe set but are idle — "
                "they are not receiving required input resources. "
                "Trace conveyor/pipe connections and check upstream production rates."
            ),
            trigger="idle_with_recipe",
            affected=(floors if floors else [b.class_name for b in idle_with_recipe[:8]]),
        ))

    if paused_with_recipe:
        recs.append(Recommendation(
            urgency=RecommendationUrgency.optional,
            category=RecommendationCategory.production,
            title=f"{len(paused_with_recipe)} machine(s) paused",
            message=(
                f"{len(paused_with_recipe)} machines are explicitly paused while having a recipe. "
                "Resume them if they should be part of an active chain."
            ),
            trigger="paused_machines",
            affected=sorted({b.floor_id or b.class_name for b in paused_with_recipe})[:8],
        ))

    # ── Efficiency analysis ───────────────────────────────────────────────────
    if active:
        avg_oc      = sum(b.overclock for b in active) / len(active)
        underclocked = [b for b in active if b.overclock < overclock_threshold]

        if avg_oc < 50:
            recs.append(Recommendation(
                urgency=RecommendationUrgency.urgent,
                category=RecommendationCategory.efficiency,
                title=f"Global efficiency very low ({avg_oc:.0f}%)",
                message=(
                    f"Active machines average only {avg_oc:.0f}% clock speed. "
                    "This may indicate intentional throttling or severe input constraints "
                    "across the entire factory."
                ),
                trigger="low_global_efficiency",
                affected=[],
            ))
        elif underclocked:
            affected_classes = sorted({b.class_name for b in underclocked})[:6]
            recs.append(Recommendation(
                urgency=RecommendationUrgency.optional,
                category=RecommendationCategory.efficiency,
                title=f"{len(underclocked)} machine(s) underclocked below {overclock_threshold}%",
                message=(
                    f"{len(underclocked)} active machines run below {overclock_threshold}% clock speed. "
                    "Check whether these are intentionally throttled; otherwise improving "
                    "input supply would allow running them at full speed."
                ),
                trigger="underclocked",
                affected=affected_classes,
            ))

    # ── Progression / all-clear ───────────────────────────────────────────────
    somersloops_active = sum(b.somersloops for b in active)
    machines_no_loop   = [b for b in active if b.somersloops == 0]
    if somersloops_active > 0 and machines_no_loop:
        recs.append(Recommendation(
            urgency=RecommendationUrgency.future,
            category=RecommendationCategory.efficiency,
            title="Somersloop slots available on key machines",
            message=(
                f"You have somersloops installed on some machines ({somersloops_active} total). "
                f"{len(machines_no_loop)} active machines have no somersloop — "
                "prioritise high-throughput bottleneck machines for the next slots."
            ),
            trigger="somersloop_opportunity",
            affected=[],
        ))

    if not recs:
        avg_oc_str = f"{sum(b.overclock for b in active) / len(active):.0f}%" if active else "N/A"
        recs.append(Recommendation(
            urgency=RecommendationUrgency.future,
            category=RecommendationCategory.progression,
            title="Factory healthy — ready to expand",
            message=(
                f"No critical issues detected. "
                f"Power surplus: {surplus:.0f} MW. "
                f"Global efficiency: {avg_oc_str}. "
                "Consider expanding production capacity or progressing to the next Space Elevator phase."
            ),
            trigger="healthy_factory",
            affected=[],
        ))

    recs.sort(key=lambda r: _URGENCY_ORDER[r.urgency])
    return recs


# ── GET /api/v1/analyze/recommendations ──────────────────────────────────────


@app.get("/api/v1/analyze/recommendations", response_model=RecommendationReport)
async def get_recommendations(
    save_id: int | None = None,
    overclock_threshold: int = 70,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> RecommendationReport:
    """Generate a prioritised recommendation report for the latest (or specified) save.

    Synthesises power, production, and efficiency data into urgency-ranked recommendations:

    | Urgency | Meaning |
    |---|---|
    | `foundational` | Blocks everything — fix immediately (fuse trip, mass starvation) |
    | `urgent` | Will cause problems soon (low power margin, many idle machines) |
    | `optional` | Improvement opportunity (underclocked machines, paused lines) |
    | `future` | Long-term suggestion or all-clear |

    Results are sorted foundational → urgent → optional → future.
    """
    from datetime import datetime, timezone

    if save_id is not None:
        record = await session.get(WorldStateRecord, save_id)
    else:
        record = await session.scalar(
            select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
        )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")

    state = WorldState.model_validate(record.state_json)
    recs  = _build_recommendations(state, overclock_threshold=overclock_threshold)

    return RecommendationReport(
        saveId=record.id,
        saveName=state.save_name,
        generatedAt=datetime.now(tz=timezone.utc),
        totalBuildings=len(state.buildings),
        recommendations=recs,
    )
