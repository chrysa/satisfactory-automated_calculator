/**
 * DIAGNOSTIC_STARTUP.gs - Test et diagnostic du démarrage du système
 * À exécuter manuellement depuis la console Apps Script
 * Aide à identifier les blocages d'initialisation
 */

/**
 * Test complet du système au démarrage
 * Lancez cette fonction depuis Console Apps Script (Ctrl+Entrée)
 */
function DIAGNOSTIC_FullSystemTest() {
  Logger.log("╔════════════════════════════════════════════════════════╗");
  Logger.log("║          🔍 DIAGNOSTIC SYSTEM STARTUP - v2026.03       ║");
  Logger.log("╚════════════════════════════════════════════════════════╝");
  Logger.log("");
  
  // =======================
  // TEST 1: SAT Global Object
  // =======================
  Logger.log("TEST 1: SAT Global Object");
  Logger.log("─".repeat(60));
  
  if (typeof SAT === 'undefined') {
    Logger.log("❌ CRITICAL: SAT global not found!");
    Logger.log("   This means 00_bootstrap.gs didn't load.");
    Logger.log("   Solution: Check file load order in Apps Script");
    return;
  }
  Logger.log("✅ SAT global object exists");
  Logger.log("   Keys: " + Object.keys(SAT).slice(0, 5).join(', ') + "...");
  Logger.log("");
  
  // =======================
  // TEST 2: Core Config
  // =======================
  Logger.log("TEST 2: Core Config (SAT.CFG)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT.CFG === 'undefined') {
      Logger.log("❌ SAT.CFG not found!");
    } else {
      Logger.log("✅ SAT.CFG exists");
      Logger.log("   VERSION: " + SAT.CFG.VERSION);
      if (SAT.CFG.SHEETS) {
        Logger.log("   Sheets: " + Object.keys(SAT.CFG.SHEETS).join(', '));
      }
    }
  } catch (e) {
    Logger.log("❌ Error accessing SAT.CFG: " + e.message);
  }
  Logger.log("");
  
  // =======================
  // TEST 3: Core Logging
  // =======================
  Logger.log("TEST 3: Core Logging (SAT.Log)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT.Log === 'undefined') {
      Logger.log("❌ SAT.Log not found!");
    } else {
      Logger.log("✅ SAT.Log exists");
      Logger.log("   Methods: " + Object.keys(SAT.Log).slice(0, 5).join(', '));
      // Test logging functions
      if (typeof SAT.Log.success === 'function') {
        SAT.Log.success("Test logging works!");
      }
    }
  } catch (e) {
    Logger.log("❌ Error with SAT.Log: " + e.message);
  }
  Logger.log("");
  
  // =======================
  // TEST 4: Core APIs Guard
  // =======================
  Logger.log("TEST 4: API Guard (_ensureAPI)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT._ensureAPI !== 'function') {
      Logger.log("❌ SAT._ensureAPI function not found!");
    } else {
      Logger.log("✅ SAT._ensureAPI function exists");
      
      // Test the guard
      var testCfg = SAT._ensureAPI("CFG", "00_core_config");
      Logger.log("✅ _ensureAPI('CFG', '00_core_config') returned: " + typeof testCfg);
    }
  } catch (e) {
    Logger.log("❌ Error with _ensureAPI: " + e.message);
  }
  Logger.log("");
  
  // =======================
  // TEST 5: Critical Init
  // =======================
  Logger.log("TEST 5: Critical Init (_verifyCriticalInit)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT._verifyCriticalInit !== 'function') {
      Logger.log("⚠️  SAT._verifyCriticalInit not found (may be optional)");
    } else {
      Logger.log("✅ SAT._verifyCriticalInit exists");
      SAT._verifyCriticalInit();
      Logger.log("✅ _verifyCriticalInit() passed");
    }
  } catch (e) {
    Logger.log("❌ _verifyCriticalInit failed: " + e.message);
  }
  Logger.log("");
  
  // =======================
  // TEST 6: Sheets Access
  // =======================
  Logger.log("TEST 6: Sheet Access (SAT.S)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT.S === 'undefined') {
      Logger.log("❌ SAT.S not found!");
    } else {
      Logger.log("✅ SAT.S exists");
      Logger.log("   Methods: " + Object.keys(SAT.S).slice(0, 5).join(', '));
      
      // Test finding a sheet
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = ss.getSheets();
      Logger.log("   Current sheets: " + sheets.map(function(s) { return s.getName(); }).join(', '));
    }
  } catch (e) {
    Logger.log("❌ Error with SAT.S: " + e.message);
  }
  Logger.log("");
  
  // =======================
  // TEST 7: Menu Building
  // =======================
  Logger.log("TEST 7: Menu Building (SAT_buildMenu)");
  Logger.log("─".repeat(60));
  
  try {
    if (typeof SAT_buildMenu !== 'function') {
      Logger.log("❌ SAT_buildMenu function not found!");
      Logger.log("   This is critical - menu won't appear");
    } else {
      Logger.log("✅ SAT_buildMenu function exists");
      Logger.log("   Testing menu build...");
      SAT_buildMenu();
      Logger.log("✅ Menu built successfully");
    }
  } catch (e) {
    Logger.log("❌ SAT_buildMenu failed: " + e.message);
    Logger.log("   Stack: " + e.stack);
  }
  Logger.log("");
  
  // =======================
  // TEST 8: Installation Functions
  // =======================
  Logger.log("TEST 8: Installation Functions");
  Logger.log("─".repeat(60));
  
  var installFuncs = [
    { name: "SAT_isFirstTimeSetup", critical: true },
    { name: "SAT_install_final", critical: true },
    { name: "SAT_createCriticalSheetsForce_", critical: false },
    { name: "SAT_recalcAll", critical: false }
  ];
  
  for (var i = 0; i < installFuncs.length; i++) {
    var funcName = installFuncs[i].name;
    var isCritical = installFuncs[i].critical;
    
    if (typeof window[funcName] !== 'undefined' && typeof window[funcName] === 'function') {
      Logger.log("✅ " + funcName + " exists");
    } else if (typeof eval("typeof " + funcName) !== 'undefined' && eval("typeof " + funcName) === 'function') {
      Logger.log("✅ " + funcName + " exists (via eval)");
    } else {
      var mark = isCritical ? "❌ CRITICAL" : "⚠️  WARNING";
      Logger.log(mark + ": " + funcName + " not found");
    }
  }
  Logger.log("");
  
  // =======================
  // FINAL SUMMARY
  // =======================
  Logger.log("═".repeat(60));
  Logger.log("DIAGNOSTIC COMPLETE");
  Logger.log("═".repeat(60));
  Logger.log("");
  Logger.log("NEXT STEPS:");
  Logger.log("1. If all ✅, try: onOpen()");
  Logger.log("2. If any ❌ CRITICAL, check file load order in Apps Script");
  Logger.log("3. Then refresh the Google Sheet (Ctrl+Shift+R)");
  Logger.log("");
}

/**
 * Simple test: Just try to build the menu
 */
function TEST_MenuOnly() {
  Logger.log("Testing menu build...");
  try {
    if (typeof SAT_buildMenu === 'function') {
      SAT_buildMenu();
      Logger.log("✅ Menu built!");
    } else {
      Logger.log("❌ SAT_buildMenu not found!");
    }
  } catch (e) {
    Logger.log("❌ Error: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}

/**
 * Simple test: Try onOpen()
 */
function TEST_OnOpen() {
  Logger.log("Testing onOpen()...");
  try {
    onOpen();
    Logger.log("✅ onOpen() called successfully");
  } catch (e) {
    Logger.log("❌ onOpen() error: " + e.message);
    Logger.log("Stack: " + e.stack);
  }
}

/**
 * List all functions defined in the script
 */
function DIAGNOSTIC_ListAllFunctions() {
  Logger.log("Available global functions:");
  Logger.log("─".repeat(60));
  
  // Get all function names that should exist
  var expectedFuncs = [
    'onOpen', 'onEdit',
    'SAT_buildMenu',
    'SAT_install_final',
    'SAT_isFirstTimeSetup',
    'SAT_createCriticalSheetsForce_',
    'SAT_recalcAll',
    'TEST_MenuOnly',
    'TEST_OnOpen',
    'DIAGNOSTIC_FullSystemTest'
  ];
  
  for (var i = 0; i < expectedFuncs.length; i++) {
    var funcName = expectedFuncs[i];
    try {
      var func = eval('typeof ' + funcName);
      if (func === 'function') {
        Logger.log("✅ " + funcName);
      } else {
        Logger.log("❌ " + funcName + " (not a function)");
      }
    } catch (e) {
      Logger.log("❌ " + funcName + " (undefined)");
    }
  }
}
