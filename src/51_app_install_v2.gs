/**
 * 51_app_install_v2.gs - Installation simplifiée (version 2)
 * 
 * Crée 5 onglets essentiels et les configure entièrement
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * Installation principale (FRANÇAIS)
 */
function SAT_install_v2() {
  Logger.log("\n🚀 INSTALLATION v2 - VERSION MINIMALISTE\n");
  
  try {
    var progress = 1;
    var total = 6;

    // 1. Créer les sheets
    SAT.WorkIndicator.progress(progress++, total, "Création des onglets...");
    SAT_createAllSheets_v2();

    // 2. Installer les headers
    SAT.WorkIndicator.progress(progress++, total, "Installation des en-têtes...");
    SAT_installHeaders_v2();

    // 3. Installer les seed data
    SAT.WorkIndicator.progress(progress++, total, "Installation des données...");
    SAT_installSeedData_v2();

    // 4. Configurer validations
    SAT.WorkIndicator.progress(progress++, total, "Configuration des validations...");
    SAT_setupValidation_v2();

    // 5. Créer le dashboard
    SAT.WorkIndicator.progress(progress++, total, "Création du tableau de bord...");
    SAT_setupDashboard_v2();

    // 6. Configuration finale
    SAT.WorkIndicator.progress(progress++, total, "Configuration finale...");
    SAT_finalSetup_v2();

    Logger.log("\n✅ INSTALLATION COMPLÈTE!\n");
    Logger.log("📊 Onglets créés: Tableau de Bord, Production, Ressources, Machines, Étages");
    Logger.log("💡 Commence par ajouter des lignes de production dans l'onglet Production\n");

    // Afficher le Dashboard
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SAT.CFG.SHEETS.DASHBOARD)
      .activate();

    SAT.Log.success("✅ Installation v2 complète!");

  } catch (e) {
    Logger.log("\n❌ INSTALLATION ÉCHOUÉE: " + e.message);
    SAT.Log.error("Erreur installation: " + e.message);
  }
}

/**
 * Créer les 5 onglets et SUPPRIMER les autres
 */
function SAT_createAllSheets_v2() {
  var cfg = SAT.CFG;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheetsToKeep = [
    cfg.SHEETS.DASHBOARD,
    cfg.SHEETS.PRODUCTION,
    cfg.SHEETS.RESOURCES,
    cfg.SHEETS.MACHINES,
    cfg.SHEETS.FLOORS
  ];

  // ⚠️ SUPPRIMER TOUS les autres sheets
  var existingSheets = ss.getSheets();
  existingSheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (!sheetsToKeep.includes(name)) {
      try {
        ss.deleteSheet(sheet);
        Logger.log("  🗑️ DELETED: " + name);
      } catch (e) {
        Logger.log("  ⚠️ Cannot delete " + name + ": " + e.message);
      }
    }
  });

  // Créer/vérifier les 5 sheets essentiels
  sheetsToKeep.forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      Logger.log("  ✓ Created: " + name);
    } else {
      Logger.log("  ✓ Exists: " + name);
    }
  });

  SAT.Log.success("✅ 5 sheets only - cleanup done");
}

/**
 * Installer les headers (TOUT EN FRANÇAIS)
 */
function SAT_installHeaders_v2() {
  var cfg = SAT.CFG;

  // PRODUCTION: 2 lignes de titre + headers
  var prodSheet = SAT.S.must(cfg.SHEETS.PRODUCTION);
  prodSheet.getRange("A1:H1").merge().setValue("📈 MA PRODUCTION");
  prodSheet.getRange("A1").setFontSize(16).setFontWeight("bold").setBackground("#1E88E5").setFontColor("#FFFFFF");

  // Micro-formulaire dans la ligne 2
  prodSheet.getRange("A2").setValue("➕ Ajouter:");
  var inputs = ["Étage", "Machine", "Ressource IN", "Qté IN", "Ressource OUT", "Qté OUT", "Nombre", "Note"];
  prodSheet.getRange("B2:I2").setValues([inputs]);
  prodSheet.getRange("B2:I2")
    .setBackground("#E3F2FD")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center");

  // Header données (ligne 3)
  prodSheet.getRange("A3:H3").setValues([["Étage", "Machine", "Res IN", "Qté/min IN", "Res OUT", "Qté/min OUT", "Nombre", "Note"]]);
  prodSheet.getRange("A3:H3")
    .setBackground(cfg.THEME.header)
    .setFontColor(cfg.THEME.headerText)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // RESOURCES
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  resSheet.getRange("A1:C1").setValues([["Ressource", "Type", "Note"]]);
  resSheet.getRange("A1:C1")
    .setBackground(cfg.THEME.header)
    .setFontColor(cfg.THEME.headerText)
    .setFontWeight("bold");

  // MACHINES
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);
  machSheet.getRange("A1:E1").setValues([["Machine", "Hauteur", "Largeur", "Longueur", "Note"]]);
  machSheet.getRange("A1:E1")
    .setBackground(cfg.THEME.header)
    .setFontColor(cfg.THEME.headerText)
    .setFontWeight("bold");

  // FLOORS
  var floorSheet = SAT.S.must(cfg.SHEETS.FLOORS);
  floorSheet.getRange("A1:F1").setValues([["Étage", "Ressource", "Machine", "Nombre", "Taux/Machine", "Total"]]);
  floorSheet.getRange("A1:F1")
    .setBackground(cfg.THEME.header)
    .setFontColor(cfg.THEME.headerText)
    .setFontWeight("bold");

  SAT.Log.success("✅ Headers installed (FR)");
}

/**
 * Installer les données de référence (EN FRANÇAIS)
 */
function SAT_installSeedData_v2() {
  var cfg = SAT.CFG;

  // Resources
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  if (resSheet.getLastRow() < cfg.RESOURCES.DATA_ROW) {
    resSheet.getRange(cfg.RESOURCES.DATA_ROW, 1, cfg.SEED.BASE_RESOURCES.length, 3)
      .setValues(cfg.SEED.BASE_RESOURCES);
    Logger.log("  ✓ " + cfg.SEED.BASE_RESOURCES.length + " ressources installées");
  }

  // Machines
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);
  if (machSheet.getLastRow() < cfg.MACHINES.DATA_ROW) {
    machSheet.getRange(cfg.MACHINES.DATA_ROW, 1, cfg.SEED.MACHINES.length, 5)
      .setValues(cfg.SEED.MACHINES);
    Logger.log("  ✓ " + cfg.SEED.MACHINES.length + " machines installées");
  }

  SAT.Log.success("✅ Données de référence installées");
}

/**
 * Configurer les validations (dropdowns) - FRANÇAIS
 */
function SAT_setupValidation_v2() {
  var cfg = SAT.CFG;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Dropdowns pour Production sheet (ligne 2, colonnes du formulaire)
  var prodSheet = SAT.S.must(cfg.SHEETS.PRODUCTION);
  var resSheet = SAT.S.must(cfg.SHEETS.RESOURCES);
  var machSheet = SAT.S.must(cfg.SHEETS.MACHINES);

  // Machine dropdown
  var machList = machSheet.getRange(
    cfg.MACHINES.DATA_ROW, 1,
    machSheet.getLastRow() - cfg.MACHINES.DATA_ROW + 1, 1
  );
  var machRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(machList, true)
    .setAllowInvalid(false)
    .build();
  prodSheet.getRange("C2").setDataValidation(machRule); // Machine colonne

  // Resource dropdowns
  var resList = resSheet.getRange(
    cfg.RESOURCES.DATA_ROW, 1,
    resSheet.getLastRow() - cfg.RESOURCES.DATA_ROW + 1, 1
  );
  var resRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(resList, true)
    .setAllowInvalid(false)
    .build();
  prodSheet.getRange("D2").setDataValidation(resRule); // Ressource IN
  prodSheet.getRange("F2").setDataValidation(resRule); // Ressource OUT

  SAT.Log.success("✅ Validations configurées");
}

/**
 * Configurer le Dashboard (FRANÇAIS)
 */
function SAT_setupDashboard_v2() {
  var cfg = SAT.CFG;
  var dashSheet = SAT.S.must(cfg.SHEETS.DASHBOARD);

  // Titre
  dashSheet.getRange("A1:D1").merge().setValue("📊 TABLEAU DE BORD");
  dashSheet.getRange("A1").setFontSize(18).setFontWeight("bold")
    .setBackground(cfg.THEME.header)
    .setFontColor(cfg.THEME.headerText);

  // Statistiques
  dashSheet.getRange("A3").setValue("📈 Statistiques:");
  dashSheet.getRange("A3").setFontWeight("bold").setFontSize(12);

  dashSheet.getRange("A4").setValue("Lignes production:");
  dashSheet.getRange("B4").setValue("=COUNTA(" + cfg.SHEETS.PRODUCTION + "!A4:A)");
  dashSheet.getRange("B4").setFontWeight("bold").setBackground("#E3F2FD").setFontSize(14);

  dashSheet.getRange("A5").setValue("Ressources:");
  dashSheet.getRange("B5").setValue("=COUNTA(" + cfg.SHEETS.RESOURCES + "!A2:A)");
  dashSheet.getRange("B5").setFontWeight("bold").setBackground("#E3F2FD").setFontSize(14);

  dashSheet.getRange("A6").setValue("Machines:");
  dashSheet.getRange("B6").setValue("=COUNTA(" + cfg.SHEETS.MACHINES + "!A2:A)");
  dashSheet.getRange("B6").setFontWeight("bold").setBackground("#E3F2FD").setFontSize(14);

  dashSheet.getRange("A7").setValue("Étages:");
  dashSheet.getRange("B7").setValue("=COUNTA(" + cfg.SHEETS.FLOORS + "!A2:A)");
  dashSheet.getRange("B7").setFontWeight("bold").setBackground("#E3F2FD").setFontSize(14);

  // Widths
  dashSheet.setColumnWidth(1, 150);
  dashSheet.setColumnWidth(2, 100);

  SAT.Log.success("✅ Tableau de bord créé");
}

/**
 * Configuration finale - FRANÇAIS
 */
function SAT_finalSetup_v2() {
  var cfg = SAT.CFG;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Réordonner les sheets dans l'ordre correct
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

  Logger.log("  ✓ Onglets réorganisés");

  // Gel des en-têtes sur Production
  var prodSheet = SAT.S.must(cfg.SHEETS.PRODUCTION);
  prodSheet.setFrozenRows(3); // Gel titre + formulaire + headers

  SAT.Log.success("✅ Configuration finale complétée");
}

Logger.log("✅ 51_app_install_v2.gs chargé");
