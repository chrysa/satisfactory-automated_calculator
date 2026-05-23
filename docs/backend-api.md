# S.A.T. Backend — API Reference

**Version**: 0.1.0 | **Stack**: Python 3.12 · FastAPI · PostgreSQL · Node.js 22

Interactive docs (Swagger UI): `http://localhost:8000/docs`  
OpenAPI schema: `http://localhost:8000/openapi.json`  
ReDoc: `http://localhost:8000/redoc`

---

## Table of Contents

- [Architecture](#architecture)
- [Data Model](#data-model)
- [Quick Start](#quick-start)
  - [Docker (recommended)](#docker-recommended)
  - [Local development](#local-development)
- [Configuration](#configuration)
- [Endpoints](#endpoints)
  - [Saves](#saves)
  - [Buildings](#buildings)
  - [KPIs](#kpis)
  - [Analysis](#analysis)
  - [Events](#events)
- [Database Migrations](#database-migrations)
- [Error Responses](#error-responses)

---

## Architecture

```
Satisfactory game
    └── .sav binary file
             │
             ▼  POST /api/v1/save/upload
         FastAPI (Python 3.12)
             │
             ├── scripts/parse-save-json.js   ← Node.js subprocess
             │       (satisfactory-file-parser)
             │       .sav → JSON WorldState
             │
             ├── PostgreSQL  (fact store)
             │       world_states  — one row per unique save
             │       buildings     — denormalised machine table
             │       event_logs    — save diffs & construction history
             │
             └── Analysis endpoints
                     /kpis            power + factory snapshot
                     /analyze/bottlenecks
                     /analyze/consumption
                     /events          construction & state-change log
```

The Node.js parser runs as a **subprocess**: Python shells out to
`node scripts/parse-save-json.js <path>` and reads back a JSON world state.
This avoids reimplementing the complex Unreal Engine 5 binary format in Python.

---

## Data Model

### WorldState

The root object stored on each upload.

| Field | Type | Description |
|---|---|---|
| `saveName` | `string` | Save slot name |
| `saveVersion` | `int` | Satisfactory binary version |
| `playTime` | `float` | Total play time in **seconds** |
| `parsedAt` | `datetime` | When the save was imported |
| `buildings` | `Building[]` | All factory machines |
| `powerGrids` | `PowerGrid[]` | Independent power circuits |

### Building

| Field | Type | Description |
|---|---|---|
| `className` | `string` | Unreal class, e.g. `Build_Constructor_C` |
| `friendlyName` | `string` | Human-readable name |
| `location` | `{x, y, z}` | World coordinates |
| `floorId` | `string\|null` | Priority Power Switch tag (= production line) |
| `state` | `active\|idle\|paused\|off` | Operational state |
| `overclock` | `int` | Clock speed % (1–250) |
| `recipe` | `string\|null` | Recipe class name |
| `recipeName` | `string\|null` | Human-readable recipe name |
| `somersloops` | `int` | Number of somersloops slotted (0–4) |
| `purity` | `string` | Node purity for extractors |

### PowerGrid

| Field | Type | Description |
|---|---|---|
| `id` | `int` | Grid index |
| `production` | `float` | MW produced |
| `consumption` | `float` | MW consumed |
| `batteryBuffer` | `float` | MWh stored in batteries |
| `fuseTripped` | `bool` | Whether the fuse has tripped |

---

## Quick Start

### Docker (recommended)

Requires Docker + Docker Compose v2.

```bash
docker compose up --build
```

Services started:
- `db` — PostgreSQL 16 on port 5432
- `api` — FastAPI on port 8000 (with auto-reload)

Migrations run automatically on API startup (`alembic upgrade head`).

**Upload a save:**

```bash
curl -X POST http://localhost:8000/api/v1/save/upload \
  -F "file=@/path/to/MySave.sav"
```

### Local development

**Prerequisites**: Python 3.12, Node.js 22, PostgreSQL 16 running.

```bash
# 1. Create the database
psql -U postgres -c "CREATE USER sat WITH PASSWORD 'sat';"
psql -U postgres -c "CREATE DATABASE sat OWNER sat;"

# 2. Install Python deps (editable)
pip install -e "backend"

# 3. Run migrations
cd backend
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" \
  python -m alembic upgrade head

# 4. Start the server
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" \
  python -m uvicorn sat_backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Configuration

All settings are read from environment variables (prefix `SAT_`) or a `.env` file.

| Variable | Default | Description |
|---|---|---|
| `SAT_DATABASE_URL` | `postgresql+asyncpg://sat:sat@localhost:5432/sat` | Async PostgreSQL connection string |
| `SAT_NODE_BIN` | `node` | Path to the Node.js binary |
| `SAT_NODE_SCRIPT_PATH` | `<project_root>/scripts/parse-save-json.js` | Path to the parser script |

The project root is resolved automatically as 4 levels up from
`backend/src/sat_backend/config.py`.

---

## Endpoints

### Saves

#### `POST /api/v1/save/upload`

Upload a `.sav` file. Deduplication is SHA-256 based: re-uploading the same file
returns `HTTP 200` without re-parsing.

**Request**: `multipart/form-data`, field `file` — the binary `.sav` file.

**Responses**

| Status | Meaning |
|---|---|
| `201 Created` | New save imported; returns `{id, save_name}` |
| `200 OK` | Duplicate — already imported; returns `{id, detail: "already imported"}` |
| `422 Unprocessable Entity` | Parsing failed — not a valid `.sav` |

**Side effects on 201**:
- Buildings written to `buildings` table
- Save-diff computed vs previous save → events written to `event_logs`

---

#### `GET /api/v1/save/latest`

Return the full `WorldState` of the most recently uploaded save.

**Response**: `WorldState` or `404` if no saves exist.

---

#### `GET /api/v1/save/{save_id}`

Return the full `WorldState` for a specific save.

**Path param**: `save_id` — integer database ID.

**Response**: `WorldState` or `404`.

---

### Buildings

#### `GET /api/v1/buildings`

Query the denormalised building table. All filters are optional and combinable.

**Query params**

| Param | Type | Description |
|---|---|---|
| `world_id` | `int` | Filter by save ID |
| `recipe` | `string` | Exact recipe class name, e.g. `Recipe_IronIngot_C` |
| `state` | `string` | `active`, `idle`, `paused` or `off` |

**Response**: `BuildingRow[]`

```json
[
  {
    "id": 1,
    "world_id": 3,
    "class_name": "Build_Constructor_C",
    "friendly_name": "Constructeur",
    "state": "active",
    "overclock": 100,
    "recipe": "Recipe_IronIngot_C",
    "floor_id": "Iron Floor",
    "somersloops": 0
  }
]
```

---

### KPIs

#### `GET /api/v1/kpis`

Return a KPI snapshot for the latest save (or a specific one).

**Query params**

| Param | Type | Description |
|---|---|---|
| `save_id` | `int` | Optional — defaults to latest |

**Response**: `KPIs`

```json
{
  "saveName": "MySave",
  "saveId": 3,
  "playTimeHours": 42.5,
  "power": {
    "producedMw": 1200.0,
    "consumedMw": 980.5,
    "surplusMw": 219.5,
    "fuseTripped": false,
    "gridCount": 2
  },
  "factory": {
    "totalBuildings": 240,
    "activeBuildings": 195,
    "idleBuildings": 30,
    "pausedBuildings": 10,
    "offBuildings": 5,
    "efficiencyPct": 97.3,
    "somersloopsSlotted": 8
  }
}
```

---

### Analysis

#### `GET /api/v1/analyze/bottlenecks`

Detect production bottlenecks sorted by severity (critical first).

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `save_id` | `int` | latest | Target save |
| `overclock_threshold` | `int` | `70` | Underclocking threshold % (1–250) |

**Detected types**

| Type | Severity | Condition |
|---|---|---|
| `fuse_tripped` | critical | A power grid fuse has tripped |
| `idle_with_recipe` | critical | Building has a recipe but is idle (input starvation) |
| `paused` | warning | Building explicitly paused with a recipe |
| `underclocked` | warning | Active building below `overclock_threshold`% |

**Response**: `Bottleneck[]`

```json
[
  {
    "type": "idle_with_recipe",
    "severity": "critical",
    "className": "Build_Constructor_C",
    "friendlyName": "Constructeur",
    "recipeName": "Fer en barre",
    "floorId": "Iron Floor",
    "overclock": 100,
    "message": "Constructeur inactif — recette «Fer en barre» non alimentée"
  }
]
```

---

#### `GET /api/v1/analyze/consumption`

Power-consumption waste report. Groups buildings by `(className × recipe)` and
ranks them by idle waste score (sum of overclock% across idle machines — higher = more
wasted capacity).

**Query params**

| Param | Type | Description |
|---|---|---|
| `save_id` | `int` | Optional — defaults to latest |

**Response**: `ConsumptionReport`

```json
{
  "saveId": 3,
  "saveName": "MySave",
  "totalBuildings": 240,
  "idleBuildings": 30,
  "idleWastePct": 12.5,
  "groups": [
    {
      "className": "Build_Constructor_C",
      "friendlyName": "Constructeur",
      "recipeName": "Fer en barre",
      "totalCount": 12,
      "activeCount": 8,
      "idleCount": 4,
      "avgOverclock": 100.0,
      "idleWasteScore": 400.0,
      "idleWastePct": 33.3
    }
  ]
}
```

**`idleWasteScore`**: sum of `overclock%` across idle machines in the group.
A group of 4 machines all at 100% idle scores 400; 2 machines at 50% scores 100.

---

### Events

#### `GET /api/v1/events`

Query the event log. Events are generated automatically on each save upload.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `save_id` | `int` | — | Filter by save |
| `category` | `string` | — | `construction`, `state_change`, `unlock`, `objective`, `recommendation` |
| `event_type` | `string` | — | `machine_added`, `machine_removed`, `recipe_changed`, `power_grid_changed`, … |
| `limit` | `int` | `100` | Max results (1–1000) |

**Common queries**

| Intent | Parameters |
|---|---|
| What did I build last session? | `category=construction&event_type=machine_added&save_id=<id>` |
| What recipes changed? | `event_type=recipe_changed` |
| Everything from save 5 | `save_id=5` |

**Response**: `EventLog[]`

```json
[
  {
    "id": 42,
    "saveId": 5,
    "category": "construction",
    "eventType": "machine_added",
    "payload": {
      "className": "Build_Constructor_C",
      "friendlyName": "Constructeur",
      "recipe": "Recipe_IronIngot_C",
      "floorId": "Iron Floor",
      "location": {"x": 100.0, "y": 200.0, "z": 0.0}
    },
    "occurredAt": "2026-04-12T10:00:00Z"
  }
]
```

---

#### `GET /api/v1/events/diff/{save_id}`

Return the diff events generated when `save_id` was uploaded — what changed
since the previous save.

**Event types generated on upload**

| Event type | Category | Trigger |
|---|---|---|
| `machine_added` | construction | Building appears in new save, absent in previous |
| `machine_removed` | construction | Building present in previous, absent in new |
| `recipe_changed` | state_change | Same building changed recipe |
| `power_grid_added` | state_change | New power grid detected |
| `power_grid_changed` | state_change | Grid production or consumption shifted > 0.5 MW |

Returns an **empty list** if `save_id` is the first import (no previous save).

**Path param**: `save_id` — database ID of the target save.

**Response**: `EventLog[]` ordered chronologically. `404` if save_id not found.

---

## Database Migrations

Migrations are managed with **Alembic** and run automatically at container startup.

```bash
cd backend

# Apply all pending migrations
SAT_DATABASE_URL="..." python -m alembic upgrade head

# Show current revision
SAT_DATABASE_URL="..." python -m alembic current

# Rollback one step
SAT_DATABASE_URL="..." python -m alembic downgrade -1

# Create a new migration
SAT_DATABASE_URL="..." python -m alembic revision --autogenerate -m "add foo table"
```

### Schema overview

| Table | Description |
|---|---|
| `world_states` | One row per unique save (deduplicated by SHA-256) |
| `buildings` | Denormalised machine rows for fast querying |
| `event_logs` | Diff events + construction/state-change history |

Migration files live in `backend/alembic/versions/`:
- `001_initial_schema.py` — `world_states` + `buildings`
- `002_event_logs.py` — `event_logs`

---

## Error Responses

All errors follow FastAPI's standard JSON format:

```json
{"detail": "Human-readable error message"}
```

| Status | Meaning |
|---|---|
| `404 Not Found` | Save ID doesn't exist or no saves in the database |
| `422 Unprocessable Entity` | `.sav` parsing failed, or invalid query parameter |
| `500 Internal Server Error` | Unexpected server error |
