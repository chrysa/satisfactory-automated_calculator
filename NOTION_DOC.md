# 🏭 S.A.T. — Satisfactory Automated Tracker

> **Calculateur de production automatisé pour Satisfactory 1.1, basé sur Google Sheets.**
> Saisie par recette officielle, calcul automatique des taux, alertes intelligentes, dashboard en temps réel.

---

🔗 **Dépôt GitHub** → [github.com/chrysa/satisfactory-automated_calculator](https://github.com/chrysa/satisfactory-automated_calculator)

---

## 📋 Sommaire

1. [Présentation](#présentation)
2. [Démarrage rapide](#démarrage-rapide)
3. [Structure du classeur](#structure-du-classeur)
4. [Saisir une ligne de production](#saisir-une-ligne-de-production)
5. [Calculs automatiques](#calculs-automatiques)
6. [Flags automatiques](#flags-automatiques)
7. [Étages](#étages)
8. [Menu S.A.T.](#menu-sat)
9. [Assistant intelligent](#assistant-intelligent)
10. [Parser de sauvegarde](#parser-de-sauvegarde)
11. [Architecture technique](#architecture-technique)
12. [Ajouter une version de Satisfactory](#ajouter-une-version-de-satisfactory)

---

## Présentation

S.A.T. est un script Google Apps Script qui transforme un Google Sheet en calculateur de production pour Satisfactory. Il intègre :

- **67 recettes officielles** (wiki.gg/fr, v1.1) avec taux IN/OUT précis
- **18 machines** avec puissance et catégorie
- **95 ressources** classées par catégorie
- Calcul automatique des taux à chaque modification
- Alertes overclock, déchets nucléaires, limite convoyeur
- Dashboard statistique en temps réel
- **Assistant intelligent** — analyse goulots, OC, phases, surplus
- **Parser de sauvegarde** — extrait machines + rapport collectibles depuis un fichier `.sav`
- Protections des cellules/onglets en lecture seule

---

## Démarrage rapide

### Prérequis

```bash
npm install -g @google/clasp
clasp login
```

### Déployer

```bash
git clone https://github.com/chrysa/satisfactory-automated_calculator.git
cd satisfactory-automated_calculator
clasp push
```

### Initialiser le classeur

1. Ouvrir le Google Sheet associé
2. Menu **S.A.T. → Mettre à jour (reinstall)**
3. Les 6 onglets sont créés automatiquement

> **Note :** À la première ouverture, l'installation se lance automatiquement si aucune donnée n'est présente.

---

## Structure du classeur

| Onglet | Rôle | Modifiable |
|---|---|---|
| 📊 **Tableau de bord** | Statistiques globales, graphiques | ⛔ Lecture seule |
| 🏭 **Production** | Saisie des lignes de production | ✅ Colonnes A/B/C/F/G/H |
| 📖 **Recettes** | Référentiel des 67 recettes officielles | ⛔ Lecture seule |
| 💎 **Ressources** | Référentiel des 95 ressources | ⛔ Lecture seule |
| ⚙️ **Machines** | Référentiel des 18 machines | ⛔ Lecture seule |
| 🏗️ **Étages** | Configuration des niveaux de l'usine | ✅ À remplir |

---

## Saisir une ligne de production

La feuille **🏭 Production** est le cœur du calculateur. Chaque lignes = une machine (ou groupe de machines identiques).

### Colonnes

| Col | Nom | Type | Description |
|---|---|---|---|
| A | **Étage** | Dropdown | Niveau de l'usine (ex : `Étage 1 – Fer`) |
| B | **Machine** | Dropdown | Machine utilisée |
| C | **Recette** | Dropdown | Recette officielle |
| D | **Qt/min OUT** | 🤖 Auto | Débit de sortie calculé |
| E | **Qt/min IN** | 🤖 Auto | Débit d'entrée calculé |
| F | **Nb** | Saisie | Nombre de machines |
| G | **Overclock %** | Saisie | 1 – 250 (défaut 100) |
| H | **Pureté** | Dropdown | `Impur` / `Normal` / `Pur` |
| I | **Flags** | 🤖 Auto | Alertes overclock, nucléaire… |
| J | **Cause** | 🤖 Auto | Diagnostic d'erreur |
| K | **Qt/min STD** | 🤖 Auto | Taux à OC=100 % (référence) |
| L | **⚡ MW** | 🤖 Auto | Consommation électrique totale |
| M | **Somersloops** | Saisie | Nombre de somersloops slottés (0–4) |

> Les colonnes **D, E, I, J, K, L** sont protégées. Elles ne doivent jamais être saisies manuellement.

### Exemple

```
Étage 1    | Constructeur | Plaque de fer | (auto) | (auto) | 4 | 100 | Normal
Étage 0    | Foreuse Mk.3 | Minerai de fer (Mk.3) | (auto) | (auto) | 1 | 200 | Pur
```

---

## Calculs automatiques

### Formule générale

$$\text{Qt/min OUT} = \text{taux\_recette} \times \frac{\text{OC}}{100} \times \text{mult\_pureté}$$

Le multiplicateur de pureté ne s'applique qu'aux **extracteurs** (Foreuse, Pompe à eau, Puit de pétrole).

### Multiplicateurs de pureté

| Pureté | Multiplicateur | Foreuse Mk.3 sortie |
|---|---|---|
| Impur | ×0,5 | 120/min |
| Normal | ×1,0 | 240/min |
| Pur | ×2,0 | 480/min |

### Débits convoyeurs de référence

| Convoyeur | Débit max |
|---|---|
| Mk.1 | 60/min |
| Mk.2 | 120/min |
| Mk.3 | 270/min |
| Mk.4 | 480/min |
| Mk.5 | 780/min |

---

## Flags automatiques

La colonne **I – Flags** est remplie automatiquement :

| Flag | Déclencheur |
|---|---|
| `⚡ OC X% = Y% MW` | Overclock > 150 % — affiche la consommation relative |
| `☢️ Déchets: X/min` | Machine = Centrale nucléaire (12 déchets/min × nb) |
| `📉 Nœud impur (×0,5)` | Pureté = Impur |
| `📈 Nœud pur (×2,0)` | Pureté = Pur |

### Formule consommation overclock

$$P = P_0 \times \left(\frac{\text{OC}}{100}\right)^{1{,}321}$$

Exemple : 200 % OC → **×2,49** de consommation électrique.

---

## Étages

La feuille **🏗️ Étages** définit la structure verticale de l'usine.

### Colonnes

| Col | Description |
|---|---|
| **Étage** | Nom (doit correspondre exactement à la colonne A de Production) |
| **Ordre** | Numéro de tri (1 = premier) |
| **Description** | Description libre |
| **Note** | Commentaire |

### Ajouter un étage

- Via **Menu S.A.T. → Ajouter un étage** (prompt)
- Ou directement dans la feuille Étages

---

## Menu S.A.T.

| Option | Fonction |
|---|---|
| **🤖 Ouvrir l'assistant** | Sidebar d'analyse — goulots, OC élevé, phase, nucléaire, surplus |
| **Recalcul complet** | Relance le moteur sur toutes les lignes |
| **Résumé de production** | Popup : nb lignes, machines, étages, erreurs |
| **➕ Ajouter une ligne de production** | Formulaire modal HTML — dropdowns recette/machine/étage, OC%, pureté |
| **📂 Importer depuis une sauvegarde** | Sidebar browser-side — parse `.sav` + import direct dans Production |
| **Ajouter un étage** | Prompt → ajoute une ligne dans 🏗️ Étages |
| **Lister les étages** | Popup listant tous les étages définis |
| **Taille des étages** | Surface m², fondations 8×8, marge configurable |
| **Marge des machines…** | Définit la marge de déplacement autour des machines (défaut 2 m) |
| **Créer graphiques Dashboard** | Génère les graphiques dans 📊 Tableau de bord |
| **Archiver usine & changer version jeu** | Snapshot des feuilles + recréation vierge pour nouvelle version |
| **Nettoyer les doublons d'onglets** | Supprime les onglets en double |
| **Mettre à jour (reinstall)** | Reconstruit les feuilles — ✅ données Production + Étages conservées |
| **RESET complet** | Réinitialisation intégrale (efface tout) |
| **Diagnostic** | Popup : version, feuilles présentes, nb lignes |

---

## Assistant intelligent

L'assistant est accessible via **S.A.T. → 🤖 Ouvrir l'assistant**. Il analyse l'état complet de l'usine en temps réel et affiche des cartes de recommandation dans une sidebar.

| Type | Déclencheur | Bouton d'action |
|---|---|---|
| ❌ Erreur config | Machine / Recette / Nb manquants | Voir Production |
| ⚠️ Avertissement | OC > 150 % ou lignes incomplètes | — |
| 🔴 Goulot | Ressource consommée > produite | Fix auto (solveur) |
| ℹ️ Phase | Recettes de la phase suivante disponibles | — |
| ☢️ Nucléaire | Centrale nucléaire présente | — |
| ⚡ Énergie | Bilan MW total | — |

---

## Parser de sauvegarde

Accessible via **S.A.T. → 📂 Importer depuis une sauvegarde** — aucun outil en local requis.

### Fonctionnement

1. La sidebar `51_import.html` s'ouvre dans Google Sheets
2. L'utilisateur sélectionne son fichier `.sav`
3. `@etothepii/satisfactory-file-parser` est chargé depuis `esm.sh` CDN **dans le navigateur**
4. Le parsing et l'extraction ont lieu **côté client** — aucun fichier n'est envoyé à Google
5. Une prévisualisation + rapport de collectibles s'affiche
6. `SAT_importFromSave(rows, append)` est appelé server-side pour écrire dans Production

> ⚠️ **Prototype** — Le comportement dans le sandbox HtmlService de GAS n'est pas garanti. Si la lib CDN ne charge pas, l'alternative `make parse-save` (Node.js local) génère un CSV importable manuellement.

### Fichiers générés par `make parse-save` (alternative)

```bash
make parse-save SAV="chemin/vers/save.sav"
# ou
node scripts/parse-save.js save.sav [output.csv]
```

| Fichier | Contenu |
|---|---|
| `<nom>_production.csv` | Prêt à importer dans la feuille Production |
| `<nom>_rapport.txt` | Résumé des collectibles (disques, somersloops, sphères, limaces) |

### Production CSV — colonnes

`Étage, Machine, Recette, Nb, OC%, Pureté, Somersloops`

### Rapport collectibles — indicateurs

| Indicateur | Source dans la save |
|---|---|
| Disques durs collectés / total (%) | `Desc_HardDrive_C` en inventaire + `CrashSiteDebris` dans le monde |
| Sites de crash restants | Objets `CrashSiteDebris*` encore dans le monde |
| Somersloops slottés | `mNumSomersloopsSlotted` par machine |
| Somersloops en inventaire | `Desc_AlienArtifact_C` en inventaire |
| Somersloops dans le monde | `BP_AlienArtifact_C` encore dans le monde |
| Sphères de Mercer | `Desc_AlienRemnant_C` + `BP_AlienRemnant*` |
| Limaces vertes (×1 shard) | `Desc_Crystal_C` / `BP_Crystal_C` |
| Limaces jaunes (×2 shards) | `Desc_Crystal_mk2_C` / `BP_Crystal_mk2_C` |
| Limaces bleues (×5 shards) | `Desc_Crystal_mk3_C` / `BP_Crystal_mk3_C` |
| Shards disponibles | Somme pondérée des limaces collectées |
| Durée de jeu | `playDurationSeconds` dans l'en-tête |

### Intégration dans la GSheet

GAS ne peut pas lire de fichiers locaux côté serveur. Deux approches :

**A — CSV pipeline (recommandé)** : `make parse-save` → upload Drive → import menu S.A.T.

**B — Browser-side (intégré, prototype)** : sidebar `51_import.html` — bundle chargé depuis `esm.sh`, parsing dans le navigateur, `google.script.run` pour écrire directement. Pas d'outil local requis.

---

## Architecture technique

### Stack

- **Google Apps Script V8** (JavaScript ES2019 subset)
- **clasp 3.3.0** — déploiement local → GAS
- **Google Sheets** comme base de données et interface

### Fichiers source (`src/`)

| Fichier | Namespace | Rôle |
|---|---|---|
| `00_core_config.gs` | `SAT.CFG` `SAT.U` `SAT.S` `SAT.Log` | Config, utilitaires, loader |
| `01_data_v1_1.gs` | `SAT.DATA['1.1']` | 18 machines · 95 ressources · 67 recettes |
| `10_engine.gs` | `SAT.Engine` | Moteur de calcul, flags, stats |
| `20_ui_charts.gs` | `SAT.Charts` | Graphiques dashboard |
| `30_recalc.gs` | — | `SAT_recalcAll()` |
| `40_install.gs` | — | `SAT_install()` · validations · protections |
| `41_triggers.gs` | — | `onEdit()` — recalcul ciblé ligne par ligne |
| `42_menu.gs` | — | `onOpen()` · menu · actions utilisateur |
| `50_assistant.gs` | `SAT.Assistant` | Analyse usine, détection goulots, suggestions actionnables |
| `51_import.gs`    | — | `SAT_openImportSidebar()` · `SAT_importFromSave()` — écriture Production |
| `51_import.html`  | — | Sidebar : parsing `.sav` browser-side · prévisualisation · rapport collectibles |

### Outils Node.js (`scripts/`)

| Fichier | Rôle |
|---|---|
| `parse-save.js` | Parse un `.sav` → CSV Production + rapport collectibles |

### Principe de chargement

Les fichiers chargent dans l'ordre alphabétique. Les préfixes numériques garantissent l'ordre des dépendances :

```
00_core_config  →  01_data  →  10_engine  →  20/30  →  40/41/42
     ↑                ↑             ↑
  SAT.CFG          SAT.DATA     SAT.Engine
```

### Optimisations

- **Écriture batch** : `writeFlags()` fait 5 appels API quelle que soit la taille de la feuille
- **Recalcul ciblé** : `onEdit` sur une seule cellule ne relit que la ligne concernée (`writeRowFlags`)
- **Index recettes** : construit une seule fois en mémoire (`SAT.getRecipeIndex()`)

---

## Ajouter une version de Satisfactory

```
# 1. Dupliquer le fichier de données
cp src/01_data_v1_1.gs src/01_data_v2_0.gs

# 2. Éditer le contenu
#    → SAT.DATA['2.0'] = { MACHINES: [...], RESOURCES: [...], RECIPES: [...] }

# 3. Changer la version dans 00_core_config.gs
#    → GAME_VERSION: '2.0'

# 4. Déployer
make push
```

Les données v1.1 restent disponibles — aucune suppression n'est nécessaire.

---

## Variables de configuration clés

```javascript
// 00_core_config.gs
SAT.CFG = {
  VERSION:      '3.5.1',   // version de l'application
  GAME_VERSION: '1.1',     // ← changer ici pour une MàJ Satisfactory

  SHEETS: {
    PROD: '🏭 Production',
    ETAG: '🏗️ Étages',
    DASH: '📊 Tableau de bord',
    OBJ:  '🎯 Objectifs',
    REC:  '📖 Recettes',
    RES:  '💎 Ressources',
    MACH: '⚙️ Machines'
  },

  // Colonnes Production (1-based)
  C: {
    ETAGE: 1, MACHINE: 2, RECIPE: 3,
    OUT_RATE: 4, IN_RATE: 5,
    NB: 6, OC: 7, PUR: 8,
    FLAGS: 9, CAUSE: 10,
    STD_RATE: 11,  // K — Qt/min à OC=100%
    MW: 12,        // L — ⚡ MW total
    SLOOP: 13      // M — Somersloops (0-4)
  },

  PURITY: { 'Impur': 0.5, 'Normal': 1.0, 'Pur': 2.0 }
};
```

---

## Machines supportées (v1.1)

| Catégorie | Machines |
|---|---|
| Extraction | Foreuse Mk.1/2/3 · Pompe à eau · Puit de pétrole · Pressuriseur de puits |
| Fusion | Fonderie · Fonderie avancée |
| Production | Constructeur · Assembleuse · Façonneuse |
| Raffinage | Raffinerie · Mélangeur |
| Conditionnement | Conditionneur |
| Avancé | Accélérateur de particules · Encodeur quantique · Convertisseur |
| Énergie | Centrale nucléaire |

---

*Source données : [satisfactory.wiki.gg/fr](https://satisfactory.wiki.gg/fr) — mise à jour mars 2026*
*Version app : v3.5.1 — Dépôt : [github.com/chrysa/satisfactory-automated_calculator](https://github.com/chrysa/satisfactory-automated_calculator)*
