# Guide GitHub Copilot — S.A.T. v3.5.1

**Mis à jour** : 27 mars 2026 | **Version app** : 3.5.1 | **Jeu** : Satisfactory 1.1  

---

## 📂 Organisation des fichiers (9 modules)

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

