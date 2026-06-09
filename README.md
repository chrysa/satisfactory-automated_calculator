# 🏭 S.A.T. — Satisfactory Automated Tracker

[![CI](https://github.com/chrysa/satisfactory-automated_calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/chrysa/satisfactory-automated_calculator/actions/workflows/ci.yml)
[![Deploy](https://github.com/chrysa/satisfactory-automated_calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/chrysa/satisfactory-automated_calculator/actions/workflows/deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=chrysa_satisfactory-automated_calculator&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=chrysa_satisfactory-automated_calculator)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=chrysa_satisfactory-automated_calculator&metric=coverage)](https://sonarcloud.io/summary/new_code?id=chrysa_satisfactory-automated_calculator)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=chrysa_satisfactory-automated_calculator&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=chrysa_satisfactory-automated_calculator)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=chrysa_satisfactory-automated_calculator&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=chrysa_satisfactory-automated_calculator)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=chrysa_satisfactory-automated_calculator&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=chrysa_satisfactory-automated_calculator)
[![pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit)](https://github.com/pre-commit/pre-commit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Plan and balance your Satisfactory factory in a Google Sheet — type a recipe, get instant production rates, power draw, belt warnings, and a smart assistant telling you what to fix next.**

**Game**: Satisfactory 1.1 · **Status**: ✅ Production Ready

---

## Who it's for

Satisfactory players who want to plan factories in a spreadsheet instead of doing maths by hand — no install, no separate app. Just a Google Sheet you control. An optional Python backend is available for players who want to upload their actual `.sav` files for deeper automated analysis.

---

## Key features

- **Type a recipe, get the numbers** — enter machine, recipe, count, overclock and purity; output/input rates, base rate and power (MW) are computed automatically.
- **Belt warnings before you build** — flags lines that exceed Mk.5 (🟠 need Mk.6, >780/min) or even Mk.6 (🟥 need a parallel split, >1200/min).
- **A built-in assistant** — analyses your whole factory and gives actionable advice: bottlenecks, over-clock warnings, power budget, phase progression, nuclear-waste reminders, and surplus detection.
- **Import from your save file** — pull your real production lines straight from a `.sav` directly in the sidebar (browser-side), or via CLI / the backend API.
- **Production solver** — set an output objective and let it propose a recipe plan.
- **Dashboard charts** — visualise production and power at a glance.
- **Version-proof** — game data is isolated per Satisfactory version; adding a future version is a copy-paste of one file.
- **Optional analysis backend** — a Python/FastAPI service that ingests `.sav` files into PostgreSQL and exposes REST endpoints for KPIs, bottleneck detection, power-waste ranking and session diffing.

---

## Quick start (Google Sheets)

The core tool runs entirely inside Google Sheets via Google Apps Script, deployed with [`clasp`](https://github.com/google/clasp).

```bash
# Prerequisites
npm install -g @google/clasp
npm install

# Deploy to your Google Sheet
clasp login
make push          # or: clasp push --force
clasp open
```

First-time setup, inside the Sheet:

1. Open the **SAT** menu → **FULL RESET** to create all sheets.
2. The assistant sidebar opens automatically on every load.
3. Start adding production lines (menu **SAT → ➕ Add production line**).

> Full walkthrough — sheets, formulas, import, assistant: **[GUIDE.md](GUIDE.md)** (English) · **[USER_GUIDE.md](USER_GUIDE.md)** (Français)

---

## Usage — the Production sheet

Fill the **manual** columns; the **auto** columns are computed for you.

| Field | Input |
|-------|-------|
| Floor · Machine · Recipe | Manual (dropdowns) |
| Count · Overclock % · Purity | Manual |
| Qt/min OUT · IN · STD | **Auto** (recipe × OC × purity) |
| ⚡ MW · Flags · Cause | **Auto** (engine) |
| Somersloops | Auto (from `.sav` import) or manual |

The **SAT** menu gives you everything else: recalculate, production summary, add/list floors, import from save file, create dashboard charts, archive & switch game version, diagnostics, soft update (preserves your data) and full reset.

---

## Optional: save-analysis backend (Docker)

A standalone Python/FastAPI service for parsing `.sav` files and running automated analysis. Not required to use the spreadsheet.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| PostgreSQL | localhost:5432 (user/pass `sat`) |

It parses the `.sav` via a Node.js subprocess into a JSON world state, stores it in PostgreSQL (`world_states`, `buildings`, `event_logs`), and exposes REST endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/save/upload` | Upload a `.sav` — parse, deduplicate, diff |
| `GET` | `/api/v1/save/latest` | World state of the latest save |
| `GET` | `/api/v1/save/{id}` | World state by save ID |
| `GET` | `/api/v1/buildings` | Building list (filter by world / recipe / state) |
| `GET` | `/api/v1/kpis` | Power + factory KPI snapshot |
| `GET` | `/api/v1/analyze/bottlenecks` | Idle / underclocked / fuse bottleneck detector |
| `GET` | `/api/v1/analyze/consumption` | Power-waste ranking by machine group |
| `GET` | `/api/v1/events` | Event log (filter by category / type / save) |
| `GET` | `/api/v1/events/diff/{id}` | Events generated at upload time |

> Full API reference: **[docs/backend-api.md](docs/backend-api.md)**

### Run without Docker

Requires Python 3.12, Node.js 22, PostgreSQL.

```bash
psql -U postgres -c "CREATE USER sat WITH PASSWORD 'sat'; CREATE DATABASE sat OWNER sat;"
pip install -e "backend"
cd backend
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" python -m alembic upgrade head
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" \
  python -m uvicorn sat_backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Configuration

- **Active game version** — set `GAME_VERSION` in `src/00_core_config.gs` (default `'1.1'`).
- **Backend** — configured via `SAT_`-prefixed environment variables (e.g. `SAT_DATABASE_URL`). See `.env.example`.

### Supporting a new Satisfactory version

Game data is isolated per version in `01_data_vX_Y.gs` files; multiple versions coexist and only `GAME_VERSION` is active.

```bash
cp src/01_data_TEMPLATE.gs src/01_data_v2_0.gs   # 1. copy the template
# 2. fill SAT.DATA['2.0'] — MACHINES, RESOURCES, RECIPES (source: satisfactory.wiki.gg)
# 3. set GAME_VERSION: '2.0' in src/00_core_config.gs
make push                                          # 4. deploy
```

---

## Development

```bash
make deploy                              # verify → backup → push to GAS
make push                                # push to GAS (no backup)
make verify                              # check file integrity
make open                                # open Apps Script editor
make parse-save SAV=path/to/save.sav     # parse .sav → CSV + collectibles report
make lint                                # run pre-commit hooks on all files
make test                                # run Jest unit tests
make help                                # list all commands
```

> Versioning is automatic (GitVersion on CI) — never edit the `VERSION` field manually; it is injected at deploy time. `CHANGELOG.md` is auto-generated by git-cliff.
> Contribution conventions: [CONTRIBUTING.md](CONTRIBUTING.md) · architecture: [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md).

---

## Documentation

| Doc | Content |
|------|---------|
| [GUIDE.md](GUIDE.md) | End-user guide — sheets, formulas, import, assistant (EN) |
| [USER_GUIDE.md](USER_GUIDE.md) | Guide utilisateur (FR) |
| [docs/backend-api.md](docs/backend-api.md) | Full backend API reference |
| [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) | Architecture decision record (GAS + FastAPI) |
| [COPILOT_GUIDE.md](COPILOT_GUIDE.md) | Code patterns & workflows for contributors |
| [CHANGELOG.md](CHANGELOG.md) | Auto-generated version history |

---

## Project metrics

| Metric | Value |
|--------|-------|
| GAS modules | 11 `.gs` files + 1 `.html` sidebar |
| Satisfactory 1.1 data | 18 machines · 95 resources · 67 recipes (official wiki.gg names) |
| GAS runtime dependencies | Zero (CDN only for the `.sav` import sidebar) |
| Backend API endpoints | 9 (saves, buildings, KPIs, analysis, events) |
| DB tables | 3 (`world_states`, `buildings`, `event_logs`) |

---

**S.A.T.** · Satisfactory 1.1 · Google Apps Script + optional FastAPI backend · MIT
</content>
</invoke>
