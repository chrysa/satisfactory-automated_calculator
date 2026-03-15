/* INITIALIZE.gs - Initialisation robuste du système */
var SAT = this.SAT || (this.SAT = {});

/**
 * Fonction d'initialisation MASTER - Refactorisée
 * À exécuter depuis Console si rien ne s'affiche
 * Extensions → Apps Script → Console → SAT_MASTER_INIT()
 */
function SAT_MASTER_INIT() {
  var tasks = [
    { name: "Vérifier SAT.S", fn: SAT_CHECK_CORE, critical: true },
    { name: "Vérifier SAT.CFG", fn: SAT_CHECK_CFG, critical: true },
    { name: "Créer feuilles", fn: SAT_ENSURE_ALL_SHEETS, critical: false },
    { name: "Headers", fn: SAT_installHeaders_, critical: false },
    { name: "Données de base", fn: SAT_installSeedIfEmpty_, critical: false },
    { name: "Validations", fn: SAT_installValidations_, critical: false },
    { name: "Formulaires", fn: SAT_SETUP_FORMS, critical: false },
    { name: "Panneaux UI", fn: SAT_UI_renderPanels, critical: false },
    { name: "Formatting conditonnel", fn: SAT_applyConditionalFormattingProduction, critical: false },
    { name: "Recalcul", fn: SAT_recalcAll, critical: false },
    { name: "Réorganiser onglets", fn: SAT_REORDER_SHEETS, critical: false },
    { name: "Documentation", fn: SAT_initializeHelpSheet_, critical: false }
  ];
  
  var results = SAT.Workflow.run("🧰 INITIALISATION S.A.T 2026", tasks);
  
  if (results.failed === 0) {
    SAT.Log.success("Actualiser: Ctrl+Shift+R, puis Menu 🧰 SAT");
  } else {
    SAT.Log.warn(results.failed + " tâches échouées - consulter log");
  }
}

function SAT_CHECK_CORE() { if (typeof SAT.S === "undefined") throw new Error("SAT.S non initialisé!"); }
function SAT_CHECK_CFG() { if (typeof SAT.CFG === "undefined") throw new Error("SAT.CFG non initialisé!"); }
function SAT_SETUP_FORMS() {
  try { SAT_setupAddForm(); } catch (e) { SAT.Log.warn("Add form: " + e); }
  try { SAT_setupSearchForm(); } catch (e) { SAT.Log.warn("Search form: " + e); }
}
function SAT_REORDER_SHEETS() {
  try { SAT_reorderSheets(); } catch (e) {}
  try { SAT_showOverviewFirst(); } catch (e) {}
}

/**
 * Crée toutes les feuilles requises
 */
function SAT_ENSURE_ALL_SHEETS() {
  var cfg = SAT.CFG;
  var ss = SAT.S.ss();
  
  var sheets = [
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.FORM_ADD,
    cfg.SHEETS.REF_BASE,
    cfg.SHEETS.REF_MACHINES,
    cfg.SHEETS.REF_ETAGES
  ];
  
  sheets.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      Logger.log("   Création: " + name);
      ss.insertSheet(name);
    }
  });
}


/**
 * Vérifier l'état du système
 */
function SAT_CHECK_STATE() {
  Logger.log("");
  Logger.log("═══════════════════════════════════════════════════════════════");
  Logger.log("📊 ÉTAT DU SYSTÈME");
  Logger.log("═══════════════════════════════════════════════════════════════");
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  
  Logger.log("Feuilles actuelles:");
  sheets.forEach(function(name) {
    var found = name;
    Logger.log("  • " + found);
  });
  
  Logger.log("");
  Logger.log("Feuilles requises:");
  var cfg = SAT.CFG;
  var required = [cfg.SHEETS.PRODUCTION, cfg.SHEETS.DASHBOARD, cfg.SHEETS.FORM_ADD, cfg.SHEETS.REF_BASE, cfg.SHEETS.REF_MACHINES, cfg.SHEETS.REF_ETAGES];
  required.forEach(function(name) {
    var found = sheets.indexOf(name) >= 0;
    Logger.log("  " + (found ? "✅" : "❌") + " " + name);
  });
  
  Logger.log("");
  Logger.log("Si des feuilles manquent:");
  Logger.log("  Exécuter: SAT_MASTER_INIT()");
  Logger.log("");
}

/**
 * RESET COMPLET - Supprime TOUT le contenu et les feuilles
 * ⚠️ ACTION DESTRUCTIVE - Demande double confirmation
 */
function SAT_RESET() {
  if (!SAT.UI.confirmDangerous(
    "🔴 RESET COMPLET",
    "Cela va SUPPRIMER:\n- Toutes les feuilles\n- Toutes les données\n- Tous les triggers",
    "Confirmer la suppression DÉFINITIVE?"
  )) {
    SAT.Log.info("Reset annulé");
    return;
  }
  
  try {
    SAT.Log.divider("🔴 RESET EN COURS");
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    // Supprimer toutes les feuilles sauf la première
    for (var i = sheets.length - 1; i > 0; i--) {
      ss.deleteSheet(sheets[i]);
      SAT.Log.info("Feuille supprimée: " + sheets[i].getName());
    }
    
    // Vider la première feuille
    sheets[0].clearContents();
    sheets[0].clearFormats();
    sheets[0].setName("Sheet1");
    
    // Supprimer tous les triggers
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      ScriptApp.deleteTrigger(trigger);
      SAT.Log.info("Trigger supprimé: " + trigger.getHandlerFunction());
    });
    
    SAT.Log.success("RESET terminé - Feuille vide, exécutez SAT_MASTER_INIT() pour recommencer");
    SAT.UI.alert("✅ Reset réussi", "La feuille est maintenant vide.\n\nExécutez SAT_MASTER_INIT() pour recommencer.", "success");
    
  } catch(error) {
    SAT.Log.error("RESET échoué: " + error.message);
    SAT.UI.alert("❌ Erreur", "Reset échoué:\n" + error.message, "error");
  }
}
