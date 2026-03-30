# S.A.T. — Developer Guide (GitHub Copilot / Contributors)

**Updated**: March 2026 | **Game**: Satisfactory 1.1

---

## 📂 File Layout (11 modules)

| File | Namespace | Role |
|------|-----------|------|
| `00_core_config.gs` | `SAT.CFG`, `SAT.U`, `SAT.S`, `SAT.Log` | App config, utilities, game data loader |
| `01_data_v1_1.gs` | `SAT.DATA['1.1']` | Satisfactory 1.1 data: 18 machines, 95 resources, 67 recipes |
| `01_data_TEMPLATE.gs` | — | Template for new game versions — copy this |
| `10_engine.gs` | `SAT.Engine` | Rate calculation, flag detection, recipe index |
| `11_solver.gs` | `SAT.Solver` | Objectives → production plan solver |
| `20_ui_charts.gs` | — | Dashboard charts |
| `30_recalc.gs` | — | `SAT_recalcAll()` — full recalculation entry point |
| `40_install.gs` | — | `SAT_install()` — sheet creation, validations, soft update |
| `41_triggers.gs` | — | `onOpen()`, `onEdit()` |
| `42_menu.gs` | — | `SAT_buildMenu()`, opens assistant on load |
| `50_assistant.gs` | `SAT.Assistant` | Factory analysis, bottlenecks, actionable suggestions |
| `51_import.gs` | — | Server-side: receive parsed rows → Production sheet |
| `51_import_ui.html` | — | Browser-side .sav parsing sidebar (esm.sh CDN) |

**Load order**: alphabetical → numeric prefixes guarantee correct dependency order.

---

## Part 1 — Code Patterns

### Module Template

```javascript
var SAT = this.SAT || (this.SAT = {});

// ============================================================
// SAT.ModuleName — Short description
// ============================================================

SAT.ModuleName = {

  publicMethod: function(param) {
    var cfg = SAT.CFG;
    try {
      // implementation
      SAT.Log.ok('publicMethod OK');
      return result;
    } catch (e) {
      SAT.Log.error('publicMethod: ' + e.message);
      throw e;
    }
  },

  _privateHelper: function() { /* ... */ }
};

Logger.log('✅ XX_module.gs loaded');
```

### Configuration Access

```javascript
var cfg = SAT.CFG;

// Sheet names
cfg.SHEETS.PROD   // '🏭 Production'
cfg.SHEETS.DASH   // '📊 Dashboard'
cfg.SHEETS.OBJ    // '🎯 Objectives'
cfg.SHEETS.REC    // '📖 Recipes'
cfg.SHEETS.RES    // '💎 Resources'
cfg.SHEETS.MACH   // '⚙️ Machines'
cfg.SHEETS.ETAG   // '🏗️ Floors'

// Production column indices (1-based)
cfg.C.ETAGE    // 1 — A  Floor
cfg.C.MACHINE  // 2 — B  Machine
cfg.C.RECIPE   // 3 — C  Recipe
cfg.C.OUT_RATE // 4 — D  Qt/min OUT (auto)
cfg.C.IN_RATE  // 5 — E  Qt/min IN  (auto)
cfg.C.NB       // 6 — F  Count
cfg.C.OC       // 7 — G  Overclock %
cfg.C.PUR      // 8 — H  Purity
cfg.C.FLAGS    // 9 — I  Auto flags
cfg.C.CAUSE    // 10 — J Error cause
cfg.C.STD_RATE // 11 — K Qt/min STD (base rate OC=100%)
cfg.C.MW       // 12 — L ⚡ Total MW
cfg.C.SLOOP    // 13 — M Somersloops (0–4)

// Purity multipliers
cfg.PURITY['Impur']   // 0.5
cfg.PURITY['Normal']  // 1.0
cfg.PURITY['Pur']     // 2.0

// Versions
cfg.VERSION       // app version (computed by GitVersion on CI)
cfg.GAME_VERSION  // '1.1'
```

### Game Data Access

```javascript
// Load game data (auto on first getRecipeIndex())
SAT.loadGameData();

var machines  = SAT.CFG.MACHINES;
var resources = SAT.CFG.RESOURCES;
var recipes   = SAT.CFG.RECIPES;

// Recipe index (auto-built)
var idx = SAT.getRecipeIndex();
var rec = idx['Iron Ingot'];
// rec = { name, machine, inRes1, inRate1, inRes2, inRate2,
//         outRes1, outRate1, outRes2, outRate2, tier }
```

### Sheet Access

```javascript
var sh = SAT.S.get('🏭 Production');    // null if missing
var sh = SAT.S.ensure('🏭 Production'); // create if missing

// Read a range
var data = sh.getRange(cfg.DAT_ROW, 1, sh.getLastRow() - 1, cfg.C.CAUSE)
             .getValues();
// data[i][cfg.C.RECIPE - 1] → recipe for row i
```

### Logging

```javascript
SAT.Log.info('Informational message');
SAT.Log.ok('Operation successful');
SAT.Log.warn('Warning');
SAT.Log.error('Critical error');
```

### Standard Error Handling Pattern

```javascript
function SAT_myAction() {
  try {
    SAT.loadGameData();
    var cfg = SAT.CFG;
    // ... code
    SAT.Log.ok('myAction done');
  } catch(e) {
    SAT.Log.error('myAction: ' + e.message);
    SpreadsheetApp.getUi().alert('Error: ' + e.message);
  }
}
```

---

## Part 2 — Game Version Isolation

Each Satisfactory version is a separate file. The active version is selected by a single config key.

### Adding a New Satisfactory Version

```bash
# 1. Copy the template
cp src/01_data_TEMPLATE.gs src/01_data_v2_0.gs
```

```javascript
// 2. In src/01_data_v2_0.gs — fill the data arrays
var SAT = this.SAT || (this.SAT = {});
SAT.DATA = SAT.DATA || {};
SAT.DATA['2.0'] = {
  MACHINES:  [
    // [Name, MW, In-belts, Out-belts, Category, W(m), L(m), H(m), Sloop-slots]
    ['Smelter', 4, 1, 1, 'Production', 5, 9, 9, 1],
  ],
  RESOURCES: [
    // [Name, Category]
    ['Iron Ore', 'Ore'],
  ],
  RECIPES: [
    // [Name, Machine, inRes1, inRate1, inRes2, inRate2,
    //                 outRes1, outRate1, outRes2, outRate2, Tier]
    ['Iron Ingot', 'Smelter', 'Iron Ore', 30, '', 0, 'Iron Ingot', 30, '', 0, 'T0'],
  ],
};
Logger.log('✅ 01_data_v2_0.gs loaded');
```

```javascript
// 3. In src/00_core_config.gs — activate the new version
GAME_VERSION: '2.0',
```

```bash
# 4. Deploy
make push
```

Multiple version files can coexist in `src/`. Only `GAME_VERSION` determines which is active.

---

## Part 3 — Production Sheet

Column structure (data rows start at row 2):

| Col | Letter | Field | Input |
|-----|--------|-------|-------|
| 1 | A | Floor | Manual (dropdown ← 🏗️ Floors) |
| 2 | B | Machine | Manual (dropdown ← ⚙️ Machines) |
| 3 | C | **Recipe** | Manual (dropdown ← 📖 Recipes) |
| 4 | D | Qt/min OUT | **Auto** (recipe × OC × purity) |
| 5 | E | Qt/min IN | **Auto** (recipe × OC) |
| 6 | F | Count | Manual |
| 7 | G | OC% | Manual (default 100) |
| 8 | H | Purity | Manual (Impure / Normal / Pure) |
| 9 | I | Flags | **Auto** (engine) |
| 10 | J | Cause | **Auto** (engine) |
| 11 | K | Qt/min STD | **Auto** |
| 12 | L | ⚡ MW | **Auto** |
| 13 | M | Somersloops | **Auto** / Manual |

> D, E, I, J, K, L are never manually entered — they are overwritten on every recalculation.

---

## Part 4 — Effective Copilot Prompts

### Create a new module
```
Following the patterns in COPILOT_GUIDE.md for S.A.T.:
In 10_engine.gs, add the method SAT.Engine.detectBeltLimits()
that iterates all rows and returns those where OUT rate exceeds 780/min.
Use SAT.CFG.C and SAT.Log.
```

### Fix a crash
```
This function crashes with SAT.CFG.RECIPES undefined.
Add SAT.loadGameData() at the top of the function.
Reference pattern in COPILOT_GUIDE.md section "Game Data Access".
```

### Add a recipe
```
Add to src/01_data_v1_1.gs, inside SAT.DATA['1.1'].RECIPES:
  ['Motor', 'Assembler', 'Rotor', 3.75, 'Stator', 3.75, 'Motor', 1.25, '', 0, 'T4']
Follow the existing format exactly.
```

---

## ✅ Best Practices

| Do | Don't |
|----|-------|
| Reference `COPILOT_GUIDE.md` in prompts | Vague prompts without context |
| `SAT.S.get()` / `SAT.S.ensure()` for sheets | Hardcode sheet names as strings |
| `SAT.CFG.SHEETS.PROD` for sheet name constants | Hardcode `'Production'` |
| `SAT.Log.*` for all logging | Raw `Logger.log()` |
| `SAT.loadGameData()` before using RECIPES | Access `SAT.CFG.RECIPES` without loading |
| Official game names from wiki.gg | Translated or approximate names |

---

## 🔧 Common Diagnostics

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `SAT.CFG.RECIPES is null` | `loadGameData()` not called | Add `SAT.loadGameData()` at top of function |
| `SAT data not found for v…` | `GAME_VERSION` has no matching `SAT.DATA` key | Check `01_data_vX_Y.gs` exists and is pushed |
| Recipe not found in index | Name mismatch (accent, case) | Check exact name in `01_data_v1_1.gs` |
| OUT rate = 0 on extractor | Purity value not recognized | Valid values: `'Impur'`, `'Normal'`, `'Pur'` |
| Assistant sidebar not opening | `onOpen` trigger not installed | Menu SAT → ⚙️ Enable assistant on startup |

---

## 🔄 Versioning

Version numbers are computed automatically by **GitVersion** from the git history:

- `feat:` → minor bump
- `fix:` / `chore:` → patch bump
- `feat!:` or `BREAKING CHANGE` → major bump

The `VERSION` field in `00_core_config.gs` is injected by the CI deploy job.
Do **not** manually edit `VERSION` — it will be overwritten.

See [GitVersion.yml](../GitVersion.yml) for the branching strategy configuration.

| Fichier | Namespace | Rôle |
|---|---|---|
| `00_core_config.gs` | `SAT.CFG`, `SAT.U`, `SAT.S`, `SAT.Log` | Config app, utilitaires, loader de données |
| `01_data_v1_1.gs` | `SAT.DATA['1.1']` | Données jeu : 18 machines, 95 ressources, 67 recettes |
| `10_engine.gs` | `SAT.Engine` | Calcul taux, flags, index recettes |
| `20_ui_charts.gs` | — | Graphiques dashboard |
| `30_recalc.gs` | — | `SAT_recalcAll()` — recalcul complet |
| `40_install.gs` | — | `SAT_install()` — création des feuilles |
| `41_triggers.gs` | — | `onOpen()`, `onEdit()` |
| `42_menu.gs` | — | `SAT_buildMenu()` — menu Google Sheets |
| `50_assistant.gs` | `SAT.Assistant` | Analyse usine, détection goulots, suggestions actionnables |

**Ordre de chargement** : alphabétique → les préfixes numériques garantissent l'ordre correct des dépendances.

---

## 🏗️ Partie 1 : Patterns de code

### Template module

```javascript
var SAT = this.SAT || (this.SAT = {});

// ============================================================
// SAT.ModuleName — Description courte
// ============================================================

SAT.ModuleName = {

  publicMethod: function(param) {
    var cfg = SAT.CFG;
    var log = SAT.Log;
    try {
      // implémentation
      log.ok('publicMethod OK');
      return result;
    } catch (e) {
      log.error('publicMethod: ' + e.message);
      throw e;
    }
  },

  _privateHelper: function() { /* ... */ }
};

Logger.log('✅ XX_module.gs loaded');
```

### Accès à la configuration

```javascript
var cfg = SAT.CFG;

// Feuilles
cfg.SHEETS.PROD   // '🏭 Production'
cfg.SHEETS.DASH   // '📊 Tableau de bord'
cfg.SHEETS.OBJ    // '🎯 Objectifs'
cfg.SHEETS.REC    // '📖 Recettes'
cfg.SHEETS.RES    // '💎 Ressources'
cfg.SHEETS.MACH   // '⚙️ Machines'
cfg.SHEETS.ETAG   // '🏗️ Étages'

// Colonnes Production (1-based)
cfg.C.ETAGE    // 1 — A
cfg.C.MACHINE  // 2 — B
cfg.C.RECIPE   // 3 — C
cfg.C.OUT_RATE // 4 — D (calculé auto)
cfg.C.IN_RATE  // 5 — E (calculé auto)
cfg.C.NB       // 6 — F
cfg.C.OC       // 7 — G
cfg.C.PUR      // 8 — H
cfg.C.FLAGS    // 9 — I
cfg.C.CAUSE    // 10 — J
cfg.C.STD_RATE // 11 — K (Qt/min à OC=100%, sans suralimentation)
cfg.C.MW       // 12 — L (⚡ consommation électrique totale)
cfg.C.SLOOP    // 13 — M (Somersloops : 0–4)

// Pureté
cfg.PURITY['Impur']   // 0.5
cfg.PURITY['Normal']  // 1.0
cfg.PURITY['Pur']     // 2.0

// Versions
cfg.VERSION       // '3.2' (application)
cfg.GAME_VERSION  // '1.1' (Satisfactory)
```

### Accès aux données du jeu

```javascript
// Charger les données (automatique au 1er getRecipeIndex())
SAT.loadGameData();  // injecte MACHINES, RESOURCES, RECIPES dans SAT.CFG

var machines  = SAT.CFG.MACHINES;   // tableau des machines
var resources = SAT.CFG.RESOURCES;  // tableau des ressources
var recipes   = SAT.CFG.RECIPES;    // tableau des recettes

// Index recettes par nom (auto-construit)
var idx = SAT.getRecipeIndex();
var rec = idx['Plaque de fer'];
// rec = { name, machine, inRes1, inRate1, inRes2, inRate2,
//         outRes1, outRate1, outRes2, outRate2, tier }
```

### Accès aux feuilles

```javascript
var sh = SAT.S.get('🏭 Production');    // null si absente
var sh = SAT.S.ensure('🏭 Production'); // crée si absente

// Lecture d'une plage
var data = sh.getRange(cfg.DAT_ROW, 1, sh.getLastRow() - 1, cfg.C.CAUSE)
             .getValues();
// data[i][cfg.C.RECIPE - 1] → recette de la ligne i
```

### Logging

```javascript
SAT.Log.info('Message informatif');
SAT.Log.ok('Opération réussie');
SAT.Log.warn('Avertissement');
SAT.Log.error('Erreur critique');
```

### Gestion des erreurs (pattern standard)

```javascript
function SAT_myAction() {
  try {
    SAT.loadGameData();
    var cfg = SAT.CFG;
    // ... code
    SAT.Log.ok('myAction terminée');
  } catch(e) {
    SAT.Log.error('myAction: ' + e.message);
    SpreadsheetApp.getUi().alert('Erreur : ' + e.message);
  }
}
```

---

## 🔄 Partie 2 : Modularité version Satisfactory

Pour supporter une nouvelle version du jeu :

**1. Créer le fichier de données**
```javascript
// src/01_data_v2_0.gs
var SAT = this.SAT || (this.SAT = {});
SAT.DATA = SAT.DATA || {};
SAT.DATA['2.0'] = {
  MACHINES:  [ /* ... */ ],   // [name, ...]
  RESOURCES: [ /* ... */ ],   // [name, type, ...]
  RECIPES:   [ /* ... */ ]    // [name, machine, inRes1, inRate1, inRes2, inRate2,
                               //  outRes1, outRate1, outRes2, outRate2, tier]
};
Logger.log('✅ 01_data_v2_0.gs loaded');
```

**2. Changer la version dans `00_core_config.gs`**
```javascript
GAME_VERSION: '2.0',   // ← pointer vers le nouveau fichier
```

**3. Déployer**
```bash
make push
```

---

## 🏭 Partie 3 : Feuille Production

Structure des colonnes (ligne de données = à partir de la ligne 2) :

| Col | Lettre | Champ | Saisie |
|---|---|---|---|
| 1 | A | Étage | Manuelle (dropdown ← 🏗️ Étages) |
| 2 | B | Machine | Manuelle (dropdown ← ⚙️ Machines) |
| 3 | C | **Recette** | Manuelle (dropdown ← 📖 Recettes) |
| 4 | D | Qt/min OUT | **Auto** (recette × OC × pureté) |
| 5 | E | Qt/min IN | **Auto** (recette × OC) |
| 6 | F | Nb machines | Manuelle |
| 7 | G | Overclock % | Manuelle (défaut 100) |
| 8 | H | Pureté | Manuelle (Impur / Normal / Pur) |
| 9 | I | Flags | **Auto** (moteur) |
| 10 | J | Cause | **Auto** (moteur) |

> D et E ne sont jamais saisies manuellement — elles sont écrasées à chaque recalcul.

---

## 💡 Partie 4 : Prompts Copilot efficaces

### Créer un nouveau module
```
En suivant les patterns de COPILOT_GUIDE.md pour SAT v3.2 :
Dans 10_engine.gs, ajoute la méthode SAT.Engine.detectConveyorLimits()
qui parcourt toutes les lignes et retourne les lignes dont le taux OUT
dépasse 780/min. Utilise SAT.CFG.C et SAT.Log.
```

### Corriger une erreur
```
Cette fonction crash sur SAT.CFG.RECIPES undefined.
Ajoute l'appel à SAT.loadGameData() en début de fonction.
Pattern de référence dans COPILOT_GUIDE.md section "Accès données jeu".
```

### Ajouter une recette
```
Ajoute dans src/01_data_v1_1.gs, dans SAT.DATA['1.1'].RECIPES,
la recette "Moteur" :
  machine: "Façonneuse", inRes1: "Rotor", inRate1: 3.75,
  inRes2: "Stator", inRate2: 3.75, outRes1: "Moteur", outRate1: 1.25, tier: 4
```

---

## ✅ Bonnes pratiques

| À faire | À éviter |
|---|---|
| Référencer `COPILOT_GUIDE.md` dans les prompts | Prompts vagues sans contexte |
| `SAT.S.get()` / `SAT.S.ensure()` pour les feuilles | Noms de feuilles en dur |
| `SAT.CFG.SHEETS.PROD` pour les noms d'onglets | Hardcoder `'Production'` |
| `SAT.Log.*` pour les logs | `console.log()` / `Logger.log()` brut |
| `SAT.loadGameData()` avant d'utiliser RECIPES | Accès direct à `SAT.CFG.RECIPES` sans chargement |
| Noms FR officiels (wiki.gg/fr) | Noms anglais dans MACHINES/RESOURCES/RECIPES |

---

## 🔧 Diagnostics courants

| Symptôme | Cause probable | Solution |
|---|---|---|
| `SAT.CFG.RECIPES is null` | `loadGameData()` non appelé | Ajouter `SAT.loadGameData()` en début de fonction |
| `données introuvables pour Satisfactory v…` | `GAME_VERSION` ne correspond à aucun `SAT.DATA` | Vérifier que `01_data_vX_Y.gs` existe et est pushé |
| Recette introuvable dans l'index | Nom avec faute (accent, casse) | Vérifier le nom exact dans `01_data_v1_1.gs` |
| Taux OUT = 0 sur extracteur | Pureté non reconnue | Valeurs valides : `'Impur'`, `'Normal'`, `'Pur'` |
