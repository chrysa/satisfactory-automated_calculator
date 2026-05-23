# ADR-001 — SAT Architecture Decision: Backend Microservice

**Status**: Accepted — Implemented  
**Date**: 2026-04-06 | **Implemented**: 2026-04-12  
**Issue**: [#24](https://github.com/chrysa/satisfactory-automated_calculator/issues/24)  
**Milestone**: M-ARCH Architecture & Platform

---

## Context

S.A.T. (Satisfactory Automated Tracker) currently operates as a Google Sheets / Google Apps Script
(GAS) tool. Three architecture options were evaluated to extend it with save-file analysis,
natural-language queries, and multi-service integration.

### Options evaluated

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A — Standalone desktop** | Python/Electron + local SQLite | Offline, zero infra | Single-user, no integration |
| **B — Backend microservice** | Python FastAPI + REST API | Multi-client, NL bridge, extensible | Needs a server |
| **C — Full web platform** | React + FastAPI | Shareable chains, full UX | Highest cost, over-engineered for now |

---

## Decision

**Option B — Python FastAPI backend microservice**, deployed on chrysa/server.

### Architecture

```
Satisfactory game
    └─ .sav file
         └─ satisfactory-save-parser (Node.js via scripts/parse-save.js)
              └─ JSON world state
                   └─ FastAPI service  (/analyze, /query, /plan)
                        ├─ GAS bridge  → doWebApp() POST endpoint
                        ├─ NL engine   → ai-aggregator direct API
                        └─ PostgreSQL  → fact store + history
```

### Layer breakdown

| Layer | Technology | Purpose |
|-------|-----------|----------|
| Save parsing | `@etothepii/satisfactory-file-parser` (Node.js) | Binary .sav → JSON world state |
| Fact store | PostgreSQL | Structured game state persistence |
| Backend API | Python FastAPI | REST endpoints for analysis and NL queries |
| NL interface | direct ai-aggregator API | Answers questions and generates action plans |
| GAS bridge | GAS `doWebApp()` → HTTP | Exposes `SAT.Assistant.analyze()` to external clients |

### Why not A or C

- **Not A** (standalone): prevents integration with `my-assistant` and multi-device access.
- **Not C** (full web): premature — a React frontend can be added later on top of the Option B API
  without re-architecting the backend. The added cost now is not justified.

---

## Consequences

### Positive

- The existing `scripts/parse-save.js` is reused as-is for the parsing layer.
- The GAS backend (SAT v1.1) keeps running unchanged; the new service consumes it as a data source.
- REST API enables future clients (mobile, VS Code extension, Discord bot).
- NL queries via `ai-aggregator` are straightforward to swap/upgrade.

### Negative / Risks

- Requires a running server (chrysa/server) — adds operational overhead.
- `satisfactory-save-parser` Node.js dependency must stay compatible with SAT game version updates
  (tracked: BLK-SA-01).

### Out of scope

- React frontend (deferred to a later milestone)
- Multi-user authentication (deferred)
- Real-time syncing (deferred)

---

## Implementation plan

1. ✅ **M-SA** ([#28](https://github.com/chrysa/satisfactory-automated_calculator/issues/28)) —
   Save analysis: parser integration (`parse-save-json.js`), WorldState schema,
   ingestion pipeline, KPIs, bottleneck detection.
2. ✅ **M-OPT** ([#34](https://github.com/chrysa/satisfactory-automated_calculator/issues/34)) —
   Consumption optimizer: power-waste ranking, idle-machine detection.
3. ✅ **M-LOG** ([#37](https://github.com/chrysa/satisfactory-automated_calculator/issues/37)) —
   Event logging: save-diff (machine_added/removed, recipe_changed, power_grid_changed),
   `event_logs` table, query endpoints.
4. **M-NL** ([#29](https://github.com/chrysa/satisfactory-automated_calculator/issues/29),
   [#30](https://github.com/chrysa/satisfactory-automated_calculator/issues/30)) —
   NL question-answering engine and action-plan generator. _(pending)_
5. **M-NL** ([#31](https://github.com/chrysa/satisfactory-automated_calculator/issues/31)) —
   Notification center + NL assistant client. _(pending)_

---

## References

- Notion: [SAT Save-Analysis Solver Strategy](https://www.notion.so/SAT-Save-Analysis-Solver-Strategy-33859293e35e8182a7fbe5d9226ca8b1)
- Notion: [SAT Standalone Client — Spec Python](https://www.notion.so/SAT-Standalone-Client-Spec-Python-33859293e35e813794c1e7e5ac00b323)
