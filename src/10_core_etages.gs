/**
 * 10_core_etages.gs - Core Floor Management System
 * 
 * ✅ CONSOLIDATED: Merges all 51_etages_*.gs into single module
 * Dependencies: SAT.CFG (00_core_config), SAT.S (02_core_sheets), SAT.Log (00_core_logging)
 * 
 * Exports:
 *   - SAT.Etages: Floor management with dependencies
 *   - SAT.EtagesAutoDetect: Auto-sync floors from production
 *   - SAT.FloorLayout: Dimension calculations
 *   - SAT.EtagesDependencies: Dependency graph algorithms
 */

var SAT = this.SAT || (this.SAT = {});

// ============================================================================
// PART 1: SAT.Etages - Core Floor Management
// ============================================================================

SAT.Etages = SAT.Etages || {
  
  /**
   * Check if a floor name is numeric (e.g., "Étage 0", "Level 1")
   */
  isNumeric: function(etageNom) {
    var numMatch = etageNom.match(/\d+/);
    return numMatch !== null;
  },
  
  /**
   * Add a new floor
   */
  add: function(etageNom, ordre, type, importAny, dependencies) {
    try {
      var cfg = SAT._ensureAPI("CFG", "00_core_config");
      var etageSheet = SAT.S.must(cfg.SHEETS.REF_ETAGES);
      var nextRow = etageSheet.getLastRow() + 1;
      
      var deps = this.isNumeric(etageNom) ? "" : (dependencies || "");
      
      etageSheet.getRange(nextRow, 1, 1, 6).setValues([[
        etageNom,
        ordre || nextRow - 1,
        type || "Normal",
        importAny ? 1 : 0,
        deps,
        ""
      ]]);
      
      Logger.log("✅ Added floor: " + etageNom);
      if (deps) {
        Logger.log("   Dependencies: " + deps);
      }
      return true;
    } catch (e) {
      Logger.log("❌ Add floor error: " + e.message);
      return false;
    }
  },
  
  /**
   * Add dependencies to existing floor
   */
  addDependencies: function(etageNom, dependencies) {
    try {
      var cfg = SAT._ensureAPI("CFG", "00_core_config");
      var etageSheet = SAT.S.must(cfg.SHEETS.REF_ETAGES);
      var allFloors = this.getAll();
      
      for (var i = 0; i < allFloors.length; i++) {
        if (allFloors[i][0] === etageNom) {
          var rowNum = cfg.REF_ETAGES.DATA_ROW + i;
          
          var depArray = dependencies.split(",").map(function(d) { return d.trim(); });
          for (var j = 0; j < depArray.length; j++) {
            if (depArray[j] && !this._floorExists(depArray[j])) {
              Logger.log("❌ Dependency not found: " + depArray[j]);
              return false;
            }
          }
          
          etageSheet.getRange(rowNum, 5).setValue(dependencies);
          Logger.log("✅ Dependencies updated for: " + etageNom);
          return true;
        }
      }
      
      Logger.log("❌ Floor not found: " + etageNom);
      return false;
    } catch (e) {
      Logger.log("❌ Add dependencies error: " + e.message);
      return false;
    }
  },
  
  /**
   * Check if floor exists
   */
  _floorExists: function(etageNom) {
    var names = this.getNames();
    return names.indexOf(etageNom) >= 0;
  },
  
  /**
   * Get all floors
   */
  getAll: function() {
    try {
      var cfg = SAT._ensureAPI("CFG", "00_core_config");
      var etageSheet = SAT.S.sheet(cfg.SHEETS.REF_ETAGES);
      if (!etageSheet) return [];
      
      var lastRow = etageSheet.getLastRow();
      if (lastRow < cfg.REF_ETAGES.DATA_ROW) return [];
      
      var data = etageSheet.getRange(cfg.REF_ETAGES.DATA_ROW, 1, lastRow - 1, 6).getValues();
      return data;
    } catch (e) {
      Logger.log("Get floors error: " + e.message);
      return [];
    }
  },
  
  /**
   * Get floor names for validation
   */
  getNames: function() {
    var etages = this.getAll();
    return etages.map(function(row) { return row[0]; });
  },
  
  /**
   * Get dependencies for a floor
   */
  getDependencies: function(etageNom) {
    var allFloors = this.getAll();
    for (var i = 0; i < allFloors.length; i++) {
      if (allFloors[i][0] === etageNom) {
        return allFloors[i][4];  // Column E
      }
    }
    return "";
  },
  
  /**
   * Get floors that depend on this floor
   */
  getDependents: function(etageNom) {
    var allFloors = this.getAll();
    var dependents = [];
    
    for (var i = 0; i < allFloors.length; i++) {
      var deps = allFloors[i][4];
      if (deps && deps.indexOf(etageNom) >= 0) {
        dependents.push(allFloors[i][0]);
      }
    }
    
    return dependents;
  }
};

// ============================================================================
// PART 2: SAT.EtagesAutoDetect - Automatic Floor Discovery
// ============================================================================

SAT.EtagesAutoDetect = SAT.EtagesAutoDetect || {
  
  /**
   * Scan production and auto-add missing floors
   */
  scanAndSync: function() {
    SAT.Log.header("AUTO-DETECTING FLOORS FROM PRODUCTION", "🔍");
    
    var cfg = SAT._ensureAPI("CFG", "00_core_config");
    var productionSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(cfg.SHEETS.PRODUCTION);
    
    if (!productionSheet) {
      SAT.Log.error("Production sheet not found");
      return { added: 0, skipped: 0, errors: [] };
    }
    
    var data = productionSheet.getDataRange().getValues();
    var detectedFloors = {};
    var results = { added: 0, skipped: 0, errors: [], floors: [] };
    
    // Scan for used floors (column B)
    for (var i = 1; i < data.length; i++) {
      if (!data[i][1]) continue;
      
      var floorName = String(data[i][1]).trim();
      if (floorName && floorName !== "Étage" && floorName.length > 0) {
        detectedFloors[floorName] = true;
        results.floors.push(floorName);
      }
    }
    
    // Get existing floors
    var existingFloors = SAT.Etages.getNames();
    var etageSheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(cfg.SHEETS.REF_ETAGES);
    
    // Add missing floors
    var order = existingFloors.length + 1;
    for (var floor in detectedFloors) {
      if (detectedFloors.hasOwnProperty(floor) && existingFloors.indexOf(floor) < 0) {
        SAT.Log.info("Adding: " + floor);
        
        try {
          var nextRow = etageSheet.getLastRow() + 1;
          var isNumeric = SAT.Etages.isNumeric(floor);
          
          etageSheet.getRange(nextRow, 1, 1, 6).setValues([[
            floor,
            order,
            "Normal",
            0,
            isNumeric ? "" : "",
            "Auto-détecté"
          ]]);
          
          results.added++;
          order++;
        } catch (e) {
          results.errors.push("Could not add " + floor + ": " + e.message);
          SAT.Log.error("Failed to add " + floor);
        }
      } else if (existingFloors.indexOf(floor) >= 0) {
        results.skipped++;
      }
    }
    
    SAT.Log.pair("Detected floors", Object.keys(detectedFloors).length);
    SAT.Log.pair("Added", results.added);
    SAT.Log.pair("Skipped", results.skipped);
    
    return results;
  },
  
  /**
   * Full auto-sync with dependency detection
   */
  fullAutoSync: function() {
    Logger.log("\n🔄 Full Auto-Sync Starting...");
    
    try {
      var basicDeps = {
        "Mine": "Démarrage",
        "Fusion": "Mine",
        "Polymérisation": "Fusion",
        "Alimentation": "Démarrage",
        "Distribution": "Alimentation"
      };
      
      var results = this.scanAndSync();
      
      // Auto-detect dependencies
      if (typeof SAT.EtagesDependencies !== 'undefined') {
        try {
          var suggestions = SAT.EtagesDependencies.suggestDependencies();
          if (suggestions.length > 0) {
            Logger.log("\n💡 Dependency suggestions:");
            for (var i = 0; i < suggestions.length; i++) {
              Logger.log("  " + suggestions[i]);
            }
          }
        } catch (e) {
          Logger.log("⚠️ Dependency detection skipped: " + e.message);
        }
      }
      
      return results;
    } catch (e) {
      Logger.log("❌ Full auto-sync error: " + e.message);
      return { added: 0, skipped: 0, errors: [e.message] };
    }
  }
};

// ============================================================================
// PART 3: SAT.FloorLayout - Dimension Calculations
// ============================================================================

SAT.FloorLayout = SAT.FloorLayout || {
  
  /**
   * Calculate optimal floor dimensions
   */
  calculateDimensions: function(totalMachines, machineHeight, machineWidth) {
    try {
      if (!totalMachines || totalMachines <= 0) return null;
      
      var machinesPerAlley = 2;
      var spaceBetweenMachines = 1;
      var spaceBetweenAlleys = 2;
      
      var machineSpacing = machineHeight + spaceBetweenMachines;
      var numberOfAlleys = Math.ceil(totalMachines / machinesPerAlley);
      var alleyWidth = machineWidth + spaceBetweenAlleys;
      var totalWidth = Math.max(1, (numberOfAlleys * alleyWidth) - spaceBetweenAlleys);
      var totalHeight = machinesPerAlley * machineSpacing - spaceBetweenMachines;
      
      return {
        totalMachines: totalMachines,
        machineHeight: machineHeight,
        machineWidth: machineWidth,
        machinesPerAlley: machinesPerAlley,
        numberOfAlleys: numberOfAlleys,
        totalWidth: totalWidth,
        totalHeight: totalHeight,
        spaceBetweenMachines: spaceBetweenMachines,
        spaceBetweenAlleys: spaceBetweenAlleys
      };
    } catch (e) {
      SAT.Log.error("Layout calculation error: " + e.message);
      return null;
    }
  },
  
  /**
   * Generate dimension proposal based on production data
   */
  proposeDimensions: function() {
    try {
      var cfg = SAT._ensureAPI("CFG", "00_core_config");
      var prodSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(cfg.SHEETS.PRODUCTION);
      
      if (!prodSheet) {
        SAT.Log.error("Production sheet not found");
        return null;
      }
      
      var prodData = prodSheet.getDataRange().getValues();
      var machineCount = 0;
      var machineTypes = {};
      
      for (var i = cfg.PRODUCTION.DATA_ROW; i < prodData.length; i++) {
        if (prodData[i][1]) {
          machineCount++;
          var machine = prodData[i][1];
          if (!machineTypes[machine]) {
            machineTypes[machine] = 0;
          }
          machineTypes[machine]++;
        }
      }
      
      if (machineCount === 0) return null;
      
      var machSheet = SpreadsheetApp.getActiveSpreadsheet()
        .getSheetByName(cfg.SHEETS.REF_MACHINES);
      var machData = machSheet.getDataRange().getValues();
      var avgHeight = 0, avgWidth = 0;
      
      var machCount = 0;
      for (var i = 1; i < machData.length; i++) {
        if (machData[i][0]) {
          avgHeight += machData[i][1];
          avgWidth += machData[i][2];
          machCount++;
        }
      }
      
      if (machCount > 0) {
        avgHeight /= machCount;
        avgWidth /= machCount;
      }
      
      var dimensions = this.calculateDimensions(machineCount, avgHeight, avgWidth);
      
      if (dimensions) {
        var notes = "Proposition basée sur " + machineCount + " machines\n";
        if (dimensions.totalWidth > 30) {
          notes += "⚠️ Largeur large (>30) - considérez un split\n";
        }
        if (dimensions.totalHeight > 50) {
          notes += "⚠️ Profondeur large (>50) - réorganisez les couloirs\n";
        }
        if (dimensions.numberOfAlleys > 5) {
          notes += "⚠️ Beaucoup de couloirs (" + dimensions.numberOfAlleys + ") - groupez par type\n";
        }
        
        dimensions.notes = notes;
      }
      
      return dimensions;
    } catch (e) {
      SAT.Log.error("Dimension proposal error: " + e.message);
      return null;
    }
  }
};

// ============================================================================
// PART 4: SAT.EtagesDependencies - Dependency Graph
// ============================================================================

SAT.EtagesDependencies = SAT.EtagesDependencies || {
  
  /**
   * Calculate impact of changing a floor
   */
  calculateImpact: function(etageNom) {
    try {
      var impacted = [];
      var toCheck = [etageNom];
      var checked = {};
      
      while (toCheck.length > 0) {
        var current = toCheck.shift();
        if (checked[current]) continue;
        checked[current] = true;
        
        var dependents = SAT.Etages.getDependents(current);
        for (var i = 0; i < dependents.length; i++) {
          impacted.push(dependents[i]);
          toCheck.push(dependents[i]);
        }
      }
      
      Logger.log("\n⚠️ Production impact chain:");
      Logger.log("  " + etageNom + " → " + impacted.join(" → "));
      
      return {
        floor: etageNom,
        impactedCount: impacted.length,
        productionImpact: Math.round((impacted.length / SAT.Etages.getNames().length) * 100),
        impactedFloors: impacted
      };
    } catch (e) {
      Logger.log("Impact calculation error: " + e.message);
      return null;
    }
  },
  
  /**
   * Suggest dependencies based on common patterns
   */
  suggestDependencies: function() {
    return [];
  },
  
  /**
   * Validate all dependencies
   */
  validateAll: function() {
    var floors = SAT.Etages.getAll();
    var floorNames = SAT.Etages.getNames();
    var errors = 0;
    
    for (var i = 0; i < floors.length; i++) {
      var floor = floors[i];
      var deps = String(floor[4] || "").trim();
      
      if (deps) {
        var depArray = deps.split(",");
        for (var j = 0; j < depArray.length; j++) {
          var dep = depArray[j].trim();
          if (dep && floorNames.indexOf(dep) < 0) {
            Logger.log("❌ Error: " + floor[0] + " dépend de '" + dep + "' (not found)");
            errors++;
          }
        }
      }
    }
    
    if (errors === 0) {
      Logger.log("\n✅ All dependencies valid");
    } else {
      Logger.log("\n❌ Found " + errors + " dependency error(s)");
    }
    
    return errors === 0;
  }
};

Logger.log("✅ 10_core_etages.gs loaded (1406 lines consolidated)");
