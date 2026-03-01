# 🎯 CHECKLIST D'ACTION - SAT ASSIST 2026

**Objectif**: Guide pratique étape-par-étape pour avancer chaque jour  
**Mise à jour**: 1er mars 2026  
**Cadence**: À suivre JJ par JJ

---

## 📅 SEMAINE 1: DEBUGGING & STABILISATION

### **JOUR 1: Setup & Test Menu**

#### Matin (2h)
- [ ] Ouvrir terminal dans le projet
- [ ] `npm install` (dépendances Node)
- [ ] `clasp login` (authentifier)
- [ ] Vérifier `.clasp.json` a `"rootDir": "src"`
- [ ] `make deploy` ou `clasp push`
- [ ] Attendre que code pousse

**Commandes:**
```bash
cd c:\Users\greau\OneDrive\Documents\satisfactory_automated_calculator
npm install
clasp login
make deploy
```

#### Midi (1h)
- [ ] Ouvrir Google Sheet dans `clasp open`
- [ ] Rafraîchir page (Ctrl+Shift+R)
- [ ] **Vérifier**: Menu 🧰 SAT ASSIST apparaît?
  - ✅ OUI → dossier à aller → Midi "Vérifications"
  - ❌ NON → aller à "Débuggage Menu"

#### Débuggage Menu (si besoin)
```javascript
// Ouvrir Console Apps Script (Ctrl+Enter)
// Lancer ce test:
function testMenuBuild() {
  try {
    var cfg = SAT._ensureAPI("CFG", "00_core_config");
    var log = SAT._ensureAPI("Log", "00_core_logging");
    Logger.log("✓ Core APIs load");
    
    var menu = SAT._ensureAPI("Menu", "53_app_menu");
    Logger.log("✓ Menu module found");
    
    menu.build();
    Logger.log("✓ Menu built!");
  } catch(e) {
    Logger.log("✗ ERROR: " + e.message + " at " + e.fileName + ":" + e.lineNumber);
  }
}
```
- [ ] Copier code ci-dessus dans Apps Script editor
- [ ] Lancer fonction `testMenuBuild()`
- [ ] Vérifier output dans Logs
  - ✅ "Menu built!" → Menu est OK
  - ❌ Error message → noter dans "Bugs trouvés"

#### Vérifications (si menu OK)
- [ ] Aller sur onglet "Production" (créer si besoin)
- [ ] Rafraîchir (Ctrl+Shift+R) → Menu doit réapparaître
- [ ] Cliquer sur menu → doit dropdown
- [ ] Vérifier tous les submenu visibles:
  - ✓ 📊 Données
  - ✓ ➕ Production
  - ✓ 🔍 Chercher
  - ✓ 👁️ Affichage
  - ✓ 🔧 Outils

#### Fin de jour
- [ ] Documenter dans `STATUS_PROJET.md`:
  - ✅ Menu affiché? OUI/NON
  - ⏱️ Tiempo gasto hoy
  - 🔴 Blocages trouvés
  - 📝 Notes obstacles
- [ ] Commit git
  ```bash
  git status
  git add .
  git commit -m "JOUR 1: Setup + Menu test"
  ```

---

### **JOUR 2: Installation Structure**

#### Matin (2h)
- [ ] Ouvrir Google Sheet (clasp open)
- [ ] Menu 🧰 → 📊 Données → 🧱 **Installer structure**
- [ ] **Attendre** que ça finisse (5-10 min max)
- [ ] **Vérifier**: Onglets créés?
  ```
  Attendu dans Google Sheet:
  ✓ 📈 Production
  ✓ 📜 Étages
  ✓ 🔴 Errors
  ✓ 📋 Logs
  ✓ [autres onglets système]
  ```

#### Débuggage Installation (si échouc)
```javascript
// Console Apps Script (Ctrl+Enter)
function testInstall() {
  try {
    var inst = SAT._ensureAPI("Install", "51_app_install");
    Logger.log("✓ Install module found");
    
    var result = inst.initializeStructure();
    Logger.log("✓ Install result: " + JSON.stringify(result));
    
  } catch(e) {
    Logger.log("✗ Install ERROR: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}
```
- [ ] Lancer `testInstall()`
- [ ] Vérifier output
- [ ] Si erreur → noter quelle étape échoue

#### Midi (1h)
- [ ] Vérifier chaque onglet créé
  - Cliquer sur "Production" → doit avoir headers?
  - Cliquer sur "Errors" → doit être vide
  - Cliquer sur "Logs" → doit avoir log initial?

#### Après-midi (1.5h)
- [ ] Ajouter 3-5 lignes **données de test**
  - Onglet: Production
  - Colonne "Nom": Sentry 1, Sentry 2, etc.
  - Colonne "Étage": 1, 2, 3
  - Colonne "Débit": 10, 20, 30
- [ ] Sauvegarder

#### Fin de jour
- [ ] Documenter:
  ```
  ✅ Installation complète?
  ✅ Onglets créés: combien?
  ✅ Données test ajoutées: combien lignes?
  ```
- [ ] Commit
  ```bash
  git add .
  git commit -m "JOUR 2: Installation complète + donnees test"
  ```

---

### **JOUR 3: Recalcul & Automation**

#### Matin (1h)
- [ ] Aller onglet "Production" (avec données test du Jour 2)
- [ ] Menu 🧰 → 📊 Données → 🔄 **Recalculer tout**
- [ ] **Attendre** (~5-10 sec)
- [ ] Vérifier dans Google Sheet:
  - Colonnes calculées remplies?
  - Aucune erreur visible?
  - Sheet "Errors" encore vide?

#### Test Débuggage Recalcul
```javascript
function testRecalc() {
  try {
    var recalc = SAT._ensureAPI("Recalc", "50_app_recalc");
    Logger.log("✓ Recalc module found");
    
    var result = recalc.recalculateAll();
    Logger.log("✓ Recalc complete: " + JSON.stringify(result));
    
  } catch(e) {
    Logger.log("✗ Recalc ERROR: " + e.message);
  }
}
```

#### Midi (1.5h)
- [ ] Tester **Automation** (changements détectés)
  1. Ajouter nouvelle ligne dans Production
  2. Ajouter données dans colonnes
  3. Vérifier que **automatiquement** quelque chose se recalcule
  4. Aller onglet Logs → voir entrée?

#### Après-midi (1h)
- [ ] Tester **Chercher** menu
  - Menu 🧰 → 🔍 Chercher → 🔎 Ressources
  - Chercher une ressource ajoutée
  - Doit la trouver?

#### Fin de jour
- [ ] Quoi marche? Quoi échoue? (Notes détaillées)
- [ ] Commit
  ```bash
  git add .
  git commit -m "JOUR 3: Recalc + Automation test"
  ```

---

### **JOUR 4: Formulaires & Panneau Dashboard**

#### Matin (1h)
- [ ] Menu 🧰 → ➕ Production → ➕ **Ajouter ligne**
- [ ] Un formulaire devrait s'afficher
- [ ] **Tester**: Remplir + Soumettre
  - Nom ressource
  - Étage
  - Débit
  - Cliquer "Ajouter"
- [ ] **Vérifier**: Ligne ajoutée dans Production?

#### Midi (1h)
- [ ] Tester **Dashboard**
  - Menu 🧰 → 👁️ Affichage → 📊 Panneaux
  - Doit ouvrir dashboard/sidepanel?
  - Affiche KPIs?
  - Graphiques visibles?

#### Après-midi (1h)
- [ ] Tester **Charts**
  - Menu 🧰 → 👁️ Affichage
  - Chercher option pour chartsm
  - Vérifier que graphiques s'affichent

#### Fin de jour
- [ ] Document status:
  - ✅ Formulaires fonctionnent?
  - ✅ Dashboard visible?
  - ✅ Graphiques affichés?
- [ ] Commit gist

---

### **JOUR 5: Diagnostic & Auto-Repair**

#### Matin (1.5h)
- [ ] Menu 🧰 → 🔧 Outils → 🔍 **Diagnostic**
- [ ] Doit afficher rapport d'état:
  - État général: OK/WARNING/ERROR?
  - Problèmes détectés: combien?
  - Recommandations?

#### Midi (1h)
- [ ] Suite Diagnostic: 🔧 Outils → 🔧 **Auto-repair**
- [ ] Lancer auto-repair
- [ ] Vérifier que problèmes résolus

#### Après-midi (1h)
- [ ] Vérifie **Documentation** intégrée
  - Menu 🧰 → 🔧 Outils → 📖 Documentation
  - Doit ouvrir doc/help dans sidepanel?

#### Test Récapitulatif
```javascript
function weeklyFullTest() {
  Logger.log("=== FULL SYSTEM TEST ===");
  
  // 1. Menu
  try {
    SAT.Menu.build();
    Logger.log("✓ Menu OK");
  } catch(e) { Logger.log("✗ Menu FAIL: " + e); }
  
  // 2. Installation
  try {
    var inst = SAT.Install.validateStructure();
    Logger.log("✓ Install OK: " + inst);
  } catch(e) { Logger.log("✗ Install FAIL: " + e); }
  
  // 3. Recalc
  try {
    SAT.Recalc.recalculateAll();
    Logger.log("✓ Recalc OK");
  } catch(e) { Logger.log("✗ Recalc FAIL: " + e); }
  
  // 4. Error tracking
  try {
    var errors = SAT.Health.getSystemHealth();
    Logger.log("✓ Health check OK: " + JSON.stringify(errors));
  } catch(e) { Logger.log("✗ Health FAIL: " + e); }
  
  Logger.log("=== TEST COMPLETE ===");
}
```

#### Fin de jour
- [ ] Resultat test complet → documenter
- [ ] Status réel du projet
- [ ] Commit final semaine 1

---

## 📊 RECAP SEMAINE 1

À la fin de JOUR 5, vérifier **checklist finale**:

```
MENU & UI:
  ✓ Menu 🧰 s'affiche
  ✓ Sous-menus tous visibles
  ✓ Pas d'erreurs au clic

INSTALLATION:
  ✓ Onglets créés: Production, Errors, Logs, Etages
  ✓ Headers en place
  ✓ Configuration initiale OK

DONNÉES & RECALCUL:
  ✓ Données test ajoutées
  ✓ Recalcul complet fonctionne
  ✓ Colonnes calculées remplies

AUTOMATION:
  ✓ Changements détectés
  ✓ Actions exécutées auto
  ✓ Logs écrivain

FORMS & UI:
  ✓ Formulaire ajouter ressource fonctionne
  ✓ Données soumises ajoutées
  ✓ Dashboard visible
  ✓ Graphiques affichés

HEALTH:
  ✓ Diagnostic affiche état
  ✓ Auto-repair fonctionne
  ✓ Documentation disponible

ERREURS:
  ✓ Sheet "Errors" vide après auto-repair
  ✓ Logs détaillés enregistrés
  ✓ Recovery automatique OK
```

**Si ✅ tous OK**: Passer à SEMAINE 2 (Advanced Testing)  
**Si ❌ certains échecs**: Rester Semaine 1, debugger avant d'avancer

---

## 📅 SEMAINE 2: ADVANCED TESTING

*(À compléter après SEMAINE 1)*

### JOUR 6: Performance & Stress
### JOUR 7: Edge Cases & Recovery
### JOUR 8: Multi-Sheet & Complex Workflows
### JOUR 9: Security & Permissions
### JOUR 10: Final Pre-Deploy Checklist

---

## 🚀 COMMANDES RAPIDES PAR JOUR

```bash
# JOUR 1: Setup
npm install && clasp login && make deploy

# JOUR 2: Push & Test
clasp push && clasp open

# JOUR 3-5: Test rapides
# Dans Google Apps Script Console:
testMenuBuild()      # JOUR 1
testInstall()        # JOUR 2
testRecalc()         # JOUR 3
weeklyFullTest()     # JOUR 5

# Push changements
git add . && git commit -m "JOUR X: Description" && git push
```

---

## 📋 PROBLÈMES COURANTS & SOLUTIONS RAPIDES

### ❌ Menu ne s'affiche pas
```
→ Vérifier: clasp push a réussi?
→ Rafraîchir: Ctrl+Shift+R
→ Vérifier: onOpen() appelé? (Apps Script logs)
→ Tester: testMenuBuild() dans console
```

### ❌ Installation échoue silencieusement
```
→ Vérifier: Sheet "Production" existe?
→ Vérifier: Permissions suffiantes?
→ Vérifier: SAT.S.create() fonctionne?
→ Tester: testInstall() dans console
```

### ❌ Recalcul timeout
```
→ Vérifier: Pas trop de données?
→ Ajouter: Pagination (chunking)
→ Tester: Récalcul sans données d'abord
→ Vérifier: SAT.Resilience retry actif?
```

### ❌ Automation ne déclenche pas
```
→ Vérifier: SAT.Handlers.detect() appelé?
→ Vérifier: onEdit() défini?
→ Vérifier: Triggers créés? (Apps Script Triggers)
→ Tester: Ajouter logging dans onEdit()
```

### ❌ Logs ne s'écrivent pas
```
→ Vérifier: Sheet "Logs" existe?
→ Vérifier: SAT.Log.info() appelé?
→ Vérifier: Sheet writable?
→ Tester: Logger.log() direct (Google native)
```

---

## ✅ VALIDATION QUOTIDIENNE

Chaque fin de jour, cocher:

```
JOUR: ___

Code:
  [ ] Code pushé sur Google Apps Script
  [ ] Pas d'erreurs à la compilation
  [ ] Logs visibles dans le console

Fonctionnalité:
  [ ] Feature testée de bout en bout
  [ ] Données persistent correctement
  [ ] UI responsive

Documentation:
  [ ] STATUS_PROJET.md mis à jour
  [ ] Bugs notés avec reproduction steps
  [ ] Blocages identifiés & escaladés

Git:
  [ ] Changements committé
  [ ] Message descriptif
  [ ] Prêt pour PR/review
```

---

## 🎯 OBJECTIFS SEMAINE-PAR-SEMAINE

```
SEMAINE 1 (du 1er mars):    DEBUGGING & STABILISATION
  → Menu visible & clickable
  → Installation structrue OK
  → Données persistantes
  → Automation working
  → Logs enregistrant

SEMAINE 2 (8 mars):         ADVANCED TESTING
  → Performance OK
  → Edge cases traités
  → Recovery actif
  → Multi-feuilles workfloors

SEMAINE 3 (15 mars):        FINAL POLISH
  → Tous les bugs éliminés
  → Documentation complète
  → Pré-deployment checklist ✓
  → Déploiement production

SEMAINE 4+ (22 mars):       MONITORING & SUPPORT
  → Post-deploy issues
  → User feedback intégré
  → Maintenance ongoing
```

---

## 📞 ESCALADE RAPIDE

Si vous êtes bloqué:

1. Commençar par **reproduire** le problème
   ```
   Quoi? Menu ne m'affiche pas
   Où? Onglet Production
   Quand? À chaque refresh
   Trace? Apps Script → Logs
   ```

2. Chercher dans `STATUS_PROJET.md` → section "Blocages"
3. Chercher dans le code → `Logger.log()` statements
4. Lancer fonction test correspondante:
   - Menu: `testMenuBuild()`
   - Install: `testInstall()`
   - Recalc: `testRecalc()`
   - Full: `weeklyFullTest()`

5. Documenter dans `STATUS_PROJET.md` → nouvelles questions

---

**Version**: Checklist v2026.03  
**Fréquence**: Mise à jour JJ par JJ  
**Prochaine étape**: Commencer JOUR 1 demain!
