/* 01_core_helpers.gs - Centralise workflows, logging, et UI patterns */
var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Log - Logging centralisé avec timestamps et niveaux
 */
SAT.Log = SAT.Log || (function() {
  var LEVELS = { INFO: "ℹ️", WARN: "⚠️", ERROR: "❌", SUCCESS: "✅", DEBUG: "🔍" };
  
  function fmt(level, msg) {
    var ts = new Date().toLocaleTimeString('fr-FR');
    return "[" + ts + "] " + LEVELS[level] + " " + msg;
  }
  
  return {
    info:    function(msg) { Logger.log(fmt("INFO", msg)); },
    warn:    function(msg) { Logger.log(fmt("WARN", msg)); },
    error:   function(msg) { Logger.log(fmt("ERROR", msg)); },
    success: function(msg) { Logger.log(fmt("SUCCESS", msg)); },
    debug:   function(msg) { Logger.log(fmt("DEBUG", msg)); },
    divider: function(title) { 
      Logger.log("═══════════════════════════════════════════════════════════════");
      Logger.log(title);
      Logger.log("═══════════════════════════════════════════════════════════════");
    },
    section: function(num, title) { Logger.log(num + " " + title); }
  };
})();

/**
 * SAT.UI - Dialogs et alertes simplifiées
 */
SAT.UI = SAT.UI || (function() {
  var ui = SpreadsheetApp.getUi();
  
  return {
    alert: function(title, msg, type) {
      var icon = { success: "✅", warning: "⚠️", error: "❌", info: "ℹ️" }[type || "info"];
      ui.alert(icon + " " + title, msg, ui.ButtonSet.OK);
    },
    
    confirm: function(title, msg) {
      var response = ui.alert(title, msg, ui.ButtonSet.YES_NO);
      return response === ui.Button.YES;
    },
    
    confirmDangerous: function(title, msg1, msg2) {
      if (!SAT.UI.confirm(title, msg1)) return false;
      if (!SAT.UI.confirm("⚠️ CONFIRMATION FINALE", msg2)) return false;
      return true;
    },
    
    toast: function(msg, duration) {
      ui.showModelessDialog(
        HtmlService.createHtmlOutput("<p style='padding:10px;font-weight:bold'>" + msg + "</p>"),
        msg
      );
    }
  };
})();

/**
 * SAT.Workflow - Orchestrer tâches séquentielles avec gestion erreurs
 */
SAT.Workflow = SAT.Workflow || (function() {
  return {
    // Exécute liste de tasks. Chaque task = {name, fn, critical}
    run: function(title, tasks) {
      SAT.Log.divider(title);
      
      var results = { success: 0, failed: 0, errors: [] };
      var startTime = new Date();
      
      tasks.forEach(function(task, idx) {
        try {
          SAT.Log.section((idx + 1) + "/" + tasks.length, task.name);
          task.fn();
          SAT.Log.success(task.name + " réussi");
          results.success++;
        } catch(e) {
          SAT.Log.error(task.name + ": " + e.message);
          results.failed++;
          results.errors.push({ task: task.name, error: e.message });
          if (task.critical) throw e;
        }
      });
      
      var elapsed = ((new Date() - startTime) / 1000).toFixed(1);
      SAT.Log.divider("✅ RÉSUMÉ: " + results.success + "/" + tasks.length + " réussies (" + elapsed + "s)");
      
      return results;
    },
    
    // Exécute fn avec retry automatique
    withRetry: function(fn, maxAttempts) {
      maxAttempts = maxAttempts || 3;
      for (var i = 1; i <= maxAttempts; i++) {
        try {
          return fn();
        } catch(e) {
          if (i === maxAttempts) throw e;
          SAT.Log.warn("Tentative " + i + " échouée, nouvelle tentative...");
          Utilities.sleep(1000);
        }
      }
    }
  };
})();

/**
 * SAT.Forms - Simplifier création et gestion des formulaires
 */
SAT.Forms = SAT.Forms || (function() {
  return {
    // Crée formulaire simple: {title, fields: [{name, type, required, values}]}
    create: function(config) {
      var form = FormApp.create(config.title);
      
      (config.fields || []).forEach(function(field) {
        var item;
        
        switch(field.type) {
          case "text":
            item = form.addTextItem().setTitle(field.name);
            if (field.multiline) item.setHelpText("Plusieurs lignes").asMultilineTextItem();
            break;
          case "number":
            item = form.addTextItem().setTitle(field.name);
            break;
          case "select":
            item = form.addMultipleChoiceItem().setTitle(field.name).setChoiceValues(field.values || []);
            break;
          case "checkbox":
            item = form.addCheckboxItem().setTitle(field.name).setChoiceValues(field.values || []);
            break;
          default:
            item = form.addTextItem().setTitle(field.name);
        }
        
        if (field.required) item.setRequired(true);
      });
      
      return form;
    },
    
    // Récupère réponses d'un formulaire
    getResponses: function(formId) {
      var form = FormApp.openById(formId);
      var responses = form.getResponses();
      var data = [];
      
      responses.forEach(function(response) {
        var row = {};
        var items = form.getItems();
        items.forEach(function(item, idx) {
          row[item.getTitle()] = response.getResponse(idx).getResponse();
        });
        data.push(row);
      });
      
      return data;
    }
  };
})();

/**
 * SAT.Validation - Centralize data validation rules
 */
SAT.Validation = SAT.Validation || (function() {
  return {
    // Applique règle de validation sur plage
    applyRule: function(range, type, values) {
      var rule;
      
      switch(type) {
        case "list":
          rule = SpreadsheetApp.newDataValidation()
            .requireValueInList(values, true)
            .setAllowInvalid(false)
            .build();
          break;
        case "range":
          rule = SpreadsheetApp.newDataValidation()
            .requireValueInRange(values, true)
            .setAllowInvalid(false)
            .build();
          break;
        case "number":
          rule = SpreadsheetApp.newDataValidation()
            .requireNumberBetween(values[0], values[1])
            .build();
          break;
        default:
          return;
      }
      
      range.setDataValidation(rule);
    },
    
    // Applique validations depuis config
    applyFromConfig: function(config) {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      config.forEach(function(rule) {
        var sheet = ss.getSheetByName(rule.sheet);
        if (!sheet) return;
        var range = sheet.getRange(rule.range);
        SAT.Validation.applyRule(range, rule.type, rule.values);
      });
    }
  };
})();

/**
 * SAT.Menu - Builder de menu déclaratif
 */
SAT.Menu = SAT.Menu || (function() {
  return {
    // Config: [{label, items: [{label, fn}]}]
    build: function(mainLabel, config) {
      var ui = SpreadsheetApp.getUi();
      var menu = ui.createMenu(mainLabel);
      
      config.forEach(function(group) {
        if (group.separator) {
          menu.addSeparator();
          return;
        }
        
        if (group.items) {
          var submenu = ui.createMenu(group.label);
          group.items.forEach(function(item) {
            if (item.separator) {
              submenu.addSeparator();
            } else {
              submenu.addItem(item.label, item.fn);
            }
          });
          menu.addSubMenu(submenu);
        } else {
          menu.addItem(group.label, group.fn);
        }
      });
      
      menu.addToUi();
      SAT.Log.success("Menu créé: " + mainLabel);
      return menu;
    }
  };
})();

/**
 * SAT.AutoCalc - Calcul automatique des IN/OUT par minute
 */
SAT.AutoCalc = SAT.AutoCalc || (function() {
  return {
    // Calcule IN/min et OUT/min basé sur les ressources
    computeRates: function(inRes, outRes) {
      var cfg = SAT.CFG;
      var inRate = 0;
      var outRate = 0;
      
      // Lookup densités par défaut selon la ressource
      var densities = {
        // Bases (densité 1x)
        "minerai de fer": 1, "minerai de cuivre": 1, "calcaire": 1,
        "charbon": 1, "soufre": 1, "minerai de caterium": 1,
        "quartz brut": 1, "bauxite": 1, "uranium": 1,
        "pétrole brut": 1, "eau": 1, "azote": 1,
        // Intermédiaires (densité 2-3x)
        "plaque de cuivre": 2, "fil de cuivre": 2, "tôle en acier": 2,
        "vis": 2, "tige": 2, "poutre en acier": 2,
        // Produits (densité 4x+)
        "circuit": 3, "moteur": 4, "rotor": 4
      };
      
      // Lookup par ressource normalisée
      var normalizedIn = SAT.U.norm(inRes);
      var normalizedOut = SAT.U.norm(outRes);
      
      inRate = densities[normalizedIn] || 1;
      outRate = densities[normalizedOut] || 1;
      
      return { inRate: inRate, outRate: outRate };
    },
    
    // Applique calcul auto aux lignes de production
    applyToProduction: function() {
      var cfg = SAT.CFG;
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var prodSheet = ss.getSheetByName(cfg.SHEETS.PRODUCTION);
      
      if (!prodSheet) return;
      
      var lastRow = prodSheet.getLastRow();
      if (lastRow < cfg.PRODUCTION.DATA_ROW) return;
      
      var data = prodSheet.getRange(
        cfg.PRODUCTION.DATA_ROW, 1, 
        lastRow - (cfg.PRODUCTION.DATA_ROW - 1), 
        cfg.PRODUCTION.COLS.OUT_RATE
      ).getValues();
      
      var updates = [];
      data.forEach(function(row, idx) {
        var inRes = SAT.U.str(row[cfg.PRODUCTION.COLS.IN_RES - 1]);
        var outRes = SAT.U.str(row[cfg.PRODUCTION.COLS.OUT_RES - 1]);
        
        if (inRes || outRes) {
          var rates = SAT.AutoCalc.computeRates(inRes, outRes);
          row[cfg.PRODUCTION.COLS.IN_RATE - 1] = rates.inRate;
          row[cfg.PRODUCTION.COLS.OUT_RATE - 1] = rates.outRate;
          updates.push(row);
        } else {
          updates.push(row);
        }
      });
      
      if (updates.length > 0) {
        prodSheet.getRange(
          cfg.PRODUCTION.DATA_ROW, 1,
          updates.length,
          cfg.PRODUCTION.COLS.OUT_RATE
        ).setValues(updates);
      }
    }
  };
})();
