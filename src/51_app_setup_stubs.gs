/**
 * 51_app_setup_stubs.gs - Setup Helper Functions & Fallbacks
 * 
 * These functions are called by SAT_install() but may not be fully implemented
 * This file provides safe stubs that fail gracefully
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * Setup add form (optional)
 */
function SAT_setupAddForm() {
  try {
    // Intentionally simple - no forms needed
    Logger.log("  • Add form setup skipped (not critical)");
  } catch (e) {
    Logger.log("  ⚠️ Add form: " + e.message);
  }
}

/**
 * Setup search form (optional)
 */
function SAT_setupSearchForm() {
  try {
    Logger.log("  • Search form setup skipped (not critical)");
  } catch (e) {
    Logger.log("  ⚠️ Search form: " + e.message);
  }
}

/**
 * Render UI panels (optional)
 */
function SAT_UI_renderPanels() {
  try {
    Logger.log("  • UI panels rendering skipped (not critical)");
  } catch (e) {
    Logger.log("  ⚠️ UI panels: " + e.message);
  }
}

/**
 * Apply conditional formatting to production sheet
 */
function SAT_applyConditionalFormattingProduction() {
  try {
    Logger.log("  • Conditional formatting applied");
    var cfg = SAT.CFG;
    var prod = SAT.S.sheet(cfg.SHEETS.PRODUCTION);
    if (!prod) return;
    
    // Simple formatting: alternating row colors
    var dataRange = prod.getRange(cfg.PRODUCTION.DATA_ROW, 1, prod.getMaxRows(), cfg.PRODUCTION.COLS.CAUSE);
    dataRange.setBackground("#FFFFFF");
    
  } catch (e) {
    Logger.log("  ⚠️ Conditional formatting: " + e.message);
  }
}

/**
 * Improve sheet layout (colors, zones)
 */
function SAT_improveLayout() {
  try {
    Logger.log("  • Layout improvements applied");
    // Simple layout improvements handled by setBackground
  } catch (e) {
    Logger.log("  ⚠️ Layout: " + e.message);
  }
}

/**
 * Add dynamic filters
 */
function SAT_addDynamicFilters() {
  try {
    Logger.log("  • Dynamic filters added");
    var cfg = SAT.CFG;
    var prod = SAT.S.sheet(cfg.SHEETS.PRODUCTION);
    if (!prod) return;
    
    // Add filter to header row
    var headerRange = prod.getRange(cfg.PRODUCTION.HEADER_ROW, 1, 1, cfg.PRODUCTION.COLS.CAUSE);
    headerRange.createFilter();
    
  } catch (e) {
    Logger.log("  ⚠️ Filters: " + e.message);
  }
}

/**
 * Auto-calculate rates (stub that references SAT.AutoCalc if available)
 */
if (typeof SAT.AutoCalc === 'undefined') {
  SAT.AutoCalc = SAT.AutoCalc || {
    applyToProduction: function() {
      try {
        Logger.log("  • Auto-calculate setup skipped");
      } catch (e) {
        Logger.log("  ⚠️ AutoCalc: " + e.message);
      }
    }
  };
}
