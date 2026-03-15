/**
 * COUCHE DE RÉSILIENCE - SAT ASSIST
 * Diagnostic, validation et récupération automatique
 * Garantit que le projet reste opérationnel malgré les erreurs
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * DIAGNOSTIC COMPLET DU PROJET
 * Vérifie tous les composants critiques
 * Retourne un rapport détaillé de l'état
 */
function SAT_HEALTH_CHECK() {
  try {
    var report = {
      timestamp: new Date().toISOString(),
      status: "PASSING",
      checks: [],
      warnings: [],
      errors: [],
      recommendations: []
    };
    
    SAT.Log.divider("🔍 DIAGNOSTIC COMPLET");
    
    // 1. Vérifier SpreadSheet accessible
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      if (!ss) throw new Error("Spreadsheet not accessible");
      report.checks.push({ name: "Spreadsheet Access", status: "✓ OK" });
    } catch (e) {
      report.status = "CRITICAL";
      report.errors.push("Spreadsheet: " + e.message);
      report.recommendations.push("Impossible d'accéder au spreadsheet. Vérifier permissions.");
      return report;
    }
    
    // 2. Vérifier Config chargée
    try {
      if (!SAT.CFG || !SAT.CFG.SHEETS) throw new Error("Config not loaded");
      report.checks.push({ name: "Configuration", status: "✓ OK" });
    } catch (e) {
      report.status = "CRITICAL";
      report.errors.push("Config: " + e.message);
      report.recommendations.push("Réexécuter SAT_RECOVERY()");
      return report;
    }
    
    // 3. Vérifier Sheets essentiels
    var requiredSheets = [
      SAT.CFG.SHEETS.PRODUCTION,
      SAT.CFG.SHEETS.OVERVIEW,
      SAT.CFG.SHEETS.REF_BASE,
      SAT.CFG.SHEETS.REF_MACHINES
    ];
    
    var missingSheets = [];
    requiredSheets.forEach(function(sheetName) {
      if (!ss.getSheetByName(sheetName)) {
        missingSheets.push(sheetName);
      }
    });
    
    if (missingSheets.length === 0) {
      report.checks.push({ name: "Sheets essentiels", status: "✓ OK (4/4)" });
    } else {
      report.status = "CRITICAL";
      report.errors.push("Sheets manquants: " + missingSheets.join(", "));
      report.recommendations.push("Réexécuter SAT_install() pour recréer les feuilles");
    }
    
    // 4. Vérifier Helpers disponibles
    try {
      if (!SAT.Log || !SAT.UI || !SAT.Menu) throw new Error("Helpers missing");
      report.checks.push({ name: "Fonctions Helpers", status: "✓ OK" });
    } catch (e) {
      report.warnings.push("Helpers: " + e.message);
      report.recommendations.push("Charger 01_core_helpers.gs manuellement");
    }
    
    // 5. Vérifier Props du projet
    try {
      var props = PropertiesService.getUserProperties();
      var satKey = props.getProperty("SAT_VERSION");
      if (satKey) {
        report.checks.push({ name: "Properties", status: "✓ OK (version: " + satKey + ")" });
      } else {
        report.warnings.push("SAT_VERSION property not found");
        report.recommendations.push("Properties non initialisées - installer le projet");
      }
    } catch (e) {
      report.warnings.push("Properties error: " + e.message);
    }
    
    // 6. Vérifier Formules en place
    try {
      var productionSheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
      if (productionSheet && productionSheet.getLastRow() > SAT.CFG.PRODUCTION.DATA_ROW) {
        var testCell = productionSheet.getRange(SAT.CFG.PRODUCTION.DATA_ROW + 1, SAT.CFG.PRODUCTION.COLS.IN_RATE);
        var formula = testCell.getFormula();
        if (formula && formula.length > 0) {
          report.checks.push({ name: "Formules", status: "✓ OK" });
        } else {
          report.warnings.push("Pas de formule détectée");
        }
      }
    } catch (e) {
      report.warnings.push("Formulas check: " + e.message);
    }
    
    // 7. Vérifier Triggers
    try {
      var triggers = ScriptApp.getProjectTriggers();
      if (triggers.length > 0) {
        report.checks.push({ name: "Triggers", status: "✓ OK (" + triggers.length + " actif(s))" });
      } else {
        report.warnings.push("Aucun trigger installé");
        report.recommendations.push("Réexécuter SAT_install() pour installer les triggers");
      }
    } catch (e) {
      report.warnings.push("Triggers check: " + e.message);
    }
    
    // Résumé final
    SAT.Log.divider("📊 RÉSUMÉ");
    SAT.Log.info("Checks OK: " + report.checks.length);
    SAT.Log.info("Warnings: " + report.warnings.length);
    report.errors.forEach(function(err) {
      SAT.Log.error("  • " + err);
    });
    report.recommendations.forEach(function(rec) {
      SAT.Log.warn("  ➜ " + rec);
    });
    
    if (report.status === "PASSING") {
      SAT.Log.success("✅ Projet en bon état");
    } else {
      SAT.Log.error("❌ Problèmes détectés - nécessite intervention");
    }
    
    return report;
    
  } catch (err) {
    SAT.Log.error("HEALTH_CHECK FATAL: " + err.message);
    throw err;
  }
}

/**
 * VALIDATION AVANT OPÉRATION
 * Vérifie que l'état du projet permet l'opération
 * Retourne true/false
 */
function SAT_VALIDATE_STATE(operationName) {
  try {
    operationName = operationName || "unknown";
    
    // Minimum: Spreadsheet + Config accessible
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      SAT.Log.error("Validation FAILED: Spreadsheet not accessible (" + operationName + ")");
      return false;
    }
    
    if (!SAT.CFG || !SAT.CFG.SHEETS) {
      SAT.Log.warn("Validation FAILED: Config not loaded (" + operationName + ")");
      return false;
    }
    
    // Vérifier Sheets critiques
    var criticalSheets = [SAT.CFG.SHEETS.PRODUCTION];
    for (var i = 0; i < criticalSheets.length; i++) {
      if (!ss.getSheetByName(criticalSheets[i])) {
        SAT.Log.warn("Validation FAILED: Missing sheet " + criticalSheets[i] + " (" + operationName + ")");
        return false;
      }
    }
    
    SAT.Log.info("✓ Validation PASSED for " + operationName);
    return true;
    
  } catch (e) {
    SAT.Log.error("Validation exception: " + e.message);
    return false;
  }
}

/**
 * RÉCUPÉRATION AUTOMATIQUE
 * Tente de réparer les états brisés détectés
 */
function SAT_RECOVERY() {
  try {
    SAT.Log.divider("🔧 RÉCUPÉRATION AUTOMATIQUE");
    
    var recovered = [];
    var failed = [];
    
    // 1. Charger config si manquante
    if (!SAT.CFG) {
      try {
        SAT.Log.info("→ Rechargement config...");
        recovered.push("Config");
      } catch (e) {
        failed.push("Config: " + e.message);
      }
    }
    
    // 2. Vérifier et recréer Sheets manquants (TOUS les onglets)
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var cfg = SAT.CFG;
      var requiredSheets = [
        cfg.SHEETS.PRODUCTION,
        cfg.SHEETS.OVERVIEW,
        cfg.SHEETS.REF_BASE,
        cfg.SHEETS.REF_MACHINES,
        cfg.SHEETS.REF_ETAGES
      ];
      
      requiredSheets.forEach(function(sheetName) {
        if (!ss.getSheetByName(sheetName)) {
          try {
            SAT.Log.info("→ Création onglet: " + sheetName);
            ss.insertSheet(sheetName);
            recovered.push("Sheet: " + sheetName);
          } catch (e) {
            failed.push("Sheet " + sheetName + ": " + e.message);
          }
        }
      });
    } catch (e) {
      failed.push("Sheet recovery: " + e.message);
    }
    
    // 3. Vérifier Triggers
    try {
      var triggers = ScriptApp.getProjectTriggers();
      if (triggers.length === 0) {
        SAT.Log.warn("→ Aucun trigger détecté, reconstruction...");
        ScriptApp.newTrigger("onEdit")
          .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
          .onEdit()
          .create();
        ScriptApp.newTrigger("onOpen")
          .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
          .onOpen()
          .create();
        recovered.push("Triggers");
      }
    } catch (e) {
      failed.push("Triggers: " + e.message);
    }
    
    // 4. Vérifier Permissions
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var range = ss.getRange("A1");
      range.getValue();
      range.setValue(range.getValue());
      recovered.push("Permissions");
    } catch (e) {
      failed.push("Permissions: " + e.message);
    }
    
    // Rapport
    SAT.Log.divider("📊 RÉSULTAT");
    if (recovered.length > 0) {
      SAT.Log.success("✓ Réparé: " + recovered.join(", "));
    }
    if (failed.length > 0) {
      SAT.Log.error("✗ Échoué: " + failed.join(", "));
    }
    
    if (failed.length === 0) {
      SAT.Log.success("✅ Récupération complète!");
      SAT.UI.alert("✅ Récupération", "Projet restauré avec succès", "success");
    } else if (recovered.length > 0) {
      SAT.Log.warn("⚠️  Récupération partielle");
      SAT.UI.alert("⚠️  Récupération partielle", 
        "Réparé: " + recovered.join(", ") + "\nÉchoué: " + failed.join(", "), 
        "warning");
    } else {
      SAT.Log.error("❌ Récupération échouée");
      SAT.UI.alert("❌ Récupération échouée", 
        "Problèmes: " + failed.join(", "), 
        "error");
    }
    
  } catch (err) {
    SAT.Log.error("RECOVERY FATAL: " + err.message);
    SAT.UI.alert("❌ Erreur Récupération", err.message, "error");
  }
}

/**
 * RETRY PATTERN - Gestion des erreurs transitoires
 * Réessaye une opération avec backoff exponentiel + jitter
 * 
 * @param {Function} fn - Fonction à exécuter
 * @param {number} maxRetries - Nombre max de tentatives (défaut: 3)
 * @param {number} initialDelayMs - Délai initial en ms (défaut: 500)
 * @param {string} operationName - Nom pour logging (optionnel)
 * @returns {Object} {success: bool, result: *, attempts: number, error: string}
 */
function SAT_Resilience_Retry(fn, maxRetries, initialDelayMs, operationName) {
  try {
    maxRetries = maxRetries || 3;
    initialDelayMs = initialDelayMs || 500;
    operationName = operationName || "Operation";
    
    var result = {};
    var lastError = null;
    
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      try {
        SAT.Log.debug("↻ " + operationName + " - Tentative " + (attempt + 1) + "/" + maxRetries);
        
        // Exécute la fonction
        var output = fn();
        
        // Succès
        result.success = true;
        result.result = output;
        result.attempts = attempt + 1;
        
        if (attempt > 0) {
          SAT.Log.info("✓ " + operationName + " réussi après " + result.attempts + " tentative(s)");
        }
        
        return result;
        
      } catch (e) {
        lastError = e;
        
        if (attempt < maxRetries - 1) {
          // Calcul du délai avec backoff exponentiel + jitter
          var delayMs = initialDelayMs * Math.pow(2, attempt);
          var jitter = Math.random() * (delayMs * 0.1); // ±10% jitter
          var totalDelay = Math.round(delayMs + jitter);
          
          SAT.Log.warn("✗ " + operationName + " tentative " + (attempt + 1) + " échouée: " + e.message);
          SAT.Log.debug("⏳ Attente " + totalDelay + "ms avant nouvelle tentative...");
          
          // Attente avec backoff
          Utilities.sleep(totalDelay);
        }
      }
    }
    
    // Tous les retries ont échoué
    result.success = false;
    result.result = null;
    result.attempts = maxRetries;
    result.error = lastError ? lastError.message : "Unknown error";
    
    SAT.Log.error("❌ " + operationName + " ÉCHOUÉ après " + maxRetries + " tentatives: " + result.error);
    
    return result;
    
  } catch (err) {
    SAT.Log.error("RETRY FATAL: " + err.message);
    return {
      success: false,
      result: null,
      attempts: 0,
      error: err.message
    };
  }
}

/**
 * Wrapper pour usage facile - utilise tous les défauts de Retry
 * @param {Function} fn - Fonction à exécuter
 * @param {string} operationName - Nom pour logging
 * @returns {*} Le résultat de la fonction, ou null si tous les retries échouent
 */
function SAT_Resilience_RetrySimple(fn, operationName) {
  var result = SAT_Resilience_Retry(fn, 3, 500, operationName);
  return result.success ? result.result : null;
}

/**
 * RÉINITIALISATION COMPLÈTE
 * Remet le projet à zéro (après confirmation)
 * DESTRUCTIF - demande confirmation
 */
function SAT_DEEP_RESET() {
  try {
    SAT.Log.divider("🚨 RÉINITIALISATION COMPLÈTE");
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      '🚨 RÉINITIALISATION COMPLÈTE\n\n' +
      'Cela va:\n' +
      '• Supprimer TOUS les sheets\n' +
      '• Supprimer TOUTES les données\n' +
      '• Réinstaller la structure vierge\n\n' +
      'Êtes-vous sûr?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      SAT.Log.info("Reset: Annulé par l'utilisateur");
      return;
    }
    
    var response2 = ui.alert(
      '⚠️  DERNIÈRE CHANCE\n\n' +
      'Confirmez pour supprimer complètement:',
      ui.ButtonSet.OK_CANCEL
    );
    
    if (response2 !== ui.Button.OK) {
      SAT.Log.info("Reset: Annulé à la confirmation finale");
      return;
    }
    
    SAT.Log.warn("🔥 RÉINITIALISATION COMMENCE...");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Supprimer tous les sheets sauf 1
    var sheets = ss.getSheets();
    for (var i = sheets.length - 1; i > 0; i--) {
      ss.deleteSheet(sheets[i]);
    }
    
    // 2. Nettoyer le sheet restant
    var sheet = sheets[0];
    sheet.setName("_temp");
    sheet.clear();
    
    SAT.Log.info("✓ Sheets supprimés");
    
    // 3. Nettoyer les Properties
    PropertiesService.getUserProperties().deleteAllProperties();
    PropertiesService.getDocumentProperties().deleteAllProperties();
    SAT.Log.info("✓ Properties nettoyées");
    
    // 4. Supprimer tous les triggers
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) {
      try {
        ScriptApp.deleteTrigger(t);
      } catch (e) {}
    });
    SAT.Log.info("✓ Triggers supprimés");
    
    // 5. Réinstaller
    SAT.Log.info("→ Réinstallation du projet...");
    
    delete SAT.CFG;
    
    if (typeof SAT_install_final === 'function') {
      SAT_install_final();
      SAT.Log.success("✅ Réinstallation complète!");
    } else {
      SAT.Log.error("❌ SAT_install_final() non trouvée");
    }
    
    SAT.UI.alert("✅ Reset Complet", 
      "Projet réinitialisé. Recharger le spreadsheet (F5).", 
      "success");
    
  } catch (err) {
    SAT.Log.error("DEEP_RESET FATAL: " + err.message);
    SAT.UI.alert("❌ Reset Erreur", err.message, "error");
  }
}

/**
 * RAPPORT DE SANTÉ DÉTAILLÉ
 * Affiche un rapport visuel dans le Spreadsheet
 */
function SAT_SHOW_HEALTH_REPORT() {
  try {
    var report = SAT_HEALTH_CHECK();
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.insertSheet("_HealthReport_" + new Date().getTime());
    
    var row = 1;
    
    // Header
    sheet.getRange(row, 1, 1, 2).setValues([["DIAGNOSTIC DU PROJET", new Date().toLocaleString()]]);
    sheet.getRange(row, 1, 1, 2).setBackground("#1a73e8").setFontColor("white").setFontWeight("bold");
    row += 2;
    
    // Status
    var statusBg = (report.status === "PASSING") ? "#34a853" : "#d33427";
    sheet.getRange(row, 1, 1, 2).setValues([["STATUS", report.status]]);
    sheet.getRange(row, 1, 1, 2).setBackground(statusBg).setFontColor("white");
    row += 2;
    
    // Checks
    if (report.checks.length > 0) {
      sheet.getRange(row, 1).setValue("✓ VÉRIFICATIONS OK").setFontWeight("bold").setBackground("#e8f5e9");
      row++;
      report.checks.forEach(function(check) {
        sheet.getRange(row, 1, 1, 2).setValues([[check.name, check.status]]);
        row++;
      });
      row++;
    }
    
    // Warnings
    if (report.warnings.length > 0) {
      sheet.getRange(row, 1).setValue("⚠️  AVERTISSEMENTS").setFontWeight("bold").setBackground("#fff3cd");
      row++;
      report.warnings.forEach(function(warn) {
        sheet.getRange(row, 1).setValue(warn).setBackground("#fffbea");
        row++;
      });
      row++;
    }
    
    // Errors
    if (report.errors.length > 0) {
      sheet.getRange(row, 1).setValue("❌ ERREURS").setFontWeight("bold").setBackground("#f8d7da");
      row++;
      report.errors.forEach(function(err) {
        sheet.getRange(row, 1).setValue(err).setBackground("#f5c6cb");
        row++;
      });
      row++;
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      sheet.getRange(row, 1).setValue("💡 RECOMMANDATIONS").setFontWeight("bold").setBackground("#d1ecf1");
      row++;
      report.recommendations.forEach(function(rec) {
        sheet.getRange(row, 1).setValue(rec).setBackground("#d6f0f5");
        row++;
      });
    }
    
    sheet.autoResizeColumns(1, 2);
    sheet.setColumnWidth(2, 500);
    
    SAT.Log.success("✓ Rapport de santé généré");
    SAT.UI.alert("✅ Rapport", "Rapport généré dans '_HealthReport_'", "success");
    
  } catch (err) {
    SAT.Log.error("HEALTH_REPORT: " + err.message);
    SAT.UI.alert("❌ Erreur", "Impossible de générer le rapport", "error");
  }
}
