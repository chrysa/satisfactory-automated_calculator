# 📋 Plan de Développement Complet - SAT ASSIST 2026

**Objectif**: Réaliser et stabiliser toutes les fonctionnalités de zéro  
**Durée estimée**: 15-20 jours  
**Statut**: ✅ À jour pour v2026.03

---

## 🎯 PHASE 0: PRÉPARATION (1 jour)

### 0.1 Environnement
- [ ] Installer `clasp` : `npm install -g @google/clasp`
- [ ] Installer dépendances : `npm install`
- [ ] `clasp login` → authifier avec Google
- [ ] Vérifier `.clasp.json` : `"rootDir": "src"`
- [ ] Vérifier `appsscript.json` : scriptId correct

### 0.2 Structure de Base
- [ ] Créer projet Google Apps Script (ou réutiliser existant)
- [ ] Importer/créer Google Sheet avec onglets de base
- [ ] Copier `.clasp.json` et `.appsscript.json`
- [ ] Tester `make push` ou `clasp push`

### 0.3 Validation Initiale
- [ ] ✅ Tous les fichiers `src/*.gs` présents
- [ ] ✅ `.clasp.json` et `appsscript.json` configurés
- [ ] ✅ Aucun fichier `.gs` ne manque

---

## 🏗️ PHASE 1: ARCHITECTURE FONDAMENTALE (2-3 jours)

### 1.1 Bootstrap & Core APIs (PRIORITÉ MAXIMALE)
**Dépendance**: Tous les autres modules en dépendent

Fichiers à implémenter dans cet ordre:

#### Étape 1.1.1: Bootstrap
- [ ] `00_bootstrap.gs`
  - Vérifier ordre de chargement
  - Initialiser objet `SAT` global
  - Gardes de sécurité
  
#### Étape 1.1.2: Configuration (Core API #1)
- [ ] `00_core_config.gs` → `SAT.CFG`
  - Configurer sheets (noms des onglets)
  - Configurer colonnes de données
  - Configurer lignes de départ/fin
  - Définir énumérations

**À configurer dans CFG:**
```javascript
PRODUCTION: { SHEET_NAME, DATA_START_ROW, COLUMNS... }
ERRORS: { SHEET_NAME, DATA_START_ROW... }
LOG: { SHEET_NAME, RETENTION_DAYS... }
```

#### Étape 1.1.3: Logging (Core API #2)
- [ ] `00_core_logging.gs` → `SAT.Log`
  - Implémentez `log.info()`, `warn()`, `error()`
  - Avec emojis (✅ ⚠️ 🔴)
  - Écrire vers sheet "🔴 Errors"

#### Étape 1.1.4: Résilience (Core API #3)
- [ ] `01_core_resilience.gs` → `SAT.Resilience`
  - Pattern de retry: exponentiel + jitter
  - `SAT_Resilience_Retry(fn, maxRetries, delayMs, name)`
  - Gestion des timeouts

#### Étape 1.1.5: Utilitaires (Core API #4)
- [ ] `01_core_utils.gs` → `SAT.Utils`
  - Validation entrées
  - Formatage strings
  - Utilitaires dates

#### Étape 1.1.6: Sheet Access (Core API #5)
- [ ] `01_core_helpers.gs` → `SAT.H` (Helpers)
  - Fonctions utilitaires
  - API Guard `SAT._ensureAPI(name, file)`

#### Étape 1.1.7: Sheet Manager (Core API #6)
- [ ] `02_core_sheets.gs` → `SAT.S`
  - `S.must(name, label)` - obtenir sheet ou crash
  - `S.find(name)` - chercher sheet
  - `S.create(name)` - créer sheet
  - `S.delete(name)` - supprimer sheet
  - Lecture/écriture sécurisées

**Validation 1.1:**
```bash
make test  # ou faire test manuel
```

---

## 📊 PHASE 2: MÉTIER FONDAMENTAL (3-4 jours)

### 2.1 Gestion des Étages/Stages (Layer 2)
- [ ] `10_core_etages.gs` → `SAT.Etages`
  - Modèle de données: nom, numéro, type
  - CRUD: ajouter, modifier, supprimer, lister
  - Validation
  - Persistance vers sheet "📜 Étages"

### 2.2 Données Repository (Layer 2)
- [ ] `10_data_repo.gs` → `SAT.Repo`
  - `Repo.Production.getAll()` → lire data
  - `Repo.Production.add(row)` → ajouter ligne
  - `Repo.Production.update(id, row)` → modifier
  - `Repo.Production.delete(id)` → supprimer
  - Cache/refresh de données

### 2.3 Context Tracking (Layer 2)
- [ ] `04_context_tracking.gs` → `SAT.Context`
  - État de la feuille actuelle
  - Plage sélectionnée
  - Dernier calcul effectué
  - Erreurs en cours

**Validation 2:**
- Onglets créés: "📈 Production", "📜 Étages", "🔴 Errors", "📋 Logs"
- Données test ajoutées/récupérées sans erreurs

---

## 🎯 PHASE 3: AUTOMATISATION (3-4 jours)

### 3.1 Handlers d'Événements
- [ ] `10_automation_handlers.gs` → `SAT.Handlers`
  - Détecter changements
  - Valider données
  - Déclencher actions

### 3.2 Exécution des Automatisations
- [ ] `11_automation_executor.gs` → `SAT.Executor`
  - Queue d'exécution
  - Traitement séquentiel
  - Gestion des erreurs
  - Déduplications

### 3.3 Scheduler
- [ ] `12_automation_scheduler.gs` → `SAT.Scheduler`
  - Tâches programmées
  - Déclencheurs temps
  - Récalculs périodiques

**Validation 3:**
- Modifications détectées
- Actions exécutées sans blocages
- Logs enregistrés correctement

---

## 🖥️ PHASE 4: UI & DASHBOARDS (4-5 jours)

### 4.1 Design System
- [ ] `20_ui_design_system.gs` → `SAT.Design`
  - Palette couleurs
  - Styles texte
  - Composants visuels réutilisables

### 4.2 Formulaires
- [ ] `21_ui_forms.gs` → `SAT.Forms`
  - Template formulaires
  - Validation côté client
  - Soumission sécurisée

- [ ] `22_ui_form_add_production.gs` → Formulaire Ajouter Production
  - Champs: nom, étage, débit
  - Validation métier
  - Feedback utilisateur

### 4.3 Panneaux
- [ ] `22_ui_panels.gs` → `SAT.Panels`
  - Recherche ressources
  - Recherche étages
  - Filtres et tris

### 4.4 Dashboard
- [ ] `23_ui_dashboard.gs` → `SAT.Dashboard`
  - Vue d'ensemble
  - KPIs principaux
  - Graphiques

### 4.5 Charts & Graphics
- [ ] `30_ui_charts.gs` → `SAT.Charts`
  - Graphiques de débit
  - Histogrammes
  - Courbes de utilisation

### 4.6 Documentation
- [ ] `30_ui_documentation.gs` → `SAT.Docs`
  - Afficher aide contextuelle
  - Guide utilisateur intégré

**Validation 4:**
- Menu accessible
- Formulaires fonctionnels
- Dashboard visible après calcul

---

## 🛡️ PHASE 5: RÉSILIENCE & MONITORING (2-3 jours)

### 5.1 Monitoring
- [ ] `30_resilience_monitor.gs` → `SAT.Monitor`
  - Surviellement continu
  - Seuils d'alerte
  - Health checks

### 5.2 Health Status
- [ ] `31_resilience_health.gs` → `SAT.Health`
  - État global système
  - Diagnostic
  - Rapport détaillé

### 5.3 Recovery
- [ ] `32_resilience_recovery.gs` → `SAT.Recovery`
  - Auto-repair mécanismes
  - Restauration données
  - Rollback

**Validation 5:**
- Erreurs détectées
- Auto-repair actif
- Logs détaillés

---

## ✨ PHASE 6: ERGONOMIE & ACCESSIBILITÉ (2 jours)

### 6.1 Adaptation Ergonomique
- [ ] `40_ergonomic_adaptive.gs` → `SAT.Ergonomic.Adaptive`
  - Adaptation à la taille d'écran
  - Responsive design

### 6.2 Accessibilité
- [ ] `41_ergonomic_accessibility.gs` → `SAT.Ergonomic.Accessibility`
  - Navigation au clavier
  - Lecteurs d'écran
  - Contraste couleurs

### 6.3 Guidance
- [ ] `42_ergonomic_guidance.gs` → `SAT.Ergonomic.Guidance`
  - Tooltips contextuels
  - Suggestions intelligentes

**Validation 6:**
- Navigation clavier fluide
- Message d'aide pertinents
- Design responsive

---

## ⚙️ PHASE 7: MOTEUR D'APPLICATION (3-4 jours)

### 7.1 Recalcul
- [ ] `50_app_recalc.gs` → `SAT.Recalc`
  - Recalculer toutes les données
  - Débit par étage
  - Production totale
  - Gestion cache

### 7.2 Installation & Setup
- [ ] `51_app_install.gs` → `SAT.Install`
  - Première installation
  - Création sheets
  - Configuration initiale
  - Import données de test

- [ ] `51_app_install_final.gs` → Finalization
- [ ] `51_app_install_v2.gs` → Migration v2
- [ ] `51_app_sheet_migration.gs` → Migration sheets
- [ ] `51_app_sheet_order.gs` → Ordre des onglets
- [ ] `51_app_setup_stubs.gs` → Stubs utiles

### 7.3 Déclencheurs
- [ ] `52_app_triggers.gs` → `SAT.Triggers`
  - `onOpen()` → Menu contextuel
  - `onEdit()` → Détection changements
  - `onFormSubmit()` → Soumission formulaire
  - Installation auto de triggers

### 7.4 Menu (ENTRY POINT)
- [ ] `53_app_menu.gs` → `SAT.Menu`
  - Menu adaptatif (contextuel selon état)
  - **Menu racine**: 🧰 SAT ASSIST
  - Sous-menus: Données, Production, Chercher, Affichage, Outils
  - Gestion des permissions
  - Rafraîchissement état

**Structure Menu:**
```
🧰 SAT ASSIST
├─ 📊 Données
│  ├─ 🧱 Installer structure
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

**Validation 7:**
- Menu apparaît au démarrage
- Recalcul complet fonctionne
- Déclencheurs attachés
- Logs complets

---

## ✅ PHASE 8: TESTING & POLISH (2-3 jours)

### 8.1 Tests Unitaires
- [ ] Tester chaque Core API isolément
- [ ] Valider patterns d'erreur
- [ ] Tester retry & recovery

### 8.2 Tests Intégration
- [ ] Workflow complet: UI → Métier → Data
- [ ] Automation bout-en-bout
- [ ] Multi-onglets interactions

### 8.3 Tests Performance
- [ ] Temps d'exécution recalcul
- [ ] Mémoire utilisée
- [ ] Nombre d'appels API

### 8.4 Pre-Deployment Checklist
- [ ] ✅ Tous 33 fichiers `src/`
- [ ] ✅ `00_bootstrap.gs` charge d'abord
- [ ] ✅ Pas de dépendances circulaires
- [ ] ✅ `make pre-commit` réussit
- [ ] ✅ Aucun code cassé non commenté
- [ ] ✅ Logs détaillés partout
- [ ] ✅ Gestion d'erreurs complète

**Validation 8:**
- Aucun bug bloc
- Performance acceptable
- Documentation à jour

---

## 🚀 PHASE 9: DÉPLOIEMENT FINAL (1 jour)

### 9.1 Déploiement
```bash
# Vérifier avant de déployer
make test
make pre-commit

# Déployer
make deploy
# ou
clasp push
clasp open
```

### 9.2 Initialisation
- [ ] Ouvrir Google Sheet
- [ ] Menu → 🧰 → 📊 Données → 🧱 Installer structure
- [ ] Remplir avec données test
- [ ] Vérifier tous les menus
- [ ] Vérifier tous les calculs

### 9.3 Monitoring Post-Deploy
- [ ] Vérifier "🔴 Errors" sheet → vide
- [ ] Vérifier "📋 Logs" sheet → infos OK
- [ ] Dashboard complet
- [ ] Menu contextuel fonctionne partout

---

## 📊 RÉSUMÉ TEMPOREL

| Phase | Durée | Fichiers |
|-------|-------|----------|
| 0: Préparation | 1j | - |
| 1: Architecture | 2-3j | 6 fichiers (00_*, 01_*, 02_*) |
| 2: Métier | 3-4j | 3 fichiers (04_*, 10_*) |
| 3: Automatisation | 3-4j | 3 fichiers (10_*, 11_*, 12_*) |
| 4: UI & Dashboards | 4-5j | 7 fichiers (20_*, 21_*, 22_*, 23_*, 30_ui_*) |
| 5: Résilience | 2-3j | 3 fichiers (30_*, 31_*, 32_*) |
| 6: Ergonomie | 2j | 3 fichiers (40_*, 41_*, 42_*) |
| 7: App Engine | 3-4j | 8 fichiers (50_*, 51_*, 52_*, 53_*) |
| 8: Testing | 2-3j | Tests |
| 9: Déploiement | 1j | Déploiement |
| **TOTAL** | **15-20j** | **33 fichiers** |

---

## 🎯 DÉPENDANCES CRITIQUES

```
00_bootstrap.gs
    ↓
00_core_config.gs → 00_core_logging.gs
    ↓                           ↓
01_core_resilience.gs ← SAT.Log (dépend de)
    ↓
01_core_utils.gs, 01_core_helpers.gs
    ↓
02_core_sheets.gs
    ↓
10_core_etages.gs, 10_data_repo.gs, 04_context_tracking.gs
    ↓
10_automation_handlers.gs → 11_automation_executor.gs → 12_automation_scheduler.gs
    ↓
20_ui_design_system.gs → 21_ui_forms.gs → 22_ui_panels.gs → 23_ui_dashboard.gs
    ↓
30_resilience_monitor.gs → 31_resilience_health.gs → 32_resilience_recovery.gs
    ↓
40-42_ergonomic_*.gs
    ↓
50_app_recalc.gs, 51_app_install.gs
    ↓
52_app_triggers.gs
    ↓
53_app_menu.gs (ENTRY POINT)
```

---

## 📢 POINTS CLÉS À RETENIR

### ✅ TOUJOURS faire:
1. **Gardes API** → `SAT._ensureAPI()` avant chaque accès
2. **Gestion erreurs** → try/catch + log
3. **Validation données** → avant chaque opération
4. **Logging détaillé** → chaque étape importante
5. **Modularité** → chaque fichier indépendant
6. **Nommage clair** → 50_app_truc.gs (préfixe + description)

### ❌ JAMAIS faire:
1. Dépendances circulaires
2. Variables globales non-SAT
3. Accès direct aux sheets sans `SAT.S`
4. Silencer les erreurs
5. Harcoder les noms de sheets
6. Importer des fichiers non-existants

### 🎯 Priorités:
1. **Phase 1** = CRITIQUE (tout en dépend)
2. **Phase 2-3** = MÉTIER (core fonctionnalités)
3. **Phase 4** = UX (utilisabilité)
4. **Phase 5+** = Polish & Stabilité

---

## 🔧 COMMANDES UTILES

```bash
# Déployer rapidement
make deploy

# Vérifier avant commit
make pre-commit

# Voir les erreurs
make test

# Ouvrir dans le navigateur
make open

# Synchroniser depuis Apps Script
make pull

# Voir l'aide
make help

# Watch mode (auto-push)
make watch
```

---

## 📝 Fichier à créer/modifier PAR ORDRE:

```
PHASE 1:
  ✓ 00_bootstrap.gs
  ✓ 00_core_config.gs
  ✓ 00_core_logging.gs
  ✓ 01_core_resilience.gs
  ✓ 01_core_utils.gs
  ✓ 01_core_helpers.gs
  ✓ 02_core_sheets.gs

PHASE 2:
  ✓ 10_core_etages.gs
  ✓ 10_data_repo.gs
  ✓ 04_context_tracking.gs

PHASE 3:
  ✓ 10_automation_handlers.gs
  ✓ 11_automation_executor.gs
  ✓ 12_automation_scheduler.gs

... (et ainsi de suite)
```

---

**Version**: Plan v2026.03  
**Dernière mise à jour**: 1er mars 2026  
**État**: ✅ À jour avec architecture SAT ASSIST  
**Prochaine étape**: Commencer PHASE 1
