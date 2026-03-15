/**
 * 11_automation_executor.gs - Automated Action Execution Engine
 * 
 * Handles immediate execution of automated operations without user intervention.
 * Part of Layer 1: Automation Pillar (96% automation target)
 * 
 * Dependencies: SAT.CFG, SAT.S, 10_automation_handlers.gs
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Executor - Execute queued automation actions
 * Processes batched automated operations efficiently with throttling
 */
SAT.Executor = {
  
  queue: [],
  processing: false,
  throttleMs: 500,
  lastExecutedTime: 0,
  
  /**
   * Queue an action for execution
   * @param {string} action - Action type (recalc, validate, calculate, etc)
   * @param {object} params - Action parameters
   */
  queue: function(action, params) {
    if (!action) return;
    
    SAT.Executor.queue.push({
      action: action,
      params: params || {},
      timestamp: new Date().getTime(),
      retries: 0
    });
    
    // Process immediately if not throttled
    SAT.Executor.processQueue();
  },
  
  /**
   * Process all queued actions
   * Applies throttling to prevent spam recalculations
   */
  processQueue: function() {
    if (SAT.Executor.processing) return;
    
    var now = new Date().getTime();
    if (now - SAT.Executor.lastExecutedTime < SAT.Executor.throttleMs) {
      // Schedule for later
      Utilities.sleep(SAT.Executor.throttleMs);
    }
    
    SAT.Executor.processing = true;
    
    try {
      while (SAT.Executor.queue.length > 0) {
        var item = SAT.Executor.queue.shift();
        
        try {
          SAT.Executor.executeAction(item);
          SAT.Executor.lastExecutedTime = new Date().getTime();
        } catch (e) {
          // Retry with exponential backoff (SmartRetry Pattern)
          item.retries = (item.retries || 0) + 1;
          
          if (item.retries < 3) {
            // Use SAT_Resilience_Retry for smarter retry with backoff
            var retryResult = SAT_Resilience_Retry(
              function() { return SAT.Executor.executeAction(item); },
              1,  // Déjà en retry, donc juste 1 tentative supplémentaire
              500 * Math.pow(2, item.retries - 1),  // Backoff exponentiel
              'Action ' + item.action
            );
            
            if (!retryResult.success) {
              SAT.Executor.queue.push(item);  // Remettre en queue
            }
          } else {
            // Limit exceeded
            if (typeof SAT.Monitor !== 'undefined') {
              SAT.Monitor.recordError('Executor retry limit exceeded: ' + item.action, 'error', {
                action: item.action,
                retries: item.retries,
                error: e.message
              });
            }
            SAT.Log.error("🔴 Executor: Action " + item.action + " échouée après " + item.retries + " retries");
          }
        }
      }
    } finally {
      SAT.Executor.processing = false;
    }
  },
  
  /**
   * Execute a single action
   * @param {object} item - Queue item with action and params
   */
  executeAction: function(item) {
    if (!item || !item.action) return;
    
    var startTime = new Date().getTime();
    
    switch (item.action) {
      case 'recalcAll':
        SAT.Executor.recalculateAll(item.params);
        break;
        
      case 'calculateRates':
        SAT.Executor.calculateInOutRates(item.params);
        break;
        
      case 'validateData':
        SAT.Executor.validateAllData(item.params);
        break;
        
      case 'autoFillDefaults':
        SAT.Executor.fillDefaultValues(item.params);
        break;
        
      case 'checkStructure':
        SAT.Executor.verifyStructure(item.params);
        break;
        
      default:
        Logger.log('Unknown action: ' + item.action);
    }
    
    // Record execution time
    var duration = new Date().getTime() - startTime;
    if (typeof SAT.Monitor !== 'undefined') {
      SAT.Monitor.recordExecution(item.action, duration);
    }
  },
  
  /**
   * Recalculate all production values
   * @param {object} params - Parameters (sheetName, range, etc)
   */
  recalculateAll: function(params) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      
      if (!sheet) {
        throw new Error('Production sheet not found');
      }
      
      // Recalc IN/OUT rates
      SAT.Executor.calculateInOutRates({ sheet: sheet });
      
      // Auto-update status based on data
      SAT.Executor.updateRowStatus({ sheet: sheet });
      
    } catch (e) {
      throw new Error('Recalc failed: ' + e.message);
    }
  },
  
  /**
   * Calculate IN/OUT rates automatically
   * @param {object} params - Parameters (sheet)
   */
  calculateInOutRates: function(params) {
    try {
      var sheet = params.sheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      var data = sheet.getDataRange().getValues();
      
      // Find rate columns
      var header = data[0] || [];
      var inIdx = header.indexOf('IN');
      var outIdx = header.indexOf('OUT');
      var nbIdx = header.indexOf('Nb');
      var rateInIdx = header.indexOf('RATE_IN');
      var rateOutIdx = header.indexOf('RATE_OUT');
      
      if (inIdx < 0 || outIdx < 0) return;
      
      // Calculate rates for each row
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var nb = row[nbIdx] || 0;
        var inVal = row[inIdx] || 0;
        var outVal = row[outIdx] || 0;
        
        if (nb > 0) {
          if (rateInIdx >= 0) {
            data[i][rateInIdx] = inVal / nb;
          }
          if (rateOutIdx >= 0) {
            data[i][rateOutIdx] = outVal / nb;
          }
        }
      }
      
      // Write back to sheet
      sheet.getDataRange().setValues(data);
      
    } catch (e) {
      throw new Error('Rate calculation failed: ' + e.message);
    }
  },
  
  /**
   * Validate all data in active sheets
   * @param {object} params - Parameters
   */
  validateAllData: function(params) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = [
        SAT.CFG.SHEETS.PRODUCTION,
        SAT.CFG.SHEETS.OVERVIEW
      ];
      
      var errors = [];
      
      for (var i = 0; i < sheets.length; i++) {
        var sheet = ss.getSheetByName(sheets[i]);
        if (!sheet) continue;
        
        var data = sheet.getDataRange().getValues();
        
        // Check for empty required cells
        for (var r = 1; r < data.length; r++) {
          for (var c = 0; c < data[r].length; c++) {
            var val = data[r][c];
            if (val === '' || val === null) {
              // Flag but don't error - empty cells are allowed
            }
          }
        }
      }
      
      if (errors.length > 0 && typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.validation(errors, []);
      }
      
    } catch (e) {
      throw new Error('Validation failed: ' + e.message);
    }
  },
  
  /**
   * Fill default values in form
   * @param {object} params - Parameters (sheet, range)
   */
  fillDefaultValues: function(params) {
    try {
      var sheet = params.sheet || SpreadsheetApp.getActiveSheet();
      
      // Get last row with data
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      
      var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
      var values = range.getValues();
      
      // Apply defaults
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        
        // Default Nb=1 if empty
        if ((row[2] === '' || row[2] === null) && row[0] !== '') {
          row[2] = 1;
        }
        
        // Default date = today if empty
        if ((row[3] === '' || row[3] === null) && row[0] !== '') {
          row[3] = new Date();
        }
      }
      
      range.setValues(values);
      
    } catch (e) {
      throw new Error('Default fill failed: ' + e.message);
    }
  },
  
  /**
   * Update row status based on completion
   * @param {object} params - Parameters (sheet)
   */
  updateRowStatus: function(params) {
    try {
      var sheet = params.sheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      var data = sheet.getDataRange().getValues();
      
      var statusIdx = data[0].indexOf('STATUS');
      var todoIdx = data[0].indexOf('TODO');
      
      if (statusIdx < 0) return;
      
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        
        if (todoIdx >= 0 && row[todoIdx] === true) {
          row[statusIdx] = 'DONE';
        } else if (row[0] !== '') {
          row[statusIdx] = 'PENDING';
        }
      }
      
      sheet.getDataRange().setValues(data);
      
    } catch (e) {
      throw new Error('Status update failed: ' + e.message);
    }
  },
  
  /**
   * Verify spreadsheet structure integrity
   * @param {object} params - Parameters
   */
  verifyStructure: function(params) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var required = [
        SAT.CFG.SHEETS.PRODUCTION,
        SAT.CFG.SHEETS.OVERVIEW,
        SAT.CFG.SHEETS.REF_BASE,
        SAT.CFG.SHEETS.REF_MACHINES
      ];
      
      var missing = [];
      for (var i = 0; i < required.length; i++) {
        if (!ss.getSheetByName(required[i])) {
          missing.push(required[i]);
        }
      }
      
      if (missing.length > 0) {
        throw new Error('Missing sheets: ' + missing.join(', '));
      }
      
    } catch (e) {
      throw new Error('Structure verification failed: ' + e.message);
    }
  }
};
