from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from sat_backend.extractor import ExtractorError, parse_save

# ── Fixtures ──────────────────────────────────────────────────────────────────

_MINIMAL_WORLD_STATE: dict = {
    "saveName": "TestFactory",
    "saveVersion": 42,
    "playTime": 3600.0,
    "parsedAt": "2026-04-06T00:00:00.000Z",
    "buildings": [
        {
            "className": "Build_ConstructorMk1_C",
            "friendlyName": "Constructeur",
            "location": {"x": 100.0, "y": 200.0, "z": 300.0},
            "floorId": "Floor-1",
            "state": "active",
            "overclock": 100,
            "recipe": "Recipe_IronPlate_C",
            "recipeName": "Plaque de fer",
            "somersloops": 0,
            "purity": "normal",
        }
    ],
    "powerGrids": [
        {
            "id": 1,
            "production": 200.0,
            "consumption": 150.0,
            "batteryBuffer": 0.0,
            "fuseTripped": False,
        }
    ],
}

_SCRIPT = Path("scripts/parse-save-json.js")


def _mock_run(returncode: int, stdout: str, stderr: str = "") -> MagicMock:
    m = MagicMock()
    m.returncode = returncode
    m.stdout = stdout
    m.stderr = stderr
    return m


# ── Tests — happy path ────────────────────────────────────────────────────────


def test_parse_save_returns_world_state(tmp_path: Path) -> None:
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(_MINIMAL_WORLD_STATE)),
    ):
        state = parse_save(save_file, script_path=_SCRIPT)

    assert state.save_name == "TestFactory"
    assert state.save_version == 42
    assert state.play_time == pytest.approx(3600.0)


def test_parse_save_buildings(tmp_path: Path) -> None:
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(_MINIMAL_WORLD_STATE)),
    ):
        state = parse_save(save_file, script_path=_SCRIPT)

    assert len(state.buildings) == 1
    b = state.buildings[0]
    assert b.class_name == "Build_ConstructorMk1_C"
    assert b.friendly_name == "Constructeur"
    assert b.floor_id == "Floor-1"
    assert b.overclock == 100
    assert b.recipe == "Recipe_IronPlate_C"
    assert b.recipe_name == "Plaque de fer"
    assert b.somersloops == 0


def test_parse_save_power_grids(tmp_path: Path) -> None:
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(_MINIMAL_WORLD_STATE)),
    ):
        state = parse_save(save_file, script_path=_SCRIPT)

    assert len(state.power_grids) == 1
    pg = state.power_grids[0]
    assert pg.id == 1
    assert pg.production == pytest.approx(200.0)
    assert pg.consumption == pytest.approx(150.0)
    assert pg.fuse_tripped is False


def test_parse_save_floor_id_none(tmp_path: Path) -> None:
    data = {**_MINIMAL_WORLD_STATE}
    data["buildings"] = [{**data["buildings"][0], "floorId": None}]
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(data)),
    ):
        state = parse_save(save_file, script_path=_SCRIPT)

    assert state.buildings[0].floor_id is None


def test_parse_save_empty_buildings(tmp_path: Path) -> None:
    data = {**_MINIMAL_WORLD_STATE, "buildings": [], "powerGrids": []}
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(data)),
    ):
        state = parse_save(save_file, script_path=_SCRIPT)

    assert state.buildings == []
    assert state.power_grids == []


# ── Tests — error paths ───────────────────────────────────────────────────────


def test_parse_save_parser_nonzero_exit(tmp_path: Path) -> None:
    save_file = tmp_path / "bad.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(1, "", "File not found: bad.sav"),
    ):
        with pytest.raises(ExtractorError, match="exited with code 1"):
            parse_save(save_file, script_path=_SCRIPT)


def test_parse_save_invalid_json(tmp_path: Path) -> None:
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, "this is not json"),
    ):
        with pytest.raises(ExtractorError, match="Invalid JSON"):
            parse_save(save_file, script_path=_SCRIPT)


def test_parse_save_missing_required_field(tmp_path: Path) -> None:
    data = {k: v for k, v in _MINIMAL_WORLD_STATE.items() if k != "saveName"}
    save_file = tmp_path / "test.sav"
    save_file.touch()

    with patch(
        "sat_backend.extractor.subprocess.run",
        return_value=_mock_run(0, json.dumps(data)),
    ):
        with pytest.raises(Exception):  # noqa: B017 — pydantic ValidationError
            parse_save(save_file, script_path=_SCRIPT)
