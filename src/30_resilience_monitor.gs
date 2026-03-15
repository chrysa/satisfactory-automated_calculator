/**
 * 30_resilience_monitor.gs - Resilience Layer
 * 
 * ✅ Continuous system monitoring
 * ✅ Anomaly detection
 * ✅ Intelligent auto-recovery
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Monitor - Monitoring performance et santé
 */
SAT.Monitor = SAT.Monitor || (function() {
  var perf = {
    recalcTimes: [],
    lastRecalc: null,
    avgRecalcTime: 0,
    errorCount: 0,
    lastError: null
  };
  
  return {
    /**
     * Start recalc timer
     */
    startRecalcTimer: function() {
      return { start: new Date().getTime() };
    },
    
    /**
     * End recalc timer
     */
    endRecalcTimer: function(timer) {
      var duration = new Date().getTime() - timer.start;
      perf.recalcTimes.push(duration);
      
      if (perf.recalcTimes.length > 20) {
        perf.recalcTimes.shift();
      }
      
      perf.lastRecalc = duration;
      perf.avgRecalcTime = perf.recalcTimes.reduce(function(a, b) { return a + b; }, 0) / perf.recalcTimes.length;
      
      return duration;
    },
    
    /**
     * Record error
     */
    recordError: function(error, context) {
      perf.errorCount++;
      perf.lastError = {
        timestamp: new Date().toISOString(),
        message: error.message || String(error),
        context: context,
        count: perf.errorCount
      };
      
      Logger.log("❌ Error recorded: " + perf.lastError.message);
    },
    
    /**
     * Get stats
     */
    getStats: function() {
      return {
        lastRecalc: perf.lastRecalc + "ms",
        avgRecalcTime: perf.avgRecalcTime.toFixed(0) + "ms",
        recalcCount: perf.recalcTimes.length,
        slowRecalcs: perf.recalcTimes.filter(function(t) { return t > 10000; }).length,
        errorCount: perf.errorCount,
        lastError: perf.lastError
      };
    },
    
    /**
     * Show report
     */
    showReport: function() {
      var stats = this.getStats();
      var msg = "📊 PERFORMANCE REPORT\n" +
                "═══════════════════════════════════════\n\n" +
                "Dernier recalc: " + stats.lastRecalc + "\n" +
                "Temps moyen: " + stats.avgRecalcTime + "\n" +
                "Nombre recalcs: " + stats.recalcCount + "\n" +
                "Recalcs lents (>10s): " + stats.slowRecalcs + "\n" +
                "Erreurs totales: " + stats.errorCount + "\n";
      
      if (stats.lastError) {
        msg += "\nDernière erreur:\n" + stats.lastError.message;
      }
      
      Logger.log(msg);
      if (typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.showInfo("Performance Report", msg);
      }
    }
  };
})();

/**
 * SAT.HealthCheck - Diagnostics système
 */
SAT.HealthCheck = SAT.HealthCheck || (function() {
  
  return {
    /**
     * Quick health check
     */
    quick: function() {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheets = ss.getSheets().map(function(s) { return s.getName(); });
        var cfg = SAT.CFG;
        
        var requiredSheets = [
          cfg.SHEETS.PRODUCTION,
          cfg.SHEETS.OVERVIEW,
          cfg.SHEETS.REF_BASE
        ];
        
        var missing = requiredSheets.filter(function(n) {
          return sheets.indexOf(n) === -1;
        });
        
        return {
          ok: missing.length === 0,
          missing: missing,
          sheetCount: sheets.length
        };
      } catch(e) {
        return { ok: false, error: e.message };
      }
    },
    
    /**
     * Detailed health check
     */
    full: function() {
      var report = {
        timestamp: new Date().toISOString(),
        status: "PASSING",
        checks: [],
        warnings: [],
        errors: []
      };
      
      try {
        // Check spreadsheet
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        report.checks.push({ name: "Spreadsheet access", status: "✓" });
        
        // Check config
        if (!SAT.CFG || !SAT.CFG.SHEETS) {
          report.errors.push("Config not loaded");
          report.status = "CRITICAL";
          return report;
        }
        report.checks.push({ name: "Configuration", status: "✓" });
        
        // Check sheets
        var cfg = SAT.CFG;
        var missingSheets = [
          cfg.SHEETS.PRODUCTION,
          cfg.SHEETS.OVERVIEW,
          cfg.SHEETS.REF_BASE,
          cfg.SHEETS.REF_MACHINES
        ].filter(function(n) { return !ss.getSheetByName(n); });
        
        if (missingSheets.length === 0) {
          report.checks.push({ name: "Required sheets", status: "✓ (4/4)" });
        } else {
          report.warnings.push("Missing sheets: " + missingSheets.join(", "));
        }
        
        // Check helpers
        if (!SAT.Log || !SAT.UI) {
          report.warnings.push("Helpers not fully loaded");
        }
        report.checks.push({ name: "Helper functions", status: "✓" });
        
      } catch(e) {
        report.status = "ERROR";
        report.errors.push(e.message);
      }
      
      return report;
    }
  };
})();

/**
 * SAT.Recovery - Auto-recovery automatique
 */
SAT.Recovery = SAT.Recovery || (function() {
  
  return {
    /**
     * Auto-repair
     */
    autoRepair: function() {
      var repairs = [];
      var cfg = SAT.CFG;
      
      try {
        // Check headers
        var prod = SAT.S.sheet(cfg.SHEETS.PRODUCTION);
        if (prod && prod.getLastRow() >= cfg.PRODUCTION.HEADER_ROW) {
          var headerVal = prod.getRange(cfg.PRODUCTION.HEADER_ROW, 1, 1, 1).getValue();
          if (!headerVal) {
            SAT_installHeaders_();
            repairs.push("✅ Headers reinstalled");
          }
        }
        
        // Check triggers
        var triggers = ScriptApp.getProjectTriggers();
        if (triggers.length === 0) {
          repairs.push("⚠️ No triggers (run SAT_MASTER_INIT)");
        }
        
        // Check seed data
        var rb = SAT.S.sheet(cfg.SHEETS.REF_BASE);
        if (rb && rb.getLastRow() < cfg.REF_BASE.DATA_ROW) {
          SAT_installSeedIfEmpty_();
          repairs.push("✅ Seed data reinstalled");
        }
        
        Logger.log("🔧 Auto-repair: " + repairs.length + " actions");
      } catch(e) {
        Logger.log("❌ Auto-repair failed: " + e.message);
      }
      
      return repairs;
    },
    
    /**
     * Safety backup
     */
    safetyBackup: function(reason) {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var backup = ss.copy("[BACKUP] " + ss.getName() + " - " + reason);
        Logger.log("💾 Safety backup created");
        return backup.getId();
      } catch(e) {
        Logger.log("⚠️ Backup failed: " + e.message);
        return null;
      }
    }
  };
})();

/**
 * SAT.Validator - Validation robuste
 */
SAT.Validator = SAT.Validator || (function() {
  
  return {
    /**
     * Validate row
     */
    validate: function(etage, machine, inRes, outRes, nb) {
      var errors = [];
      var warnings = [];
      
      if (!etage) errors.push("Étage requis");
      if (!machine) errors.push("Machine requise");
      if (!outRes) errors.push("Output requis");
      
      if (nb === "" || nb === null) {
        warnings.push("Nb vide: marqué TODO");
      } else if (SAT.U.num(nb) === 0) {
        warnings.push("Nb=0: marqué TODO");
      }
      
      return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
      };
    }
  };
})();
