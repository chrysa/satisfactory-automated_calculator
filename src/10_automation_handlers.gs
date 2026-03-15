/**
 * 10_automation_handlers.gs - Automation Layer
 * 
 * Handles all automated events without user intervention.
 * Implements intelligent throttling and error recovery.
 * Part of 96% Automation pillar.
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.AutoHandlers - Gestionnaires événements automatisés
 */
SAT.AutoHandlers = SAT.AutoHandlers || (function() {
  
  return {
    /**
     * Auto-initialization on sheet open
     * Runs structure check, form auto-fill, and progressive guidance
     */
    initOnOpen: function() {
      try {
        // 1. Auto-check structure integrity
        if (typeof SAT.HealthCheck !== 'undefined') {
          var health = SAT.HealthCheck.quick();
          if (!health.ok && typeof SAT.Recovery !== 'undefined') {
            SAT.Recovery.autoRepair();
          }
        }
        
        // 2. Auto-fill form with context and smart defaults
        if (typeof SAT.Adaptive !== 'undefined') {
          SAT.Adaptive.smartFormFill();
          SAT.Adaptive.applySmartDefaults();
        }
        
        // 3. Show progressive onboarding for first-time users
        if (typeof SAT.Guidance !== 'undefined') {
          SAT.Guidance.showProgressiveOnboarding();
        }
        
        Logger.log("✅ AutoHandlers.initOnOpen completed");
      } catch(e) {
        Logger.log("⚠️ AutoHandlers.initOnOpen: " + e.message);
      }
    },
    
    /**
     * Auto-handling of user edits with real-time monitoring
     * Includes throttled recalculation and error recovery
     */
    handleEdit: function(range, sheetName) {
      try {
        var cfg = SAT.CFG;
        
        // Only recalc si modification dans zones críticas
        var criticalSheets = [
          cfg.SHEETS.PRODUCTION,
          cfg.SHEETS.REF_BASE,
          cfg.SHEETS.REF_MACHINES,
          cfg.SHEETS.REF_ETAGES
        ];
        
        if (criticalSheets.indexOf(sheetName) === -1) {
          return;
        }
        
        // Throttle recalc
        var lastRecalc = SAT.LAST_RECALC || 0;
        var now = new Date().getTime();
        if (now - lastRecalc < 2000) {
          return;
        }
        SAT.LAST_RECALC = now;
        
        // Acquire lock
        var lock = LockService.getDocumentLock();
        if (!lock.tryLock(30000)) {
          Logger.log("⏱️ Recalc skipped: lock timeout");
          return;
        }
        
        try {
          // Monitor performance
          var timer = (typeof SAT.Monitor !== 'undefined') ? SAT.Monitor.startRecalcTimer() : null;
          
          // Main recalc
          SAT_recalcAll();
          
          // Auto-fill après recalc
          if (typeof SAT.Adaptive !== 'undefined') {
            SAT.Adaptive.smartFormFill();
          }
          
          // Record timing
          if (timer && typeof SAT.Monitor !== 'undefined') {
            var duration = SAT.Monitor.endRecalcTimer(timer);
            if (duration > 10000) {
              Logger.log("⏱️ Slow recalc (" + duration + "ms) detected");
            }
          }
          
        } catch(err) {
          Logger.log("❌ Recalc error: " + err.message);
          
          // Auto-recovery
          try {
            if (typeof SAT.Recovery !== 'undefined') {
              var repairs = SAT.Recovery.autoRepair();
              if (repairs.length > 0) {
                Logger.log("🔧 Auto-repairs: " + repairs.join(" | "));
              }
            }
          } catch(e2) {
            Logger.log("Recovery failed: " + e2.message);
          }
        } finally {
          lock.releaseLock();
        }
        
      } catch(e) {
        Logger.log("❌ AutoHandlers.handleEdit: " + e.message);
      }
    },
    
    /**
     * Todo checkbox change automatique
     */
    handleTodoCheckbox: function(range, prodRow) {
      try {
        var cfg = SAT.CFG;
        
        // Mark production row as complete
        SAT.S.must(cfg.SHEETS.PRODUCTION).getRange(prodRow, cfg.PRODUCTION.COLS.NB).setValue(1);
        
        // Auto-recalc
        SAT_recalcAll();
        
        Logger.log("✅ Todo marked complete: row " + prodRow);
      } catch(e) {
        Logger.log("❌ handleTodoCheckbox: " + e.message);
      }
    },
    
    /**
     * Valider ligne avant commit
     */
    autoValidateBeforeSave: function(etage, machine, inRes, outRes, nb) {
      try {
        if (typeof SAT.Validator === 'undefined') return true;
        
        var validation = SAT.Validator.validate(etage, machine, inRes, outRes, nb);
        
        if (!validation.valid && typeof SAT.Feedback !== 'undefined') {
          SAT.Feedback.showValidationError(validation);
        }
        
        return validation.valid;
      } catch(e) {
        Logger.log("⚠️ autoValidateBeforeSave: " + e.message);
        return true; // Allow if validation fails
      }
    },
    
    /**
     * Auto-calculate dérivées
     */
    autoCalculateValues: function(machine, inRes, outRes) {
      try {
        if (typeof SAT.AutoCalc === 'undefined') return {};
        
        var rates = SAT.AutoCalc.computeRates(inRes, outRes);
        return {
          inRate: rates.inRate,
          outRate: rates.outRate
        };
      } catch(e) {
        return { inRate: 0, outRate: 0 };
      }
    }
  };
})();
