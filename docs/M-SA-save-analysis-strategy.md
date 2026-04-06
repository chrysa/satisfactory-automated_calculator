# M-SA — Save File Analysis Strategy

**Issue**: [#28](https://github.com/chrysa/satisfactory-automated_calculator/issues/28)  
**Milestone**: M-SA Save Analysis  
**Status**: In Progress

---

## Goal

Design and implement the pipeline that ingests a Satisfactory `.sav` binary file,
parses it into a structured JSON world state, stores it in PostgreSQL, and exposes
it to the question-answering and action-plan engines.

---

## Parser Decision

### Selected: `@etothepii/satisfactory-file-parser` (Node.js)

**Rationale**:
- Already integrated in `scripts/parse-save.js` and `src/51_import_ui.html`
- Most complete open-source parser for Satisfactory saves (UE5 format)
- Actively maintained; supports Satisfactory 1.x through parsing game headers
- Battle-tested in the existing SAT save import flow

**Alternative considered**: custom Python binary parser  
**Rejected because**: maintenance cost far outweighs the benefit. The existing Node.js parser
already handles the complexity of the UE5 binary format.

**Blocker**: BLK-SA-01 — ensure `@etothepii/satisfactory-file-parser` version in `package.json`
stays compatible with the current SAT release. Track upstream releases.

---

## Extracted Facts — Target Schema

```typescript
interface WorldState {
  // Metadata
  saveName: string;
  saveVersion: number;
  playTime: number;           // seconds
  parsedAt: string;           // ISO timestamp

  // Factory buildings
  buildings: Building[];

  // Resource nodes
  resourceNodes: ResourceNode[];

  // Power grids
  powerGrids: PowerGrid[];

  // Research / milestones
  research: ResearchState;

  // Inventory (player + storage boxes)
  inventory: InventorySnapshot;
}

interface Building {
  className: string;          // e.g. "Build_Constructor_C"
  friendlyName: string;       // e.g. "Constructeur"
  location: { x: number; y: number; z: number };
  floorId: string;            // zone/factory tag if available
  state: "active" | "idle" | "paused" | "off";
  overclock: number;          // 0–250 (%)
  recipe: string | null;      // current recipe class name
  inputRates: Record<string, number>;   // resource → /min
  outputRates: Record<string, number>;  // resource → /min
  powerConsumption: number;   // MW
  somersloops: number;        // 0 or 1
}

interface ResourceNode {
  resourceClass: string;      // e.g. "Desc_OreIron_C"
  friendlyName: string;
  purity: "impure" | "normal" | "pure";
  location: { x: number; y: number; z: number };
  extractorClass: string | null;
  extractionRate: number;    // /min (0 if no extractor)
}

interface PowerGrid {
  id: number;
  production: number;   // MW
  consumption: number;  // MW
  batteryBuffer: number; // MWh
  fuseTripped: boolean;
}

interface ResearchState {
  unlockedMilestones: string[];
  pendingMilestones: string[];
  collectedHardDrives: number;
}

interface InventorySnapshot {
  playerInventory: Record<string, number>;   // resource → count
  storageInventory: Record<string, number>;  // resource → count (aggregate)
}
```

---

## Ingestion Pipeline

```
.sav binary file
    │
    ▼ POST /upload  (multipart/form-data)
FastAPI endpoint
    │
    ▼ scripts/parse-save.js  (Node.js subprocess)
    │   spawned via subprocess.run(["node", "scripts/parse-save.js", "--stdin"])
    │
    ▼ raw JSON (satisfactory-file-parser output)
    │
    ▼ fact-extractor.py  (Python module)
    │   maps raw parser output → WorldState schema
    │
    ▼ PostgreSQL  (table: world_states)
    │   insert with save hash deduplication
    │
    ▼ /analyze, /query, /plan endpoints
```

### Key design choices

1. **Node.js subprocess**: the parser runs as a Node.js child process invoked by Python via
   `subprocess.run`. This avoids reimplementing the parser logic in Python.
2. **Deduplication**: saves are hashed (SHA-256 of raw bytes) before insert; re-uploading the
   same save is a no-op.
3. **Delta computation**: each new upload computes a diff against the previous world state
   (state-change log — issue [#37](https://github.com/chrysa/satisfactory-automated_calculator/issues/37)).

---

## PostgreSQL Schema

```sql
-- World states (one row per save upload)
CREATE TABLE world_states (
    id          SERIAL PRIMARY KEY,
    save_hash   CHAR(64) UNIQUE NOT NULL,     -- SHA-256
    save_name   TEXT NOT NULL,
    play_time   INTEGER,                       -- seconds
    parsed_at   TIMESTAMPTZ DEFAULT NOW(),
    state_json  JSONB NOT NULL                 -- full WorldState
);

-- Buildings (denormalized for fast querying)
CREATE TABLE buildings (
    id           SERIAL PRIMARY KEY,
    world_id     INTEGER REFERENCES world_states(id) ON DELETE CASCADE,
    class_name   TEXT NOT NULL,
    friendly_name TEXT,
    state        TEXT,
    overclock    SMALLINT,
    recipe       TEXT,
    floor_id     TEXT,
    power_mw     NUMERIC(10,2),
    somersloops  SMALLINT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_buildings_world_id ON buildings(world_id);
CREATE INDEX idx_buildings_recipe ON buildings(recipe);
CREATE INDEX idx_world_states_save_hash ON world_states(save_hash);
CREATE INDEX idx_world_states_parsed_at ON world_states(parsed_at DESC);
```

---

## FastAPI Endpoints (MVP)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/save/upload` | Upload + parse + store a `.sav` file |
| `GET` | `/api/v1/save/latest` | Get the most recent world state |
| `GET` | `/api/v1/save/{id}` | Get a specific world state by ID |
| `GET` | `/api/v1/buildings?world_id=&recipe=&state=` | Query buildings |
| `POST` | `/api/v1/query` | NL question over current world state |
| `POST` | `/api/v1/plan` | Generate step-by-step action plan |

---

## Tasks Checklist

- [ ] Verify `@etothepii/satisfactory-file-parser` v3.3.x compatibility with SAT 1.1 saves
- [ ] Implement `fact-extractor.py` — raw parser JSON → `WorldState` schema
- [ ] Create PostgreSQL schema and migrations (Alembic)
- [ ] Implement FastAPI `/upload` endpoint with subprocess parser call
- [ ] Implement deduplication (SHA-256 hash check)
- [ ] Write unit tests for `fact-extractor.py`
- [ ] Document the pipeline in `docs/M-SA-pipeline.md`

---

## References

- Existing parser usage: [scripts/parse-save.js](../scripts/parse-save.js),
  [src/51_import_ui.html](../src/51_import_ui.html)
- ADR: [docs/ADR-001-architecture.md](ADR-001-architecture.md)
- Notion blocker: BLK-SA-01 (parser version compatibility)
