# 🏭 S.A.T. — Satisfactory Automated Tracker

**Version app**: 3.4.2 | **Jeu**: Satisfactory 1.1 | **Status**: ✅ Production Ready | **Fichiers**: 8 modules

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

## ✨ Nouveautés v3.4.x

| Fonctionnalité | Statut |
|---|---|
| **Colonnes Qt/min STD & ⚡ MW** | ✅ Taux standard + consommation électrique par ligne |
| **Dashboard électricité** | ✅ MW total + MW max à 250% OC, dernière mise à jour |
| **Top ressources produites** | ✅ Top 8 par Qt/min affiché dans le Dashboard |
| **Goulots (sous-production)** | ✅ Ressources consommées > produites avec déficit |
| **Graphiques permanents** | ✅ 2 graphiques toujours présents (machines/étage + top Qt/min) |
| **Archivage & migration** | ✅ Archiver une usine et démarrer une nouvelle version jeu |
| **Formulaire d'ajout production** | ✅ Modal HTML — dropdowns recette/machine/étage, OC%, pureté |
| **Calculateur taille d'étages** | ✅ Surface m², fondations 8×8, marge configurable entre machines |
| **Dimensions machines** | ✅ Largeur × Longueur (m) dans le référentiel Machines |
| **Fusionnement colonnes Dashboard** | ✅ Quick start et Changelog sur toute la largeur |
| **Backup données au reinstall** | ✅ Production (A–H) et Étages conservés après "Mettre à jour" |
| **Bump version automatique** | ✅ `make push` incrémente automatiquement le patch de version |

<details>
<summary>Historique des versions antérieures</summary>

### v3.4.1
- Correction positions graphiques Dashboard (hors des tables de données)
- Correction hauteurs de lignes (rows 11, 13 ne s'effondrent plus)
- Fusion colonnes Quick start et Changelog sur toute la largeur (A–H)
- Buff = 50 dans `_installDashboardCharts` et `_refreshDashboardCharts` synchronisés

### v3.4
- Dashboard v2 : section électricité, goulots, top ressources, graphiques permanents
- Formulaire HTML d'ajout de ligne de production (modal)
- Calculateur de taille d'étages + marge configurable
- Archivage usine & migration vers une nouvelle version jeu
- Colonnes K (Qt/min STD) et L (⚡ MW) dans Production

### v3.3.1
- Correction mise à jour automatique Dashboard au changement de version
- Correction `SAT.S.get()` avec fallback emoji normalisé

### v3.3
- Suppression des doublons d'onglets à l'install
- Correction #ERROR dans les cellules de valeurs

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
make push         # Bump version patch + push vers Apps Script
make pull         # Pull depuis Apps Script
make open         # Ouvrir dans le navigateur
make help         # Toutes les commandes
```

> `make push` incrémente automatiquement le patch (`3.4.2` → `3.4.3`) avant chaque déploiement.

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

---

## 🧰 Menu SAT

```
S.A.T.
  Recalcul complet
  Résumé de production
  ─────────────────────────────────
  ➕ Ajouter une ligne de production
  ─────────────────────────────────
  Ajouter un étage
  Lister les étages
  Taille des étages
  Marge des machines…
  ─────────────────────────────────
  Afficher / Masquer les référentiels
  Créer graphiques Dashboard
  ─────────────────────────────────
  Archiver usine & changer version jeu
  ─────────────────────────────────
  Nettoyer les doublons d'onglets
  Diagnostic
  Mettre à jour (reinstall)       ← conserve Production + Étages
  RESET complet                   ← efface tout
```

---

## ✅ Pre-Deployment Checklist

- [ ] 8 fichiers `.gs` dans `src/`
- [ ] `appsscript.json` référence le bon scriptId
- [ ] `.clasp.json` a `"rootDir": "src"`
- [ ] Pas de modifications non commitées
- [ ] `make push` s'exécute sans erreur

---

## 🔧 Troubleshooting

| Erreur | Solution |
|-------|----------|
| Menu SAT absent | Rechargez la page (Ctrl+Shift+R) |
| `#ERROR` dans les cellules | Menu SAT → Recalcul complet |
| Listes déroulantes vides | Menu SAT → Mettre à jour (reinstall) |
| Dashboard affiché bizarre | Menu SAT → Mettre à jour — les données Production sont conservées |
| `.clasp.json not found` | `clasp login` à la racine du projet |

---

## 📊 Project Metrics

| Métrique | Valeur |
|--------|-------|
| Fichiers | 8 modules .gs |
| Lignes de code | ~2 500 |
| Recettes | 67 recettes officielles Satisfactory 1.1 |
| Machines | 18 machines avec dimensions et MW |
| Ressources | 95 ressources classées |
| Dépendances | Zéro dépendance externe |

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

- **v3.4.2** - MW max 250% OC, backup/restore au reinstall, version dynamique dans changelog
- **v3.4.1** - Corrections layout Dashboard (graphiques, fusions colonnes, hauteurs)
- **v3.4** - Dashboard v2, formulaire production, calculateur étages, archivage
- **v3.3** - Corrections ergonomiques, dédup onglets
- **v3.2** - Réécriture complète 8 modules, données Satisfactory 1.1 FR

---

**S.A.T. v3.4.2** | 8 Modules | Satisfactory 1.1 | Production Ready ✅
