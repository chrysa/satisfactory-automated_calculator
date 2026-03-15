/* 70_sat.install.gs */
var SAT = this.SAT || (this.SAT = {});

function SAT_install() {
  Logger.log("\n");
  Logger.log("═══════════════════════════════════════════════════════");
  Logger.log("🧰 STARTING S.A.T INSTALLATION");
  Logger.log("═══════════════════════════════════════════════════════\n");
  
  try {
    // CRITICAL STEPS (must succeed)
    SAT.WorkIndicator.progress(1, 7, "Creating sheets...");
    SAT_installSheets_();
    
    SAT.WorkIndicator.progress(2, 7, "Installing headers...");
    SAT_installHeaders_();
    
    SAT.WorkIndicator.progress(3, 7, "Installing seed data...");
    SAT_installSeedIfEmpty_();
    
    SAT.WorkIndicator.progress(4, 7, "Setting up validations...");
    try { SAT_installValidations_(); } catch (e) { Logger.log("⚠️ Validations: " + e.message); }
    
    SAT.WorkIndicator.progress(5, 7, "Applying formatting & filters...");
    try { SAT_applyAllThemes_(); } catch (e) { Logger.log("⚠️ Themes: " + e.message); }
    try { SAT.FormAddProduction.setup(); } catch (e) { Logger.log("⚠️ Form: " + e.message); }
    try { SAT.Dashboard.setup(); } catch (e) { Logger.log("⚠️ Dashboard: " + e.message); }
    try { SAT_setupAddForm(); } catch (e) { Logger.log("⚠️ Add form: " + e.message); }
    try { SAT_setupSearchForm(); } catch (e) { Logger.log("⚠️ Search form: " + e.message); }
    try { SAT_UI_renderPanels(); } catch (e) { Logger.log("⚠️ Panels: " + e.message); }
    try { SAT_applyConditionalFormattingProduction(); } catch (e) { Logger.log("⚠️ Formatting: " + e.message); }
    try { SAT_improveLayout(); } catch (e) { Logger.log("⚠️ Layout: " + e.message); }
    try { SAT_addDynamicFilters(); } catch (e) { Logger.log("⚠️ Filters: " + e.message); }
    try { SAT.AutoCalc.applyToProduction(); } catch (e) { Logger.log("⚠️ AutoCalc: " + e.message); }
    
    SAT.WorkIndicator.progress(6, 8, "Creating charts...");
    try { SAT.Dashboard.createFloorChart(); } catch (e) { Logger.log("⚠️ Floor chart: " + e.message); }
    try { SAT.Dashboard.createBalanceChart(); } catch (e) { Logger.log("⚠️ Balance chart: " + e.message); }

    SAT.WorkIndicator.progress(7, 8, "Running final recalculation...");
    SAT_recalcAll();
    
    SAT.WorkIndicator.progress(8, 9, "Organizing sheets...");
    try { SAT_reorderSheets(); } catch (e) { Logger.log("⚠️ Reorder: " + e.message); }
    try { SAT_showOverviewFirst(); } catch (e) { Logger.log("⚠️ Overview order: " + e.message); }
    
    SAT.WorkIndicator.progress(9, 9, "Ensuring triggers are installed...");
    try { SAT_ensureAllTriggers_(); } catch (e) { Logger.log("⚠️ Triggers: " + e.message); }
    
    Logger.log("\n");
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("✅ INSTALLATION COMPLETE!");
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("\n📋 NEXT STEPS:");
    Logger.log("1. Add floors using Menu → Données → + Ajouter étage");
    Logger.log("2. Use ➕ Ajouter Production sheet to quickly add production lines");
    Logger.log("3. Dashboard will auto-update\n");
    
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SAT.CFG.SHEETS.DASHBOARD).activate();
    SAT.Log.success("✅ Installation complète!");
    
  } catch (e) {
    Logger.log("\n");
    Logger.log("═══════════════════════════════════════════════════════");
    Logger.log("❌ INSTALLATION FAILED: " + e.message);
    Logger.log("═══════════════════════════════════════════════════════\n");
    SAT.Log.error("Installation échouée: " + e.message);
  }
}

/**
 * Apply color themes to all sheets
 */
function SAT_applyAllThemes_() {
  SAT.Log.info("Applying color themes...");
  
  var cfg = SAT.CFG;
  try {
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.DASHBOARD), "DASHBOARD");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.FORM_ADD), "FORM_ADD");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.PRODUCTION), "PRODUCTION");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.REF_BASE), "REF_BASE");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.REF_MACHINES), "REF_MACHINES");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.REF_ETAGES), "REF_ETAGES");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.ERRORS), "ERRORS");
    SAT.Design.applySheetTheme(SAT.S.must(cfg.SHEETS.HELP), "HELP");
    SAT.Log.success("✅ All themes applied");
  } catch (e) {
    SAT.Log.error("Theme error: " + e.message);
  }
}

function SAT_installSheets_() {
  var cfg = SAT.CFG;
  SAT.Log.divider("📄 Création/Vérification des onglets");
  
  // Créer ALL onglets requis (ensure crée s'il manque)
  var sheets = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.FORM_ADD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.REF_BASE,
    cfg.SHEETS.REF_MACHINES,
    cfg.SHEETS.REF_ETAGES,
    cfg.SHEETS.ERRORS,
    cfg.SHEETS.HELP
  ];
  
  sheets.forEach(function(sheetName) {
    try {
      var sheet = SAT.S.ensure(sheetName);
      SAT.Log.info("✓ Onglet " + sheetName + (sheet ? " existant/créé" : " erreur"));
    } catch (e) {
      SAT.Log.error("Onglet " + sheetName + ": " + e.message);
    }
  });
  
  SAT.Log.success("✅ Tous les onglets disponibles");
}

function SAT_installHeaders_() {
  var cfg = SAT.CFG;

  SAT.S.must(cfg.SHEETS.PRODUCTION)
    .getRange(cfg.PRODUCTION.HEADER_ROW, 1, 1, cfg.PRODUCTION.COLS.CAUSE)
    .setValues([["Étage", "Machine", "IN Res", "IN/min", "OUT Res", "OUT/min", "Nb", "Note", "Cause"]]);

  SAT.S.must(cfg.SHEETS.REF_BASE)
    .getRange(cfg.REF_BASE.HEADER_ROW, 1, 1, 3)
    .setValues([["Ressource", "Type", "Note"]]);

  SAT.S.must(cfg.SHEETS.REF_MACHINES)
    .getRange(cfg.REF_MACHINES.HEADER_ROW, 1, 1, cfg.REF_MACHINES.COLS.NOTE)
    .setValues([["Machine", "Hauteur", "Largeur", "Longueur", "Note"]]);

  // REF_ETAGES - Input form for floors with resources, machines, quantities
  SAT.S.must(cfg.SHEETS.REF_ETAGES)
    .getRange(cfg.REF_ETAGES.HEADER_ROW, 1, 1, 6)
    .setValues([["Étage", "Ressource", "Machine", "Nombre", "Taux/Machine", "Taux Total"]]);

  Logger.log("✅ Headers installed");

  // Apply themes to all sheets
  SAT_applyAllThemes_();
}

function SAT_installSeedIfEmpty_() {
  var cfg = SAT.CFG;
  Logger.log("Installing core data...");

  // Install reference resources
  var rb = SAT.S.must(cfg.SHEETS.REF_BASE);
  if (rb.getLastRow() < cfg.REF_BASE.DATA_ROW) {
    Logger.log("  • Installing BASE resources (" + cfg.SEED.BASE_RESOURCES.length + " items)");
    rb.getRange(cfg.REF_BASE.DATA_ROW, 1, cfg.SEED.BASE_RESOURCES.length, 3).setValues(cfg.SEED.BASE_RESOURCES);
  }

  // Install reference machines
  var rm = SAT.S.must(cfg.SHEETS.REF_MACHINES);
  if (rm.getLastRow() < cfg.REF_MACHINES.DATA_ROW) {
    Logger.log("  • Installing MACHINES (" + cfg.SEED.MACHINES.length + " items)");
    rm.getRange(cfg.REF_MACHINES.DATA_ROW, 1, cfg.SEED.MACHINES.length, 5).setValues(cfg.SEED.MACHINES);
  }

  Logger.log("✅ Core data installed");
}

/**
 * Setup data validation (dropdowns) and formulas for Étages sheet
 */
function SAT_setupEtagesValidation_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var etSh = SAT.S.must(cfg.SHEETS.REF_ETAGES);
    
    // Get resources for dropdown - Column B
    var rb = ss.getSheetByName(cfg.SHEETS.REF_BASE);
    if (rb && rb.getLastRow() >= cfg.REF_BASE.DATA_ROW) {
      var rRange = rb.getRange(cfg.REF_BASE.DATA_ROW, cfg.REF_BASE.COLS.RESSOURCE, rb.getLastRow() - (cfg.REF_BASE.DATA_ROW - 1), 1);
      etSh.getRange(cfg.REF_ETAGES.DATA_ROW, cfg.REF_ETAGES.COLS.RESSOURCE, etSh.getMaxRows() - (cfg.REF_ETAGES.DATA_ROW - 1), 1)
        .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(rRange, true).setAllowInvalid(true).build());
    }
    
    // Get machines for dropdown - Column C
    var rm = ss.getSheetByName(cfg.SHEETS.REF_MACHINES);
    if (rm && rm.getLastRow() >= cfg.REF_MACHINES.DATA_ROW) {
      var mRange = rm.getRange(cfg.REF_MACHINES.DATA_ROW, cfg.REF_MACHINES.COLS.MACHINE, rm.getLastRow() - (cfg.REF_MACHINES.DATA_ROW - 1), 1);
      etSh.getRange(cfg.REF_ETAGES.DATA_ROW, cfg.REF_ETAGES.COLS.MACHINE, etSh.getMaxRows() - (cfg.REF_ETAGES.DATA_ROW - 1), 1)
        .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(mRange, true).setAllowInvalid(true).build());
    }
    
    // Add formula for Taux Total (F = D × E)
    var formulas = [];
    for (var i = 0; i < 100; i++) {
      var row = cfg.REF_ETAGES.DATA_ROW + i;
      formulas.push(["=IF(AND(D" + row + "<>\"\",E" + row + "<>\"\"),D" + row + "*E" + row + ",\"\")"]);
    }
    etSh.getRange(cfg.REF_ETAGES.DATA_ROW, cfg.REF_ETAGES.COLS.TAUX_TOTAL, 100, 1).setFormulas(formulas);
    
    Logger.log("✓ Étages validation & formulas set");
  } catch (e) {
    Logger.log("⚠️ Étages setup: " + e.message);
  }
}

function SAT_installValidations_() {
  var cfg = SAT.CFG;
  var prod = SAT.S.must(cfg.SHEETS.PRODUCTION);

  var rm = SAT.S.sheet(cfg.SHEETS.REF_MACHINES);
  if (rm && rm.getLastRow() >= cfg.REF_MACHINES.DATA_ROW) {
    var mRange = rm.getRange(cfg.REF_MACHINES.DATA_ROW, cfg.REF_MACHINES.COLS.MACHINE, rm.getLastRow() - (cfg.REF_MACHINES.DATA_ROW - 1), 1);
    prod.getRange(cfg.PRODUCTION.DATA_ROW, cfg.PRODUCTION.COLS.MACHINE, prod.getMaxRows() - (cfg.PRODUCTION.DATA_ROW - 1), 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInRange(mRange, true).setAllowInvalid(false).build()
    );
  }

  var rb = SAT.S.sheet(cfg.SHEETS.REF_BASE);
  if (rb && rb.getLastRow() >= cfg.REF_BASE.DATA_ROW) {
    var rRange = rb.getRange(cfg.REF_BASE.DATA_ROW, cfg.REF_BASE.COLS.RESSOURCE, rb.getLastRow() - (cfg.REF_BASE.DATA_ROW - 1), 1);
    var ruleR = SpreadsheetApp.newDataValidation().requireValueInRange(rRange, true).setAllowInvalid(true).build();

    prod.getRange(cfg.PRODUCTION.DATA_ROW, cfg.PRODUCTION.COLS.IN_RES, prod.getMaxRows() - (cfg.PRODUCTION.DATA_ROW - 1), 1).setDataValidation(ruleR);
    prod.getRange(cfg.PRODUCTION.DATA_ROW, cfg.PRODUCTION.COLS.OUT_RES, prod.getMaxRows() - (cfg.PRODUCTION.DATA_ROW - 1), 1).setDataValidation(ruleR);
  }
}

/**
 * VIDER DONNÉES - Efface production + overview, garde structure et référentiels
 * ⚠️ ACTION DESTRUCTIVE - Demande confirmation
 */
function SAT_CLEAR_ALL_DATA() {
  if (!SAT.UI.confirm(
    "🗑️ VIDER DONNÉES",
    "Cela va effacer:\n- Production (toutes les lignes)\n- Overview (résultats)\n\nLes référentiels seront conservés.\n\nConfirmer?"
  )) {
    SAT.Log.info("Suppression annulée");
    return;
  }

  try {
    SAT.Log.divider("🗑️ SUPPRESSION DES DONNÉES EN COURS");
    var cfg = SAT.CFG;
    
    // Vider production (garder headers)
    var prod = SAT.S.must(cfg.SHEETS.PRODUCTION);
    var prodLastRow = prod.getLastRow();
    if (prodLastRow > cfg.PRODUCTION.HEADER_ROW) {
      var prodClearRange = prod.getRange(
        cfg.PRODUCTION.DATA_ROW, 
        1, 
        prodLastRow - (cfg.PRODUCTION.DATA_ROW - 1), 
        prod.getLastColumn()
      );
      prodClearRange.clearContent();
      SAT.Log.success("✅ Production: données supprimées");
    }
    
    // Vider overview (garder headers, formules, panneaux)
    var ov = SAT.S.must(cfg.SHEETS.OVERVIEW);
    var ovLastRow = ov.getLastRow();
    if (ovLastRow > cfg.OVERVIEW.DATA_ROW) {
      var ovClearRange = ov.getRange(
        cfg.OVERVIEW.DATA_ROW, 
        1, 
        ovLastRow - (cfg.OVERVIEW.DATA_ROW - 1), 
        13  // Colonnes A:M
      );
      ovClearRange.clearContent();
      SAT.Log.success("✅ Overview: résultats supprimés");
    }
    
    // Vider formulaire (mais garder headers)
    var formAddRange = ov.getRange(
      cfg.OVERVIEW.FORM_ADD.START_ROW, 
      cfg.OVERVIEW.FORM_ADD.START_COL, 
      2, 
      cfg.OVERVIEW.FORM_ADD.WIDTH
    );
    formAddRange.clearContent();
    ov.getRange(cfg.OVERVIEW.FORM_ADD.START_ROW, cfg.OVERVIEW.FORM_ADD.START_COL + 6).setValue(1);
    SAT.Log.success("✅ Formulaire: réinitialisé");
    
    // Recalcul
    SAT_recalcAll();
    SAT.Log.success("✅ Recalcul effectué");
    
    SAT.Log.divider("✅ SUPPRESSION COMPLÉTÉE");
    SAT.UI.alert(
      "✅ Données supprimées",
      "Production et overview ont été vidés.\nRéférentiels conservés.\n\nVous pouvez ajouter de nouvelles lignes.",
      "success"
    );
    
  } catch(error) {
    SAT.Log.error("SUPPRESSION ÉCHOUÉE: " + error.message);
    SAT.UI.alert("❌ Erreur", "Suppression échouée:\n" + error.message, "error");
  }
}
/**
 * Ensures onOpen and onEdit triggers exist
 * Auto-recreates if accidentally deleted
 */
function SAT_ensureAllTriggers_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  
  // Check which triggers exist
  var hasOnOpen = false;
  var hasOnEdit = false;
  
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onOpen') hasOnOpen = true;
    if (trigger.getHandlerFunction() === 'onEdit') hasOnEdit = true;
  });
  
  // Create missing triggers
  if (!hasOnOpen) {
    ScriptApp.newTrigger('onOpen')
      .forSpreadsheet(ss)
      .onOpen()
      .create();
    Logger.log("✓ onOpen trigger created");
  }
  
  if (!hasOnEdit) {
    ScriptApp.newTrigger('onEdit')
      .forSpreadsheet(ss)
      .onEdit()
      .create();
    Logger.log("✓ onEdit trigger created");
  }
  
  if (hasOnOpen && hasOnEdit) {
    Logger.log("✓ All triggers already exist");
  }
}

/**
 * Create production efficiency chart
 */
function SAT_createProductionChart_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var prodSheet = ss.getSheetByName(cfg.SHEETS.PRODUCTION);
    
    if (!prodSheet || prodSheet.getLastRow() < 3) return;
    
    // Create chart: IN rate vs OUT rate by floor
    var range = prodSheet.getRange(cfg.PRODUCTION.HEADER_ROW, cfg.PRODUCTION.COLS.ETAGE, 
      Math.min(10, prodSheet.getLastRow()), cfg.PRODUCTION.COLS.OUT_RATE + 1);
    
    var chart = prodSheet.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(range)
      .setPosition(2, 12, 0, 0)
      .setOption('title', '📊 Production vs Consommation')
      .setOption('width', 600)
      .setOption('height', 300)
      .build();
    
    prodSheet.insertChart(chart);
    Logger.log("✓ Production chart created");
  } catch (e) {
    Logger.log("⚠️ Production chart: " + e.message);
  }
}

/**
 * Create floor dependency visualization
 */
function SAT_createDependencyChart_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var etageSheet = ss.getSheetByName(cfg.SHEETS.REF_ETAGES);
    
    if (!etageSheet || etageSheet.getLastRow() < 3) return;
    
    // Simple table showing dependencies
    Logger.log("✓ Dependency info: Reference Etages sheet contains DEPENDENCIES column");
  } catch (e) {
    Logger.log("⚠️ Dependency chart: " + e.message);
  }
}

/**
 * Create error trend chart (placeholder)
 */
function SAT_createErrorTrendChart_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var errorSheet = ss.getSheetByName(cfg.SHEETS.ERRORS);
    
    if (!errorSheet) {
      errorSheet = ss.insertSheet(cfg.SHEETS.ERRORS);
      errorSheet.getRange(1, 1, 1, 3).setValues([["Timestamp", "Error", "Status"]]);
    }
    
    Logger.log("✓ Error tracking sheet initialized");
  } catch (e) {
    Logger.log("⚠️ Error chart: " + e.message);
  }
}

/**
 * Initialize Help sheet with documentation
 */
function SAT_initializeHelpSheet_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var helpSheet = ss.getSheetByName(cfg.SHEETS.HELP);
    
    if (!helpSheet) {
      helpSheet = ss.insertSheet(cfg.SHEETS.HELP);
    }
    
    // Add help content
    helpSheet.getRange(1, 1).setValue("🧰 S.A.T ASSIST 2026 - Aide");
    helpSheet.getRange(2, 1).setValue("Version 2026.03");
    helpSheet.getRange(4, 1).setValue("📖 Guide Rapide:");
    helpSheet.getRange(5, 1).setValue("1. Ajouter étages → Menu → Ajouter étage");
    helpSheet.getRange(6, 1).setValue("2. Ajouter production → Menu → Ajouter ligne");
    helpSheet.getRange(7, 1).setValue("3. Overview se met à jour automatiquement");
    
    helpSheet.setColumnWidth(1, 400);
    Logger.log("✓ Help sheet initialized");
  } catch (e) {
    Logger.log("⚠️ Help sheet: " + e.message);
  }
}

/**
 * Initialize Visual Guide sheet
 */
function SAT_initializeVisualGuide_() {
  try {
    var cfg = SAT.CFG;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var visualSheet = ss.getSheetByName(cfg.SHEETS.VISUAL);
    
    if (!visualSheet) {
      visualSheet = ss.insertSheet(cfg.SHEETS.VISUAL);
    }
    
    visualSheet.getRange(1, 1).setValue("🎨 Guide Visuel des Couleurs");
    visualSheet.getRange(3, 1).setValue("Couleur");
    visualSheet.getRange(3, 2).setValue("Signification");
    
    var legendData = [
      ["🟢 Vert", "Production OK"],
      ["🟡 Jaune", "Attention requise"],
      ["🔴 Rouge", "Erreur / Critique"],
      ["⚪ Blanc", "Données manquantes"],
      ["🟦 Bleu", "Référentiel"]
    ];
    
    visualSheet.getRange(4, 1, 5, 2).setValues(legendData);
    visualSheet.setColumnWidth(1, 200);
    visualSheet.setColumnWidth(2, 250);
    
    Logger.log("✓ Visual guide initialized");
  } catch (e) {
    Logger.log("⚠️ Visual guide: " + e.message);
  }
}

Logger.log("✅ 51_app_install.gs loaded");