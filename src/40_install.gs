/* ============================================================
 * 40_install.gs — Installation complète SAT v3.4
 * SAT_install() crée / recrée toutes les feuilles proprement.
 *
 * Feuilles créées (dans l'ordre d'affichage) :
 *   1. 📊 Dashboard
 *   2. 🏭 Production
 *   3. 📖 Recettes        ← toutes les recettes wiki 1.1
 *   4. 💎 Ressources
 *   5. ⚙️ Machines
 *   6. 🏗️ Étages           ← pré-remplie avec 3 exemples
 *
 * Architecture Production :
 *   A Étage | B Machine | C Recette | D Qt/min OUT | E Qt/min IN
 *   F Nb | G Overclock % | H Pureté | I Flags | J Cause
 *   → D et E sont calculées automatiquement depuis la recette
 *   → L'utilisateur ne saisit JAMAIS les taux IN/OUT
 * ============================================================ */

/**
 * Point d'entrée principal.
 * Appelé par onOpen() (auto-migration) ou depuis le menu (RESET).
 */
function SAT_install() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = SAT.CFG;

  // Charger les données du jeu (MACHINES, RESOURCES, RECIPES) pour la version configurée
  SAT.loadGameData();

  Logger.log('\n=== SAT Installation v' + cfg.VERSION + ' (jeu v' + cfg.GAME_VERSION + ') ===\n');

  // ── Backup user data before full reset ─────────────────────────────────────
  // Save user-entered columns from Production (A,B,C,F,G,H) and entire Étages.
  // Auto-computed columns (D,E,I,J,K,L) are excluded — they are recalculated.
  var _backupProd  = null; // [[etage, machine, recipe, nb, oc, purity], ...]
  var _backupEtag  = null; // [[col1, col2, col3, col4], ...]
  var _backupObj   = null; // [[item, qt, phase, etage_cible, statut, nb, ressources], ...]
  var _prodSh = ss.getSheetByName(cfg.SHEETS.PROD);
  var _etagSh = ss.getSheetByName(cfg.SHEETS.ETAG);
  var _objSh  = ss.getSheetByName(cfg.SHEETS.OBJ);
  var c = cfg.C;
  if (_prodSh && _prodSh.getLastRow() >= cfg.DAT_ROW) {
    var _nRows = _prodSh.getLastRow() - cfg.DAT_ROW + 1;
    var _full  = _prodSh.getRange(cfg.DAT_ROW, 1, _nRows, c.SLOOP).getValues();
    _backupProd = _full.map(function(row) {
      return [row[c.ETAGE-1], row[c.MACHINE-1], row[c.RECIPE-1],
              row[c.NB-1], row[c.OC-1], row[c.PUR-1], row[c.SLOOP-1]];
    }).filter(function(row) {
      // Keep rows that have at least a recipe or a floor set
      return row[0] !== '' || row[2] !== '';
    });
  }
  if (_etagSh && _etagSh.getLastRow() >= 2) {
    var _eRows = _etagSh.getLastRow() - 1;
    _backupEtag = _etagSh.getRange(2, 1, _eRows, 6).getValues();
  }
  if (_objSh && _objSh.getLastRow() >= 2) {
    var _oRows = _objSh.getLastRow() - 1;
    _backupObj = _objSh.getRange(2, 1, _oRows, 7).getValues()
      .filter(function(row) { return row[0] !== ''; });
  }

  // ── Full reset ─────────────────────────────────────────────────────────────
  // Insert a placeholder (GAS requires at least 1 sheet), delete all others,
  // then install SAT sheets cleanly to avoid emoji encoding / stale duplicates.
  var _tmpSh = ss.insertSheet('__SAT_RESET__');
  ss.getSheets().forEach(function(sh) {
    if (sh.getSheetId() !== _tmpSh.getSheetId()) {
      try { ss.deleteSheet(sh); } catch(e) {}
    }
  });

  _installDashboard();
  _installProduction();
  _installRecipes();
  _installResources();
  _installMachines();
  _installFloors();
  _installObjectives();

  // Supprimer le placeholder AVANT les validations (qui ont besoin des vraies feuilles)
  try { ss.deleteSheet(_tmpSh); } catch(e) {}

  _setupValidations();
  _setupProtections();

  // ── Restore user data ──────────────────────────────────────────────────────
  // Write back Production user columns (A,B,C,F,G,H) and Étages rows.
  var _newProdSh = ss.getSheetByName(cfg.SHEETS.PROD);
  if (_backupProd && _backupProd.length > 0 && _newProdSh) {
    _backupProd.forEach(function(row, i) {
      var r = cfg.DAT_ROW + i;
      _newProdSh.getRange(r, c.ETAGE,   1, 1).setValue(row[0]);
      _newProdSh.getRange(r, c.MACHINE, 1, 1).setValue(row[1]);
      _newProdSh.getRange(r, c.RECIPE,  1, 1).setValue(row[2]);
      _newProdSh.getRange(r, c.NB,      1, 1).setValue(row[3]);
      _newProdSh.getRange(r, c.OC,      1, 1).setValue(row[4]);
      _newProdSh.getRange(r, c.PUR,     1, 1).setValue(row[5]);
      if (row[6] !== undefined && row[6] !== '') _newProdSh.getRange(r, c.SLOOP, 1, 1).setValue(row[6]);
    });
    Logger.log('Restored ' + _backupProd.length + ' production rows');
  }
  var _newEtagSh = ss.getSheetByName(cfg.SHEETS.ETAG);
  if (_backupEtag && _backupEtag.length > 0 && _newEtagSh) {
    _newEtagSh.getRange(2, 1, _backupEtag.length, 6).setValues(_backupEtag);
    Logger.log('Restored ' + _backupEtag.length + ' floor rows');
  }
  var _newObjSh = ss.getSheetByName(cfg.SHEETS.OBJ);
  if (_backupObj && _backupObj.length > 0 && _newObjSh) {
    _newObjSh.getRange(2, 1, _backupObj.length, 7).setValues(_backupObj);
    Logger.log('Restored ' + _backupObj.length + ' objective rows');
  }

  // Réordonner les onglets (les feuilles sont déjà dans le bon ordre d'insertion,
  // mais on repositionne explicitement pour plus de robustesse)
  var order = [
    cfg.SHEETS.DASH,
    cfg.SHEETS.PROD,
    cfg.SHEETS.OBJ,
    cfg.SHEETS.REC,
    cfg.SHEETS.RES,
    cfg.SHEETS.MACH,
    cfg.SHEETS.ETAG
  ];
  order.forEach(function(name, i) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    try {
      ss.setActiveSheet(sh);
      ss.moveActiveSheet(i + 1);
    } catch(e) { Logger.log('WARN moveActiveSheet(' + name + '): ' + e.message); }
  });

  // Masquer les onglets de référence (accès via menu S.A.T.)
  _hideRefSheets();

  // Activer le Dashboard
  var dash = ss.getSheetByName(cfg.SHEETS.DASH);
  if (dash) ss.setActiveSheet(dash);

  // Stocker la version installée
  try {
    PropertiesService.getDocumentProperties().setProperty('SAT_VERSION', cfg.VERSION);
  } catch(e) {}

  Logger.log('=== Installation terminée v' + cfg.VERSION + ' ===\n');
  ss.toast('Installation SAT v' + cfg.VERSION + ' terminée ! — Active l\'assistant : menu S.A.T. → ⚙️ Activer l\'assistant au démarrage', 'S.A.T.', 10);
}

/**
 * Supprime les onglets en double.
 * Utilise une comparaison normalisée (sans emoji) pour détecter les doublons
 * même quand l'encodage des caractères spéciaux diffère légèrement.
 */
function _deduplicateSheets() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var seen = {}; // clé normalisée → true

  // Parcourir dans l'ordre pour conserver le premier onglet (index le plus bas)
  ss.getSheets().forEach(function(sh) {
    var raw  = sh.getName();
    var norm = raw.replace(/[^\w\s\u00C0-\u024F\-]/g, '').trim().toLowerCase();
    if (seen[norm]) {
      try { ss.deleteSheet(sh); } catch(e) {}
    } else {
      seen[norm] = true;
    }
  });
}

/** Masque les 3 onglets de référence (Recettes, Ressources, Machines). */
function _hideRefSheets() {
  var cfg = SAT.CFG;
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  [cfg.SHEETS.REC, cfg.SHEETS.RES, cfg.SHEETS.MACH].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (sh) try { sh.hideSheet(); } catch(e) {}
  });
  SAT.Log.ok('Référentiels masqués');
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Encapsule un nom de feuille pour formule (gère les apostrophes/emojis) */
function _q(name) {
  return "'" + name.replace(/'/g, "''") + "'";
}

/** Vide et retourne la feuille (la crée si absente). */
function _clearSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Dans le contexte SAT_install(), toutes les feuilles ont été supprimées avant
  // l'appel → on insère simplement une feuille propre.
  var sh = ss.getSheetByName(name);
  if (sh) {
    sh.clearContents();
    sh.clearFormats();
    sh.clearConditionalFormatRules();
    try { var f = sh.getFilter(); if (f) f.remove(); } catch(e) {}
    sh.getCharts().forEach(function(c) { try { sh.removeChart(c); } catch(e) {} });
    return sh;
  }
  return ss.insertSheet(name);
}

/** Applique le style d'en-tête sur un Range. */
function _styleHeader(range, bg) {
  range
    .setBackground(bg || '#1565C0')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function _installDashboard() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.DASH);

  // ── Ligne 1 — Titre ────────────────────────────────────────────────────────
  sh.getRange(1, 1, 1, 8).merge()
    .setValue('S.A.T.  —  Satisfactory Automated Tracker')
    .setBackground('#0D47A1').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(18)
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 48);

  // ── Ligne 2 — Sous-titre version ───────────────────────────────────────────
  sh.getRange(2, 1, 1, 8).merge()
    .setValue('v' + cfg.VERSION + '  —  wiki officiel Satisfactory ' + cfg.GAME_VERSION)
    .setBackground('#1565C0').setFontColor('#BBDEFB')
    .setFontStyle('italic').setFontSize(11).setHorizontalAlignment('center');
  sh.setRowHeight(2, 24);

  // ── Ligne 3 — Séparateur ───────────────────────────────────────────────────
  sh.setRowHeight(3, 8);
  sh.getRange(3, 1, 1, 8).setBackground('#E3F2FD');

  // ══════════════════════════════════════════════════════════════════════════
  // COLONNE GAUCHE (A–D) — Stats production + Électricité
  // COLONNE DROITE (E–H) — Ressources produites + Sous-produites
  // ══════════════════════════════════════════════════════════════════════════

  // ── Section PRODUCTION (A4:D10) ────────────────────────────────────────────
  var secStyle = function(range, bg, fg) {
    range.merge().setBackground(bg).setFontColor(fg)
      .setFontWeight('bold').setFontSize(11)
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
  };
  secStyle(sh.getRange(4, 1, 1, 4), '#1565C0', '#FFFFFF');
  sh.getRange(4, 1).setValue('  \uD83D\uDCCA Production');
  sh.setRowHeight(4, 28);

  var prodLabels = [
    ['Lignes de production',   'B5'],
    ['Machines actives',       'B6'],
    ['\u00C9tages distincts',  'B7'],
    ['Ressources produites',   'B8'],
    ['Lignes avec erreurs',    'B9'],
    ['\u00C0 compl\u00e9ter (Nb=0)', 'B10']
  ];
  prodLabels.forEach(function(row, i) {
    sh.getRange(5 + i, 1).setValue(row[0])
      .setBackground('#F5F5F5').setFontSize(10).setFontWeight('bold');
    sh.getRange(5 + i, 2).setBackground('#FFFFFF').setFontSize(11)
      .setFontWeight('bold').setFontColor('#1565C0').setHorizontalAlignment('center');
    sh.setRowHeight(5 + i, 24);
  });
  sh.getRange(5, 1, prodLabels.length, 2)
    .setBorder(true, true, true, true, true, true, '#BBDEFB', SpreadsheetApp.BorderStyle.SOLID);

  // ── Electricity section (A12:D15) — no row height reduction: row 11 is shared with top-resources data
  sh.getRange(11, 1, 1, 4).setBackground('#FFF8E1');
  secStyle(sh.getRange(12, 1, 1, 4), '#E65100', '#FFFFFF');
  sh.getRange(12, 1).setValue('  \u26A1 \u00C9lectricit\u00e9');
  sh.setRowHeight(12, 28);

  var elecLabels = [
    'Consommation totale (MW)',
    'Production max \u00e0 250% OC (MW)',
    'Derni\u00e8re mise \u00e0 jour'
  ];
  elecLabels.forEach(function(lbl, i) {
    sh.getRange(13 + i, 1).setValue(lbl)
      .setBackground('#FFF3E0').setFontSize(10).setFontWeight('bold');
    sh.getRange(13 + i, 2).setBackground('#FFFFFF').setFontSize(11)
      .setFontWeight('bold').setFontColor('#E65100').setHorizontalAlignment('center');
    sh.setRowHeight(13 + i, 24);
  });
  sh.getRange(13, 1, elecLabels.length, 2)
    .setBorder(true, true, true, true, true, true, '#FFE0B2', SpreadsheetApp.BorderStyle.SOLID);

  // ── Section OBJECTIFS SOLVEUR (A16–B20) ────────────────────────────────────
  sh.setRowHeight(16, 6);
  sh.getRange(16, 1, 1, 4).setBackground('#EDE7F6');
  secStyle(sh.getRange(17, 1, 1, 4), '#4A148C', '#FFFFFF');
  sh.getRange(17, 1).setValue('  \uD83C\uDFAF Objectifs solveur');
  sh.setRowHeight(17, 26);
  var objLabels = [
    'Objectifs d\u00e9finis',
    'Actifs (\u25BA)',
    'R\u00e9solus (Nb machines > 0)',
    'Phase dominante'
  ];
  objLabels.forEach(function(lbl, i) {
    sh.getRange(18 + i, 1).setValue(lbl)
      .setBackground('#F3E5F5').setFontSize(10).setFontWeight('bold');
    sh.getRange(18 + i, 2).setBackground('#FFFFFF').setFontSize(11)
      .setFontWeight('bold').setFontColor('#6A1B9A').setHorizontalAlignment('center');
    sh.setRowHeight(18 + i, 24);
  });
  sh.getRange(17, 1, objLabels.length + 1, 2)
    .setBorder(true, true, true, true, true, true, '#CE93D8', SpreadsheetApp.BorderStyle.SOLID);

  // ── Section TOP RESSOURCES (E4:H12) ────────────────────────────────────────
  secStyle(sh.getRange(4, 5, 1, 4), '#2E7D32', '#FFFFFF');
  sh.getRange(4, 5).setValue('  \uD83D\uDCE6 Top ressources produites (/min)');
  sh.setRowHeight(4, 28);
  // Top resources: 9 rows (col-header at row 5 + 8 data rows 6–13, matching _refreshDashboard)
  sh.getRange(5, 5, 9, 4)
    .setBackground('#F9FBE7').setFontSize(10)
    .setBorder(true, true, true, true, true, false, '#C8E6C9', SpreadsheetApp.BorderStyle.SOLID);
  // En-têtes colonnes ressources
  sh.getRange(5, 5, 1, 4).setValues([['Ressource', '', 'Qt/min', '']]);
  sh.getRange(5, 5, 1, 4).setFontWeight('bold').setFontColor('#2E7D32').setFontSize(9)
    .setBackground('#E8F5E9');

  // ── Section SOUS-PRODUITES (E14:H21) ───────────────────────────────────────
  sh.getRange(13, 5, 1, 4).setBackground('#FCE4EC');
  secStyle(sh.getRange(14, 5, 1, 4), '#C62828', '#FFFFFF');
  sh.getRange(14, 5).setValue('  \u26A0\uFE0F Goulots (ressources manquantes)');
  sh.setRowHeight(14, 28);
  // Bottlenecks: 8 rows (col-header at row 15 + 7 data rows 16–22, matching _refreshDashboard)
  sh.getRange(15, 5, 8, 4)
    .setBackground('#FFF8F8').setFontSize(10)
    .setBorder(true, true, true, true, true, false, '#EF9A9A', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(15, 5, 1, 4).setValues([['Ressource', 'Prod.', 'Conso.', 'D\u00e9ficit']]);
  sh.getRange(15, 5, 1, 4).setFontWeight('bold').setFontColor('#C62828').setFontSize(9)
    .setBackground('#FFEBEE');

  // ── Graphique placeholder col H (position fixe) — créé par _installCharts
  // Row 22 is the last bottleneck data row — give it normal height (not collapsed)
  sh.setRowHeight(22, 24);

  // Charts zone (rows 23-36)
  // Charts anchored at row 25 (left: col A, right: col E) by _installDashboardCharts.
  // 12 rows x 22 px = 264 px — enough to contain 240-px-tall charts without overflow.
  sh.setRowHeight(23, 8);
  sh.getRange(23, 1, 1, 8).setBackground('#E8EAF6');
  secStyle(sh.getRange(24, 1, 1, 8), '#283593', '#FFFFFF');
  sh.getRange(24, 1).setValue('  \uD83D\uDCC8 Charts');
  sh.setRowHeight(24, 28);
  for (var cr = 25; cr <= 36; cr++) { sh.setRowHeight(cr, 22); }

  // Quick start guide (rows 37-43)
  sh.setRowHeight(37, 8);
  sh.getRange(37, 1, 1, 8).setBackground('#E3F2FD');
  secStyle(sh.getRange(38, 1, 1, 8), '#37474F', '#FFFFFF');
  sh.getRange(38, 1).setValue('  \uD83D\uDCA1 Quick start');
  sh.setRowHeight(38, 28);

  var tips = [
    ['1.', 'Fill in Stage, Machine, Recipe, Qty, OC% in the Production sheet.'],
    ['2.', 'Qt/min IN/OUT and \u26A1 MW are computed automatically on each edit.'],
    ['3.', 'OC% = overclock (100 = normal, 250 = max). Col K = rate at OC=100%.'],
    ['4.', 'Purity for extractors only: Impure \u00D70.5 \u2014 Pure \u00D72.0.'],
    ['5.', 'Menu S.A.T. \u203A Full recalc to force a dashboard refresh.']
  ];
  // Merge B-H for each tip so text spans full dashboard width
  tips.forEach(function(tip, i) {
    sh.getRange(39 + i, 1).setValue(tip[0])
      .setFontWeight('bold').setFontColor('#546E7A').setHorizontalAlignment('center');
    sh.getRange(39 + i, 2, 1, 7).merge().setValue(tip[1])
      .setFontColor('#37474F').setFontSize(10).setWrap(true);
    sh.setRowHeight(39 + i, 24);
  });

  // Changelog (rows 45+)
  sh.setRowHeight(44, 8);
  sh.getRange(44, 1, 1, 8).setBackground('#FFF3E0');
  var clRow = 45;
  secStyle(sh.getRange(clRow, 1, 1, 8), '#BF360C', '#FFFFFF');
  sh.getRange(clRow, 1).setValue('  CHANGELOG');
  sh.setRowHeight(clRow, 28);

  var changelog = [
    ['v' + cfg.VERSION, '27 Mar 2026',
      '\u2022 Smart Assistant sidebar: bottleneck detection, one-click solver fix, OC normalizer.\n' +
      '\u2022 Assistant: phase progression coaching, nuclear waste alert, surplus detection.\n' +
      '\u2022 CI: release job auto-creates GitHub release on push to main.'],
    ['v3.5.0', '22 Mar 2026',
      '\u2022 Columns K (Qt/min STD) and L (\u26A1 MW): standard rate + power draw per line.\n' +
      '\u2022 Dashboard: electricity section, bottlenecks, top resources, permanent charts.\n' +
      '\u2022 Archive & migrate: snapshot a factory before a game version update.\n' +
      '\u2022 Stage size calculator with configurable machine clearance margin.\n' +
      '\u2022 Column merges for tips/changelog. Auto bump-version before each push.'],
    ['v3.3.1', '22 Mar 2026',
      '\u2022 Soft-update rebuilds Dashboard + validations on version change.\n' +
      '\u2022 Duplicate sheet dedup on install. Fixed #ERROR via setValue.'],
    ['v3.3', 'Mar 2026',
      '\u2022 Cleared row removes auto-computed columns.\n' +
      '\u2022 New row pre-fills OC=100 and Purity=Normal.\n' +
      '\u2022 Purity flag only shown for extractors.'],
    ['v3.2', '16\u201321 Mar 2026',
      '\u2022 Full rewrite \u2014 8 modules, Satisfactory 1.1 data (FR names).\n' +
      '\u2022 Fixed extractor purity, auto machine fill, Mk.5 flag.'],
    ['v3.1', 'Jan 2026', '\u2022 Per-row targeted recalc (onEdit optimised).'],
    ['v3.0', 'Nov 2025', '\u2022 Migrated to SAT.* namespace architecture.']
  ];
  // Per-row: merge C-H so text spans cols 3-8 (col C alone is 20px — far too narrow)
  changelog.forEach(function(r, i) {
    sh.getRange(clRow + 1 + i, 1).setValue(r[0])
      .setFontWeight('bold').setFontColor('#E65100')
      .setHorizontalAlignment('center').setVerticalAlignment('top');
    sh.getRange(clRow + 1 + i, 2).setValue(r[1])
      .setFontColor('#757575').setFontStyle('italic').setFontSize(10).setVerticalAlignment('top');
    sh.getRange(clRow + 1 + i, 3, 1, 6).merge().setValue(r[2])
      .setFontColor('#424242').setFontSize(10).setWrap(true).setVerticalAlignment('top');
    sh.setRowHeight(clRow + 1 + i, 80);
  });
  sh.getRange(clRow, 1, changelog.length + 1, 8)
    .setBorder(true, true, true, true, false, true, '#FFE0B2', SpreadsheetApp.BorderStyle.SOLID);

  // Column widths
  sh.setColumnWidth(1, 210);  // A - label
  sh.setColumnWidth(2, 100);  // B - value
  sh.setColumnWidth(3, 20);   // C - padding
  sh.setColumnWidth(4, 20);   // D - padding
  sh.setColumnWidth(5, 220);  // E - resource name
  sh.setColumnWidth(6, 75);   // F
  sh.setColumnWidth(7, 75);   // G
  sh.setColumnWidth(8, 75);   // H
  sh.setFrozenRows(2);
  sh.setTabColor('#1A237E'); // Indigo 900 — analytics/overview

  // ── Graphiques permanents (vides si pas de données) ────────────────────────
  _installDashboardCharts(sh);

  SAT.Log.ok('Dashboard install\u00e9');
}

// ─── Production ─────────────────────────────────────────────────────────────
//
// Colonnes (1-based) — alignées sur SAT.CFG.C :
//   A(1) Étage | B(2) Machine | C(3) Recette
//   D(4) Qt/min OUT (auto) | E(5) Qt/min IN (auto)
//   F(6) Nb | G(7) Overclock % | H(8) Pureté
//   I(9) Flags | J(10) Cause | K(11) Qt/min STD | L(12) ⚡ MW total

/**
 * Creates 2 permanent charts on the Dashboard in the dedicated chart zone (rows 25-36).
 * Chart 1 (left, col A): machines per stage. Chart 2 (right, col E): top resources Qt/min.
 * Both use a hidden data buffer at row 50 (well below visible rows 1-46).
 */
function _installDashboardCharts(sh) {
  // Remove existing charts
  sh.getCharts().forEach(function(c) { try { sh.removeChart(c); } catch(e) {} });

  // Hidden data buffer at row 50 — does not interfere with visible rows 1-46
  var buf = 50;
  sh.getRange(buf, 6, 1, 2).setValues([['Stage', 'Machines']]);
  sh.getRange(buf, 8, 1, 2).setValues([['Resource', 'Qt/min']]);

  // Chart 1: machines by stage — anchored at A25 (left half of chart zone)
  var chart1 = sh.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sh.getRange(buf, 6, 2, 2))
    .setPosition(25, 1, 4, 4)
    .setOption('title', 'Machines by stage')
    .setOption('width', 360).setOption('height', 240)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: 'Count', minValue: 0 })
    .setOption('backgroundColor', '#F3E5F5')
    .build();
  sh.insertChart(chart1);

  // Chart 2: top produced resources — anchored at E25 (right half of chart zone)
  var chart2 = sh.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sh.getRange(buf, 8, 2, 2))
    .setPosition(25, 5, 4, 4)
    .setOption('title', 'Top production (Qt/min)')
    .setOption('width', 360).setOption('height', 240)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: 'Qt/min', minValue: 0 })
    .setOption('backgroundColor', '#E8F5E9')
    .build();
  sh.insertChart(chart2);
}

function _installProduction() {
  var cfg = SAT.CFG;
  var c   = cfg.C;
  var sh  = _clearSheet(cfg.SHEETS.PROD);

  var ROWS = 200;

  // ── En-têtes
  var headers = [
    'Étage',       // A — saisie
    'Machine',     // B — déduite de la recette
    'Recette',     // C — saisie (dropdown depuis 📖 Recettes)
    'Qt/min OUT',  // D — calculé auto
    'Qt/min IN',   // E — calculé auto
    'Nb machines', // F — saisie
    'Overclock %', // G — saisie
    'Pureté',      // H — saisie (extracteurs)
    'Flags',       // I — auto
    'Cause',       // J — auto
    'Qt/min STD',  // K — taux base (OC=100%) calculé auto
    '⚡ MW',        // L — consommation électrique totale calculée auto
    'Somersloops'  // M — saisie (nb de somersloops dans les machines)
  ];
  sh.getRange(cfg.HDR_ROW, 1, 1, headers.length).setValues([headers]);

  // Colonnes saisie utilisateur (A-C, F-H) = bleu
  _styleHeader(sh.getRange(cfg.HDR_ROW, 1, 1, 3));
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.NB, 1, 3));
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.SLOOP, 1, 1));

  // Colonnes calculées auto (D-E) = vert
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.OUT_RATE, 1, 2), '#2E7D32');

  // Colonnes auto (I-J-K-L) = gris ardoise
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.FLAGS, 1, 4), '#455A64');

  sh.setRowHeight(cfg.HDR_ROW, 30);
  sh.setFrozenRows(1);

  // ── Fond doux sur les colonnes calculées (indication visuelle lecture seule)
  sh.getRange(cfg.DAT_ROW, c.OUT_RATE, ROWS, 2)
    .setBackground('#F1F8E9')
    .setFontColor('#2E7D32')
    .setFontStyle('italic')
    .setNumberFormat('0.00')
    .setHorizontalAlignment('center');

  // ── Machine (col B) — lecture seule, déduite de la recette
  sh.getRange(cfg.DAT_ROW, c.MACHINE, ROWS, 1)
    .setBackground('#ECEFF1')
    .setFontColor('#546E7A')
    .setFontStyle('italic');
  sh.getRange(cfg.HDR_ROW, c.MACHINE)
    .setNote('Déduite automatiquement de la Recette sélectionnée.\nNe pas modifier manuellement.');

  // ── Valeurs par défaut : OC = 100, Pureté = Normal, Somersloops = 0
  sh.getRange(cfg.DAT_ROW, c.OC,    ROWS, 1).setValue(100);
  sh.getRange(cfg.DAT_ROW, c.PUR,   ROWS, 1).setValue('Normal');
  sh.getRange(cfg.DAT_ROW, c.SLOOP, ROWS, 1).setValue(0)
    .setNumberFormat('0')
    .setBackground('#FFF3E0')
    .setFontColor('#BF360C')
    .setHorizontalAlignment('center');
  // Validation Somersloops : entier 0-4
  var sloopRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 4)
    .setAllowInvalid(false)
    .build();
  sh.getRange(cfg.DAT_ROW, c.SLOOP, ROWS, 1).setDataValidation(sloopRule);

  // ── Formats numériques
  sh.getRange(cfg.DAT_ROW, c.NB, ROWS, 1).setNumberFormat('0');
  sh.getRange(cfg.DAT_ROW, c.OC, ROWS, 1).setNumberFormat('0');

  // ── Style colonnes Flags / Cause
  sh.getRange(cfg.DAT_ROW, c.FLAGS, ROWS, 2)
    .setBackground('#ECEFF1')
    .setFontColor('#607D8B')
    .setFontStyle('italic')
    .setFontSize(10);

  // ── Qt/min STD (K) — taux base à OC=100% (vert pâle comme D-E)
  sh.getRange(cfg.DAT_ROW, c.STD_RATE, ROWS, 1)
    .setBackground('#E8F5E9')
    .setFontColor('#2E7D32')
    .setFontStyle('italic')
    .setNumberFormat('0.00')
    .setHorizontalAlignment('center');

  // ── ⚡ MW total (L) — consommation électrique (orange)
  sh.getRange(cfg.DAT_ROW, c.MW, ROWS, 1)
    .setBackground('#FFF8E1')
    .setFontColor('#E65100')
    .setFontStyle('italic')
    .setNumberFormat('0.0')
    .setHorizontalAlignment('center');

  // ── Note info sur les colonnes auto
  sh.getRange(cfg.HDR_ROW, c.OUT_RATE)
    .setNote('Calculé automatiquement depuis la recette sélectionnée.');
  sh.getRange(cfg.HDR_ROW, c.IN_RATE)
    .setNote('Calculé automatiquement depuis la recette sélectionnée.');
  sh.getRange(cfg.HDR_ROW, c.STD_RATE)
    .setNote('Taux de sortie à OC=100% (sans boost)\nPermet de voir le gain apporté par l\'overclocking.');
  sh.getRange(cfg.HDR_ROW, c.MW)
    .setNote('Consommation électrique totale (toutes machines de la ligne)\nFormule : MW_machine × Nb × (OC% / 100)^1,321');

  // ── Largeurs
  sh.setColumnWidth(c.ETAGE,    140);
  sh.setColumnWidth(c.MACHINE,  200);
  sh.setColumnWidth(c.RECIPE,   230);
  sh.setColumnWidth(c.OUT_RATE,  90);
  sh.setColumnWidth(c.IN_RATE,   90);
  sh.setColumnWidth(c.NB,        90);
  sh.setColumnWidth(c.OC,        90);
  sh.setColumnWidth(c.PUR,       90);
  sh.setColumnWidth(c.FLAGS,    300);
  sh.setColumnWidth(c.CAUSE,    200);
  sh.setColumnWidth(c.STD_RATE,  90);
  sh.setColumnWidth(c.MW,        80);
  sh.setColumnWidth(c.SLOOP,    110);

  sh.getRange(cfg.HDR_ROW, c.SLOOP)
    .setNote('Nb de Somersloops dans les machines (0-4).\nChaque loop double le taux de sortie (×2^N).');

  // ── Freeze column A (keep Étage always visible when scrolling right) ──────
  sh.setFrozenColumns(1);

  // ── Conditional formatting ─────────────────────────────────────────────────
  // Applied in priority order (first rule wins on conflict):
  //   1. Error rows (Flags contains ERR)  → red
  //   2. Recipe present + Nb=0 (TODO)     → amber
  //   3. OC at max (250%)                 → orange tint on OC cell
  //   4. Somersloops slotted (> 0)        → purple tint on Sloop cell
  var datR     = cfg.DAT_ROW;
  var fullRow  = sh.getRange(datR, 1, ROWS, headers.length);
  var ocCell   = sh.getRange(datR, c.OC,    ROWS, 1);
  var slpCell  = sh.getRange(datR, c.SLOOP, ROWS, 1);

  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=ISNUMBER(SEARCH("ERR",$I' + datR + '))')
      .setBackground('#FFCDD2').setFontColor('#B71C1C')
      .setRanges([fullRow]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($C' + datR + '<>"",$F' + datR + '=0)')
      .setBackground('#FFF9C4').setFontColor('#827717')
      .setRanges([fullRow]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(250)
      .setBackground('#FFE0B2').setFontColor('#E65100')
      .setRanges([ocCell]).build(),

    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground('#EDE7F6').setFontColor('#6A1B9A')
      .setRanges([slpCell]).build()
  ]);

  sh.setTabColor('#1565C0'); // Blue 800 — main production sheet

  SAT.Log.ok('Production installée (' + ROWS + ' lignes + mise en forme conditionnelle)');
}

// ─── Recettes ───────────────────────────────────────────────────────────────
//
// Feuille de référence : toutes les recettes officielles wiki 1.1
// Colonnes :
//   A Recette | B Machine | C Res IN 1 | D Rate IN 1
//   E Res IN 2 | F Rate IN 2 | G Res OUT 1 | H Rate OUT 1
//   I Res OUT 2 | J Rate OUT 2 | K Tier

function _installRecipes() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.REC);

  var recHdrs = [
    'Recette', 'Machine',
    'Res IN 1', 'Rate IN 1 /min',
    'Res IN 2', 'Rate IN 2 /min',
    'Res OUT 1', 'Rate OUT 1 /min',
    'Res OUT 2', 'Rate OUT 2 /min',
    'Tier'
  ];
  sh.getRange(1, 1, 1, recHdrs.length).setValues([recHdrs]);
  _styleHeader(sh.getRange(1, 1, 1, recHdrs.length), '#6A1B9A');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  if (cfg.RECIPES.length > 0) {
    sh.getRange(2, 1, cfg.RECIPES.length, cfg.RECIPES[0].length)
      .setValues(cfg.RECIPES);
  }

  // Alternance de couleurs par Machine
  var machCol  = {};
  var colors   = ['#F3E5F5', '#EDE7F6', '#E8EAF6', '#E3F2FD', '#E8F5E9', '#FFF8E1', '#FBE9E7', '#EFEBE9'];
  var colorIdx = 0;
  cfg.RECIPES.forEach(function(r, i) {
    var mach = r[1];
    if (!(mach in machCol)) { machCol[mach] = colors[colorIdx++ % colors.length]; }
    sh.getRange(i + 2, 1, 1, r.length).setBackground(machCol[mach]);
  });

  // Formats numériques sur les colonnes de taux
  [4, 6, 8, 10].forEach(function(col) {
    if (cfg.RECIPES.length > 0) {
      sh.getRange(2, col, cfg.RECIPES.length, 1).setNumberFormat('0.##');
    }
  });

  sh.setColumnWidth(1, 250).setColumnWidth(2, 180)
    .setColumnWidth(3, 180).setColumnWidth(4,  90)
    .setColumnWidth(5, 180).setColumnWidth(6,  90)
    .setColumnWidth(7, 180).setColumnWidth(8,  90)
    .setColumnWidth(9, 180).setColumnWidth(10, 90)
    .setColumnWidth(11, 65);

  sh.setTabColor('#4A148C'); // Purple 900 — reference sheet
  SAT.Log.ok('Recettes installées (' + cfg.RECIPES.length + ')');
}

// ─── Ressources ─────────────────────────────────────────────────────────────

function _installResources() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.RES);

  sh.getRange(1, 1, 1, 2).setValues([['Ressource', 'Catégorie']]);
  _styleHeader(sh.getRange(1, 1, 1, 2), '#1565C0');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  if (cfg.RESOURCES.length > 0) {
    sh.getRange(2, 1, cfg.RESOURCES.length, 2).setValues(cfg.RESOURCES);
  }

  // Alternance de couleurs par catégorie
  var catCol   = {};
  var colors   = ['#E3F2FD', '#E8F5E9', '#FFF8E1', '#FCE4EC', '#F3E5F5', '#E8EAF6', '#FBE9E7'];
  var colorIdx = 0;
  cfg.RESOURCES.forEach(function(r, i) {
    var cat = r[1];
    if (!(cat in catCol)) { catCol[cat] = colors[colorIdx++ % colors.length]; }
    sh.getRange(i + 2, 1, 1, 2).setBackground(catCol[cat]);
  });

  sh.setColumnWidth(1, 220).setColumnWidth(2, 130);

  sh.setTabColor('#1B5E20'); // Green 900 — reference sheet (resources)
  SAT.Log.ok('Ressources installées (' + cfg.RESOURCES.length + ')');
}

// ─── Machines ────────────────────────────────────────────────────────────────
//
// SAT.CFG.MACHINES = [[Nom, MW, Entrées conv., Sorties conv., Catégorie, Larg.(m), Long.(m), Haut.(m)]]

function _installMachines() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.MACH);

  var headers = ['Machine', 'Puissance (MW)', 'Entrées conv.', 'Sorties conv.',
                 'Catégorie', 'Larg. (m)', 'Long. (m)', 'Haut. (m)', 'Somersloops'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#2E7D32');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  if (cfg.MACHINES.length > 0) {
    sh.getRange(2, 1, cfg.MACHINES.length, cfg.MACHINES[0].length)
      .setValues(cfg.MACHINES);
  }

  // Alternance de couleurs par catégorie
  var catCol   = {};
  var colors   = ['#E8F5E9', '#E3F2FD', '#FFF8E1', '#FCE4EC', '#F3E5F5'];
  var colorIdx = 0;
  cfg.MACHINES.forEach(function(r, i) {
    var cat = r[4];
    if (!(cat in catCol)) { catCol[cat] = colors[colorIdx++ % colors.length]; }
    sh.getRange(i + 2, 1, 1, r.length).setBackground(catCol[cat]);
  });

  sh.setColumnWidth(1, 280).setColumnWidth(2, 130).setColumnWidth(3, 110)
    .setColumnWidth(4, 110).setColumnWidth(5, 120)
    .setColumnWidth(6, 80) .setColumnWidth(7, 80).setColumnWidth(8, 80)
    .setColumnWidth(9, 100);

  sh.setTabColor('#E65100'); // Deep Orange — reference sheet (machines)
  SAT.Log.ok('Machines installées (' + cfg.MACHINES.length + ')  [W×L×H + Somersloops]');
}

// ─── Étages ─────────────────────────────────────────────────────────────────
//
// Pré-remplie avec 3 étages exemples (à personnaliser).
// La validation dropdown de la colonne A (Production) pointe vers cette feuille.

// ── Colonnes feuille Étages ────────────────────────────────────────────────
// A(1)   B(2)    C(3)          D(4)   E(5)       F(6)       
// Étage  Ordre   Description   Note   Ascenseur  Aération
// G(7)        H(8)       I(9)       J(10)      K(11)       L(12)
// Nucléaire   Haut.(m)   Larg.(m)   Long.(m)   Surface m²  Fondations

function _installFloors() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.ETAG);

  // En-têtes : cols A-D = saisie utilisateur, cols E-F = paramètres, cols G-L = calculés
  var hdrUser   = ['\u00c9tage', 'Ordre', 'Description', 'Note'];
  var hdrParams = ['Ascenseur', 'A\u00e9ration'];
  var hdrCalc   = ['\u26a0\ufe0f Nucl\u00e9aire', 'Haut. (m)', 'Larg. (m)', 'Long. (m)',
                   'Surface (m\u00b2)', 'Fondations'];

  sh.getRange(1, 1, 1, hdrUser.length).setValues([hdrUser]);
  _styleHeader(sh.getRange(1, 1, 1, hdrUser.length), '#6A1B9A');

  sh.getRange(1, 5, 1, hdrParams.length).setValues([hdrParams]);
  _styleHeader(sh.getRange(1, 5, 1, hdrParams.length), '#1565C0'); // bleu — paramètres

  sh.getRange(1, 7, 1, hdrCalc.length).setValues([hdrCalc]);
  _styleHeader(sh.getRange(1, 7, 1, hdrCalc.length), '#2E7D32');   // vert — calculé

  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  // Dropdowns oui/non pour Ascenseur (col E) et Aération (col F)
  var ouiNon = SpreadsheetApp.newDataValidation()
    .requireValueInList(['oui', 'non'], true).build();
  sh.getRange(2, 5, 200, 1).setDataValidation(ouiNon); // Ascenseur
  sh.getRange(2, 6, 200, 1).setDataValidation(ouiNon); // Aération

  // Cols G-L en lecture seule (fond gris clair)
  sh.getRange(2, 7, 200, 6).setBackground('#F5F5F5');

  // Étages exemples
  var exemples = [
    ['\u00c9tage 0 \u2014 Extraction',  1, 'Foreuses, pompes, puits (mati\u00e8res premi\u00e8res)', '', 'non', 'non'],
    ['\u00c9tage 1 \u2014 Fonderie',    2, 'Lingots et mat\u00e9riaux de base',                 '', 'oui', 'oui'],
    ['\u00c9tage 2 \u2014 Production',  3, 'Composants interm\u00e9diaires et avanc\u00e9s',      '', 'oui', 'oui']
  ];
  sh.getRange(2, 1, exemples.length, 6).setValues(exemples);
  sh.getRange(2, 1, exemples.length, 4).setFontColor('#616161').setFontStyle('italic');

  // Largeurs de colonnes
  sh.setColumnWidth(1, 200).setColumnWidth(2, 60)
    .setColumnWidth(3, 280).setColumnWidth(4, 180)
    .setColumnWidth(5, 90) .setColumnWidth(6, 90) //  params
    .setColumnWidth(7, 110).setColumnWidth(8, 85) //  nucl., haut.
    .setColumnWidth(9, 85) .setColumnWidth(10, 85) // larg., long.
    .setColumnWidth(11, 95).setColumnWidth(12, 90); // surface, fondations
  sh.setTabColor('#37474F'); // Blue Grey 800 — structural/floors  SAT.Log.ok('\u00c9tages \u2014 3 exemples pr\u00e9-remplis (\u00e0 personnaliser)');
}

// ─── Objectifs (Solver targets) ────────────────────────────────────────────────
function _installObjectives() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.OBJ);

  // Header row
  var headers = ['Item à produire', 'Qt/min cible', 'Phase', 'Étage cible',
                 'Statut', 'Nb machines', 'Ressources brutes requises'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#4A148C');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  // Phase dropdown values
  var phaseValues = cfg.PHASES.map(function(p) { return p.id + ' — ' + p.label; }).join(',');
  var phaseRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(cfg.PHASES.map(function(p) { return p.id; }), true)
    .build();
  sh.getRange(2, 3, 200, 1).setDataValidation(phaseRule);

  // Make-active / skip dropdown for col E (Statut)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['▶ Actif', 'skip'], true).build();
  sh.getRange(2, 5, 200, 1).setDataValidation(statusRule);

  // Example rows (one per phase)
  var exemples = [
    ['Circuit imprimé',               7.5,  'P3', 'Étage 3 — Pétrole',  '▶ Actif', '', ''],
    ['Superordinateur',               1.875,'P4', 'Étage 4 — Avance',  'skip',     '', ''],
    ['Moteur',                        5,    'P2', 'Étage 2 — Acier',   'skip',     '', '']
  ];
  sh.getRange(2, 1, exemples.length, headers.length).setValues(exemples);
  sh.getRange(2, 1, exemples.length, headers.length)
    .setFontColor('#616161').setFontStyle('italic');

  // Column widths
  sh.setColumnWidth(1, 220).setColumnWidth(2, 100).setColumnWidth(3, 90)
    .setColumnWidth(4, 200).setColumnWidth(5, 120)
    .setColumnWidth(6, 100).setColumnWidth(7, 300);

  // Protect status + machine count columns (written by solver)
  sh.getRange(2, 5, 200, 3).setBackground('#F5F5F5');

  sh.setTabColor('#880E4F'); // Pink 900 — objectives/solver
  SAT.Log.ok('Objectifs — feuille solveur installée');
}

// ─── Validations (Production) ────────────────────────────────────────────────
function _setupValidations() {
  var cfg  = SAT.CFG;
  var c    = cfg.C;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var prod = ss.getSheetByName(cfg.SHEETS.PROD);
  if (!prod) return;

  var ROWS   = 200;
  var datRow = cfg.DAT_ROW;

  // ── A — Étage : dropdown depuis 🏗️ Étages col A (dynamique, à partir ligne 2)
  var etSh = ss.getSheetByName(cfg.SHEETS.ETAG);
  if (etSh && etSh.getLastRow() >= 2) {
    prod.getRange(datRow, c.ETAGE, ROWS, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(etSh.getRange(2, 1, etSh.getLastRow() - 1, 1), true)
        .setAllowInvalid(true).build()
    );
  }

  // ── B — Machine : dropdown depuis ⚙️ Machines col A
  var machSh = ss.getSheetByName(cfg.SHEETS.MACH);
  if (machSh && machSh.getLastRow() >= 2) {
    prod.getRange(datRow, c.MACHINE, ROWS, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(machSh.getRange(2, 1, machSh.getLastRow() - 1, 1), true)
        .setAllowInvalid(true).build()
    );
  }

  // ── C — Recette : dropdown depuis 📖 Recettes col A
  var recSh = ss.getSheetByName(cfg.SHEETS.REC);
  if (recSh && recSh.getLastRow() >= 2) {
    prod.getRange(datRow, c.RECIPE, ROWS, 1).setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInRange(recSh.getRange(2, 1, recSh.getLastRow() - 1, 1), true)
        .setAllowInvalid(true).build()
    );
  }

  // ── G — Overclock % : nombre entre 1 et 250
  prod.getRange(datRow, c.OC, ROWS, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 250)
      .setHelpText('Overclock : 1 à 250 %')
      .setAllowInvalid(true).build()  // true = ne pas afficher d'erreur sur cellule vide
  );

  // ── H — Pureté : liste fixe (noms EN officiel wiki)
  prod.getRange(datRow, c.PUR, ROWS, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Impur', 'Normal', 'Pur'], true)
      .setAllowInvalid(true).build()  // true = ne pas afficher d'erreur sur cellule vide
  );

  SAT.Log.ok('Validations installées');
}

// ─── Protections ──────────────────────────────────────────────────────
//
// Protection des zones écrites automatiquement (pas de saisie manuelle)
// et des onglets de référence (ne pas modifier les référentiels à la main).

function _setupProtections() {
  var cfg  = SAT.CFG;
  var c    = cfg.C;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var me   = Session.getEffectiveUser();
  var ROWS = 200;
  var datRow = cfg.DAT_ROW;

  // ── 1. Colonnes calculées auto dans Production (D, E, I, J) ──────────
  var prod = ss.getSheetByName(cfg.SHEETS.PROD);
  if (prod) {
    // Supprimer les protections existantes sur cette feuille
    prod.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function(p) {
      try { p.remove(); } catch(e) {}
    });

    // D-E : Qt/min OUT et IN (calculées par le moteur)
    var pDE = prod.getRange(datRow, c.OUT_RATE, ROWS, 2).protect();
    pDE.setDescription('Qt/min IN\/OUT — calculées automatiquement');
    pDE.setWarningOnly(true); // avertissement au lieu de blocage dur (l’auteur peut écrire)

    // I-J-K-L : Flags, Cause, Qt/min STD, ⚡ MW (auto)
    var pIJKL = prod.getRange(datRow, c.FLAGS, ROWS, 4).protect();
    pIJKL.setDescription('Flags/Cause/STD/MW — écrits automatiquement par le moteur');
    pIJKL.setWarningOnly(true);

    SAT.Log.ok('Protections colonnes auto Production');
  }

  // ── 2. Feuilles de référence (lecture seule sauf propriétaire) ──────
  var readOnlySheets = [
    { name: cfg.SHEETS.DASH, desc: 'Dashboard — ne pas modifier manuellement' },
    { name: cfg.SHEETS.REC,  desc: 'Recettes — référentiel officiel SAT ' + cfg.GAME_VERSION },
    { name: cfg.SHEETS.RES,  desc: 'Ressources — référentiel officiel SAT ' + cfg.GAME_VERSION },
    { name: cfg.SHEETS.MACH, desc: 'Machines — référentiel officiel SAT ' + cfg.GAME_VERSION }
  ];

  readOnlySheets.forEach(function(item) {
    var sh = ss.getSheetByName(item.name);
    if (!sh) return;
    // Supprimer les protections de feuille existantes
    sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function(p) {
      try { p.remove(); } catch(e) {}
    });
    var prot = sh.protect();
    prot.setDescription(item.desc);
    // Seul le propriétaire peut éditer ; les autres voient un avertissement
    try {
      prot.removeEditors(prot.getEditors());
      prot.addEditor(me);
    } catch(e) {
      // Droits insuffisants (ex: non propriétaire) — passer en warning only
      prot.setWarningOnly(true);
    }
    SAT.Log.ok('Protégé : ' + item.name);
  });
}
