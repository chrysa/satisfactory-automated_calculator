/**
 * 40_ergonomic_adaptive.gs - Ergonomics Layer
 * 
 * ✅ Adaptive smart features
 * ✅ WCAG accessibility
 * ✅ Progressive guidance
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Adaptive - Features intelligentes
 */
SAT.Adaptive = SAT.Adaptive || (function() {
  
  return {
    /**
     * Smart form auto-fill
     */
    smartFormFill: function() {
      var cfg = SAT.CFG;
      var ov = SAT.S.must(cfg.SHEETS.OVERVIEW);
      var prod = SAT.S.must(cfg.SHEETS.PRODUCTION);
      var r0 = cfg.OVERVIEW.FORM_ADD.START_ROW;
      var c0 = cfg.OVERVIEW.FORM_ADD.START_COL;
      
      try {
        var lastRow = prod.getLastRow();
        if (lastRow < cfg.PRODUCTION.DATA_ROW) return;
        
        var lastData = prod.getRange(lastRow, 1, 1, cfg.PRODUCTION.COLS.NOTE).getValues()[0];
        
        if (lastData[cfg.PRODUCTION.COLS.MACHINE - 1]) {
          ov.getRange(r0, c0 + 1).setValue(lastData[cfg.PRODUCTION.COLS.MACHINE - 1]);
        }
        
        if (lastData[cfg.PRODUCTION.COLS.ETAGE - 1]) {
          ov.getRange(r0, c0).setValue(lastData[cfg.PRODUCTION.COLS.ETAGE - 1]);
        }
        
        if (lastData[cfg.PRODUCTION.COLS.OUT_RES - 1]) {
          ov.getRange(r0, c0 + 4).setValue(lastData[cfg.PRODUCTION.COLS.OUT_RES - 1]);
        }
      } catch(e) {
        Logger.log("⚠️ Smart fill: " + e.message);
      }
    },
    
    /**
     * Smart defaults
     */
    applySmartDefaults: function() {
      var cfg = SAT.CFG;
      var ov = SAT.S.must(cfg.SHEETS.OVERVIEW);
      var r0 = cfg.OVERVIEW.FORM_ADD.START_ROW;
      var c0 = cfg.OVERVIEW.FORM_ADD.START_COL;
      
      var nbCell = ov.getRange(r0, c0 + 6);
      if (!nbCell.getValue()) {
        nbCell.setValue(1);
      }
    },
    
    /**
     * Contextual suggestions
     */
    getSuggestions: function(context) {
      var suggestions = {
        "empty_etage": "Sélectionner étage première",
        "empty_machine": "Choisir machine du catalogue",
        "empty_output": "Spécifier sortie production",
        "incomplete_entry": "Nb vide = marqué TODO"
      };
      return suggestions[context] || "Aide non disponible";
    }
  };
})();

/**
 * SAT.A11y - Accessibilité WCAG
 */
SAT.A11y = SAT.A11y || (function() {
  
  return {
    /**
     * Apply high contrast
     */
    applyHighContrast: function(sheet) {
      var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
      headerRange
        .setBackground("#FFFFFF")
        .setFontColor("#000000")
        .setFontWeight("bold");
      
      Logger.log("✅ High contrast applied");
    },
    
    /**
     * Get accessible label
     */
    getAccessibleLabel: function(emoji) {
      var labels = {
        "📊": "Dashboard",
        "✅": "Success",
        "❌": "Error",
        "⚠️": "Warning",
        "➕": "Add",
        "🗑️": "Delete",
        "🔍": "Search"
      };
      return labels[emoji] || emoji;
    },
    
    /**
     * Add keyboard shortcuts
     */
    addKeyboardShortcuts: function() {
      Logger.log("📋 Keyboard shortcuts:");
      Logger.log("  Ctrl+Shift+R: Refresh");
      Logger.log("  Ctrl+Alt+A: Add row");
      Logger.log("  Ctrl+Alt+S: Search");
    }
  };
})();

/**
 * SAT.Guidance - Système aide progressive
 */
SAT.Guidance = SAT.Guidance || (function() {
  
  return {
    /**
     * Show progressive onboarding
     */
    showProgressiveOnboarding: function() {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheets = ss.getSheets().map(function(s) { return s.getName(); });
      var cfg = SAT.CFG;
      
      var completion = 0;
      
      if (sheets.indexOf(cfg.SHEETS.PRODUCTION) >= 0) completion += 20;
      if (sheets.indexOf(cfg.SHEETS.OVERVIEW) >= 0) completion += 20;
      
      var prod = SAT.S.sheet(cfg.SHEETS.PRODUCTION);
      if (prod && prod.getLastRow() > cfg.PRODUCTION.DATA_ROW) completion += 20;
      
      var ov = SAT.S.sheet(cfg.SHEETS.OVERVIEW);
      if (ov && ov.getLastRow() > cfg.OVERVIEW.DATA_ROW) completion += 20;
      
      var ref = SAT.S.sheet(cfg.SHEETS.REF_MACHINES);
      if (ref && ref.getLastRow() > cfg.REF_MACHINES.DATA_ROW) completion += 20;
      
      Logger.log("📊 Progression: " + completion + "% (5 étapes)");
      return completion;
    },
    
    /**
     * Get next step
     */
    getNextStep: function(completion) {
      if (completion < 20) return "Menu 🧰 → Install Structure";
      if (completion < 40) return "Configurer Overview";
      if (completion < 60) return "Ajouter lignes production";
      if (completion < 80) return "Vérifier résultats";
      return "Configuration terminée";
    },
    
    /**
     * Show in-context help
     */
    showContextHelp: function(context) {
      var helps = {
        "production": "Ajouter étape, machine, inputs/outputs, nombre machines",
        "overview": "Voir TODO, ERREURS, et STATISTIQUES",
        "referentiel": "Configurer ressources, machines, étages"
      };
      
      var msg = helps[context] || "Aide pas disponible";
      if (typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.showInfo("Aide", msg);
      }
    }
  };
})();

/**
 * SAT.Shortcuts - Raccourcis productivité
 */
SAT.Shortcuts = SAT.Shortcuts || (function() {
  
  return {
    /**
     * Quick actions
     */
    quickAddRow: function() {
      Logger.log("⚡ Quick add row");
      if (typeof SAT_addProductionFromForm !== 'undefined') {
        SAT_addProductionFromForm();
      }
    },
    
    /**
     * Quick search
     */
    quickSearch: function(resource) {
      Logger.log("⚡ Quick search: " + resource);
      if (typeof SAT_searchProducers !== 'undefined') {
        SAT_searchProducers();
      }
    },
    
    /**
     * Quick recalc
     */
    quickRecalc: function() {
      Logger.log("⚡ Quick recalc");
      SAT_recalcAll();
    }
  };
})();
