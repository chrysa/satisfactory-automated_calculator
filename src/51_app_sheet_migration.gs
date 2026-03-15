/**
 * 51_app_sheet_migration.gs - Sheet name migration from old names to new names with emojis
 * 
 * Handles migration of old sheet names (without emojis) to new names (with emojis)
 * Renames existing sheets to ensure consistency
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * Migrate old sheet names to new names with emojis
 * Renames sheets if they exist in old format
 */
function SAT_migrateSheetNames() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var sheetMap = {};
    
    sheets.forEach(function(sh) {
      sheetMap[sh.getName()] = sh;
    });
    
    // Map old names to new names
    var migrations = [
      { old: "production", new: "📈 Production" },
      { old: "overview", new: "📊 Overview" },
      { old: "referentiel", new: "📋 Referentiel" },
      { old: "referentiel_machines", new: "🏗️ Machines" },
      { old: "referentiel_etages", new: "🏢 Étages" }
    ];
    
    var migrated = [];
    
    migrations.forEach(function(migration) {
      if (sheetMap[migration.old] && !sheetMap[migration.new]) {
        try {
          sheetMap[migration.old].setName(migration.new);
          SAT.Log.info("✓ Renamed: " + migration.old + " → " + migration.new);
          migrated.push(migration.old);
        } catch (e) {
          SAT.Log.warn("Cannot rename " + migration.old + ": " + e.message);
        }
      }
    });
    
    if (migrated.length > 0) {
      SAT.Log.success("Migrated " + migrated.length + " sheet(s) to new names with emojis");
      return true;
    }
    
    return false;
  } catch (e) {
    SAT.Log.error("Sheet migration error: " + e.message);
    return false;
  }
}

/**
 * Update config references after migration
 */
function SAT_updateConfigAfterMigration() {
  try {
    // Update SHEETS config to match new names
    SAT.CFG.SHEETS = {
      PRODUCTION: "📈 Production",
      OVERVIEW: "📊 Overview",
      REF_BASE: "📋 Referentiel",
      REF_MACHINES: "🏗️ Machines",
      REF_ETAGES: "🏢 Étages"
    };
    
    SAT.Log.success("Config updated with new emoji names");
    return true;
  } catch (e) {
    SAT.Log.error("Config update error: " + e.message);
    return false;
  }
}

/**
 * Complete migration process
 */
function SAT_COMPLETE_SHEET_MIGRATION() {
  SAT.Log.header("MIGRATING SHEET NAMES TO EMOJI VERSIONS", "📝");
  
  try {
    var beforeCount = SpreadsheetApp.getActiveSpreadsheet().getSheets().length;
    
    SAT_migrateSheetNames();
    SAT_updateConfigAfterMigration();
    
    // Reorder sheets after migration
    if (typeof SAT_reorderSheets === 'function') {
      SAT_reorderSheets();
      SAT.Log.success("Sheets reordered after migration");
    }
    
    var afterCount = SpreadsheetApp.getActiveSpreadsheet().getSheets().length;
    SAT.Log.success("Migration complete: " + afterCount + " sheets with proper emoji names");
    
    // Show result
    var sheetNames = [];
    SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function(sh) {
      sheetNames.push(sh.getName());
    });
    
    SAT.Log.pair("Total sheets", sheetNames.length);
    SAT.Log.info("Sheet order: \n  • " + sheetNames.join("\n  • "));
    
  } catch (e) {
    SAT.Log.error("Complete migration error: " + e.message);
  }
}

/**
 * Menu function: Start sheet migration
 */
function SAT_START_SHEET_MIGRATION() {
  try {
    var response = SpreadsheetApp.getUi().alert(
      "🔄 MIGRATION FEUILLES\n\n" +
      "Cette action va:\n" +
      "1. Renommer les onglets sans emoji → avec emoji\n" +
      "2. Réorganiser les onglets\n\n" +
      "Continuer?",
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (response === SpreadsheetApp.getUi().Button.YES) {
      SAT_COMPLETE_SHEET_MIGRATION();
      SpreadsheetApp.getUi().alert(
        "✅ Migration Réussie!\n\n" +
        "Tous les onglets ont été renommés avec emoji et réorganisés.",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
  } catch (e) {
    SAT.UI.alert("❌ Erreur", "Migration échouée: " + e.message, "error");
  }
}
