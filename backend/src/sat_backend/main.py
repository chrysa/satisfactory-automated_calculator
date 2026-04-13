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
    FicsitEntry,
    FicsitReport,
    KPIs,
    PowerKPIs,
    WorldState,
)

logger = logging.getLogger(__name__)

# ── Static AWESOME Sink point data (Satisfactory 1.1) ────────────────────────
# recipe_class → (output_item_name, sink_pts_per_item, base_output_rate/min at OC=100%)
# Source: https://satisfactory.wiki.gg/wiki/AWESOME_Sink
_SINK_DATA: dict[str, tuple[str, int, float]] = {
    # Smelter
    "Recipe_IronIngot_C":               ("Iron Ingot",                2,   30.0),
    "Recipe_CopperIngot_C":             ("Copper Ingot",               6,   30.0),
    "Recipe_CateriumIngot_C":           ("Caterium Ingot",            15,   15.0),
    "Recipe_AluminumIngot_C":           ("Aluminum Ingot",             8,   60.0),
    # Constructor
    "Recipe_IronPlate_C":               ("Iron Plate",                 6,   20.0),
    "Recipe_IronRod_C":                 ("Iron Rod",                   4,   15.0),
    "Recipe_Screw_C":                   ("Screw",                      2,   40.0),
    "Recipe_Wire_C":                    ("Wire",                       6,   30.0),
    "Recipe_Cable_C":                   ("Cable",                     24,   30.0),
    "Recipe_Concrete_C":                ("Concrete",                  12,   45.0),
    "Recipe_Quickwire_C":               ("Quickwire",                  5,   60.0),
    "Recipe_Silica_C":                  ("Silica",                    10,   37.5),
    "Recipe_CopperSheet_C":             ("Copper Sheet",              24,   10.0),
    "Recipe_SteelBeam_C":               ("Steel Beam",                24,   15.0),
    "Recipe_SteelPipe_C":               ("Steel Pipe",                24,   20.0),
    "Recipe_AluminumCasing_C":          ("Aluminum Casing",           35,   60.0),
    # Assembler
    "Recipe_ReinforcedIronPlate_C":     ("Reinforced Iron Plate",    120,    5.0),
    "Recipe_Rotor_C":                   ("Rotor",                    140,    4.0),
    "Recipe_ModularFrame_C":            ("Modular Frame",            408,    2.0),
    "Recipe_EncasedIndustrialBeam_C":   ("Encased Industrial Beam",  480,    6.0),
    "Recipe_Motor_C":                   ("Motor",                   1520,    5.0),
    "Recipe_CircuitBoard_C":            ("Circuit Board",            696,    7.5),
    "Recipe_AILimiter_C":               ("AI Limiter",               920,    5.0),
    "Recipe_AlcladAluminumSheet_C":     ("Alclad Aluminum Sheet",    266,   30.0),
    "Recipe_HeatSink_C":                ("Heat Sink",                322,   10.0),
    # Manufacturer
    "Recipe_Computer_C":                ("Computer",               17260,    2.5),
    "Recipe_Supercomputer_C":           ("Supercomputer",          99576,    0.25),
    "Recipe_HighSpeedConnector_C":      ("High-Speed Connector",    3776,    3.75),
    "Recipe_ModularFrameHeavy_C":       ("Heavy Modular Frame",     3696,    2.0),
    "Recipe_TurboMotor_C":              ("Turbo Motor",            276900,   1.875),
    "Recipe_RadioControlUnit_C":        ("Radio Control Unit",      15760,   2.5),
    "Recipe_CoolingSystem_C":           ("Cooling System",          44720,   6.0),
    # Blender / Refinery
    "Recipe_Rubber_C":                  ("Rubber",                     6,   20.0),
    "Recipe_Plastic_C":                 ("Plastic",                    6,   20.0),
    "Recipe_PackagedWater_C":           ("Packaged Water",             7,   60.0),
}

# AWESOME Sink building class names
_AWESOME_SINK_CLASSES: frozenset[str] = frozenset({
    "Build_ResourceSink_C",
    "Build_AwesomeSink_C",
})

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


# ── GET /api/v1/analyze/ficsit ────────────────────────────────────────────────


@app.get("/api/v1/analyze/ficsit", response_model=FicsitReport)
async def get_ficsit(
    save_id: int | None = None,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> FicsitReport:
    """AWESOME Sink / FICSIT ticket optimisation report.

    Groups active buildings by (machine-type × recipe) and estimates AWESOME Sink
    points/min using embedded Satisfactory 1.1 sink-point data.

    **Estimation formula per group**:
    ```
    points/min = sink_pts_per_item × base_output_rate
                 × (avg_overclock / 100)
                 × (1 + somersloops_in_group)
    ```

    - Groups are ranked by estimated points/min descending (highest yield first).
    - `estPointsPerMin` is `null` for recipes not in the static lookup table.
    - AWESOME Sink buildings are counted separately (they consume items, not produce them).

    **Somersloops** double output (×2), which directly doubles sink points/min for the group.
    """
    from collections import defaultdict

    if save_id is not None:
        record = await session.get(WorldStateRecord, save_id)
    else:
        record = await session.scalar(
            select(WorldStateRecord).order_by(WorldStateRecord.parsed_at.desc()).limit(1)
        )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saves found")

    state = WorldState.model_validate(record.state_json)

    # Count AWESOME Sink buildings (they receive items — not producers)
    sink_count = sum(
        1 for b in state.buildings
        if any(cls in b.class_name for cls in _AWESOME_SINK_CLASSES)
    )

    # Group active + idle buildings by (class_name, recipe), exclude sinks
    groups: dict[tuple, list] = defaultdict(list)
    for b in state.buildings:
        if any(cls in b.class_name for cls in _AWESOME_SINK_CLASSES):
            continue
        if b.state in (BuildingState.active, BuildingState.idle):
            groups[(b.class_name, b.recipe)].append(b)

    entries: list[FicsitEntry] = []
    unknown_recipes = 0

    for (class_name, recipe), members in groups.items():
        active  = [b for b in members if b.state == BuildingState.active]
        if not active:
            continue

        avg_oc      = sum(b.overclock for b in active) / len(active)
        total_loops = sum(b.somersloops for b in active)

        sink_row = _SINK_DATA.get(recipe) if recipe else None

        if sink_row:
            output_item, pts_per_item, base_rate = sink_row
            # Somersloops double output (×2 per slotted machine)
            loop_multiplier = 1.0 + total_loops
            est_pts = pts_per_item * base_rate * len(active) * (avg_oc / 100) * loop_multiplier
        else:
            output_item = None
            pts_per_item = None
            est_pts = None
            if recipe:
                unknown_recipes += 1

        representative = members[0]
        entries.append(FicsitEntry(
            className=class_name,
            friendlyName=representative.friendly_name,
            recipeName=representative.recipe_name,
            machineCount=len(members),
            activeCount=len(active),
            avgOverclock=round(avg_oc, 1),
            somersloops=total_loops,
            estPointsPerMin=round(est_pts, 1) if est_pts is not None else None,
            outputItem=output_item,
            sinkPtsPerItem=pts_per_item,
        ))

    # Sort: known recipes by points desc, then unknowns (None) at the bottom
    entries.sort(key=lambda e: (e.est_points_per_min is None, -(e.est_points_per_min or 0)))

    total_pts = sum(e.est_points_per_min for e in entries if e.est_points_per_min is not None)

    return FicsitReport(
        saveId=record.id,
        saveName=state.save_name,
        awesomeSinkCount=sink_count,
        totalEstPointsPerMin=round(total_pts, 1),
        entries=entries,
        unknownRecipes=unknown_recipes,
    )
