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
9. [Architecture technique](#architecture-technique)
10. [Ajouter une version de Satisfactory](#ajouter-une-version-de-satisfactory)

---

## Présentation

S.A.T. est un script Google Apps Script qui transforme un Google Sheet en calculateur de production pour Satisfactory. Il intègre :

- **67 recettes officielles** (wiki.gg/fr, v1.1) avec taux IN/OUT précis
- **18 machines** avec puissance et catégorie
- **95 ressources** classées par catégorie
- Calcul automatique des taux à chaque modification
- Alertes overclock, déchets nucléaires, limite convoyeur
- Dashboard statistique en temps réel
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

> Les colonnes **D, E, I, J** sont protégées. Elles ne doivent jamais être saisies manuellement.

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
| **Recalcul complet** | Relance le moteur sur toutes les lignes |
| **Résumé de production** | Popup : nb lignes, machines, étages, erreurs |
| **Ajouter un étage** | Prompt → ajoute une ligne dans 🏗️ Étages |
| **Lister les étages** | Popup listant tous les étages définis |
| **Créer graphiques Dashboard** | Génère les graphiques dans 📊 Tableau de bord |
| **Mettre à jour (reinstall)** | Reconstruit les feuilles (⚠️ données Production effacées) |
| **RESET complet** | Identique — efface tout |
| **Diagnostic** | Popup : version, feuilles présentes, nb lignes |

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
  VERSION:      '3.2',   // version de l'application
  GAME_VERSION: '1.1',   // ← changer ici pour une MàJ Satisfactory

  SHEETS: {
    PROD: '🏭 Production',
    ETAG: '🏗️ Étages',
    DASH: '📊 Tableau de bord',
    REC:  '📖 Recettes',
    RES:  '💎 Ressources',
    MACH: '⚙️ Machines'
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
*Dépôt : [github.com/chrysa/satisfactory-automated_calculator](https://github.com/chrysa/satisfactory-automated_calculator)*
