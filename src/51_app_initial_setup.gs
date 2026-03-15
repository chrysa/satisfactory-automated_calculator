/**
 * 51_app_initial_setup.gs - First-time setup and initialization
 * 
 * Runs once on first load to setup triggers, documentation, and data
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * Check if onEdit trigger is installed
 */
function _hasOnEditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getEventType() === ScriptApp.EventType.ON_EDIT &&
        triggers[i].getHandlerFunction() === 'onEdit') {
      return true;
    }
  }
  return false;
}

/**
 * Install required triggers if missing
 */
function _ensureTriggers() {
  try {
    // Check onEdit trigger
    if (!_hasOnEditTrigger()) {
      SAT.Log.info("Installing onEdit trigger...");
      ScriptApp.newTrigger('onEdit')
        .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
        .onEdit()
        .create();
    }
    
    // Check onOpen trigger (already in menu, but ensure)
    var triggers = ScriptApp.getProjectTriggers();
    var hasOnOpen = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getEventType() === ScriptApp.EventType.ON_OPEN) {
        hasOnOpen = true;
        break;
      }
    }
    
    if (!hasOnOpen) {
      SAT.Log.info("Installing onOpen trigger...");
      ScriptApp.newTrigger('onOpen')
        .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
        .onOpen()
        .create();
    }
    
    return true;
  } catch (e) {
    SAT.Log.error("Trigger installation error: " + e.message);
    return false;
  }
}

/**
 * Initialize everything on first setup
 */
function SAT_INITIALIZE_ALL() {
  SAT.Log.header("INITIALIZING SYSTEM", "⚙️");
  
  // Step 1: Install
  SAT.Log.subheader("Installation", "🧱");
  if (SAT_isFirstTimeSetup()) {
    SAT_install_final();
    SAT.Log.success("System installed");
  } else {
    SAT.Log.bullet("System already installed");
  }
  
  // Step 2: Create documentation
  SAT.Log.subheader("Documentation", "📚");
  try {
    if (typeof SAT.Documentation !== 'undefined') {
      SAT.Documentation.ensureHelpSheet();
      SAT.Documentation.ensureLegendSheet();
      SAT.Documentation.ensureDashboardSheet();
      SAT.Documentation.ensureVisualGuideSheet();
      SAT.Log.success("Documentation created");
    }
  } catch (e) {
    SAT.Log.error("Documentation error: " + e.message);
  }
  
  // Step 3: Auto-detect floors
  SAT.Log.subheader("Floor Detection", "🔍");
  try {
    if (typeof SAT.EtagesAutoDetect !== 'undefined') {
      var result = SAT.EtagesAutoDetect.fullAutoSync();
      SAT.Log.pair("Floors detected", result.floorsAdded);
      SAT.Log.pair("Dependencies", result.dependenciesDetected);
    }
  } catch (e) {
    SAT.Log.error("Floor detection error: " + e.message);
  }
  
  // Step 4: Setup triggers
  SAT.Log.subheader("Triggers", "⏱️");
  try {
    if (_ensureTriggers()) {
      SAT.Log.success("Triggers installed");
    }
  } catch (e) {
    SAT.Log.error("Trigger error: " + e.message);
  }
  
  // Step 5: Create charts
  SAT.Log.subheader("Visualizations", "📊");
  try {
    if (typeof SAT.Charts !== 'undefined') {
      var prodSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      
      if (prodSheet && prodSheet.getLastRow() > 1) {
        SAT.Charts.createAllCharts();
        SAT.Log.success("Charts created");
      } else {
        SAT.Log.info("Add production data first to create charts");
      }
    }
  } catch (e) {
    SAT.Log.error("Charts error: " + e.message);
  }
  
  Logger.log("");
  SAT.Log.success("Initialization Complete!", true);
}

/**
 * Menu shortcut for initialization
 */
function SAT_SETUP_EVERYTHING() {
  SAT.Log.header("FULL SYSTEM SETUP", "🚀");
  
  try {
    // Install base if needed
    if (SAT_isFirstTimeSetup()) {
      SAT_install_final();
    }
    
    // Create documentation
    if (typeof SAT.Documentation !== 'undefined') {
      SAT.Documentation.setupAll();
    }
    
    // Auto-detect
    if (typeof SAT.EtagesAutoDetect !== 'undefined') {
      SAT.EtagesAutoDetect.fullAutoSync();
    }
    
    // Triggers
    _ensureTriggers();
    
    // Charts
    if (typeof SAT.Charts !== 'undefined') {
      SAT.Charts.createAllCharts();
    }
    
    Logger.log("");
    SAT.Log.complete(4);
    
  } catch (e) {
    SAT.Log.error("Setup error: " + e.message);
  }
}

/**
 * Check if documentation sheets exist
 */
function _needsDocumentation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return !ss.getSheetByName("📖 Aide");
}

/**
 * Check if data needs auto-detection
 */
function _needsAutoDetection() {
  try {
    var prodSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
    
    if (!prodSheet || prodSheet.getLastRow() <= 1) {
      return false;  // No production data
    }
    
    // Check if there are unused floors in production
    var data = prodSheet.getDataRange().getValues();
    var usedFloorsInProd = {};
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1]) {
        usedFloorsInProd[String(data[i][1]).trim()] = true;
      }
    }
    
    var registeredFloors = SAT.Etages.getNames();
    
    for (var floor in usedFloorsInProd) {
      if (usedFloorsInProd.hasOwnProperty(floor) && 
          registeredFloors.indexOf(floor) < 0) {
        return true;  // Found unused floor
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}
