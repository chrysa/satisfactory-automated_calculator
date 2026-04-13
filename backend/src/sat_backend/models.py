from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Location(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class BuildingState(StrEnum):
    active = "active"
    idle = "idle"
    paused = "paused"
    off = "off"


class Building(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    class_name: str = Field(alias="className")
    friendly_name: str = Field(alias="friendlyName")
    location: Location
    floor_id: str | None = Field(None, alias="floorId")
    state: BuildingState = BuildingState.idle
    overclock: int = 100
    recipe: str | None = None
    recipe_name: str | None = Field(None, alias="recipeName")
    somersloops: int = 0
    purity: str = "normal"


class PowerGrid(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    production: float = 0.0
    consumption: float = 0.0
    battery_buffer: float = Field(0.0, alias="batteryBuffer")
    fuse_tripped: bool = Field(False, alias="fuseTripped")


class WorldState(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    save_name: str = Field(alias="saveName")
    save_version: int = Field(0, alias="saveVersion")
    play_time: float = Field(0.0, alias="playTime")
    parsed_at: str = Field(alias="parsedAt")
    buildings: list[Building]
    power_grids: list[PowerGrid] = Field(default_factory=list, alias="powerGrids")


# ── KPI models ────────────────────────────────────────────────────────────────


class PowerKPIs(BaseModel):
    """Power balance KPIs derived from all power grids in the save."""

    model_config = ConfigDict(populate_by_name=True)

    produced_mw: float = Field(alias="producedMw")
    consumed_mw: float = Field(alias="consumedMw")
    surplus_mw: float = Field(alias="surplusMw")
    fuse_tripped: bool = Field(alias="fuseTripped")
    grid_count: int = Field(alias="gridCount")


class FactoryKPIs(BaseModel):
    """Factory-level KPIs: building counts and efficiency."""

    model_config = ConfigDict(populate_by_name=True)

    total_buildings: int = Field(alias="totalBuildings")
    active_buildings: int = Field(alias="activeBuildings")
    idle_buildings: int = Field(alias="idleBuildings")
    paused_buildings: int = Field(alias="pausedBuildings")
    off_buildings: int = Field(alias="offBuildings")
    efficiency_pct: float = Field(alias="efficiencyPct")
    somersloops_slotted: int = Field(alias="somersloopsSlotted")


class KPIs(BaseModel):
    """Full KPI snapshot for the latest (or specified) save."""

    model_config = ConfigDict(populate_by_name=True)

    save_name: str = Field(alias="saveName")
    save_id: int = Field(alias="saveId")
    play_time_hours: float = Field(alias="playTimeHours")
    power: PowerKPIs
    factory: FactoryKPIs


# ── Bottleneck models ─────────────────────────────────────────────────────────


class BottleneckSeverity(StrEnum):
    critical = "critical"
    warning = "warning"
    info = "info"


class BottleneckType(StrEnum):
    idle_with_recipe = "idle_with_recipe"
    underclocked = "underclocked"
    paused = "paused"
    fuse_tripped = "fuse_tripped"


class Bottleneck(BaseModel):
    """A single detected production bottleneck."""

    model_config = ConfigDict(populate_by_name=True)

    type: BottleneckType
    severity: BottleneckSeverity
    class_name: str = Field(alias="className")
    friendly_name: str = Field(alias="friendlyName")
    recipe_name: str | None = Field(None, alias="recipeName")
    floor_id: str | None = Field(None, alias="floorId")
    overclock: int | None = None
    message: str


# ── FICSIT optimizer models ───────────────────────────────────────────────────


class FicsitEntry(BaseModel):
    """Estimated AWESOME Sink output for one (machine-type × recipe) group."""

    model_config = ConfigDict(populate_by_name=True)

    class_name: str = Field(alias="className")
    friendly_name: str = Field(alias="friendlyName")
    recipe_name: str | None = Field(None, alias="recipeName")
    machine_count: int = Field(alias="machineCount")
    active_count: int = Field(alias="activeCount")
    avg_overclock: float = Field(alias="avgOverclock")
    somersloops: int = Field(description="Total somersloops slotted across all machines in this group.")
    est_points_per_min: float | None = Field(
        None,
        alias="estPointsPerMin",
        description="Estimated AWESOME Sink points/min. Null when recipe not in static lookup.",
    )
    output_item: str | None = Field(
        None,
        alias="outputItem",
        description="Primary sinkable output item name (from static lookup).",
    )
    sink_pts_per_item: int | None = Field(
        None,
        alias="sinkPtsPerItem",
        description="AWESOME Sink point value per item unit.",
    )


class FicsitReport(BaseModel):
    """Full FICSIT / AWESOME Sink optimisation report."""

    model_config = ConfigDict(populate_by_name=True)

    save_id: int = Field(alias="saveId")
    save_name: str = Field(alias="saveName")
    awesome_sink_count: int = Field(
        alias="awesomeSinkCount",
        description="Number of AWESOME Sink buildings detected in the save.",
    )
    total_est_points_per_min: float = Field(
        alias="totalEstPointsPerMin",
        description="Sum of estimated points/min across all known recipe groups.",
    )
    entries: list[FicsitEntry] = Field(
        description="Groups ranked by estimated points/min descending."
    )
    unknown_recipes: int = Field(
        alias="unknownRecipes",
        description="Number of active recipe groups not in the static sink-point lookup.",
    )
