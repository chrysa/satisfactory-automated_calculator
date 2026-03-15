# 🧰 SAT ASSIST 2026 - Production Ready

**Version**: 2026.03 | **Status**: ✅ Production Ready | **Files**: 33 modules | **LOC**: 9K production code

Factory production management system for Google Sheets. Intelligent tracking, error detection, intuitive dashboard.

---

## 📦 Project Structure

```
satisfactory_automated_calculator/
├── src/                    ← All Google Apps Script code (33 files)
│   ├── 00_bootstrap.gs     ← Layer 0: Bootstrap system  
│   ├── 00-02_core_*.gs     ← Layer 1: Core APIs
│   ├── 04-12_*.gs          ← Layer 2: Business logic
│   ├── 20-42_*.gs          ← Layer 3-4: Features & UI
│   └── 50-53_app_*.gs      ← Layer 5: Application entry points
├── README.md               ← This file
├── COPILOT_GUIDE.md        ← GitHub Copilot patterns & workflows
├── appsscript.json         ← Google Apps Script project config
├── .clasp.json             ← clasp configuration
├── Makefile                ← Development commands
└── .gitignore              ← Git configuration
```

---

## ✨ What's New (v2026.03)

| Feature | Status |
|---------|--------|
| **Contextual Menu** | ✅ Menu adapts dynamically to sheet state |
| **Retry Pattern** | ✅ `SAT_Resilience_Retry()` - Exponential backoff + jitter |
| **Minimal Docs** | ✅ 2 files only: README.md + COPILOT_GUIDE.md |
| **Clean Architecture** | ✅ 33 files, 9K LOC, zero legacy code |

---

## 🚀 Quick Start

### 1. Deploy to Google Sheets
```bash
# Authenticate with Google
clasp login

# Push code to Google Apps Script
clasp push

# Or use make
make deploy
```

### 2. Open in Google Sheets
```bash
clasp open
```

### 3. Initialize
- **Menu 🧰 → 📊 Données → 🧱 Installer structure**
- Then add production data

---

## 💻 Development

### Install Dependencies
```bash
npm install -g @google/clasp
npm install
```

### Build & Deploy
```bash
make deploy       # Full deployment
make push         # Push code only
make pull         # Pull from Apps Script
make open         # Open in browser
make watch        # Watch for changes
make test         # Run tests if any
make help         # Show all commands
```

---

## 📚 Code Documentation

| File | Purpose |
|------|---------|
| **[COPILOT_GUIDE.md](COPILOT_GUIDE.md)** | GitHub Copilot patterns, code templates, workflows |
| **src/** | 33 Google Apps Script modules organized by layer |

---

## 🏗️ 5-Layer Architecture

### Layer 0: Bootstrap
- `00_bootstrap.gs` - Initialization guards, load order verification

### Layer 1: Core APIs (7 files)
- `00_core_config.gs` → `SAT.CFG` (centralized configuration)
- `00_core_logging.gs` → `SAT.Log` (logging with emojis)
- `01_core_resilience.gs` → `SAT.Resilience` (retry pattern, recovery)
- `02_core_sheets.gs` → `SAT.S` (safe sheet access)

### Layer 2: Business Logic (8 files)
- `10_core_etages.gs` → Floor/Stage management
- `10_automation_*.gs` → Automation handlers
- `11_automation_executor.gs` → Queue-based execution
- `12_automation_scheduler.gs` → Scheduling

### Layer 3-4: Features (14 files)
- UI components, forms, dashboards
- Resilience monitoring and recovery
- Ergonomic helpers and accessibility

### Layer 5: Application (3 files)
- `50_app_recalc.gs` → Recalculation engine
- `51_app_install.gs` → Installation & setup
- `52_app_triggers.gs` → Event handlers (onOpen, onEdit)
- `53_app_menu.gs` → **ENTRY POINT** with contextual menu

---

## 💡 Code Examples

```javascript
// Configuration centralisée
var prodSheet = SAT.CFG.SHEETS.PRODUCTION;
var startRow = SAT.CFG.PRODUCTION.DATA_START_ROW;

// Étages (Stages/Floors)
SAT.Etages.add("Stage 0", 1, "normal");
var allFloors = SAT.Etages.getAll();

// Sheet access (safe)
var sheet = SAT.S.must("📈 Production", "Production");
var data = sheet.getRange(2, 1, 100, 10).getValues();

// Logging with emojis
SAT.Log.info("✓ Operation succeeded");
SAT.Log.warn("⚠ Warning message");
SAT.Log.error("🔴 Error occurred");

// Retry pattern (NEW)
var result = SAT_Resilience_Retry(
  function() { return unreliableOperation(); },
  3,              // maxRetries
  500,            // initialDelayMs
  "OperationName" // for logging
);
```

---

## 🧰 Menu Structure

```
🧰 SAT ASSIST (Contextual Menu)
├─ 📊 Données
│  ├─ 🧱 Installer structure (first-time setup)
│  ├─ 🔄 Recalculer tout
│  └─ ✓ Vérifier intégrité
├─ ➕ Production
│  └─ ➕ Ajouter ligne
├─ 🔍 Chercher
│  ├─ 🔎 Ressources
│  └─ 🏗️ Étages
├─ 👁️ Affichage
│  ├─ 📊 Panneaux
│  └─ 🎨 Colorisation
└─ 🔧 Outils
   ├─ 🔍 Diagnostic
   ├─ 🔧 Auto-repair
   └─ 📖 Documentation
```

The menu adapts dynamically based on current state:
- First-time users see setup instructions
- Error states show recovery options
- Production sheet activates production-specific actions

---

## 🔐 Code Patterns

### Always Use Guards (CRITICAL)
```javascript
function myFunction() {
  var cfg = SAT._ensureAPI("CFG", "00_core_config");
  var log = SAT._ensureAPI("Log", "00_core_logging");
  
  // Now safe to use cfg and log
}
```

### Error Handling
```javascript
try {
  var data = SAT.SomeModule.getData();
  SAT.Log.info("✓ Data loaded: " + data.length + " rows");
  return data;
} catch (e) {
  SAT.Log.error("getData failed: " + e.message);
  throw e;
}
```

### Module Structure
```javascript
var SAT = this.SAT || (this.SAT = {});

SAT.MyModule = SAT.MyModule || {
  publicMethod: function(param) {
    try {
      // Implementation
      return result;
    } catch (e) {
      SAT.Log.error("publicMethod failed: " + e.message);
      throw e;
    }
  }
};

Logger.log("✅ filename.gs loaded");
```

---

## ✅ Pre-Deployment Checklist

- [ ] All 33 files in `src/` directory
- [ ] `src/00_bootstrap.gs` loads first
- [ ] `appsscript.json` references correct scriptId
- [ ] `.clasp.json` has correct rootDir pointing to `src/`
- [ ] No uncommitted changes in git
- [ ] Ran `make pre-commit` successfully

---

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| `SAT.CFG undefined` | Menu → 🧰 → 📊 → 🧱 Installer structure |
| Menu doesn't appear | Reload: Ctrl+Shift+R (or Cmd+Shift+R on Mac) |
| onOpen() crashes | Menu → 🔧 → 🔍 Diagnostic & Auto-repair |
| `.clasp.json not found` | Run `clasp login` in project root |
| `Need rootDir` | Ensure `.clasp.json` has `"rootDir": "src"` |

---

## 🤖 Using GitHub Copilot

Reference `COPILOT_GUIDE.md` in your prompts:

```
Using COPILOT_GUIDE.md and SAT ASSIST 2026:
In src/15_feature_*.gs, add SAT.MyFeature.doSomething()
that uses SAT._ensureAPI() guards and SAT.Log for errors.
```

---

## 📊 Project Metrics

| Metric | Value |
|--------|-------|
| Files | 33 .gs modules |
| Lines of Code | ~9,000 (production only) |
| Layers | 5 (Bootstrap → Core → Business → Features → App) |
| Load Order | Alphabetical (guaranteed by Google Apps Script) |
| Dependencies | Zero circular dependencies |
| Documentation | 2 files (minimal) |
| Copilot Ready | ✅ Patterns documented |

---

## 🚀 Deploy

```bash
# First time
clasp login
clasp push

# Or with make
make deploy

# Then open in Google Sheets
clasp open
```

---

## 📝 Version History

- **v2026.03** - Contextual menu, retry pattern, doc consolidation
- **v2026.02** - Bootstrap system, core APIs, architecture
- **v2026.01** - Initial production version

---

**SAT ASSIST v2026.03** | 33 Files | 9K LOC | Bootstrap ✓ | Production Ready ✨

For GitHub Copilot help → See [COPILOT_GUIDE.md](COPILOT_GUIDE.md)
# satisfactory-automated_calculator
