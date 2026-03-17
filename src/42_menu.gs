/* ============================================================
 * 42_menu.gs — onOpen, menu S.A.T., actions utilisateur
 * ============================================================ */

/**
 * Déclenché automatiquement à l'ouverture du classeur.
 * Ordre : 1) menu  2) vérif version  3) recalcul si données présentes
 */
function onOpen(e) {
  // 1. Menu — toujours en premier (même si le reste échoue)
  _buildMenu();

  // 2. Vérification version → install automatique si nécessaire
  try {
    var props  = PropertiesService.getDocumentProperties();
    var stored = props.getProperty('SAT_VERSION') || '';
    var cur    = SAT.CFG.VERSION;

    if (stored !== cur) {
      var prodSh  = SAT.S.get(SAT.CFG.SHEETS.PROD);
      var hasData = prodSh && prodSh.getLastRow() >= SAT.CFG.DAT_ROW;
      if (!prodSh || !hasData) {
        // Première installation ou feuilles absentes → install complète
        Logger.log('SAT v' + stored + ' -> v' + cur + ' : installation initiale');
        SpreadsheetApp.getActiveSpreadsheet()
          .toast('Installation SAT ' + cur + '\u2026', 'SAT', 10);
        SAT_install();
      } else {
        // Données présentes → ne pas écraser, laisser l'utilisateur décider
        PropertiesService.getDocumentProperties().setProperty('SAT_VERSION', cur);
        SpreadsheetApp.getActiveSpreadsheet()
          .toast('SAT v' + cur + ' charg\u00e9. Utilisez "Mettre \u00e0 jour" si n\u00e9cessaire.', 'S.A.T.', 6);
        Logger.log('SAT v' + cur + ' — donn\u00e9es conserv\u00e9es (was v' + stored + ')');
      }
    } else {
      Logger.log('SAT v' + cur + ' — a jour, pas de migration');
    }
  } catch (err) {
    Logger.log('ERR onOpen version check: ' + err.message);
  }

  // 3. Recalcul automatique si des données sont présentes
  try {
    var prodSheet = SAT.S.get(SAT.CFG.SHEETS.PROD);
    if (prodSheet && prodSheet.getLastRow() >= SAT.CFG.DAT_ROW) {
      SAT_recalcAll();
    }
  } catch(e) {}
}

// ─── Construction du menu ─────────────────────────────────────────────────

function _buildMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('S.A.T.')
      .addItem('Recalcul complet',          'SAT_recalcAll')
      .addItem('Résumé de production',      'SAT_SHOW_SUMMARY')
      .addSeparator()
      .addItem('Ajouter un étage',          'SAT_ADD_FLOOR')
      .addItem('Lister les étages',         'SAT_LIST_FLOORS')
      .addSeparator()
      .addItem('Créer graphiques Dashboard','SAT_CREATE_CHARTS')
      .addSeparator()
      .addItem('Mettre à jour (reinstall)', 'SAT_forceUpdate')
      .addItem('RESET complet',             'SAT_resetAll')
      .addToUi();
  } catch(e) {
    Logger.log('ERR _buildMenu: ' + e.message);
  }
}

// ─── Actions du menu ────────────────────────────────────────────────────────

/** Réinstalle toute la structure (efface les données). */
function SAT_forceUpdate() {
  var ui = SpreadsheetApp.getUi();
  var r  = ui.alert(
    'Mettre à jour SAT',
    'Reconstruit toutes les feuilles.\n' +
    'Vos données de PRODUCTION seront effacées.\n\nContinuer ?',
    ui.ButtonSet.YES_NO
  );
  if (r !== ui.Button.YES) return;
  try {
    PropertiesService.getDocumentProperties().deleteProperty('SAT_VERSION');
    SAT_install();
    ui.alert('Mise à jour v' + SAT.CFG.VERSION + ' terminée.');
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

/** Reset complet — equivalent de forceUpdate. */
function SAT_resetAll() {
  var ui = SpreadsheetApp.getUi();
  var r  = ui.alert(
    'RESET complet',
    'TOUTES les données (production + référentiels) seront effacées.\n\nContinuer ?',
    ui.ButtonSet.YES_NO
  );
  if (r !== ui.Button.YES) return;
  try {
    PropertiesService.getDocumentProperties().deleteProperty('SAT_VERSION');
    SAT_install();
    ui.alert('Reset terminé.');
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

/** Affiche un résumé des statistiques de production. */
function SAT_SHOW_SUMMARY() {
  var ui = SpreadsheetApp.getUi();
  try {
    var rows  = SAT.Engine.buildIndex();
    var s     = SAT.Engine.stats(rows);
    ui.alert(
      'Résumé de production',
      [
        'Lignes        : ' + s.lines,
        'Machines      : ' + s.machines,
        'Étages        : ' + s.etages,
        'Ressources    : ' + s.resources,
        '────────────────',
        'Erreurs       : ' + s.errors,
        'À compléter   : ' + s.todo
      ].join('\n'),
      ui.ButtonSet.OK
    );
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

/** Ajoute un étage dans la feuille Étages. */
function SAT_ADD_FLOOR() {
  var ui = SpreadsheetApp.getUi();
  var r  = ui.prompt('Ajouter un étage', 'Nom du nouvel étage :', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var name = r.getResponseText().trim();
  if (!name) { ui.alert('Nom vide.'); return; }
  try {
    var sh   = SAT.S.ensure(SAT.CFG.SHEETS.ETAG);
    var next = sh.getLastRow() + 1;
    sh.getRange(next, 1, 1, 4).setValues([[name, next - 1, '', '']]);
    ui.alert('Étage "' + name + '" ajouté (ligne ' + next + ').');
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

/** Liste les étages configurés. */
function SAT_LIST_FLOORS() {
  var ui = SpreadsheetApp.getUi();
  try {
    var sh = SAT.S.get(SAT.CFG.SHEETS.ETAG);
    if (!sh || sh.getLastRow() < 2) { ui.alert('Aucun étage configuré.'); return; }
    var data  = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
    var lines = data
      .filter(function(r) { return r[0]; })
      .map(function(r, i) {
        return (i + 1) + '.  ' + r[0] + (r[2] ? '  — ' + r[2] : '');
      });
    ui.alert('Étages (' + lines.length + ')', lines.join('\n'), ui.ButtonSet.OK);
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

/** Crée les graphiques dans le Dashboard. */
function SAT_CREATE_CHARTS() {
  var ui = SpreadsheetApp.getUi();
  if (typeof SAT.Charts !== 'undefined' && SAT.Charts.createAllCharts) {
    try {
      SAT.Charts.createAllCharts();
      ui.alert('Graphiques créés dans le Dashboard.');
    } catch(e) {
      ui.alert('Erreur graphiques : ' + e.message);
    }
  } else {
    // Graphique simple inline si SAT.Charts absent
    try {
      _createSimpleCharts();
      ui.alert('Graphiques créés dans le Dashboard.');
    } catch(e) {
      ui.alert('Erreur : ' + e.message);
    }
  }
}

/** Graphique simple de production par étage. */
function _createSimpleCharts() {
  var cfg   = SAT.CFG;
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var prod  = SAT.S.get(cfg.SHEETS.PROD);
  var dash  = SAT.S.get(cfg.SHEETS.DASH);
  if (!prod || !dash) throw new Error('Feuilles manquantes');

  // Supprimer anciens graphiques
  dash.getCharts().forEach(function(c) { try { dash.removeChart(c); } catch(e) {} });

  var last = prod.getLastRow();
  if (last < cfg.DAT_ROW) { Logger.log('Pas de données pour le graphique'); return; }

  // Nombre de machines par étage
  var rows = SAT.Engine.buildIndex();
  if (rows.length === 0) return;

  // Construire données pour graphique dans une zone temp du Dashboard
  var chartData = {};
  rows.forEach(function(r) {
    chartData[r.etage] = (chartData[r.etage] || 0) + (r.nb || 0);
  });

  var keys = Object.keys(chartData);
  var tempRow = 20;
  dash.getRange(tempRow, 6).setValue('Étage');
  dash.getRange(tempRow, 7).setValue('Machines');
  keys.forEach(function(k, i) {
    dash.getRange(tempRow + 1 + i, 6).setValue(k);
    dash.getRange(tempRow + 1 + i, 7).setValue(chartData[k]);
  });

  var dataRange = dash.getRange(tempRow, 6, keys.length + 1, 2);
  var chart = dash.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(dataRange)
    .setPosition(4, 4, 10, 10)
    .setOption('title', 'Machines par étage')
    .setOption('legend', { position: 'none' })
    .build();
  dash.insertChart(chart);
}

// ─── Compatibilité avec les anciennes fonctions référencées ─────────────────

function SAT_isFirstTimeSetup()     { return false; }
function SAT_buildMenu()            { _buildMenu(); }
function SAT_install_final()        { SAT_install(); }
function SAT_resetSheetCompletely() { SAT_resetAll(); }
function SAT_DIAGNOSTIC()           {
  var ui  = SpreadsheetApp.getUi();
  var cfg = SAT.CFG;
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var shNames = [cfg.SHEETS.DASH, cfg.SHEETS.PROD, cfg.SHEETS.REC, cfg.SHEETS.RES, cfg.SHEETS.MACH, cfg.SHEETS.ETAG];
  var ok   = shNames.filter(function(n) { return ss.getSheetByName(n); }).length;
  var rows = 0;
  try {
    var prodSh = ss.getSheetByName(cfg.SHEETS.PROD);
    if (prodSh) rows = Math.max(0, prodSh.getLastRow() - cfg.DAT_ROW + 1);
  } catch(e) {}
  var ver  = '';
  try { ver = PropertiesService.getDocumentProperties().getProperty('SAT_VERSION') || 'non définie'; } catch(e) {}
  ui.alert(
    'Diagnostic SAT',
    'Version code   : ' + cfg.VERSION + '\n' +
    'Version stockée: ' + ver + '\n' +
    'Feuilles OK    : ' + ok + ' / 6\n' +
    'Lignes prod    : ' + rows,
    ui.ButtonSet.OK
  );
}
