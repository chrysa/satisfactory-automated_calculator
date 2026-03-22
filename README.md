# 🏭 S.A.T. — Satisfactory Automated Tracker

**Version app**: 3.4 | **Jeu**: Satisfactory 1.1 | **Status**: ✅ Production Ready | **Fichiers**: 8 modules

Calculateur de production pour Satisfactory, basé sur Google Sheets / Apps Script. Saisie par recette officielle, calcul automatique des taux, alertes intelligentes, dashboard en temps réel.

---

## 📦 Structure du projet

```
satisfactory_automated_calculator/
├── src/                        ← Code Google Apps Script (8 fichiers)
│   ├── 00_core_config.gs       ← Config app + loader de données de jeu
│   ├── 01_data_v1_1.gs         ← Données Satisfactory 1.1 (machines, ressources, recettes)
│   ├── 10_engine.gs            ← Moteur de calcul (taux, flags, erreurs)
│   ├── 20_ui_charts.gs         ← Graphiques du dashboard
│   ├── 30_recalc.gs            ← Point d'entrée recalcul
│   ├── 40_install.gs           ← Installation / réinitialisation
│   ├── 41_triggers.gs          ← Déclencheurs (onOpen, onEdit)
│   └── 42_menu.gs              ← Menu SAT dans Google Sheets
├── README.md                   ← Ce fichier
├── GUIDE_UTILISATEUR.md        ← Guide d'utilisation complet
├── COPILOT_GUIDE.md            ← Patterns de code pour GitHub Copilot
├── appsscript.json             ← Config Google Apps Script
├── .clasp.json                 ← Config clasp (déploiement)
├── Makefile                    ← Commandes de développement
└── .gitignore
```

---

## ✨ Nouveautés v3.4

| Fonctionnalité | Statut |
|---|---|
| **Colonnes Qt/min STD & ⚡ MW** | ✅ Taux standard + consommation électrique par ligne |
| **Dashboard électricité** | ✅ MW total, MW/machine, dernière mise à jour |
| **Top ressources produites** | ✅ Top 8 par Qt/min affiché dans le Dashboard |
| **Goulots (sous-production)** | ✅ Ressources consommées > produites avec déficit |
| **Graphiques permanents** | ✅ 2 graphiques toujours présents (machines/étage + top Qt/min) |
| **Archivage & migration** | ✅ Archiver une usine et démarrer une nouvelle version jeu |

<details>
<summary>Historique des versions antérieures</summary>

### v3.3.1
- Correction mise à jour automatique Dashboard au changement de version
- Correction `SAT.S.get()` avec fallback emoji normalisé

### v3.3
- Suppression des doublons d'onglets à l'install
- Correction #ERROR dans les cellules de valeurs
- Amélioration ergonomique du Dashboard (changelog 1 ligne/version)

### v3.2
- Noms FR officiels (machines + ressources conformes wiki.gg/fr)
- Modularité version jeu (`SAT.DATA['1.1']`)
- Architecture allégée à 8 fichiers

</details>

---

## 🚀 Démarrage rapide

### 1. Déployer sur Google Sheets
```bash
clasp login          # Authentification Google
clasp push           # Envoyer le code
# ou
make push
```

### 2. Ouvrir le classeur
```bash
clasp open
```

### 3. Initialiser
- Menu **SAT → Réinstaller** pour créer toutes les feuilles
- Saisir les lignes de production dans **🏭 Production**

---

## 💻 Développement

### Prérequis
```bash
npm install -g @google/clasp
```

### Commandes
```bash
make push         # Push vers Apps Script
make pull         # Pull depuis Apps Script
make open         # Ouvrir dans le navigateur
make help         # Toutes les commandes
make help         # Show all commands
```

---

## 📚 Documentation

| Fichier | Contenu |
|---|---|
| **[GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md)** | Guide complet d'utilisation (saisie, calculs, feuilles) |
| **[COPILOT_GUIDE.md](COPILOT_GUIDE.md)** | Patterns de code, templates, workflows pour développer |

---

## 🏗️ Architecture

### Couche 0 — Config & Données
- `00_core_config.gs` → `SAT.CFG` — configuration + utilitaires de base (`SAT.U`, `SAT.S`, `SAT.Log`, `SAT.loadGameData`)
- `01_data_v1_1.gs` → `SAT.DATA['1.1']` — 18 machines, 95 ressources, 67 recettes (noms FR officiels)

### Couche 1 — Moteur
- `10_engine.gs` → `SAT.Engine` — calcul des taux, détection de flags, index des recettes

### Couche 2 — Interface
- `20_ui_charts.gs` → graphiques dashboard
- `30_recalc.gs` → point d'entrée recalcul complet

### Couche 3 — Application
- `40_install.gs` → création de toutes les feuilles, validations
- `41_triggers.gs` → `onOpen()`, `onEdit()`
- `42_menu.gs` → menu **SAT** dans Google Sheets

---

## 🔄 Mise à jour pour une nouvelle version de Satisfactory

```bash
# 1. Créer le fichier de données
cp src/01_data_v1_1.gs src/01_data_v2_0.gs
# Éditer SAT.DATA['2.0'] dans le nouveau fichier

# 2. Changer la version dans la config
# Dans 00_core_config.gs :
#   GAME_VERSION: '2.0'

# 3. Déployer
make push
```
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
