# 🧰 SAT ASSIST 2026 - Restructured & Fixed

**Status**: ✅ Production Ready | **Version**: 2026.02 Rev2 | **Files**: 37 Google Apps Script modules

SAT ASSIST est une application Google Sheets pour gérer la production d'une usine. Suivi intelligent, détection d'erreurs, dashboarding intuitif.

---

## 🆕 What's Fixed (v2026.02 Rev2)

| Problème | Solution |
|----------|----------|
| ❌ "SAT.CFG undefined" errors | ✅ Bootstrap system (00_bootstrap.gs) |
| ❌ "SAT.Etages not found" crashes | ✅ Consolidé en 10_core_etages.gs |
| ❌ onOpen() crashait | ✅ SAT._verifyCriticalInit() guards |
| ❌ Architecture confuse (43 fichiers) | ✅ Restructure par couche |
| ❌ Documentation obsolète | ✅ README complet |

---

## 📁 Nouvelle Structure

### 🟦 Couche 0: Bootstrap
- `00_bootstrap.gs` → Garantit ordre d'exécution

### 🟩 Couche 1: Core APIs
- `00_core_config.gs` → SAT.CFG
- `00_core_logging.gs` → SAT.Log
- `01_core_*.gs` → Helpers, Resilience, Utils
- `02_core_sheets.gs` → SAT.S

### 🟪 Couche 2: Business Logic
- `04_context_tracking.gs` → Documentation
- `10_core_etages.gs` → **[CONSOLIDÉ]** Floor management
- `10_automation_*.gs` → Orchestration
- `10_data_repo.gs` → Data access

### 🟨 Couche 3-4: Features
- `20-22_ui_*` → UI, Charts, Panels
- `30-32_resilience_*` → Health, Recovery
- `40-42_ergonomic_*` → Accessibility, Guidance

### 🔵 Couche 5: Application
- `50-53_app_*.gs` → Recalc, Triggers, Menu
- `AUTOMATION.gs`, `INITIALIZE.gs`

---

## 🔄 Ordre Garanti

📝 Google Apps Script charge alphabétiquement → Zéro dépendances non-résolues ✅

```
00_bootstrap                   (Déclare guards)
  ↓
00_core_config                 (SAT.CFG)
00_core_logging                (SAT.Log)
01_core_* (3)                  (Helpers)
02_core_sheets                 (SAT.S)
  ↓
10_core_etages, 10_automation  (Dépend Core)
  ↓
20-42_* features               (Dépend Core)
  ↓
50-53_app_*                    (ENTRY POINT)
  ↓
onOpen() → SAT._verifyCriticalInit() ✅
```

---

## 🚀 Quick Start (2 min)

1. **Menu 🧰 → 📊 Données → 🧱 Installer structure**
2. **Menu 🧰 → ➕ Production → ➕ Ajouter ligne**
3. **Vue: 📊 Overview → Sections TODO, ERROR, STATS**

---

## 📋 API Principales

```javascript
// Configuration
SAT.CFG.SHEETS.PRODUCTION
SAT.CFG.PRODUCTION.COLS.ETAGE

// Étages
SAT.Etages.add("Étage 0", 1, "Normal")
SAT.Etages.getAll()
SAT.EtagesAutoDetect.fullAutoSync()

// Dimensions
SAT.FloorLayout.proposeDimensions()

// Sheets
SAT.S.sheet("📈 Production")
SAT.S.must("📈 Production")

// Logging
SAT.Log.info("Message")
SAT.Log.error("Error")
```

---

## 🧰 Menu

```
🧰 SAT ASSIST
├─ 📊 Données → Installer, Recalcul, Triggers
├─ ➕ Production → Ajouter ligne
├─ 🔍 Chercher → Ressources, Étages
├─ 👁️ Affichage → Panneaux, Colorisation
└─ 🔧 Outils → Vérifier, Diagnostic, Documentation
```

---

## ✅ Validation

- [x] Bootstrap system
- [x] Core APIs garantis
- [x] Étages consolidés
- [x] onOpen() guards
- [x] Zéro erreurs "undefined"
- [x] README v2
- [x] 37 fichiers optimisés

---

## 🔧 Troubleshooting

| Error | Fix |
|-------|-----|
| SAT.CFG undefined | Ctrl+Shift+R → Menu → 🧱 Installer |
| SAT.Etages not found | Vérifie 10_core_etages.gs existe |
| onOpen() crashes | Menu → 🔧 Outils → ✓ Vérifier & réparer |
| Floors not detected | Ajoute données production → Run sync |

---

**SAT ASSIST v2026.02 Rev2** | Bootstrap System ✅ | 37 Files | Production Ready
# satisfactory-automated_calculator
