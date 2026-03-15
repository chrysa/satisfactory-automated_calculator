/* 53_app_menu.gs - Menu & Interface utilisateur améliorée */
var SAT = this.SAT || (this.SAT = {});

/**
 * ⭐ FUNCTION KEY: onOpen - Called automatically on sheet open
 * Execution sequence:
 *   1. Check if setup is needed
 *   2. Auto-setup if first time
 *   3. Initialize core systems
 *   4. Build menu
 *   5. Health check & auto-repair
 */
function onOpen(e) {
  try {
    // ⚠️ CRITICAL: Verify all core APIs loaded (bootstrap guards)
    try {
      SAT._verifyCriticalInit();
    } catch (initErr) {
      Logger.log("❌ CRITICAL INIT ERROR: " + initErr.message);
      Logger.log("This usually means files were not loaded in correct order.");
      SpreadsheetApp.getUi().alert("Error: SAT system not properly initialized.\nRestart the app: Ctrl+Shift+R then refresh menu.");
      return;
    }
    
    // Execute deferred initializations (runs after all files loaded)
    if (typeof SAT._executeDeferredInit === 'function') {
      SAT._executeDeferredInit();
    }
    
    // STEP 0: Auto-setup detection for first-time users
    Logger.log("🔍 onOpen: Checking if setup needed...");
    
    // Force ensure all critical sheets exist (even if setup appears done)
    try {
      SAT_createCriticalSheetsForce_();
    } catch (forceErr) {
      Logger.log("⚠️ Force create sheets: " + forceErr.message);
    }
    
    if (SAT_isFirstTimeSetup()) {
      Logger.log("📦 First-time setup detected - auto-installing...");
      try {
        SAT_install_final();
        Logger.log("✅ Auto-setup completed successfully");
      } catch (setupErr) {
        Logger.log("❌ Auto-setup error: " + setupErr.message);
        Logger.log("Stack: " + setupErr.stack);
      }
    } else {
      Logger.log("✅ Setup already done");
    }
    
    // 1. Initialize automation system
    if (typeof SAT !== 'undefined' && SAT.AUTO && typeof SAT.AUTO.start === 'function') {
      try {
        SAT.AUTO.start();
      } catch (err) {
        Logger.log('AUTO.start warning: ' + err.message);
      }
    }
    
    // 2. Initialize adaptive features & health check
    if (typeof SAT.AutoHandlers !== 'undefined' && typeof SAT.AutoHandlers.initOnOpen === 'function') {
      try {
        SAT.AutoHandlers.initOnOpen();
      } catch (err) {
        Logger.log('AutoHandlers.initOnOpen warning: ' + err.message);
      }
    }
    
    // 3. Build menu
    if (typeof SAT_buildMenu === 'function') {
      SAT_buildMenu();
    }
    
    // 4. Create documentation sheets if needed
    if (typeof SAT.Documentation !== 'undefined' && SAT.Documentation.ensureHelpSheet) {
      try {
        SAT.Documentation.ensureHelpSheet();
        SAT.Documentation.ensureLegendSheet();
        SAT.Documentation.ensureDashboardSheet();
        SAT.Documentation.ensureVisualGuideSheet();
      } catch (err) {
        Logger.log('Documentation setup warning: ' + err.message);
      }
    }
    
    // 4b. Auto-detect floors from production data
    if (typeof SAT.EtagesAutoDetect !== 'undefined' && SAT.EtagesAutoDetect.fullAutoSync) {
      try {
        SAT.EtagesAutoDetect.fullAutoSync();
      } catch (err) {
        Logger.log('Auto-detect floors warning: ' + err.message);
      }
    }
    
    // 4c. Create charts if production has data
    if (typeof SAT.Charts !== 'undefined' && SAT.Charts.createAllCharts) {
      try {
        var prodSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
        if (prodSheet && prodSheet.getLastRow() > 1) {
          // Only create if sheet has data
          SAT.Charts.createAllCharts();
        }
      } catch (err) {
        Logger.log('Charts creation warning: ' + err.message);
      }
    }
    
    // 4d. Refresh dashboard metrics
    if (typeof SAT_REFRESH_DASHBOARD === 'function') {
      try {
        var dashSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("📊 Tableau de Bord");
        if (dashSheet) {
          dashSheet.getRange("B4:D11").recalculate();
        }
      } catch (err) {
        Logger.log('Dashboard refresh warning: ' + err.message);
      }
    }
    
    // 4e. Ensure triggers are installed
    if (typeof _ensureTriggers === 'function') {
      try {
        _ensureTriggers();
      } catch (err) {
        Logger.log('Trigger setup warning: ' + err.message);
      }
    }
    
    // 4f. Reorder sheets to ensure correct order
    if (typeof SAT_reorderSheets === 'function') {
      try {
        SAT_reorderSheets();
      } catch (err) {
        Logger.log('Sheet reorder warning: ' + err.message);
      }
    }
    
    // 5. Show welcome for first-time users
    if (typeof SAT_showWelcome === 'function') {
      try {
        SAT_showWelcome();
      } catch (err) {
        // Non-critical, skip silently
      }
    }
    
    // 5. Quick format
    if (typeof SAT_quickFormat === 'function') {
      try {
        SAT_quickFormat();
      } catch (err) {
        // Non-critical, skip silently
      }
    }
    
    Logger.log("✅ onOpen complete");
    
  } catch (err) {
    Logger.log('❌ onOpen error: ' + err.message);
    // Even if onOpen fails, the sheet should still be usable
  }
}

/**
 * Check if this is first-time setup
 * Returns true if any critical sheet is missing or empty
 */
function SAT_isFirstTimeSetup() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = SAT.CFG;
    
    // Check if all critical sheets exist
    var criticalSheets = [
      cfg.SHEETS.DASHBOARD,
      cfg.SHEETS.PRODUCTION,
      cfg.SHEETS.RESOURCES,
      cfg.SHEETS.MACHINES,
      cfg.SHEETS.FLOORS
    ];
    
    for (var i = 0; i < criticalSheets.length; i++) {
      var sheet = ss.getSheetByName(criticalSheets[i]);
      if (!sheet) {
        Logger.log("  Missing sheet: " + criticalSheets[i]);
        return true;
      }
    }
    
    // Check if reference sheets have data
    var resSheet = ss.getSheetByName(cfg.SHEETS.RESOURCES);
    if (!resSheet || resSheet.getLastRow() < cfg.RESOURCES.DATA_ROW) {
      Logger.log("  RESOURCES is empty");
      return true;
    }
    
    Logger.log("  All sheets exist with data - setup already done");
    return false;
    
  } catch (e) {
    Logger.log("  Setup check error: " + e.message);
    return true;
  }
}

/**
 * Détecte le contexte actuel (sheet, état, données) pour menu dynamique
 */
function SAT_getMenuContext() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = ss.getActiveSheet();
    var sheetName = activeSheet.getName();
    var cfg = SAT.CFG;
    
    // Détecte sheet actuelle
    var context = {
      sheet: sheetName,
      isProduction: sheetName === cfg.SHEETS.PRODUCTION,
      isDashboard: sheetName === cfg.SHEETS.DASHBOARD,
      isRef: sheetName.startsWith("📋") || sheetName.startsWith("🏗️"),
      hasProductionData: false,
      hasErrors: false,
      isFirstTime: SAT_isFirstTimeSetup()
    };
    
    // Détecte présence de données
    var prodSheet = ss.getSheetByName(cfg.SHEETS.PRODUCTION);
    if (prodSheet && prodSheet.getLastRow() > cfg.PRODUCTION.DATA_ROW) {
      context.hasProductionData = true;
    }
    
    // Détecte présence d'erreurs
    var errSheet = ss.getSheetByName(cfg.SHEETS.ERRORS);
    if (errSheet && errSheet.getLastRow() > 1) {
      context.hasErrors = true;
    }
    
    return context;
  } catch (e) {
    return {
      sheet: "unknown",
      isProduction: false,
      isDashboard: false,
      isRef: false,
      hasProductionData: false,
      hasErrors: false,
      isFirstTime: true
    };
  }
}

/**
 * Construit le menu principal dynamique (adapté au contexte)
 * Utilise SAT.Menu builder déclaratif
 */
function SAT_buildMenu() {
  var context = SAT_getMenuContext();
  var config = [
    {
      label: "📊 Données",
      items: [
        { label: "🧱 Installer structure", fn: "SAT_install" },
        { label: "✓ Vérifier & réparer", fn: "SAT_VERIFY_AND_FIX" },
        { label: "🔄 Recalcul complet", fn: "SAT_recalcAll" },
        { label: "⚡ Calcul auto IN/OUT", fn: "SAT_AutoCalc_Menu" },
        { separator: true },
        { label: "⏱ Réinstaller triggers", fn: "SAT_installTriggers" },
        { label: "✓ Vérifier triggers", fn: "SAT_checkTriggers" },
        { separator: true },
        { label: "� Résumé production", fn: "SAT_SHOW_PRODUCTION_SUMMARY" },
        { label: "📅 Maintenance schedule", fn: "SAT_AutoCalc_Menu" },
        { separator: true },
        { label: "�🗑️ Vider données (production)", fn: "SAT_CLEAR_ALL_DATA" },
        { separator: true },
        { label: "📋 État système", fn: "SAT_CHECK_STATE" }
      ]
    },
    {
      label: "🏢 Étages",
      items: [
        { label: "➕ Ajouter étage", fn: "SAT_addFloor" },
        { label: "📋 Lister étages", fn: "SAT_listFloors" },
        { separator: true },
        { label: "📐 Proposer dimensions optimales", fn: "SAT_SHOW_FLOOR_LAYOUTS" },
        { label: "⚙️ Optimiser agencement & dimensions", fn: "SAT_OPTIMIZE_FLOOR_DIMENSIONS" },
        { separator: true },
        { label: "🔍 Auto-détecter étages", fn: "SAT_AUTO_SYNC_FLOORS" },
        { label: "📊 Scanner production", fn: "SAT_SCAN_PRODUCTION_FLOORS" },
        { separator: true },
        { label: "🔗 Gérer dépendances", fn: "SAT_addFloorDependencies" },
        { label: "📊 Analyse d'impacts", fn: "SAT_SHOW_FLOOR_IMPACTS" },
        { label: "✓ Valider dépendances", fn: "SAT_TEST_FLOOR_VALIDATION" },
        { label: "📋 Rapport dépendances", fn: "SAT_GENERATE_DEPENDENCY_REPORT" }
      ]
    },
    {
      label: "➕ Production",
      items: [
        { label: "➕ Ajouter ligne", fn: "SAT_addProductionFromForm" }
      ]
    },
    {
      label: "🔍 Chercher",
      items: [
        { label: "🔎 Ressources", fn: "SAT_searchProducers" },
        { label: "📋 Init recherche", fn: "SAT_setupSearchForm" }
      ]
    },
    {
      label: "👁️ Affichage",
      items: [
        { label: "📚 Créer documentation", fn: "SAT_CREATE_DOCUMENTATION" },
        { label: "📊 Créer graphiques", fn: "SAT_CREATE_CHARTS" },
        { label: "🎨 Ajouter couleurs production", fn: "SAT_ADD_SPARKLINES" },
        { label: "📊 Rafraîchir tableau de bord", fn: "SAT_REFRESH_DASHBOARD" },
        { separator: true },
        { label: "ℹ️ Panneaux aide", fn: "SAT_UI_renderPanels" },
        { label: "🟨 Colorier production", fn: "SAT_applyConditionalFormattingProduction" },
        { label: "🎨 Mise en page", fn: "SAT_improveLayout" },
        { label: "⚙️ + Filtres dynamiques", fn: "SAT_addDynamicFilters" }
      ]
    },
    {
      label: "🔧 Outils",
      items: [
        { label: "📊 Diagnostic", fn: "SAT_DIAGNOSTIC" },
        { label: "🔨 Quick Fix", fn: "SAT_QUICK_FIX" },
        { label: "🚀 Init complète", fn: "SAT_MASTER_INIT" },
        { separator: true },
        { label: "📖 Documentation", fn: "SAT_showDocumentation" },
        { label: "🎓 Aide", fn: "SAT_showHelp" },
        { separator: true },
        { label: "🔴 Réinstaller la feuille (RESET)", fn: "SAT_resetSheetCompletely" },
        { label: "⚠️ RESET Everything (DANGEREUX!)", fn: "SAT_RESET" }
      ]
    },
    {
      label: "⚙️ Configuration & Init",
      items: [
        { label: "🚀 Setup Complet (auto-install triggers)", fn: "SAT_SETUP_EVERYTHING_Menu" },
        { label: "🔄 Initialisation Complète", fn: "SAT_INITIALIZE_ALL_Menu" },
        { separator: true },
        { label: "✓ Vérifier qu'init nécessaire", fn: "SAT_CHECK_INIT_NEEDED" }
      ]
    },
    {
      label: "🚑 Résilience & Santé",
      items: [
        { label: "🔍 Diagnostic complet", fn: "SAT_HEALTH_CHECK" },
        { label: "🔧 Recovery automatique", fn: "SAT_RECOVERY" },
        { label: "📊 Rapport santé détaillé", fn: "SAT_SHOW_HEALTH_REPORT" },
        { separator: true },
        { label: "✓ Valider l'état", fn: "SAT_validateBeforeOp" },
        { separator: true },
        { label: "🚨 Reset complet (DESTRUCTIF!)", fn: "SAT_DEEP_RESET" }
      ]
    },
    {
      label: "⚙️ Automatisation",
      items: [
        { label: "ℹ️ Info Automatisation", fn: "SAT_showAutomationMenu" },
        { label: "📊 Statut Automation", fn: "SAT_SHOW_AUTOMATION_STATUS" },
        { label: "📋 Logs Automatisation", fn: "SAT_SHOW_AUTOMATION_LOGS" },
        { label: "📖 Résumé Automatisation", fn: "SAT_SHOW_AUTOMATION_SUMMARY" },
        { separator: true },
        { label: "🧹 Nettoyage manuel", fn: "SAT_AUTO_CLEANUP" },
        { label: "✓ Valider données", fn: "SAT_AUTO_VALIDATE_DATA" },
        { separator: true },
        { label: "🔴 Désactiver auto", fn: "SAT_DISABLE_AUTOMATION" },
        { label: "🟢 Réactiver auto", fn: "SAT_ENABLE_AUTOMATION" }
      ]
    },
    {
      label: "🎨 Design & Diagrammes",
      items: [
        { label: "📖 Guide cohérence graphique", fn: "SAT_SHOW_COHERENCE_GUIDE" },
        { label: "🎨 Appliquer Design System", fn: "SAT_APPLY_DESIGN_SYSTEM" },
        { separator: true },
        { label: "🎯 Palette de couleurs", fn: "SAT_SHOW_COLOR_PALETTE" },
        { label: "📝 Guide typographie", fn: "SAT_SHOW_TYPOGRAPHY_GUIDE" },
        { separator: true },
        { label: "🏗️ Architecture générale", fn: "SAT_SHOW_ARCHITECTURE_DIAGRAM" },
        { label: "📊 Flux de données", fn: "SAT_SHOW_DATA_FLOW_DIAGRAM" },
        { label: "🔄 Cycle de résilience", fn: "SAT_SHOW_RESILIENCE_CYCLE" },
        { label: "🎨 Mise en page UI", fn: "SAT_SHOW_UI_LAYOUT" }
      ]
    },
    {
      label: "📈 Optimisation & Performance",
      items: [
        { label: "⏱️ Rapport Performance", fn: "SAT_SHOW_PERFORMANCE_REPORT" },
        { label: "🔧 Auto-Repair & Suggestions", fn: "SAT_SHOW_AUTO_REPAIR_SUGGESTIONS" },
        { separator: true },
        { label: "♿ Accessibilité", fn: "SAT_SHOW_ACCESSIBILITY_CHECK" },
        { label: "🎯 Progression Onboarding", fn: "SAT_SHOW_PROGRESS_GUIDE" },
        { label: "🧠 Conseils Ergonomie", fn: "SAT_SHOW_ERGONOMIE_TIPS" },
        { separator: true },
        { label: "✨ Smart Defaults", fn: "SAT_APPLY_SMART_DEFAULTS" },
        { label: "🔄 Form Auto-Fill", fn: "SAT_TEST_SMART_FORM_FILL" }
      ]
    }
  ];
  
  // ===== CONTEXTE DYNAMIQUE =====
  // Adapte le menu selon le contexte actuel (sheet, état, données)
  if (context.isFirstTime) {
    // First-time: mettez "Installation" en premier
    config.unshift({
      label: "⚡ DÉMARRAGE RAPIDE",
      items: [
        { label: "🧱 Installer structure (1-clic)", fn: "SAT_MASTER_INIT" },
        { label: "📖 Voir guide rapide", fn: "SAT_showHelp" }
      ]
    });
  }
  
  if (context.isProduction) {
    // Production sheet: mettre "Ajouter" au premier plan
    var addIdx = config.findIndex(function(m) { return m.label && m.label.includes("Production"); });
    if (addIdx > -1) {
      config.unshift(config.splice(addIdx, 1)[0]);
    }
  }
  
  if (context.hasProductionData && context.hasErrors) {
    // Erreurs trouvées: mettez "Résilience & Santé" en avant
    var resilienceIdx = config.findIndex(function(m) { return m.label && m.label.includes("Résilience"); });
    if (resilienceIdx > -1) {
      config.unshift({
        label: "🚨 URGENT!",
        items: [
          { label: "🔴 Erreurs détectées - Quick Fix", fn: "SAT_QUICK_FIX" },
          { label: "🔧 Recovery automatique", fn: "SAT_RECOVERY" }
        ]
      });
    }
  }
  
  SAT.Menu.build("🧰 S.A.T.", config);
}

/**
 * Wrapper pour valider l'état avant opération (menu)
 */
function SAT_validateBeforeOp() {
  try {
    if (SAT_VALIDATE_STATE("menu-check")) {
      SAT.Log.info("✓ Validation: État du projet OK");
    } else {
      SAT.Log.error("❌ Validation: État du projet INVALIDE");
      SAT.Log.info("  → Utiliser 'Recovery automatique'");
    }
  } catch (e) {
    SAT.Log.error("Validation: " + e.message);
  }
}

/**
 * Affiche dialogue bienvenue si structure manquante
 * Propose installation automatique
 */
function SAT_showWelcome() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dashboard = ss.getSheetByName(SAT.CFG.SHEETS.DASHBOARD);
    
    if (!dashboard) {
      // Auto-install silently (no popup)
      SAT_install_final();
    }
  } catch (err) {
    SAT.Log.warn("Welcome: " + err.message);
  }
}

/**
 * Formatage rapide: gel lignes 1, en-têtes bleus
 */
function SAT_quickFormat() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheets().forEach(function(sheet) {
      try {
        sheet.setFrozenRows(1);
      } catch (e) {}
    });
  } catch (err) {
    Logger.log("Format: " + err.message);
  }
}

/**
 * Affiche l'aide complète dans une dialogue HTML
 * Sections: Première utilisation, Outils, Conseils
 */
function SAT_showHelp() {
  var html = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial; color: #333; background: #f5f5f5; }
        header {
          background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
          color: white;
          padding: 20px;
          text-align: center;
          border-bottom: 3px solid #0d47a1;
        }
        .content { padding: 15px; }
        .section {
          background: white;
          margin: 10px 0;
          padding: 12px;
          border-radius: 5px;
          border-left: 4px solid #1a73e8;
        }
        h2 { color: #1a73e8; font-size: 16px; margin-bottom: 8px; }
        ul { margin-left: 20px; }
        li { margin: 6px 0; font-size: 13px; }
      </style>
    </head>
    <body>
      <header>
        <h1>🧰 SAT ASSIST</h1>
      </header>
      
      <div class="content">
        <div class="section">
          <h2>📖 Première Utilisation</h2>
          <ul>
            <li>Menu 🧰 → Données → Installer structure</li>
            <li>Remplir les referentiels</li>
            <li>Ajouter lignes de production</li>
            <li>Onglet overview = tableau de bord</li>
          </ul>
        </div>

        <div class="section">
          <h2>🔧 Outils</h2>
          <ul>
            <li><strong>Diagnostic:</strong> Vérifie l'intégrité</li>
            <li><strong>Quick Fix:</strong> Réparation rapide</li>
            <li><strong>Init complète:</strong> Réinitialise tout</li>
          </ul>
        </div>

        <div class="section">
          <h2>💡 Conseil</h2>
          <ul>
            <li>Si erreur → Menu → Outils → Init complète</li>
            <li>Console: Extensions → Apps Script → Console</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `)
  .setWidth(350)
  .setHeight(500);
  
  SpreadsheetApp.getUi().showModelessDialog(html, "🧰 Guide");
}

/**
 * Améliorer la mise en page + zones éditables + alternance couleurs + filtres
 * VERSION RÉSILIENTE: Gère tous les cas d'erreur
 */
function SAT_improveLayout() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Validation préalable
    if (!SAT_VALIDATE_STATE("improveLayout")) {
      SAT.UI.alert("❌ Erreur", "État du projet invalide. Exécuter SAT_RECOVERY() d'abord", "error");
      return;
    }
    
    SAT.Log.divider("🎨 Amélioration mise en page (résiliente)");
    
    var sheets = ss.getSheets();
    var successCount = 0;
    var errorCount = 0;
    
    // Format basic pour tous les sheets
    sheets.forEach(function(sheet) {
      try {
        var sheetName = sheet.getName();
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        
        // Sauté si sheet vide
        if (lastRow <= 0 || lastCol <= 0) {
          SAT.Log.warn(sheetName + ": vide, ignoré");
          return;
        }
        
        // Largeurs colonnes (défensif)
        for (var c = 1; c <= Math.min(lastCol, 15); c++) {
          try {
            sheet.setColumnWidth(c, 120);
          } catch (e) {
            // Continuer si une colonne échoue
          }
        }
        
        // En-tête
        try {
          var headerRange = sheet.getRange(1, 1, 1, lastCol);
          headerRange.setFontWeight("bold");
          headerRange.setFontSize(12);
          headerRange.setBackground("#1a73e8");
          headerRange.setFontColor("white");
          headerRange.setVerticalAlignment("middle");
          headerRange.setHorizontalAlignment("center");
          sheet.setRowHeight(1, 28);
        } catch (e) {
          SAT.Log.warn(sheetName + " headers: " + e.message);
        }
        
        // Gel
        try {
          sheet.setFrozenRows(1);
        } catch (e) {
          SAT.Log.warn(sheetName + " freeze: " + e.message);
        }
        
        // Alternance (défensif - ne pas planter si une ligne échoue)
        if (lastRow > 1 && lastCol > 0) {
          try {
            for (var r = 2; r <= lastRow && r <= 2 + 1000; r++) {  // Limite de sécurité
              try {
                var rowBg = (r % 2 === 0) ? "#f0f7ff" : "#ffffff";
                var rowRange = sheet.getRange(r, 1, 1, lastCol);
                rowRange.setBackground(rowBg);
              } catch (e) {
                // Continuer si une ligne échoue
              }
            }
          } catch (e) {
            SAT.Log.warn(sheetName + " colors: " + e.message);
          }
        }
        
        SAT.Log.info("✓ " + sheetName);
        successCount++;
      } catch (e) {
        SAT.Log.error(sheet.getName() + ": " + e.message);
        errorCount++;
      }
    });
    
    // Formatage spécialisé (ne pas planter si échoue)
    try {
      SAT_formatProductionSheet_(ss);
    } catch (e) {
      SAT.Log.warn("Production format: " + e.message);
    }
    
    try {
      SAT_formatReferentielSheets_(ss);
    } catch (e) {
      SAT.Log.warn("Referentiel format: " + e.message);
    }
    
    // Rapport
    if (errorCount === 0) {
      SAT.Log.success("✅ Mise en page complète (" + successCount + " sheets)");
      SAT.Log.success("Mise en page: Format appliqué à " + successCount + " feuille(s)");
    } else {
      SAT.Log.warn("⚠️  Mise en page partielle (" + successCount + " OK, " + errorCount + " erreurs)");
      SAT.Log.warn("⚠️ Mise en page: " + successCount + " feuille(s) formatées, " + errorCount + " erreur(s)");
    }
    
  } catch (err) {
    SAT.Log.error("improveLayout FATAL: " + err.message);
    SAT.UI.alert("❌ Erreur critique", "Mise en page échouée:\n" + err.message, "error");
  }
}

/**
 * Formate la feuille production avec zones éditables
 */
function SAT_formatProductionSheet_(ss) {
  try {
    var cfg = SAT.CFG;
    var sheet = ss.getSheetByName(cfg.SHEETS.PRODUCTION);
    if (!sheet) return;
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < cfg.PRODUCTION.DATA_ROW || lastCol < 1) return;
    
    // Zone éditable: colonnes Machine, IN, OUT, Nb (vert clair)
    var editableCols = [cfg.PRODUCTION.COLS.MACHINE, cfg.PRODUCTION.COLS.IN_RES, cfg.PRODUCTION.COLS.OUT_RES, cfg.PRODUCTION.COLS.NB];
    editableCols.forEach(function(col) {
      try {
        if (col <= lastCol) {
          var colRange = sheet.getRange(cfg.PRODUCTION.DATA_ROW, col, lastRow - cfg.PRODUCTION.DATA_ROW + 1, 1);
          colRange.setBackground("#e8f5e9");  // Vert clair = éditable
          colRange.setBorder(true, true, true, true, false, false, "#81c784", SpreadsheetApp.BorderStyle.SOLID);
        }
      } catch (e) {
        // Continuer si une colonne échoue
      }
    });
    
    // Zone calculée: colonnes IN/min, OUT/min (gris = lecture seule)
    var readOnlyCols = [cfg.PRODUCTION.COLS.IN_RATE, cfg.PRODUCTION.COLS.OUT_RATE];
    readOnlyCols.forEach(function(col) {
      try {
        if (col <= lastCol) {
          var colRange = sheet.getRange(cfg.PRODUCTION.DATA_ROW, col, lastRow - cfg.PRODUCTION.DATA_ROW + 1, 1);
          colRange.setBackground("#f5f5f5");  // Gris = lecture seule
          colRange.setBorder(true, true, true, true, false, false, "#bdbdbd", SpreadsheetApp.BorderStyle.DASHED);
        }
      } catch (e) {
        // Continuer si une colonne échoue
      }
    });
    
    // Ajouter filtres (défensif)
    try {
      sheet.getRange(1, 1, lastRow, lastCol).createFilter();
    } catch (e) {
      SAT.Log.warn("Production filters: " + e.message);
    }
  } catch (e) {
    SAT.Log.error("formatProductionSheet: " + e.message);
  }
}

/**
 * Formate les feuilles de référentiel avec zones
 * RÉSILIENT: Gère les cas où colonnes manquent ou erreurs de border
 */
function SAT_formatReferentielSheets_(ss) {
  try {
    var cfg = SAT.CFG;
    var refSheets = [cfg.SHEETS.REF_BASE, cfg.SHEETS.REF_MACHINES];
    
    refSheets.forEach(function(sheetName) {
      try {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) return;
        
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        if (lastRow < 2 || lastCol < 1) return;
        
        // Zone éditable: toutes les colonnes (vert très clair)
        try {
          var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
          dataRange.setBackground("#e8f5e9");  // Vert très clair
          
          // Borders (défensif - peut échouer sur gros sheets)
          try {
            dataRange.setBorder(true, true, true, true, false, false, "#81c784", SpreadsheetApp.BorderStyle.SOLID);
          } catch (e) {
            // Si borders échoue, continuer sans
            SAT.Log.warn(sheetName + " borders failed");
          }
        } catch (e) {
          SAT.Log.warn(sheetName + " background: " + e.message);
        }
        
        // Ajouter filtres (défensif)
        try {
          sheet.getRange(1, 1, lastRow, lastCol).createFilter();
        } catch (e) {
          SAT.Log.warn(sheetName + " filters: " + e.message);
        }
      } catch (e) {
        SAT.Log.warn("Referentiel sheet error: " + e.message);
      }
    });
  } catch (e) {
    SAT.Log.error("formatReferentielSheets: " + e.message);
  }
}

/**
 * Ajouter filtres dynamiques à tous les tableaux
 */
function SAT_addDynamicFilters() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = SAT.CFG;
  
  try {
    SAT.Log.divider("⚡ Ajout filtres dynamiques");
    
    var sheets = [cfg.SHEETS.PRODUCTION, cfg.SHEETS.REF_BASE, cfg.SHEETS.REF_MACHINES, cfg.SHEETS.DASHBOARD];
    sheets.forEach(function(sheetName) {
      try {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          SAT.Log.warn(sheetName + ": non trouvé");
          return;
        }
        
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();
        if (lastRow < 1 || lastCol < 1) return;
        
        // Supprimer filtre existant
        try {
          sheet.getFilter().remove();
        } catch (e) {}
        
        // Ajouter nouveau filtre
        sheet.getRange(1, 1, lastRow, lastCol).createFilter();
        SAT.Log.info("Filtres: " + sheetName);
      } catch (e) {
        SAT.Log.warn(sheetName + ": " + e.message);
      }
    });
    
    SAT.Log.info("✅ Filtres: Filtres dynamiques ajoutés");
    
  } catch (err) {
    SAT.Log.error("addDynamicFilters: " + err.message);
  }
}

/**
 * Calcul automatique des IN/OUT par minute
 * Wrapper menu
 */
function SAT_AutoCalc_Menu() {
  try {
    SAT.AutoCalc.applyToProduction();
    SAT_recalcAll();
    SAT.Log.success("✅ Calcul auto appliqué: IN/OUT par minute calculés automatiquement");
  } catch (err) {
    SAT.UI.alert("❌ Erreur", "Calcul auto échoué:\n" + err.message, "error");
  }
}

/**
 * Menu wrapper: Setup Complet avec installation automatique des triggers
 */
function SAT_SETUP_EVERYTHING_Menu() {
  try {
    SAT.UI.progress("🚀 Démarrage...", 0);
    SAT_SETUP_EVERYTHING();
    SAT.UI.progress("✅ Setup terminé!", 100);
  } catch (err) {
    SAT.UI.alert("❌ Erreur Setup", "Setup échoué:\n" + err.message, "error");
  }
}

/**
 * Menu wrapper: Initialisation Complète
 */
function SAT_INITIALIZE_ALL_Menu() {
  try {
    SAT.UI.progress("🔄 Initialisation...", 0);
    SAT_INITIALIZE_ALL();
    SAT.UI.progress("✅ Initialisation terminée!", 100);
  } catch (err) {
    SAT.UI.alert("❌ Erreur Init", "Initialisation échouée:\n" + err.message, "error");
  }
}

/**
 * Menu wrapper: Vérifier si initialisation est nécessaire
 */
function SAT_CHECK_INIT_NEEDED() {
  try {
    var needsInit = SAT_isFirstTimeSetup();
    var needsDocumentation = _needsDocumentation();
    var needsAutoDetection = _needsAutoDetection();
    
    var report = "📋 État de l'initialisation:\n\n";
    report += (needsInit ? "❌" : "✅") + " Setup initial: " + (needsInit ? "NÉCESSAIRE" : "OK") + "\n";
    report += (needsDocumentation ? "❌" : "✅") + " Documentation: " + (needsDocumentation ? "MANQUANTE" : "OK") + "\n";
    report += (needsAutoDetection ? "⚠️" : "✅") + " Étages: " + (needsAutoDetection ? "À détecter" : "À jour") + "\n";
    
    report += "\n🎯 Recommandations:\n";
    if (needsInit) {
      report += "  • Exécuter: SAT_SETUP_EVERYTHING\n";
    }
    if (needsDocumentation || needsAutoDetection) {
      report += "  • Exécuter: SAT_INITIALIZE_ALL\n";
    }
    if (!needsInit && !needsDocumentation && !needsAutoDetection) {
      report += "  ✅ Aucune action nécessaire!";
    }
    
    SAT.UI.alert("ℹ️ Diagnostic", report, "info");
  } catch (err) {
    SAT.UI.alert("❌ Erreur", "Diagnostic échoué:\n" + err.message, "error");
  }
}
/**
 * Force create critical sheets if they don't exist
 * Called by onOpen() if SAT_install() fails
 */
function SAT_createCriticalSheetsForce_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cfg = SAT.CFG;
    
    Logger.log("🔨 Force creating critical sheets...");
    
    var criticalSheets = [
      cfg.SHEETS.DASHBOARD,
      cfg.SHEETS.PRODUCTION,
      cfg.SHEETS.RESOURCES,
      cfg.SHEETS.MACHINES,
      cfg.SHEETS.FLOORS
    ];
    
    var created = 0;
    for (var i = 0; i < criticalSheets.length; i++) {
      var sheetName = criticalSheets[i];
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        ss.insertSheet(sheetName);
        created++;
        Logger.log("  ✓ Created: " + sheetName);
      } else {
        Logger.log("  ✓ Exists: " + sheetName);
      }
    }
    
    // Now populate with headers and seed data
    Logger.log("📝 Filling in headers and seed data...");
    try {
      SAT_installHeaders_();
      Logger.log("  ✓ Headers installed");
    } catch (e) {
      Logger.log("  ⚠️ Headers: " + e.message);
    }
    
    try {
      SAT_installSeedIfEmpty_();
      Logger.log("  ✓ Seed data installed");
    } catch (e) {
      Logger.log("  ⚠️ Seed: " + e.message);
    }
    
    Logger.log("✅ Force create done (" + created + " new sheets)");
    return true;
  } catch (e) {
    Logger.log("❌ Force create error: " + e.message);
    throw e;
  }
}