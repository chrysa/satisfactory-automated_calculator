/**
 * 51_app_install_final.gs - Installation COMPLÈTE redesignée
 * 
 * Refait le Google Sheet ENTIÈREMENT avec:
 * - Meilleure lisibilité
 * - Meilleure structure
 * - Vrai dashboard
 * - Vraies formulas
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * MAIN INSTALL - Complete redesign
 */
function SAT_install_final() {
  Logger.log("\n🔄 INSTALLATION COMPLÈTE - REDESIGN UX/UI\n");
  
  try {
    // Clean all sheets first
    SAT_cleanAllSheets_();
    
    // 1. Create sheets
    SAT_createSheetsClean_();
    
    // 2. Install reference data
    SAT_installReferencesClean_();
    
    // 3. Design Production sheet
    SAT_designProductionSheetPro_();
    
    // 4. Design Dashboard
    SAT_designDashboardPro_();
    
    // 5. Design Referentials
    SAT_designReferentialsPro_();
    
    // 6. Setup validations & formulas
    SAT_setupValidationsPro_();
    
    // 7. Final polish
    SAT_finalPolish_();

    Logger.log("\n✅ INSTALLATION COMPLÈTE!\n");
    Logger.log("📊 Structure:");
    Logger.log("  1. Dashboard - Vue d'ensemble");
    Logger.log("  2. Production - Saisie + données");
    Logger.log("  3. Ressources - Référentiel");
    Logger.log("  4. Machines - Référentiel");
    Logger.log("  5. Étages - Configuration\n");

    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SAT.CFG.SHEETS.DASHBOARD)
      .activate();

    SAT.Log.success("✅ Installation finale complète!");

  } catch (e) {
    Logger.log("\n❌ ERREUR: " + e.message);
    Logger.log("Stack: " + e.stack);
    SAT.Log.error("Erreur installation: " + e.message);
  }
}

/**
 * Clean ALL old sheets
 */
function SAT_cleanAllSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = SAT.CFG;
  
  var keepSheets = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.RESOURCES,
    cfg.SHEETS.MACHINES,
    cfg.SHEETS.FLOORS
  ];

  var allSheets = ss.getSheets();
  allSheets.forEach(function(sheet) {
    if (!keepSheets.includes(sheet.getName())) {
      try {
        ss.deleteSheet(sheet);
        Logger.log("  🗑️ Supprimé: " + sheet.getName());
      } catch (e) {
        // Ignore
      }
    }
  });

  // Clear content of existing sheets
  keepSheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      try {
        sheet.clearFormats();
        sheet.clearContent();
        sheet.clearDataValidations();
        Logger.log("  🧹 Nettoyé: " + name);
      } catch (e) {
        // Ignore
      }
    }
  });
}

/**
 * Create 5 clean sheets
 */
function SAT_createSheetsClean_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = SAT.CFG;

  var sheets = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.RESOURCES,
    cfg.SHEETS.MACHINES,
    cfg.SHEETS.FLOORS
  ];

  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      ss.insertSheet(name);
    }
  });

  // Set column widths for all
  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    
    // Default widths
    for (var i = 1; i <= 10; i++) {
      sheet.setColumnWidth(i, 120);
    }
    
    // Adjust major columns
    sheet.setColumnWidth(1, 150); // A - Title/Étage
    sheet.setColumnWidth(2, 130); // B - Name/Machine
  });

  Logger.log("✅ 5 sheets created & formatted");
}

/**
 * Install seed data (FR)
 */
function SAT_installReferencesClean_() {
  var cfg = SAT.CFG;

  // RESOURCES
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  resSheet.getRange(cfg.RESOURCES.DATA_ROW, 1, cfg.SEED.BASE_RESOURCES.length, 3)
    .setValues(cfg.SEED.BASE_RESOURCES);

  // MACHINES
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);
  machSheet.getRange(cfg.MACHINES.DATA_ROW, 1, cfg.SEED.MACHINES.length, 5)
    .setValues(cfg.SEED.MACHINES);

  Logger.log("✅ Reference data installed");
}

/**
 * Design Production sheet with PRO layout
 */
function SAT_designProductionSheetPro_() {
  var cfg = SAT.CFG;
  var sheet = SAT.S.must(cfg.SHEETS.PRODUCTION);

  var row = 1;
  
  // === TITLE ===
  sheet.getRange(row, 1, 1, 8).merge();
  sheet.getRange(row, 1).setValue("📈 MA PRODUCTION");
  sheet.setRowHeight(row, 35);
  
  sheet.getRange(row, 1)
    .setFontSize(18)
    .setFontWeight("bold")
    .setBackground("#1565C0")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  
  row += 1;
  
  // === FORM INPUT ROW ===
  sheet.setRowHeight(row, 25);
  
  var formLabels = ["Étage", "Machine", "Ressource IN", "Qté IN", "Ressource OUT", "Qté OUT", "Nombre", "Note"];
  sheet.getRange(row, 1, 1, 8).setValues([formLabels]);
  
  sheet.getRange(row, 1, 1, 8)
    .setBackground("#FFA726")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setFontSize(11);
  
  row += 1;
  
  // === INPUT CELLS (editable) ===
  sheet.setRowHeight(row, 30);
  
  // Set number formats
  sheet.getRange(row, 4).setNumberFormat("0.00"); // Qté IN
  sheet.getRange(row, 6).setNumberFormat("0.00"); // Qté OUT
  sheet.getRange(row, 7).setNumberFormat("0"); // Nombre
  
  // Background
  sheet.getRange(row, 1, 1, 8)
    .setBackground("#FFF9C4")
    .setFontColor("#000000")
    .setBorder(true, true, true, true, true, true);
  
  row += 1;
  
  // === SPACING ===
  sheet.setRowHeight(row, 8);
  row += 1;
  
  // === HEADERS FOR DATA ===
  var dataHeaders = ["Étage", "Machine", "Res IN", "Qté/min IN", "Res OUT", "Qté/min OUT", "Nombre", "Note"];
  sheet.getRange(row, 1, 1, 8).setValues([dataHeaders]);
  sheet.setRowHeight(row, 25);
  
  sheet.getRange(row, 1, 1, 8)
    .setBackground("#1565C0")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  row += 1;
  
  // === DATA ROWS (pre-format 100 rows) ===
  var dataRange = sheet.getRange(row, 1, 100, 8);
  
  dataRange.setBackground("#FFFFFF");
  dataRange.setBorder(true, true, true, true, false, false);
  
  // Number formats for data rows
  sheet.getRange(row, 4, 100, 1).setNumberFormat("0.00"); // Qté IN
  sheet.getRange(row, 6, 100, 1).setNumberFormat("0.00"); // Qté OUT
  sheet.getRange(row, 7, 100, 1).setNumberFormat("0"); // Nombre
  
  // Alternating row colors for readability
  for (var i = 0; i < 100; i++) {
    if (i % 2 === 0) {
      sheet.getRange(row + i, 1, 1, 8).setBackground("#F5F5F5");
    }
  }

  // Freeze: title + form + headers
  sheet.setFrozenRows(5);

  Logger.log("✅ Production sheet designed (PRO)");
}

/**
 * Design Dashboard with real data
 */
function SAT_designDashboardPro_() {
  var cfg = SAT.CFG;
  var sheet = SAT.S.must(cfg.SHEETS.DASHBOARD);

  var row = 1;

  // === TITLE ===
  sheet.getRange(row, 1, 1, 4).merge();
  sheet.getRange(row, 1).setValue("📊 TABLEAU DE BORD");
  sheet.setRowHeight(row, 40);
  
  sheet.getRange(row, 1)
    .setFontSize(20)
    .setFontWeight("bold")
    .setBackground("#0D47A1")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  
  row += 2;

  // === STATS SECTION ===
  sheet.getRange(row, 1).setValue("📈 STATISTIQUES CLÉS");
  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1)
    .setFontSize(12)
    .setFontWeight("bold")
    .setBackground("#E3F2FD")
    .setFontColor("#0D47A1");
  
  row += 1;

  // Stat 1: Production lines
  sheet.getRange(row, 1).setValue("Lignes production:");
  sheet.getRange(row, 2).setValue("=COUNTA(" + cfg.SHEETS.PRODUCTION + "!A6:A)");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(14);
  row += 1;

  // Stat 2: Resources
  sheet.getRange(row, 1).setValue("Ressources disponibles:");
  sheet.getRange(row, 2).setValue("=COUNTA(" + cfg.SHEETS.RESOURCES + "!A2:A)");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(14);
  row += 1;

  // Stat 3: Machines
  sheet.getRange(row, 1).setValue("Machines disponibles:");
  sheet.getRange(row, 2).setValue("=COUNTA(" + cfg.SHEETS.MACHINES + "!A2:A)");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(14);
  row += 1;

  // Stat 4: Étages
  sheet.getRange(row, 1).setValue("Étages configurés:");
  sheet.getRange(row, 2).setValue("=COUNTA(" + cfg.SHEETS.FLOORS + "!A2:A)");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(14);
  row += 2;

  // === QUICK SUMMARY ===
  sheet.getRange(row, 1).setValue("💡 RÉSUMÉ PRODUCTION");
  sheet.setRowHeight(row, 22);
  sheet.getRange(row, 1)
    .setFontSize(12)
    .setFontWeight("bold")
    .setBackground("#E3F2FD")
    .setFontColor("#0D47A1");
  
  row += 1;

  // Summary by étage (if data exists)
  sheet.getRange(row, 1).setValue("Total recursos IN:");
  sheet.getRange(row, 2).setValue("=SUMIF(" + cfg.SHEETS.PRODUCTION + "!D:D,\">0\")");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(12);
  row += 1;

  sheet.getRange(row, 1).setValue("Total recursos OUT:");
  sheet.getRange(row, 2).setValue("=SUMIF(" + cfg.SHEETS.PRODUCTION + "!F:F,\">0\")");
  sheet.getRange(row, 2).setBackground("#FFF9C4").setFontWeight("bold").setFontSize(12);

  // Set column widths
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 150);

  Logger.log("✅ Dashboard designed (PRO)");
}

/**
 * Design Referential sheets (Resources, Machines)
 */
function SAT_designReferentialsPro_() {
  var cfg = SAT.CFG;

  // === RESOURCES ===
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  
  // Headers
  resSheet.getRange(cfg.RESOURCES.HEADER_ROW, 1, 1, 3).setValues([["Ressource", "Type", "Note"]]);
  resSheet.getRange(cfg.RESOURCES.HEADER_ROW, 1, 1, 3)
    .setBackground("#1E88E5")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  resSheet.setFrozenRows(1);
  resSheet.setColumnWidth(1, 180);
  resSheet.setColumnWidth(2, 120);
  resSheet.setColumnWidth(3, 200);

  // === MACHINES ===
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);
  
  // Headers
  machSheet.getRange(cfg.MACHINES.HEADER_ROW, 1, 1, 5).setValues([["Machine", "Hauteur", "Largeur", "Longueur", "Note"]]);
  machSheet.getRange(cfg.MACHINES.HEADER_ROW, 1, 1, 5)
    .setBackground("#388E3C")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  
  machSheet.setFrozenRows(1);
  machSheet.setColumnWidth(1, 180);
  machSheet.setColumnWidth(2, 100);
  machSheet.setColumnWidth(3, 100);
  machSheet.setColumnWidth(4, 100);
  machSheet.setColumnWidth(5, 200);

  Logger.log("✅ Referentials designed (PRO)");
}

/**
 * Setup data validation & formulas
 */
function SAT_setupValidationsPro_() {
  var cfg = SAT.CFG;
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);
  var prodSheet = SAT.S.must(cfg.SHEETS.PRODUCTION);

  // Machine dropdown (row 3, col C)
  var machList = machSheet.getRange(
    cfg.MACHINES.DATA_ROW, 1,
    machSheet.getLastRow() - cfg.MACHINES.DATA_ROW + 1, 1
  );
  var machRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(machList, true)
    .setAllowInvalid(false)
    .build();
  
  // Apply to column C (Machine) for next 100 rows
  prodSheet.getRange("C3:C102").setDataValidation(machRule);

  // Resource dropdowns (columns D & F)
  var resList = resSheet.getRange(
    cfg.RESOURCES.DATA_ROW, 1,
    resSheet.getLastRow() - cfg.RESOURCES.DATA_ROW + 1, 1
  );
  var resRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(resList, true)
    .setAllowInvalid(false)
    .build();
  
  prodSheet.getRange("D3:D102").setDataValidation(resRule);
  prodSheet.getRange("F3:F102").setDataValidation(resRule);

  Logger.log("✅ Validations & formulas setup");
}

/**
 * Final polish: fonts, colors, etc
 */
function SAT_finalPolish_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = SAT.CFG;

  // Set default font for all sheets
  var sheets = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.RESOURCES,
    cfg.SHEETS.MACHINES,
    cfg.SHEETS.FLOORS
  ];

  sheets.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    
    // Set font
    var range = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
    range.setFontFamily("Roboto").setFontSize(10).setFontColor("#222222");
    
    // Set default background
    range.setBackground("#FAFAFA");
  });

  // Reorder sheets
  var sheetOrder = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.RESOURCES,
    cfg.SHEETS.MACHINES,
    cfg.SHEETS.FLOORS
  ];

  var sheetMap = {};
  ss.getSheets().forEach(function(sh) {
    sheetMap[sh.getName()] = sh;
  });

  var pos = 0;
  sheetOrder.forEach(function(name) {
    if (sheetMap[name]) {
      ss.moveSheet(sheetMap[name], pos++);
    }
  });

  Logger.log("✅ Final polish complete");
}

Logger.log("✅ 51_app_install_final.gs loaded");
