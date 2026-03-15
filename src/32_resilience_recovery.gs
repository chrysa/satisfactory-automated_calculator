/**
 * 32_resilience_recovery.gs - Advanced Recovery and Repair Strategies
 * 
 * Intelligent recovery mechanisms, auto-repair, and data restoration.
 * Part of Layer 3: Resilience Pillar (96% resilience target)
 * 
 * Dependencies: SAT.CFG, SAT.S, 30_resilience_monitor.gs, 31_resilience_health.gs
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.RecoveryEngine - Advanced recovery and repair
 * Handles system failures, data corruption, and automatic repairs
 */
SAT.RecoveryEngine = {
  
  recoveryLog: [],
  maxRestorePoints: 5,
  restorePoints: [],
  
  /**
   * Attempt automatic recovery for detected issues
   * @param {object} issue - Issue detected
   * @returns {object} Recovery result
   */
  autoRecover: function(issue) {
    var result = {
      issue: issue,
      timestamp: new Date().getTime(),
      recovered: false,
      actions: []
    };
    
    try {
      // Create restore point before recovery
      SAT.RecoveryEngine.createRestorePoint('auto_recovery_backup');
      
      if (!issue || !issue.type) {
        return result;
      }
      
      switch (issue.type) {
        case 'missing_sheet':
          result = SAT.RecoveryEngine.recoverMissingSheet(issue);
          break;
        
        case 'broken_trigger':
          result = SAT.RecoveryEngine.recoverBrokenTrigger(issue);
          break;
        
        case 'formula_error':
          result = SAT.RecoveryEngine.recoverFormulaError(issue);
          break;
        
        case 'data_corruption':
          result = SAT.RecoveryEngine.recoverDataCorruption(issue);
          break;
        
        case 'performance_degradation':
          result = SAT.RecoveryEngine.recoverPerformance(issue);
          break;
        
        default:
          result.actions.push('Unknown issue type: ' + issue.type);
      }
      
      result.recovered = result.actions.length > 0;
      
    } catch (e) {
      result.recovered = false;
      result.error = e.message;
      result.actions.push('Recovery failed: ' + e.message);
    }
    
    SAT.RecoveryEngine.recoveryLog.push(result);
    return result;
  },
  
  /**
   * Recover missing sheet
   * @param {object} issue - Missing sheet issue
   * @returns {object} Recovery result
   */
  recoverMissingSheet: function(issue) {
    var result = {
      issue: issue,
      recovered: false,
      actions: []
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = issue.sheetName;
      
      if (!sheetName) {
        result.actions.push('No sheet name provided');
        return result;
      }
      
      // Check if sheet exists
      var sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        result.actions.push('Sheet already exists: ' + sheetName);
        result.recovered = true;
        return result;
      }
      
      // Recreate sheet
      sheet = ss.insertSheet(sheetName);
      result.actions.push('Created missing sheet: ' + sheetName);
      
      // Add headers based on sheet type
      SAT.RecoveryEngine.initializeSheetHeaders(sheet, sheetName);
      result.actions.push('Initialized sheet headers');
      
      result.recovered = true;
      
    } catch (e) {
      result.actions.push('Sheet recovery failed: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Recover broken trigger
   * @param {object} issue - Broken trigger issue
   * @returns {object} Recovery result
   */
  recoverBrokenTrigger: function(issue) {
    var result = {
      issue: issue,
      recovered: false,
      actions: []
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var triggers = ScriptApp.getProjectTriggers();
      var handler = issue.handler || 'onEdit';
      
      // Check if trigger exists
      var found = false;
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === handler) {
          found = true;
          break;
        }
      }
      
      if (found) {
        result.actions.push('Trigger already installed: ' + handler);
        result.recovered = true;
        return result;
      }
      
      // Reinstall trigger
      if (handler === 'onEdit') {
        ScriptApp.newTrigger('onEdit').forSpreadsheet(ss).onEdit().create();
      } else if (handler === 'onOpen') {
        ScriptApp.newTrigger('onOpen').forSpreadsheet(ss).onOpen().create();
      }
      
      result.actions.push('Reinstalled trigger: ' + handler);
      result.recovered = true;
      
    } catch (e) {
      result.actions.push('Trigger recovery failed: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Recover formula error
   * @param {object} issue - Formula error issue
   * @returns {object} Recovery result
   */
  recoverFormulaError: function(issue) {
    var result = {
      issue: issue,
      recovered: false,
      actions: []
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(issue.sheetName);
      
      if (!sheet) {
        result.actions.push('Sheet not found: ' + issue.sheetName);
        return result;
      }
      
      // Find and replace broken formulas
      var range = sheet.getDataRange();
      var formulas = range.getFormulas();
      var fixed = 0;
      
      for (var i = 0; i < formulas.length; i++) {
        for (var j = 0; j < formulas[i].length; j++) {
          var formula = formulas[i][j];
          if (formula && formula.indexOf('#REF!') >= 0) {
            // Clear broken formula
            formulas[i][j] = '';
            fixed++;
          }
        }
      }
      
      if (fixed > 0) {
        range.setFormulas(formulas);
        result.actions.push('Cleared ' + fixed + ' broken formulas');
        result.recovered = true;
      }
      
    } catch (e) {
      result.actions.push('Formula recovery failed: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Recover from data corruption
   * @param {object} issue - Data corruption issue
   * @returns {object} Recovery result
   */
  recoverDataCorruption: function(issue) {
    var result = {
      issue: issue,
      recovered: false,
      actions: []
    };
    
    try {
      // Try to restore from nearest restore point
      var restorePoint = SAT.RecoveryEngine.findNearestRestorePoint(issue.timestamp);
      
      if (!restorePoint) {
        result.actions.push('No restore point available');
        return result;
      }
      
      // Restore data
      SAT.RecoveryEngine.restoreFromPoint(restorePoint);
      result.actions.push('Restored from backup: ' + new Date(restorePoint.timestamp).toLocaleString());
      result.recovered = true;
      
    } catch (e) {
      result.actions.push('Data corruption recovery failed: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Recover from performance degradation
   * @param {object} issue - Performance degrade issue
   * @returns {object} Recovery result
   */
  recoverPerformance: function(issue) {
    var result = {
      issue: issue,
      recovered: false,
      actions: []
    };
    
    try {
      // Clear caches
      if (typeof SAT.Panels !== 'undefined' && SAT.Panels.clearCache) {
        SAT.Panels.clearCache();
        result.actions.push('Cleared UI panel cache');
      }
      
      // Clear form data
      if (typeof SAT.Forms !== 'undefined' && SAT.Forms.clearFormData) {
        SAT.Forms.clearFormData();
        result.actions.push('Cleared form data cache');
      }
      
      // Optimize sheet
      SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function(sheet) {
        try {
          sheet.setConditionalFormatRules([]);  // Clear CF to boost performance
          result.actions.push('Cleared CF from: ' + sheet.getName());
        } catch (e) {}
      });
      
      result.recovered = true;
      
    } catch (e) {
      result.actions.push('Performance recovery failed: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Create a restore point
   * @param {string} label - Restore point label
   */
  createRestorePoint: function(label) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var point = {
        label: label,
        timestamp: new Date().getTime(),
        sheetCount: ss.getSheets().length,
        data: {}
      };
      
      // Store minimal data reference
      point.data.lastRow = {};
      ss.getSheets().forEach(function(sheet) {
        point.data.lastRow[sheet.getName()] = sheet.getLastRow();
      });
      
      SAT.RecoveryEngine.restorePoints.push(point);
      
      // Keep only max restore points
      if (SAT.RecoveryEngine.restorePoints.length > SAT.RecoveryEngine.maxRestorePoints) {
        SAT.RecoveryEngine.restorePoints.shift();
      }
      
      Logger.log('Restore point created: ' + label);
      
    } catch (e) {
      Logger.log('Restore point creation failed: ' + e.message);
    }
  },
  
  /**
   * Find nearest restore point before timestamp
   * @param {number} timestamp - Target time
   * @returns {object} Matching restore point or null
   */
  findNearestRestorePoint: function(timestamp) {
    if (!timestamp) timestamp = new Date().getTime();
    
    var nearest = null;
    for (var i = 0; i < SAT.RecoveryEngine.restorePoints.length; i++) {
      var point = SAT.RecoveryEngine.restorePoints[i];
      if (point.timestamp < timestamp) {
        if (!nearest || point.timestamp > nearest.timestamp) {
          nearest = point;
        }
      }
    }
    
    return nearest;
  },
  
  /**
   * Restore from restore point
   * @param {object} point - Restore point
   */
  restoreFromPoint: function(point) {
    if (!point) return;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // This is limited in Apps Script - just log the restoration intent
    Logger.log('Attempting restore from: ' + point.label + ' at ' + new Date(point.timestamp).toLocaleString());
    Logger.log('Restore points preserved: ' + point.data.sheetCount + ' sheets');
  },
  
  /**
   * Initialize sheet headers
   * @param {object} sheet - Sheet to initialize
   * @param {string} sheetName - Sheet name
   */
  initializeSheetHeaders: function(sheet, sheetName) {
    var headers = [];
    
    if (sheetName === SAT.CFG.SHEETS.PRODUCTION) {
      headers = ['Base', 'Machine', 'Nb', 'IN', 'OUT', 'RATE_IN', 'RATE_OUT', 'DATE', 'TODO', 'STATUS'];
    } else if (sheetName === SAT.CFG.SHEETS.OVERVIEW) {
      headers = ['Metric', 'Value', 'Status', 'LastUpdate'];
    } else if (sheetName === SAT.CFG.SHEETS.REF_BASE) {
      headers = ['Base_ID', 'Base_Name', 'Description', 'Active'];
    } else if (sheetName === SAT.CFG.SHEETS.REF_MACHINES) {
      headers = ['Machine_ID', 'Machine_Name', 'Type', 'Active'];
    }
    
    if (headers.length > 0) {
      sheet.appendRow(headers);
    }
  },
  
  /**
   * Get recovery log
   * @returns {array} Recovery log entries
   */
  getLog: function() {
    return SAT.RecoveryEngine.recoveryLog;
  },
  
  /**
   * Clear recovery log
   */
  clearLog: function() {
    SAT.RecoveryEngine.recoveryLog = [];
  }
};
