# S.A.T. — User Guide

> Production calculator for Satisfactory 1.1, powered by Google Sheets and Apps Script.

---

## Table of Contents

- [S.A.T. — User Guide](#sat--user-guide)
  - [Table of Contents](#table-of-contents)
  - [1. First Launch](#1-first-launch)
  - [2. Spreadsheet Structure](#2-spreadsheet-structure)
  - [3. Adding a Production Line](#3-adding-a-production-line)
    - [Column Structure](#column-structure)
    - [Example](#example)
    - [Example with overclocked extractor](#example-with-overclocked-extractor)
  - [4. Real-time Automations](#4-real-time-automations)
    - [Effective Rate Calculation (Overclock × Purity)](#effective-rate-calculation-overclock--purity)
    - [Automatic Flags (column I)](#automatic-flags-column-i)
    - [Error Detection (column J)](#error-detection-column-j)
  - [5. Understanding the Dashboard](#5-understanding-the-dashboard)
  - [6. Managing Reference Sheets](#6-managing-reference-sheets)
    - [Recipes (📖 Recipes)](#recipes--recipes)
    - [Resources (💎 Resources)](#resources--resources)
    - [Machines (⚙️ Machines)](#machines-️-machines)
  - [7. Configuring Floors](#7-configuring-floors)
    - [Example](#example-1)
  - [8. Satisfactory 1.1 Mechanics](#8-satisfactory-11-mechanics)
    - [Resource Nodes and Purity](#resource-nodes-and-purity)
    - [Belt Limits](#belt-limits)
    - [Nuclear Waste](#nuclear-waste)
    - [Somersloops](#somersloops)
    - [Space Elevator Phases](#space-elevator-phases)
  - [9. The SAT Menu](#9-the-sat-menu)
  - [10. Understanding Errors](#10-understanding-errors)
  - [11. FAQ](#11-faq)
  - [12. Smart Assistant](#12-smart-assistant)
    - [Card Types](#card-types)
    - [Action Buttons](#action-buttons)
  - [13. Import from Save File](#13-import-from-save-file)
    - [How It Works](#how-it-works)
    - [Production Line Detection](#production-line-detection)
    - [Auto-extracted Data](#auto-extracted-data)
    - [Collectibles Report](#collectibles-report)
    - [CLI Alternative](#cli-alternative)

---

## 1. First Launch

1. Open the shared Google Sheet.
2. On load, the script runs automatically and:
   - Checks for first-time installation.
   - Creates all sheets if they are missing.
   - Loads reference data (resources, machines, recipes).
   - Builds the **SAT** menu in the menu bar.
   - Opens the **Smart Assistant** sidebar.
3. If an initialization error appears, press **Ctrl+Shift+R** to reload the page.

> **Note:** The initial installation may take a few seconds. Do not close the tab during this time.

---

## 2. Spreadsheet Structure

The workbook contains 7 sheets:

| Sheet | Role |
|-------|------|
| 🏭 **Production** | Enter all your production lines |
| 🏗️ **Floors** | Factory vertical structure (floors / production lines) |
| 📊 **Dashboard** | Overview — stats, charts, bottlenecks |
| 🎯 **Objectives** | Solver input — target items and quantities |
| 📖 **Recipes** | Game recipe reference |
| 💎 **Resources** | Raw materials and products reference |
| ⚙️ **Machines** | Machine reference with dimensions and power |

---

## 3. Adding a Production Line

The **🏭 Production** sheet is the core of the calculator. Each row represents one machine (or a group of identical machines) in your factory.

### Column Structure

| Col | Name | Description | Input |
|-----|------|-------------|-------|
| A | **Floor** | Floor/production-line name (e.g. `Iron Ingots`) | Manual |
| B | **Machine** | Machine name | Dropdown |
| C | **Recipe** | Official recipe name | Dropdown |
| D | **Qt/min OUT** | Output rate (auto-calculated) | **Auto** |
| E | **Qt/min IN** | Input rate (auto-calculated) | **Auto** |
| F | **Count** | Number of identical machines on this line | Manual |
| G | **OC%** | Overclock percentage (1–250, default 100) | Manual |
| H | **Purity** | Node purity for extractors (Impure/Normal/Pure) | Dropdown |
| I | **Flags** | Auto-alerts: nuclear waste, belt limits, high OC | **Auto** |
| J | **Cause** | Error diagnostic written by the engine | **Auto** |
| K | **Qt/min STD** | Base rate at OC=100% (no boost) | **Auto** |
| L | **⚡ MW** | Total power consumption | **Auto** |
| M | **Somersloops** | Number of Somersloops slotted (0–4) | **Auto** / Manual |

> **Important**: Columns D, E, I, J, K, L are never entered manually — they are overwritten on every recalculation.

### Example

```
Iron Ingots | Smelter | Iron Ingot | (auto) | (auto) | 4 | 100 | Normal
```
→ 4 Smelters at 100% OC with recipe "Iron Ingot": D = 120/min OUT, E = 120/min IN.

### Example with overclocked extractor

```
Extraction | Miner Mk.3 | Mine: Iron | (auto) | (auto) | 1 | 200 | Pure
```
→ Flag `⚡ 200% OC → 249% energy` is generated automatically.

---

## 4. Real-time Automations

Every cell edit in the Production sheet triggers the engine automatically.

### Effective Rate Calculation (Overclock × Purity)

**Overclock** (column G):
$$\text{effective rate} = \text{recipe rate} \times \frac{\text{overclock}}{100}$$

Example: Constructor at 150% producing 20/min nominally → **30/min effective**.

**Node Purity** (column H, extractors only):

| Purity | Multiplier | Miner Mk.3 output |
|--------|------------|-------------------|
| Impure | ×0.5 | 120/min |
| Normal | ×1.0 | 240/min |
| Pure | ×2.0 | 480/min |

Both factors combine: Miner Mk.3 at 200% on a Pure node = **240 × 2 × 2 = 960/min**.

### Automatic Flags (column I)

| Flag | Trigger |
|------|---------|
| `☢️ X waste/min` | Machine = Nuclear Power Plant (12 waste per plant per minute) |
| `🟥 OUT > Mk.5 (780/min)` | Output rate exceeds Mk.5 belt limit |
| `🟥 IN > Mk.5 (780/min)` | Input rate exceeds Mk.5 belt limit |
| `⚡ X% OC → Y% energy` | Overclock > 150% |
| `🔮 Somersloop (×2 OUT)` | Somersloop slotted in the machine |

Power formula at overclock: $P = P_0 \times \left(\frac{\text{OC}}{100}\right)^{1.321}$

### Error Detection (column J)

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing machine` | Column B is empty | Fill in the machine name |
| `Missing recipe` | Column C is empty | Select a recipe from the list |
| `Machine count = 0` | Column F contains 0 | Set to at least 1 |

---

## 5. Understanding the Dashboard

The **📊 Dashboard** sheet updates automatically and shows:

- **Production lines** — total rows entered
- **Resources available** — reference resource count
- **Machines available** — reference machine count
- **Floors configured** — number of floors defined
- **Total resources IN / OUT** — sum of all consumed / produced quantities
- **Top 8 resources by output rate**
- **Bottlenecks** — resources consumed more than produced
- **Power** — total MW, max MW at 250% OC

---

## 6. Managing Reference Sheets

### Recipes (📖 Recipes)

Loaded from `01_data_v1_1.gs`. Contains all 67 official Satisfactory 1.1 recipes with inputs, outputs, rates, and tiers.

### Resources (💎 Resources)

Lists all raw materials, fluids, and products. Categories: `Ore`, `Metal`, `Fluid`, `Component`, etc.

To **add a resource**: append a new row after the existing data.

### Machines (⚙️ Machines)

Lists all machines with dimensions (W × L × H in meters) and power consumption (MW).

To **add a machine**: append a row after the existing data.

---

## 7. Configuring Floors

The **🏗️ Floors** sheet defines the vertical structure of your factory. Each row represents a production line named via a Priority Power Switch in-game.

| Column | Description |
|--------|-------------|
| **Floor** | Floor name (must match exactly what you enter in column A of Production) |
| **Order** | Sort number (1 = first) |
| **Type** | `NORMAL`, `NUCLEAR`, or other |
| **Note** | Free-form comment |

### Example

```
Iron Ingots      | 1 | NORMAL | Iron smelting line
Copper Ingots    | 2 | NORMAL | Copper smelting line
Steel Ingots     | 3 | NORMAL | Steel production
```

> Floors are automatically populated from `.sav` import — one Priority Power Switch = one production line (the switch tag = line name).

---

## 8. Satisfactory 1.1 Mechanics

### Resource Nodes and Purity

| Purity | Miner Mk.1 | Miner Mk.2 | Miner Mk.3 |
|--------|------------|------------|------------|
| Impure | 30/min | 60/min | 120/min |
| Normal | 60/min | 120/min | 240/min |
| Pure | 120/min | 240/min | 480/min |

At 250% OC on a Pure node: Miner Mk.3 reaches **1,200/min**.

### Belt Limits

| Belt | Max throughput |
|------|----------------|
| Mk.1 | 60/min |
| Mk.2 | 120/min |
| Mk.3 | 270/min |
| Mk.4 | 480/min |
| Mk.5 | 780/min |

The flag `🟥 OUT > Mk.5` triggers automatically if you exceed 780/min.

### Nuclear Waste

Each **Nuclear Power Plant** produces **12 nuclear waste rods/min**. The flag `☢️ X waste/min` is generated automatically. Waste cannot be destroyed — plan storage space.

### Somersloops

Somersloops are rare artefacts found on the map. When slotted into a machine:
- **×2 the OUT production** without changing IN consumption
- Increase power consumption

Column **M — Somersloops** (0–4) is auto-filled from `.sav` import.

### Space Elevator Phases

| Phase | Key parts |
|-------|-----------|
| Phase 1 | Reinforced Iron Plates, Rotors, Modular Frames |
| Phase 2 | Motors, Computers, Smart Plating |
| Phase 3 | Circuit Boards, Turbo Motors, Assembly Director Systems |
| Phase 4 | Alclad Sheets, Cooling Systems, Magnetic Field Generators |
| Phase 5 | Energy Crystals, Nuclear Catalysts, SAM Fluctuators |

---

## 9. The SAT Menu

| Option | Action |
|--------|--------|
| **🤖 Open assistant** | Open the analysis sidebar |
| **Full recalculate** | Re-run the engine on all production rows |
| **Production summary** | Popup: lines, machines, floors, errors |
| **➕ Add production line** | Modal form with recipe/machine/floor dropdowns |
| **📂 Import from save file** | Browser-side `.sav` parsing → fill Production |
| **Add floor** | Prompt → adds a row to 🏗️ Floors |
| **List floors** | Popup listing all defined floors |
| **Floor dimensions** | Calculates area (m²), 8×8 foundations, machine margins |
| **Show/Hide reference sheets** | Toggle visibility of Recipes/Resources/Machines |
| **Create dashboard charts** | (Re)generate the 2 permanent charts |
| **Archive factory & switch version** | Snapshot current sheets, create fresh ones for new game version |
| **Clean duplicate tabs** | Remove duplicate sheets from forced reloads |
| **Diagnostic** | Health report (version, sheets, row count) |
| **Update (soft reinstall)** | Rebuild sheets — ✅ Production + Floors data preserved |
| **FULL RESET** | Complete wipe |

> To access logs: **Extensions → Apps Script → Executions** in Google Sheets.

---

## 10. Understanding Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing machine` | Column B is empty | Fill in machine name |
| `Missing recipe` | Column C is empty | Select a recipe |
| `Machine count = 0` | Column F is 0 | Set to at least 1 |

Error rows are highlighted in red automatically.

---

## 11. FAQ

**Q: Dropdowns are missing in the Machine column.**
A: Check that ⚙️ Machines has data from row 2 onwards. If empty: menu SAT → Update (soft reinstall).

**Q: I added resources but they don't appear in dropdowns.**
A: Validations are rebuilt on install. Go to SAT → Full recalculate, or close and reopen the sheet.

**Q: Dashboard shows `#ERROR` in some cells.**
A: Close and reopen the sheet. If it persists: menu SAT → Update (soft reinstall).

**Q: Can I add custom resource types?**
A: Yes. Just append a row in 💎 Resources with any type you like — there is no closed list.

**Q: How do I export my data?**
A: Use **File → Download → Microsoft Excel (.xlsx)** or **.csv** from Google Sheets.

---

## 12. Smart Assistant

The assistant is accessible via **SAT → 🤖 Open assistant**. It opens automatically on every sheet load.

It analyzes your full factory and shows recommendation cards in a sidebar.

### Card Types

| Icon | Type | Trigger |
|------|------|---------|
| ❌ | Config error | Rows with missing Machine, Recipe or Count |
| ⚠️ | Warning | Incomplete rows or OC > 150% |
| 📉 | Bottleneck | Consumed resource > produced (deficit) |
| ℹ️ | Info | Phase progression, surplus detected |
| ☢️ | Nuclear | Nuclear power plant present (waste reminder) |
| ⚡ | Power | Total MW summary |
| ✅ | All good | No bottlenecks or errors |

### Action Buttons

Each card can have buttons that execute actions directly from the sidebar:

| Button | Action |
|--------|--------|
| **Fix bottleneck** | Runs solver, creates missing production lines |
| **Normalize OC** | Sets equivalent Count + OC=100% for a floor |
| **View Production** | Navigates to the Production sheet |
| **View Objectives** | Navigates to the Objectives sheet |

> After each action a toast appears and the sidebar auto-refreshes.

---

## 13. Import from Save File

S.A.T. can pre-fill the Production sheet from a Satisfactory `.sav` file, directly from the menu — no local tooling required.

### How It Works

1. Menu **SAT → 📂 Import from save file** — a sidebar opens
2. Click the file picker and select your `.sav`
3. The `@etothepii/satisfactory-file-parser` library is loaded from `esm.sh` CDN **in your browser** — no data is sent to Google
4. Parsing runs locally, a preview table is shown
5. Click **➕ Add to Production** or **🔄 Replace Production**
6. Rows are written to the sheet, recalculation runs automatically, and the assistant sidebar opens

### Production Line Detection

Floor names come from **Priority Power Switches** in-game:
- 1 Priority Power Switch = 1 production line
- The switch tag (user-set name) = the floor name
- Machines are assigned to a floor via their power circuit membership

### Auto-extracted Data

| Data | Source in save |
|------|----------------|
| Machine, Recipe | Unreal class path of the building |
| Overclock % | `mCurrentPotential` × 100 |
| Purity | `EResourcePurity` of the resource node |
| Somersloops | `mNumSomersloopsSlotted` |
| Floor | Priority Power Switch `mBuildingTag` |

### Collectibles Report

The sidebar also shows a summary of your save collectibles:

| Indicator | Content |
|-----------|---------|
| **Hard Drives** | Collected / total + % + remaining crash sites |
| **Somersloops** | Slotted in machines + in inventory + in the world |
| **Mercer Spheres** | In inventory + still in the world |
| **Power Slugs** | Green/Yellow/Blue + available power shards |
| **Playtime** | Extracted from save header |

### CLI Alternative

```bash
npm install
make parse-save SAV="/path/to/my-save.sav"
# or
node scripts/parse-save.js "/path/to/my-save.sav" output.csv
```

This generates `output.csv` (import-ready) and `output_rapport.txt` (collectibles report).

---

*S.A.T. — Satisfactory 1.1 | Google Apps Script*
