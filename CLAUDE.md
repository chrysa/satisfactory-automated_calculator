# S.A.T. — Satisfactory Automated Tracker

## Project Overview

Google Apps Script (GAS) project for tracking Satisfactory game production.
Deployed to Google Sheets via `clasp`. No Python — all JavaScript/GAS.

## Key Commands

```bash
make push            # Deploy to Google Apps Script (clasp push)
make deploy          # Full deploy: verify → backup → push → GitHub Release
make verify          # Check file integrity before push
make lint            # Run pre-commit hooks on all files
make test            # Run Jest unit tests
make parse-save SAV=path/to/save.sav  # Parse .sav file → CSV + collectibles
make help            # List all available targets
```

## Architecture

```
src/                             ← Google Apps Script source files
├── 00_core_config.gs            ← SAT.CFG, utilities (SAT.U, SAT.S, SAT.Log)
├── 01_data_v1_1.gs              ← Game data: machines, resources, recipes
├── 01_data_TEMPLATE.gs          ← Template for new game versions — copy this
├── 10_engine.gs                 ← SAT.Engine — rate calculation, belt flags
├── 11_solver.gs                 ← SAT.Solver — objective-based planner
├── 20_ui_charts.gs              ← Dashboard charts
├── 30_recalc.gs                 ← SAT_recalcAll() entry point
├── 40_install.gs                ← Sheet creation, validations, migrations
├── 41_triggers.gs               ← onOpen/onEdit triggers
├── 42_menu.gz                   ← SAT menu in Google Sheets
├── 50_assistant.gs              ← SAT.Assistant — bottleneck analysis
├── 51_import.gs                 ← Import .sav from server
└── 51_import_ui.html            ← Sidebar HTML for browser-side parsing
scripts/
├── parse-save.js                ← CLI .sav parser
└── explore-*.js                 ← Diagnostic scripts (not deployed)
```

**Namespace**: All GAS code uses `SAT.*` namespace (e.g., `SAT.CFG`, `SAT.Engine`, `SAT.Assistant`).

## CI/CD

- **ci.yml** — pre-commit hooks + Jest tests on all PRs and pushes to `main`
- **deploy.yml** — on push to `main`: GitVersion → inject VERSION → `clasp push` → GitHub Release
- **VERSION** is auto-injected by CI — never edit it manually in `00_core_config.gs`
- Versioning: `feat:` → minor, `fix:`/`chore:` → patch, `feat!:` → major

## Tech Stack

- Language: JavaScript (Google Apps Script) + Node.js for scripts/tests
- Deployment: `@google/clasp` (Google Apps Script CLI)
- Testing: Jest
- Linting: pre-commit + chrysa/pre-commit-tools (javascript hooks)
- Versioning: GitVersion + git-cliff (changelog)
- Game: Satisfactory 1.1 data in `01_data_v1_1.gs`

## Development Context

- No dependencies at GAS runtime (zero imports in deployed code)
- CDN used only for `.sav` import sidebar (`esm.sh`)
- Game data is versioned and isolated: `SAT.DATA['1.1']`
- To add new game version: copy `01_data_TEMPLATE.gs` → fill `MACHINES`, `RESOURCES`, `RECIPES`
- Belt threshold flags: 🟠 Mk.6 required (>780/min), 🟥 split required (>1200/min)

## Conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- All GAS modules export into `SAT` namespace — no global functions except entry points
- Layer architecture: Config → Engine → UI → Application → Intelligence
- Pre-commit hooks: `console-log/debug-detection` (chrysa), `check-gs-syntax` (local)

## Important Notes

- CLAUDE.md is not deployed to GAS — it's dev context only
- `appsscript.json` is the GAS manifest — do not break its structure
- The `VERSION` field in `00_core_config.gs` is replaced by CI deploy workflow
- Supported Node.js version: whatever `package.json` specifies (check before updating)
