/**
 * 00_bootstrap.gs - Garantit l'ordre d'initialisation du système
 * 
 * ⚠️ CRITICAL: Ce fichier charge EN PREMIER et organise l'initialisation.
 * Tous les fichiers doivent suivre un pattern:
 *   var SAT = this.SAT || (this.SAT = {});
 *   SAT.API_NAME = SAT.API_NAME || { ... };
 * 
 * Ordre d'initialisation garanti:
 *   1. 00_bootstrap.gs          ← Vous êtes ici
 *   2. 00_core_config.gs        ← SAT.CFG global
 *   3. 00_core_logging.gs       ← SAT.Log (logging centralisé)
 *   4. 01_core_*.gs             ← SAT.* outils
 *   5. 02_core_sheets.gs        ← SAT.S (accès sheets)
 *   6. 10_core_etages.gs        ← SAT.Etages (floor management)
 *   7-43. Feature layers         ← Tous dépendent de core
 *   50-53. App layer            ← Tout ce qui reste
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * Initialization registry - ensures dependencies load first
 */
SAT._INIT_ORDER = SAT._INIT_ORDER || {
  // Core (0-2)
  CORE_CONFIG: "00_core_config.gs",        // Must be first after bootstrap
  CORE_LOGGING: "00_core_logging.gs",      // Must be before any Log usage
  
  // Core Utilities (01)
  CORE_HELPERS: "01_core_helpers.gs",
  CORE_RESILIENCE: "01_core_resilience.gs",
  CORE_UTILS: "01_core_utils.gs",
  
  // Core Sheets API (02)
  CORE_SHEETS: "02_core_sheets.gs",        // Must be after CONFIG
  
  // Context & Data (04, 10)
  CONTEXT_TRACKING: "04_context_tracking.gs",
  CORE_ETAGES: "10_core_etages.gs",        // Must be after CORE_SHEETS
  DATA_REPO: "10_data_repo.gs",
  
  // Features (11-42)
  FEATURES_START: "11_automation_executor.gs"
};

/**
 * API Guard Wrapper
 * Prevents accessing undefined APIs before they initialize
 * 
 * Usage: SAT._ensureAPI("CFG", "00_core_config.gs")
 */
SAT._ensureAPI = SAT._ensureAPI || function(apiName, file) {
  if (typeof SAT[apiName] === 'undefined') {
    var msg = "❌ SAT." + apiName + " not initialized (missing " + file + ")";
    Logger.log(msg);
    throw new Error(msg);
  }
  return SAT[apiName];
};

/**
 * Deferred Initialization Pattern
 * Use this for functions that need to run AFTER all files load
 */
SAT._deferred = SAT._deferred || [];
SAT._registerDeferred = SAT._registerDeferred || function(name, fn) {
  SAT._deferred.push({ name: name, fn: fn });
};

/**
 * Execute all deferred initializations
 * Called from onOpen() after all scripts load
 */
SAT._executeDeferredInit = SAT._executeDeferredInit || function() {
  if (!SAT._deferred || SAT._deferred.length === 0) return;
  
  Logger.log("🔄 Executing " + SAT._deferred.length + " deferred initializations...");
  
  for (var i = 0; i < SAT._deferred.length; i++) {
    try {
      var task = SAT._deferred[i];
      Logger.log("  ✓ " + task.name);
      task.fn();
    } catch (e) {
      Logger.log("  ⚠️ " + task.name + " failed: " + e.message);
    }
  }
};

/**
 * Critical APIs Check
 * Verifies all mandatory core APIs are loaded
 */
SAT._verifyCriticalInit = SAT._verifyCriticalInit || function() {
  var required = ["CFG", "Log", "S"];
  var missing = [];
  
  for (var i = 0; i < required.length; i++) {
    if (typeof SAT[required[i]] === 'undefined') {
      missing.push(required[i]);
    }
  }
  
  if (missing.length > 0) {
    var msg = "❌ Missing critical APIs: " + missing.join(", ");
    Logger.log(msg);
    throw new Error(msg);
  }
  
  return true;
};

/**
 * Log bootstrap startup
 */
Logger.log("🚀 S.A.T Bootstrap system loaded (43 files will follow)");
