# 🚀 GUIDE DE DÉMARRAGE - SAT ASSIST 2026

**Pour commencer AUJOURD'HUI en 5 minutes**

---

## 📌 RÉSUMÉ EXÉCUTIF

Vous avez un **projet Google Apps Script semi-complet**:
- ✅ **33 fichiers existent** (0_bootstrap jusqu'à 53_app_menu)
- ✅ **Architecture clean** en 5 couches
- ✅ **~9000 lignes de code**
- 🟡 **Besoin de testing/debugging** (probablement 3-5 jours)
- ❌ **Menu + Triggers**: Potentiellement cassés (à vérifier ASAP)

**Verdict**: Projet à **60% complet**, besoin **40% finish work**.

---

## 📚 3 DOCUMENTS CRÉÉS POUR VOUS

**Lisez ces 3 fichiers dans cet ordre:**

### 1️⃣ VOUS ÊTES ICI (Ce fichier)
→ Vue d'ensemble 5 min

### 2️⃣ [PLAN_DEVELOPPEMENT.md](PLAN_DEVELOPPEMENT.md)
→ Stratégie détaillée 9 phases (30 min)
→ Si vous venez de zéro, c'est votre roadmap

### 3️⃣ [STATUS_PROJET.md](STATUS_PROJET.md)
→ État actuel EXACT du projet (15 min)
→ Blocages trouvés + solutions

### 4️⃣ [CHECKLIST_ACTION.md](CHECKLIST_ACTION.md)
→ **À FAIRE CHAQUE JOUR** (actuel)
→ Jour 1: Setup, Jour 2: Installation, etc.

---

## ⚡ DEMARRAGE EN 5 ETAPES

### Étape 1: Préparer l'environnement (5 min)

```bash
cd c:\Users\greau\OneDrive\Documents\satisfactory_automated_calculator
npm install
clasp login
```

### Étape 2: Déployer le code (2 min)

```bash
make deploy
# ou
clasp push
```

### Étape 3: Ouvrir dans Google Sheets (1 min)

```bash
clasp open
```

### Étape 4: Tester le menu (2 min)

- Rafraîchir la page: **Ctrl+Shift+R**
- Regarder coin haut-droit: **Menu 🧰 SAT ASSIST apparaît?**
  - ✅ **OUI**: Aller à "✅ C'EST BON"
  - ❌ **NON**: Aller à "🔴 MENU CASSÉ"

### Étape 5: Tester l'installation (3 min)

```
Menu 🧰 → 📊 Données → 🧱 Installer structure
```

- Attendre ~10 sec
- Vérifier onglets: "Production", "Errors", "Logs", "Étages"
  - ✅ **OUI**: Aller à "✅ C'EST BON"
  - ❌ **NON**: Aller à "🔴 INSTALLATION ÉCHOUÉE"

---

## ✅ C'EST BON - PROCHAINES ÉTAPES

Si menu + installation OK, vous êtes **GREEN LIGHT** pour commencer:

1. **Ajouter données de test** (5 lignes minimum)
   - Menu → Production → Ajouter ligne
   - Ou directement dans l'onglet Production

2. **Recalculer** 
   - Menu → Données → Recalculer tout
   - Vérifier que colonnes calculées se remplissent

3. **Tester automation**
   - Modifier une cellule
   - Vérifier que quelque chose se recalcule automatiquement

4. **Maintenant suivez** [CHECKLIST_ACTION.md](CHECKLIST_ACTION.md) à partir de JOUR 2

---

## 🔴 MENU NE S'AFFICHE PAS - DÉBUGGER

### Quick Test (2 min)

Ouvrir **Apps Script Console** dans Google Sheets:
- Menu du Google Apps Script: **Exécution** (puis Exécution)
- Ou: **Ctrl+Entrée**

Copier-coller ce code et lancer:

```javascript
function testSetup() {
  Logger.log("=== DIAGNOSTIC ===");
  
  try {
    // Test 1: SAT global exists?
    if (!window.SAT && !this.SAT) {
      Logger.log("✗ SAT global not found!");
      return;
    }
    Logger.log("✓ SAT global found");
    
    // Test 2: Bootstrap loaded?
    var cfg = SAT._ensureAPI("CFG", "00_core_config");
    Logger.log("✓ CFG loaded");
    
    // Test 3: Menu module exists?
    var menu = SAT._ensureAPI("Menu", "53_app_menu");
    Logger.log("✓ Menu module found");
    
    // Test 4: Build menu
    menu.build();
    Logger.log("✓✓✓ MENU BUILT SUCCESS!");
    
  } catch (e) {
    Logger.log("✗ ERROR: " + e.message);
    Logger.log("File: " + e.fileName);
    Logger.log("Line: " + e.lineNumber);
    Logger.log("Stack: " + e.stack);
  }
}
```

**Résultat attendu:**
```
✓ SAT global found
✓ CFG loaded
✓ Menu module found
✓✓✓ MENU BUILT SUCCESS!
```

**Si vous voyez "MENU BUILT SUCCESS!"**: Menu est OK, problème trigger onOpen

### Si Menu n'est pas OK

1. **Vérifier les Logs Google Apps Script**
   - Menu → Exécution → Voir logs d'exécution
   - Note l'erreur exacte

2. **Vérifier que .clasp.json est bon**
   ```bash
   cat .clasp.json
   # Doit avoir: "rootDir": "src"
   ```

3. **Re-déployer**
   ```bash
   clasp push --force
   ```

4. **Rafraîchir et tester**
   - Fermer onglet Google Sheet
   - Réouvrir
   - Tester menu

5. **Si toujours cassé**: Documenter erreur dans [STATUS_PROJET.md](STATUS_PROJET.md) section "Bugs"

---

## 🔴 INSTALLATION ÉCHOUÉE - DÉBUGGER

Ouvrir Apps Script Console et lancer:

```javascript
function testInstall() {
  Logger.log("=== INSTALL TEST ===");
  
  try {
    var inst = SAT._ensureAPI("Install", "51_app_install");
    Logger.log("✓ Install module loaded");
    
    var result = inst.initializeStructure();
    Logger.log("✓ Install complete!");
    Logger.log("Result: " + JSON.stringify(result));
    
  } catch (e) {
    Logger.log("✗ Install FAILED");
    Logger.log("Error: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}
```

**Étapes si échouée:**

1. Vérifier que Google Sheet ne readonly
2. Vérifier que vous avez permissions sur le sheet
3. Re-lancer install depuis menu
4. Si encore cassé: 
   - Supprimer manuellement les onglets créés = structure peut être incohérente
   - Relancer installation

---

## 📊 ARCHITECTURE RAPIDE (Pour comprendre)

```
Layer 0: Bootstrap (charger d'abord)
  ↓
Layer 1: Core APIs (config, logging, retry)
  ├─ Config centralisée (SAT.CFG)
  ├─ Logging avec emojis (SAT.Log)
  ├─ Retry pattern (SAT.Resilience)
  ├─ Utilities (SAT.Utils, SAT.H)
  └─ Sheet access (SAT.S)
  ↓
Layer 2: Métier (données, étages, context)
  ├─ Étages management (SAT.Etages)
  ├─ Data repository (SAT.Repo)
  └─ Context tracking (SAT.Context)
  ↓
Layer 3: Automation (handlers, executor, scheduler)
  ├─ Handlers détection
  ├─ Executor queue
  └─ Scheduler timing
  ↓
Layer 4: Features (UI, forms, dashboards, resilience, ergonomie)
  ├─ UI components
  ├─ Forms & Panels
  ├─ Dashboard & Charts
  ├─ Health & Recovery
  └─ Accessibility
  ↓
Layer 5: Application (instalation, triggers, menu)
  ├─ Installation & Setup
  ├─ Event triggers (onOpen, onEdit)
  └─ Menu contextuel (ENTRY POINT)
```

**Clé à retenir**: Chaque layer dépend du précédent. Layer 1 = CRITIQUE.

---

## 🎯 STRUCTURE DES FICHIERS

```
src/
├─ 00_bootstrap.gs          ← Charge d'abord, setup SAT global
├─ 00_core_*.gs             ← Config, Logging, Resilience (CRITIQUE)
├─ 01_core_*.gs             ← Utils, Helpers, Sheets access
├─ 02_core_sheets.gs        ← API "safe" pour accéder aux sheets
├─ 04_context_tracking.gs   ← État courant
│
├─ 10_automation_*.gs       ← Queue automation
├─ 10_core_etages.gs        ← Gestion des étages (floors)
├─ 10_data_repo.gs          ← CRUD données
├─ 11-12_automation_*.gs    ← Executor + Scheduler
│
├─ 20_ui_design_system.gs   ← Colors, styles
├─ 21_ui_forms.gs           ← Form builder
├─ 22_ui_form_add_*.gs      ← Formulaires spécifiques
├─ 22_ui_panels.gs          ← Search panels
├─ 23_ui_dashboard.gs       ← Dashboard view
├─ 30_ui_charts.gs          ← Graphiques
├─ 30_ui_documentation.gs   ← Help intégré
│
├─ 30-32_resilience_*.gs    ← Monitoring, Health, Recovery
│
├─ 40-42_ergonomic_*.gs     ← Adaptive, Accessibility, Guidance
│
├─ 50_app_recalc.gs         ← Moteur recalcul
├─ 51_app_install*.gs       ← Installation & setup
├─ 52_app_triggers.gs       ← Attach event handlers
├─ 53_app_menu.gs           ← Menu contextuel (ENTRY POINT)
│
└─ INITIALIZE.gs            ← Stub/placeholder
```

---

## 💻 COMMANDES UTILES

```bash
# Déployer code
make deploy          # Full deployment
clasp push           # Just push .gs files

# Ouvrir dans Google Sheets
clasp open

# Voir logs
make logs            # Si script supporte

# Vérifier erreurs pré-commit
make pre-commit

# Autre
make help            # Voir toutes les commandes
```

---

## 📋 CHECKLIST MINIMUM JOUR 1

- [ ] `npm install`
- [ ] `clasp login`
- [ ] `clasp push`
- [ ] `clasp open`
- [ ] Menu 🧰 s'affiche? 
- [ ] Installation structure complète?
- [ ] Onglets créés: Production, Errors, Logs, Étages?
- [ ] Documenter résultat dans [STATUS_PROJET.md](STATUS_PROJET.md)
- [ ] Git commit

---

## 🔗 DOCUMENTS COMPLÉMENTAIRES

| Document | Objectif |
|----------|----------|
| [README.md](README.md) | Vue d'ensemble générale |
| [COPILOT_GUIDE.md](COPILOT_GUIDE.md) | Patterns de code + Copilot |
| **[PLAN_DEVELOPPEMENT.md](PLAN_DEVELOPPEMENT.md)** | 📍 **À LIRE**: Roadmap 9 phases |
| **[STATUS_PROJET.md](STATUS_PROJET.md)** | 📍 **À LIRE**: État exact + blocages |
| **[CHECKLIST_ACTION.md](CHECKLIST_ACTION.md)** | 📍 **À FAIRE**: Tâches jour par jour |
| Makefile | Commandes make disponibles |

---

## 🆘 PROBLÈME? VIA CETTE PROCÉDURE

1. **Reproduire exactement** le problème
   - Quoi? Quelle action?
   - Où? Quel onglet/menu?
   - Quand? À chaque fois?

2. **Noter l'erreur** 
   - Apps Script Console → Logs
   - Note le message exact

3. **Chercher dans [STATUS_PROJET.md](STATUS_PROJET.md)**
   - Section "Blocages identifiés"
   - Déjà résolu?

4. **Lancer test diagnostic**
   - `testSetup()` pour menu
   - `testInstall()` pour installation
   - Copier output

5. **Documenter dans [STATUS_PROJET.md](STATUS_PROJET.md)**
   - Ajouter nouvelle entrée sous "Questions à clarifier"
   - Inclure résultat du test

---

## 🎬 MAINTENANT COMMENCEZ PAR

### Option A: "Je veux comprendre le plan complet"
→ Lire [PLAN_DEVELOPPEMENT.md](PLAN_DEVELOPPEMENT.md) (30 min)

### Option B: "Je veux juste savoir où on en est"
→ Lire [STATUS_PROJET.md](STATUS_PROJET.md) (15 min)

### Option C: "Je veux avancer MAINTENANT"
→ Suivre [CHECKLIST_ACTION.md](CHECKLIST_ACTION.md) JOUR 1

### Option D: "Je veux savoir quoi faire aujourd'hui"
```bash
# Lancez cette commande
cat CHECKLIST_ACTION.md | head -100
# Puis exécutez "JOUR 1: Setup & Test Menu"
```

---

## ✨ RÉSUMÉ

| Question | Réponse |
|---------|--------|
| **Combien de temps pour finir?** | 15-20 jours (3 semaines) |
| **Est-ce cassé?** | 60% OK, 40% à tester |
| **Par où commencer?** | JOUR 1: Setup + Menu test |
| **Qu'est-ce qui peut échouer?** | Menu + Installation + Triggers |
| **Comment débugger?** | Apps Script Console → Tests diag |
| **Où documenter les bugs?** | STATUS_PROJET.md |
| **Prochaine milestone?** | Fin SEMAINE 1: Tous les menus marchent |

---

## 🚀 YOU'RE READY!

```
                 SAT ASSIST 2026
          Production Management System
           Satisfactory Calculator
        
           ✅ 33 Files ready
           ✅ Architecture clean  
           ✅ 9K LOC
           ⏳ Testing needed
           🎯 Deploy in 3 weeks
           
        👉 START NOW: JOUR 1 in CHECKLIST_ACTION.md
```

---

**Version**: Quick Start v2026.03  
**Créé**: 1er mars 2026  
**Prêt à commencer?** → Ouvrir [CHECKLIST_ACTION.md](CHECKLIST_ACTION.md) JOUR 1

---

### 📞 Questions?

1. Tous les documents sont écrits pour guide vous
2. Commencez par JOUR 1 de la checklist
3. Documentez les blocages = on peut réagir
4. Progressez jour par jour, sans panique

**Vous avez 80% du code prêt. Besoin juste de 20% test/debug. Vous êtes OK! 🚀**
