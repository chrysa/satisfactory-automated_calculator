/**
 * 31_resilience_health.gs - Detailed Health Diagnostics and Monitoring
 * 
 * Deep health checks, anomaly detection, and performance analysis.
 * Part of Layer 3: Resilience Pillar (96% resilience target)
 * 
 * Dependencies: SAT.CFG, SAT.S, 30_resilience_monitor.gs
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.HealthDiagnostics - Advanced health checking and diagnostics
 * Performs detailed analysis beyond quick health checks
 */
SAT.HealthDiagnostics = {
  
  diagnosticHistory: [],
  thresholds: {
    SLOW_RECALC: 5000,      // ms
    HIGH_ERROR_RATE: 0.1,   // 10%
    LOW_MEMORY: 100000000,  // bytes
    MAX_ERRORS: 10
  },
  
  /**
   * Run full diagnostic suite
   * @returns {object} Diagnostic report
   */
  fullDiagnostic: function() {
    var report = {
      timestamp: new Date().getTime(),
      results: {},
      score: 0,
      status: 'GOOD'
    };
    
    try {
      // Check structure
      report.results.structure = SAT.HealthDiagnostics.checkStructure();
      
      // Check data integrity
      report.results.dataIntegrity = SAT.HealthDiagnostics.checkDataIntegrity();
      
      // Check triggers
      report.results.triggers = SAT.HealthDiagnostics.checkTriggers();
      
      // Check performance
      report.results.performance = SAT.HealthDiagnostics.checkPerformance();
      
      // Check formulas
      report.results.formulas = SAT.HealthDiagnostics.checkFormulas();
      
      // Calculate score
      report.score = SAT.HealthDiagnostics.calculateScore(report.results);
      
      // Determine status
      if (report.score >= 90) report.status = 'EXCELLENT';
      else if (report.score >= 75) report.status = 'GOOD';
      else if (report.score >= 50) report.status = 'WARNING';
      else report.status = 'CRITICAL';
      
      // Store in history
      SAT.HealthDiagnostics.diagnosticHistory.push(report);
      
    } catch (e) {
      report.status = 'ERROR';
      report.error = e.message;
    }
    
    return report;
  },
  
  /**
   * Check spreadsheet structure integrity
   * @returns {object} Structure check result
   */
  checkStructure: function() {
    var result = {
      passed: true,
      issues: [],
      details: {}
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var cfg = SAT.CFG;
      
      if (!cfg) {
        result.passed = false;
        result.issues.push('Config not loaded');
        return result;
      }
      
      var required = [
        cfg.SHEETS.PRODUCTION,
        cfg.SHEETS.OVERVIEW,
        cfg.SHEETS.REF_BASE,
        cfg.SHEETS.REF_MACHINES
      ];
      
      var missing = [];
      for (var i = 0; i < required.length; i++) {
        var sheet = ss.getSheetByName(required[i]);
        if (!sheet) {
          missing.push(required[i]);
        }
      }
      
      if (missing.length > 0) {
        result.passed = false;
        result.issues.push('Missing sheets: ' + missing.join(', '));
      }
      
      result.details.sheetCount = ss.getSheets().length;
      result.details.missingSheets = missing;
      
    } catch (e) {
      result.passed = false;
      result.issues.push('Structure check error: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Check data integrity across sheets
   * @returns {object} Data integrity check result
   */
  checkDataIntegrity: function() {
    var result = {
      passed: true,
      issues: [],
      details: {}
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var prodSheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      
      if (!prodSheet) {
        result.passed = false;
        result.issues.push('Production sheet not found');
        return result;
      }
      
      var data = prodSheet.getDataRange().getValues();
      var emptyRows = 0;
      var nullValues = 0;
      
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var isEmpty = true;
        var hasNulls = 0;
        
        for (var j = 0; j < row.length; j++) {
          if (row[j] === '' || row[j] === null) {
            hasNulls++;
          } else {
            isEmpty = false;
          }
        }
        
        if (isEmpty) emptyRows++;
        nullValues += hasNulls;
      }
      
      result.details.totalRows = data.length - 1;
      result.details.emptyRows = emptyRows;
      result.details.nullValuesCount = nullValues;
      
      // Flag if too many empty/null values
      if (emptyRows > data.length * 0.2) {
        result.issues.push('More than 20% empty rows');
      }
      
    } catch (e) {
      result.passed = false;
      result.issues.push('Data integrity error: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Check installed triggers
   * @returns {object} Trigger check result
   */
  checkTriggers: function() {
    var result = {
      passed: true,
      issues: [],
      details: {}
    };
    
    try {
      var triggers = ScriptApp.getProjectTriggers();
      var handlers = triggers.map(function(t) { return t.getHandlerFunction(); });
      
      var requiredHandlers = ['onOpen', 'onEdit'];
      var missing = [];
      
      for (var i = 0; i < requiredHandlers.length; i++) {
        if (handlers.indexOf(requiredHandlers[i]) < 0) {
          missing.push(requiredHandlers[i]);
        }
      }
      
      if (missing.length > 0) {
        result.passed = false;
        result.issues.push('Missing triggers: ' + missing.join(', '));
      }
      
      result.details.installedTriggers = handlers;
      result.details.triggerCount = triggers.length;
      
    } catch (e) {
      result.passed = false;
      result.issues.push('Trigger check error: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Check performance metrics
   * @returns {object} Performance check result
   */
  checkPerformance: function() {
    var result = {
      passed: true,
      issues: [],
      details: {}
    };
    
    try {
      if (typeof SAT.Monitor !== 'undefined' && SAT.Monitor.stats) {
        var stats = SAT.Monitor.stats;
        
        result.details.avgRecalcTime = stats.avgRecalcTime || 0;
        result.details.maxRecalcTime = stats.maxRecalcTime || 0;
        result.details.totalRecalcs = stats.totalRecalcs || 0;
        result.details.errorCount = stats.errorCount || 0;
        
        // Check for slow recalculations
        if (stats.avgRecalcTime > SAT.HealthDiagnostics.thresholds.SLOW_RECALC) {
          result.issues.push('Average recalc time exceeds threshold: ' + stats.avgRecalcTime + 'ms');
        }
        
        // Check error rate
        if (stats.totalRecalcs > 0) {
          var errorRate = stats.errorCount / stats.totalRecalcs;
          if (errorRate > SAT.HealthDiagnostics.thresholds.HIGH_ERROR_RATE) {
            result.issues.push('High error rate: ' + (errorRate * 100).toFixed(1) + '%');
          }
        }
      }
      
    } catch (e) {
      result.issues.push('Performance check error: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Check formula integrity
   * @returns {object} Formula check result
   */
  checkFormulas: function() {
    var result = {
      passed: true,
      issues: [],
      details: {}
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = [
        ss.getSheetByName(SAT.CFG.SHEETS.OVERVIEW)
      ];
      
      var brokenFormulas = [];
      
      for (var s = 0; s < sheets.length; s++) {
        var sheet = sheets[s];
        if (!sheet) continue;
        
        var range = sheet.getDataRange();
        var formulas = range.getFormulas();
        
        for (var i = 0; i < formulas.length; i++) {
          for (var j = 0; j < formulas[i].length; j++) {
            var formula = formulas[i][j];
            if (formula && formula.indexOf('#REF!') >= 0) {
              brokenFormulas.push({
                sheet: sheet.getName(),
                cell: range.getCell(i + 1, j + 1).getA1Notation(),
                formula: formula
              });
            }
          }
        }
      }
      
      if (brokenFormulas.length > 0) {
        result.passed = false;
        result.issues.push('Found ' + brokenFormulas.length + ' broken formulas');
      }
      
      result.details.brokenFormulas = brokenFormulas;
      
    } catch (e) {
      result.issues.push('Formula check error: ' + e.message);
    }
    
    return result;
  },
  
  /**
   * Calculate health score (0-100)
   * @param {object} results - Diagnostic results
   * @returns {number} Health score
   */
  calculateScore: function(results) {
    var score = 100;
    
    // Deduct points for each failed check
    if (!results.structure.passed) score -= 25;
    if (!results.dataIntegrity.passed) score -= 15;
    if (!results.triggers.passed) score -= 20;
    if (!results.performance.passed) score -= 20;
    if (!results.formulas.passed) score -= 20;
    
    return Math.max(0, score);
  },
  
  /**
   * Get diagnostic history
   * @param {number} limit - Max items to return
   * @returns {array} Diagnostic reports
   */
  getHistory: function(limit) {
    limit = limit || 10;
    return SAT.HealthDiagnostics.diagnosticHistory.slice(-limit);
  },
  
  /**
   * Clear history
   */
  clearHistory: function() {
    SAT.HealthDiagnostics.diagnosticHistory = [];
  },
  
  /**
   * Generate diagnostic report HTML
   * @param {object} diagnostic - Diagnostic report
   * @returns {string} HTML report
   */
  generateReport: function(diagnostic) {
    var html = '<div style="font-family: Arial; padding: 20px; background: #f5f5f5; border-radius: 4px;">' +
      '<h2 style="margin-top: 0; color: #333;">Health Diagnostic Report</h2>' +
      '<p><strong>Timestamp:</strong> ' + new Date(diagnostic.timestamp).toLocaleString() + '</p>' +
      '<p><strong>Status:</strong> <span style="color: ' + (diagnostic.score >= 75 ? 'green' : 'orange') + '; font-weight: bold;">' + diagnostic.status + '</span></p>' +
      '<p><strong>Score:</strong> ' + diagnostic.score + '/100</p>' +
      '<hr>' +
      '<h3>Detailed Results:</h3>';
    
    for (var key in diagnostic.results) {
      var result = diagnostic.results[key];
      html += '<h4>' + key.toUpperCase() + ': ' + (result.passed ? '✓ PASS' : '✗ FAIL') + '</h4>';
      
      if (result.issues.length > 0) {
        html += '<ul>';
        for (var i = 0; i < result.issues.length; i++) {
          html += '<li>' + result.issues[i] + '</li>';
        }
        html += '</ul>';
      }
    }
    
    html += '</div>';
    return html;
  }
};
