/* 51_app_sheet_order.gs - Organise l'ordre des onglets */
var SAT = this.SAT || (this.SAT = {});

/**
 * S'assure que l'overview est le premier onglet
 * Appeler après SAT_install()
 */
function SAT_reorderSheets() {
  var cfg = SAT.CFG;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log("🔄 Réorganisation des onglets...");
  
  try {
    // Obtenir les feuilles actuelles
    var sheets = ss.getSheets();
    var sheetMap = {};
    sheets.forEach(function(sh) {
      sheetMap[sh.getName()] = sh;
    });
    
    // Ordre FINAL désiré (Tableau de Bord AVANT tout)
    // 1. Tableau de Bord → 2. Ajouter Production → 3. Production → 4-6. Referentiels → 7. Erreurs → 8. Aide
    var finalOrder = [
      cfg.SHEETS.DASHBOARD,       // 1. 📊 Tableau de Bord (VUE PRINCIPALE)
      cfg.SHEETS.FORM_ADD,        // 2. ➕ Ajouter Production
      cfg.SHEETS.PRODUCTION,      // 3. 📈 Production
      cfg.SHEETS.REF_BASE,        // 4. 📋 Ressources
      cfg.SHEETS.REF_MACHINES,    // 5. 🏗️ Machines
      cfg.SHEETS.REF_ETAGES,      // 6. 🏢 Étages
      cfg.SHEETS.ERRORS,          // 7. 🔴 Erreurs
      cfg.SHEETS.HELP             // 8. 📖 Aide
    ];
    
    // Appliquer l'ordre final
    var position = 0;
    finalOrder.forEach(function(sheetName) {
      if (sheetMap[sheetName]) {
        ss.moveSheet(sheetMap[sheetName], position);
        Logger.log("  ✅ " + sheetName + " → position " + (position + 1));
        position++;
      }
    });
    
    Logger.log("✅ Onglets réorganisés: Overview → Tableau de Bord → Production → Referentiels!");
    
  } catch (err) {
    Logger.log("❌ Erreur réorganisation: " + err.message);
  }
}

/**
 * Affiche le premier onglet (overview)
 */
function SAT_showOverviewFirst() {
  var cfg = SAT.CFG;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    var dashboard = ss.getSheetByName(cfg.SHEETS.DASHBOARD);
    if (dashboard) {
      ss.setActiveSheet(dashboard);
      Logger.log("✅ Dashboard activé");
    }
  } catch (err) {
    Logger.log("⚠️ Cannot activate dashboard: " + err.message);
  }
}
