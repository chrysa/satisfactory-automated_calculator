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
