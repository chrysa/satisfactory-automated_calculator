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

**Game**: Satisfactory 1.1 | **Status**: ✅ Production Ready | **Modules**: 11

A production calculator for Satisfactory, built on Google Sheets / Apps Script. Enter recipes by name, get automatic rate calculations, intelligent alerts, and a real-time dashboard.

The project also ships a **Python FastAPI backend** that ingests `.sav` files, stores world state in PostgreSQL, and exposes REST endpoints for factory analysis, bottleneck detection and session diffing.

---

## 📦 Project Structure

```
satisfactory-automated_calculator/
├── src/                             ← Google Apps Script source (deployed via clasp)
│   ├── 00_core_config.gs            ← App config, utilities, game data loader
│   ├── 01_data_v1_1.gs              ← Satisfactory 1.1 data  (machines / resources / recipes)
│   ├── 01_data_TEMPLATE.gs          ← Template for future game versions  ← copy this
│   ├── 10_engine.gs                 ← Calculation engine (rates, flags, belt checks)
│   ├── 11_solver.gs                 ← Production solver (objectives → recipe plan)
│   ├── 20_ui_charts.gs              ← Dashboard charts
│   ├── 30_recalc.gs                 ← Full-recalc entry point
│   ├── 40_install.gs                ← Sheet creation, validations, migrations
│   ├── 41_triggers.gs               ← onOpen / onEdit triggers
│   ├── 42_menu.gs                   ← SAT menu in Google Sheets
│   ├── 50_assistant.gs              ← Smart assistant (bottlenecks, OC, belts, power, phases)
│   ├── 51_import.gs                 ← Server: receive parsed rows → Production sheet
│   └── 51_import_ui.html            ← Sidebar: browser-side .sav parsing (esm.sh CDN)
├── backend/                         ← Python FastAPI backend (save analysis API)
│   ├── src/sat_backend/
│   │   ├── main.py                  ← FastAPI app, all endpoints
│   │   ├── models.py                ← Pydantic schemas (WorldState, KPIs, Bottleneck…)
│   │   ├── config.py                ← Settings (env vars, SAT_ prefix)
│   │   ├── extractor.py             ← .sav → WorldState via Node.js subprocess
│   │   └── db/                      ← SQLAlchemy models + async session
│   ├── alembic/                     ← DB migrations (001 schema, 002 event logs)
│   ├── Dockerfile                   ← Python 3.12 + Node.js 22 image
│   └── pyproject.toml
├── scripts/
│   ├── parse-save.js                ← CLI: .sav → production CSV + collectibles report
│   ├── parse-save-json.js           ← .sav → JSON WorldState (called by FastAPI)
│   └── explore-*.js                 ← Diagnostic scripts (not deployed)
├── docker-compose.yml               ← One-command local stack (PostgreSQL + API)
├── sat_watcher.py                   ← Local .sav polling service (auto-upload on save)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                   ← CI: lint + pre-commit + tests (all PRs and pushes to main)
│   │   └── deploy.yml               ← CD: GitVersion → deploy to GAS → GitHub Release
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   └── pull_request_template.md
├── Makefile                         ← Main entry point (includes *.Makefile)
├── deploy.Makefile                  ← deploy / verify / push / staging targets
├── setup.Makefile                   ← setup-env / setup-clasp / setup-precommit targets
├── backup.Makefile                  ← backup / sync / pull targets
├── tools.Makefile                   ← test / parse-save / clean / diagnose targets
├── .pre-commit-config.yaml         ← pre-commit hooks (standard + chrysa/pre-commit-tools)
├── CHANGELOG.md                     ← Auto-generated by git-cliff on each release
├── cliff.toml                       ← git-cliff changelog configuration
├── GitVersion.yml                   ← Semantic versioning configuration
├── appsscript.json                  ← Google Apps Script manifest
├── package.json                     ← Node.js dev dependencies (Jest, clasp)
└── .gitignore
```

---

## 🐍 Backend API

The Python backend runs alongside Google Sheets as an independent REST service.
It parses `.sav` files via a Node.js subprocess, stores world state in PostgreSQL,
and exposes analysis endpoints (KPIs, bottlenecks, consumption, event log).

### One-command start (Docker)

```bash
docker compose up --build
```

| Service | URL | Description |
|---|---|---|
| API | http://localhost:8000 | FastAPI |
| Swagger UI | http://localhost:8000/docs | Interactive docs |
| ReDoc | http://localhost:8000/redoc | Alternative docs |
| PostgreSQL | localhost:5432 | DB (user/pass: `sat`) |

### API endpoints

| Method | Path | Tag | Description |
|---|---|---|---|
| `POST` | `/api/v1/save/upload` | saves | Upload a `.sav` — parse, deduplicate, diff |
| `GET` | `/api/v1/save/latest` | saves | Full world state of the latest save |
| `GET` | `/api/v1/save/{id}` | saves | World state by save ID |
| `GET` | `/api/v1/buildings` | buildings | Building list (filterable by world_id / recipe / state) |
| `GET` | `/api/v1/kpis` | kpis | Power + factory KPI snapshot |
| `GET` | `/api/v1/analyze/bottlenecks` | analysis | Idle / underclocked / fuse bottleneck detector |
| `GET` | `/api/v1/analyze/consumption` | analysis | Power waste ranking by machine group |
| `GET` | `/api/v1/events` | events | Event log (filterable by category / type / save) |
| `GET` | `/api/v1/events/diff/{id}` | events | Diff events generated at upload time |

### Architecture

```
.sav binary
    └── POST /api/v1/save/upload
            └── Node.js subprocess (scripts/parse-save-json.js)
                    └── JSON WorldState
                            ├── PostgreSQL (world_states, buildings, event_logs)
                            └── REST analysis endpoints
```

### Local development (without Docker)

```bash
# Requires Python 3.12, Node.js 22, PostgreSQL 16
psql -U postgres -c "CREATE USER sat WITH PASSWORD 'sat'; CREATE DATABASE sat OWNER sat;"
pip install -e "backend"
cd backend
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" python -m alembic upgrade head
SAT_DATABASE_URL="postgresql+asyncpg://sat:sat@localhost:5432/sat" \
  python -m uvicorn sat_backend.main:app --host 0.0.0.0 --port 8000 --reload
```

> Full API reference: **[docs/backend-api.md](docs/backend-api.md)**

---

## 🆕 Supporting a New Satisfactory Version

Game data is fully isolated per version in `01_data_vX_Y.gs` files.
Multiple versions can coexist — only `GAME_VERSION` in `00_core_config.gs` is active.

```bash
# 1. Copy the template
cp src/01_data_TEMPLATE.gs src/01_data_v2_0.gs

# 2. Edit SAT.DATA['2.0'] — fill MACHINES, RESOURCES, RECIPES arrays
#    Source: https://satisfactory.wiki.gg/wiki/

# 3. Activate the new version
#    In src/00_core_config.gs:  GAME_VERSION: '2.0'

# 4. Deploy
make push
```

---

## 🚀 Quick Start

### Prerequisites
```bash
npm install -g @google/clasp
npm install
```

### Deploy to Google Sheets
```bash
clasp login
make push          # or: clasp push --force
clasp open
```

### First-time setup in Sheets
- Open your Google Sheet
- Menu **SAT → Reset (reinstall)** to create all sheets
- The assistant sidebar opens automatically on every load

---

## 💻 Development

```bash
make deploy              # Full deployment (verify → backup → push to GAS)
make push                # Push to GAS (no backup)
make verify              # Check file integrity
make open                # Open Apps Script editor in browser
make parse-save SAV=path/to/save.sav        # Parse .sav → CSV + collectibles report
make parse-save SAV=path/to/save.sav OUT=output.csv
make lint                # Run pre-commit hooks on all files
make test                # Run Jest unit tests
make help                # List all available commands
```

> Versioning is handled automatically by `gittools/actions/gitversion` on CI.
> Do not manually edit the `VERSION` field — it is injected at deploy time.

---

## 🏗️ Architecture

### Layer 0 — Config & Game Data
- `00_core_config.gs` → `SAT.CFG` — configuration, utilities (`SAT.U`, `SAT.S`, `SAT.Log`, `SAT.loadGameData`)
- `01_data_v1_1.gs` → `SAT.DATA['1.1']` — 18 machines, 95 resources, 67 recipes (official FR names from wiki.gg)
- `01_data_TEMPLATE.gs` → template to copy for new game versions

### Layer 1 — Engine
- `10_engine.gs` → `SAT.Engine` — rate calculation, flag detection, recipe index
  - Belt throughput flags: 🟠 Mk.6 required (>780/min), 🟥 split required (>1200/min Mk.6 limit)
- `11_solver.gs` → `SAT.Solver` — objective-based production planner

### Layer 2 — UI
- `20_ui_charts.gs` — dashboard charts
- `30_recalc.gs` — `SAT_recalcAll()` entry point

### Layer 3 — Application
- `40_install.gs` — sheet creation, dropdown validations, soft update (data-preserving)
- `41_triggers.gs` — `onOpen()`, `onEdit()`
- `42_menu.gs` — SAT menu, opens assistant by default on load

### Layer 4 — Intelligence
- `50_assistant.gs` → `SAT.Assistant` — full factory analysis, actionable recommendations:
  - Configuration errors, bottlenecks, high OC warnings
  - **Belt/conveyor analysis**: 🟠 lines needing Mk.6 (>780/min), 🟥 lines exceeding Mk.6 requiring parallel split (>1200/min)
  - Phase progression coaching, nuclear waste reminder, power budget, large surpluses
- `51_import.gs` + `51_import_ui.html` — import `.sav` directly from sidebar (browser-side parsing via CDN)

---

## 📊 Production Sheet Columns

| Col | Letter | Field | Input |
|-----|--------|-------|-------|
| 1 | A | **Floor** | Manual (dropdown ← 🏗️ Floors) |
| 2 | B | **Machine** | Manual (dropdown ← ⚙️ Machines) |
| 3 | C | **Recipe** | Manual (dropdown ← 📖 Recipes) |
| 4 | D | Qt/min OUT | **Auto** (recipe × OC × purity) |
| 5 | E | Qt/min IN | **Auto** (recipe × OC) |
| 6 | F | Count | Manual |
| 7 | G | Overclock % | Manual (default 100) |
| 8 | H | Purity | Manual (Impure / Normal / Pure) |
| 9 | I | Flags | **Auto** (engine) |
| 10 | J | Cause | **Auto** (engine) |
| 11 | K | Qt/min STD | **Auto** (base rate at OC=100%) |
| 12 | L | ⚡ MW | **Auto** (total power consumption) |
| 13 | M | Somersloops | **Auto** (from .sav import) or manual |

---

## 🧰 SAT Menu

```
SAT
  🤖 Open assistant
  ─────────────────────────────────
  Full recalculate
  Production summary
  ─────────────────────────────────
  ➕ Add production line
  📂 Import from save file
  ─────────────────────────────────
  Add floor
  List floors
  Floor dimensions
  ─────────────────────────────────
  Show / Hide reference sheets
  Create dashboard charts
  ─────────────────────────────────
  Archive factory & switch game version
  ─────────────────────────────────
  Clean duplicate tabs
  Diagnostic
  Update (soft reinstall)    ← preserves Production + Floors data
  FULL RESET                 ← wipes everything
  ─────────────────────────────────
  ⚙️ Enable assistant on startup
```

---

## 🔄 CI/CD

Two workflows run automatically on every push to `main`:

| Workflow | File | Trigger | Steps |
|----------|------|---------|-------|
| **CI** | `ci.yml` | push + PR | pre-commit hooks, Jest tests |
| **Deploy** | `deploy.yml` | push to `main` | GitVersion → inject version → `clasp push` → GitHub Release |

### Version injection into GAS

The `VERSION` field in `src/00_core_config.gs` is **automatically injected** by the Deploy workflow using the GitVersion-computed semver. The deployed Apps Script code always contains the exact version that triggered the push.

### Pre-commit hooks

Hooks are defined in `.pre-commit-config.yaml`:

| Hook | Source | Purpose |
|------|--------|---------|
| `check-json`, `check-yaml` | pre-commit/pre-commit-hooks | Syntax validation |
| `end-of-file-fixer`, `trailing-whitespace` | pre-commit/pre-commit-hooks | File hygiene |
| `console-log/debug/table-detection` | chrysa/pre-commit-tools | Catch debug output in `.js` and `.gs` |
| `env-file-check` | chrysa/pre-commit-tools | Detect secrets in `.env` files |
| `check-gs-syntax` | local | Node.js syntax check on GAS files |

---

## 🔒 Contributing

- Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`
- `feat:` → minor version bump &nbsp; `fix:`/`chore:` → patch bump &nbsp; `feat!:` → major bump
- Open issues using the templates in `.github/ISSUE_TEMPLATE/`
- Pull requests use the template in `.github/pull_request_template.md`

---

## 🔄 Versioning

Versions are computed automatically using **GitVersion** (semantic versioning from git history):

- `feat:` commits → minor bump (`3.5.x` → `3.6.0`)
- `fix:` / `chore:` commits → patch bump (`3.5.5` → `3.5.6`)
- `feat!:` or `BREAKING CHANGE` → major bump

The `CHANGELOG.md` is auto-generated by **git-cliff** on every push to `main`.

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## ✅ Pre-Deployment Checklist

- [ ] `src/` has at least 10 `.gs` files + 1 `.html`
- [ ] `src/appsscript.json` is valid JSON
- [ ] No un-committed changes
- [ ] `make push` runs without error

---

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| SAT menu missing | Reload page (Ctrl+Shift+R) |
| `#ERROR` in cells | Menu SAT → Full recalculate |
| Empty dropdowns | Menu SAT → Update (soft reinstall) |
| `.clasp.json not found` | Run `clasp login` at project root |
| `SAT data not found for v…` | Check `01_data_vX_Y.gs` exists and is pushed |

---

## 📚 Documentation

| File | Content |
|------|---------|
| [GUIDE.md](GUIDE.md) | End-user guide (sheets, formulas, import, assistant) |
| [COPILOT_GUIDE.md](COPILOT_GUIDE.md) | Code patterns, templates, workflows for developers |
| [docs/backend-api.md](docs/backend-api.md) | Full backend API reference (endpoints, data model, Docker) |
| [docs/ADR-001-architecture.md](docs/ADR-001-architecture.md) | Architecture decision record (GAS + FastAPI) |
| [CHANGELOG.md](CHANGELOG.md) | Auto-generated version history |

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| GAS modules | 11 `.gs` files + 1 `.html` |
| Recipes | 67 official Satisfactory 1.1 recipes |
| Machines | 18 machines with dimensions and MW |
| Resources | 95 classified resources |
| GAS runtime dependencies | Zero (CDN only for .sav import sidebar) |
| Backend API endpoints | 9 (saves, buildings, KPIs, analysis, events) |
| DB tables | 3 (`world_states`, `buildings`, `event_logs`) |

---

**S.A.T.** | Satisfactory 1.1 | Google Apps Script | Production Ready ✅
