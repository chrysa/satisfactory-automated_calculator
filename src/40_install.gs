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

  // ── Réinitialisation complète ──────────────────────────────────────────────
  // Insérer un placeholder (GAS exige au moins 1 feuille), supprimer toutes les
  // autres sans exception, puis installer les feuilles SAT proprement.
  // Ceci évite tout problème d'encodage emoji / doublons résiduels.
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

  // Supprimer le placeholder AVANT les validations (qui ont besoin des vraies feuilles)
  try { ss.deleteSheet(_tmpSh); } catch(e) {}

  _setupValidations();
  _setupProtections();

  // Réordonner les onglets (les feuilles sont déjà dans le bon ordre d'insertion,
  // mais on repositionne explicitement pour plus de robustesse)
  var order = [
    cfg.SHEETS.DASH,
    cfg.SHEETS.PROD,
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
  ss.toast('Installation SAT v' + cfg.VERSION + ' terminée !', 'S.A.T.', 5);
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
    sh.setRowHeight(5 + i, 22);
  });
  sh.getRange(5, 1, prodLabels.length, 2)
    .setBorder(true, true, true, true, true, true, '#BBDEFB', SpreadsheetApp.BorderStyle.SOLID);

  // ── Section ÉLECTRICITÉ (A12:D15) ──────────────────────────────────────────
  sh.setRowHeight(11, 8);
  sh.getRange(11, 1, 1, 4).setBackground('#FFF8E1');
  secStyle(sh.getRange(12, 1, 1, 4), '#E65100', '#FFFFFF');
  sh.getRange(12, 1).setValue('  \u26A1 \u00C9lectricit\u00e9');
  sh.setRowHeight(12, 28);

  var elecLabels = [
    'Consommation totale (MW)',
    'Moy. par machine (MW)',
    'Derni\u00e8re mise \u00e0 jour'
  ];
  elecLabels.forEach(function(lbl, i) {
    sh.getRange(13 + i, 1).setValue(lbl)
      .setBackground('#FFF3E0').setFontSize(10).setFontWeight('bold');
    sh.getRange(13 + i, 2).setBackground('#FFFFFF').setFontSize(11)
      .setFontWeight('bold').setFontColor('#E65100').setHorizontalAlignment('center');
    sh.setRowHeight(13 + i, 22);
  });
  sh.getRange(13, 1, elecLabels.length, 2)
    .setBorder(true, true, true, true, true, true, '#FFE0B2', SpreadsheetApp.BorderStyle.SOLID);

  // ── Section TOP RESSOURCES (E4:H12) ────────────────────────────────────────
  secStyle(sh.getRange(4, 5, 1, 4), '#2E7D32', '#FFFFFF');
  sh.getRange(4, 5).setValue('  \uD83D\uDCE6 Top ressources produites (/min)');
  sh.setRowHeight(4, 28);
  // Lignes E5:H12 — remplies par _refreshDashboard
  sh.getRange(5, 5, 8, 4)
    .setBackground('#F9FBE7').setFontSize(10)
    .setBorder(true, true, true, true, true, false, '#C8E6C9', SpreadsheetApp.BorderStyle.SOLID);
  // En-têtes colonnes ressources
  sh.getRange(5, 5, 1, 4).setValues([['Ressource', '', 'Qt/min', '']]);
  sh.getRange(5, 5, 1, 4).setFontWeight('bold').setFontColor('#2E7D32').setFontSize(9)
    .setBackground('#E8F5E9');

  // ── Section SOUS-PRODUITES (E14:H21) ───────────────────────────────────────
  sh.setRowHeight(13, 8);
  sh.getRange(13, 5, 1, 4).setBackground('#FCE4EC');
  secStyle(sh.getRange(14, 5, 1, 4), '#C62828', '#FFFFFF');
  sh.getRange(14, 5).setValue('  \u26A0\uFE0F Goulots (ressources manquantes)');
  sh.setRowHeight(14, 28);
  // Lignes E15:H21 — remplies par _refreshDashboard
  sh.getRange(15, 5, 7, 4)
    .setBackground('#FFF8F8').setFontSize(10)
    .setBorder(true, true, true, true, true, false, '#EF9A9A', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(15, 5, 1, 4).setValues([['Ressource', 'Prod.', 'Conso.', 'D\u00e9ficit']]);
  sh.getRange(15, 5, 1, 4).setFontWeight('bold').setFontColor('#C62828').setFontSize(9)
    .setBackground('#FFEBEE');

  // ── Graphique placeholder col H (position fixe) — créé par _installCharts
  sh.setRowHeight(22, 8);
  sh.getRange(22, 1, 1, 8).setBackground('#E3F2FD');

  // ── Guide rapide (A23:D28) ─────────────────────────────────────────────────
  secStyle(sh.getRange(23, 1, 1, 4), '#37474F', '#FFFFFF');
  sh.getRange(23, 1).setValue('  \uD83D\uDCA1 Guide rapide');
  sh.setRowHeight(23, 28);

  var tips = [
    ['1.', 'Saisir \u00C9tage, Machine, Recette, Nb, OC% dans la feuille Production.'],
    ['2.', 'Qt/min IN/OUT et \u26A1 MW se calculent automatiquement.'],
    ['3.', 'OC% = overclock (100=normal, 250=max). Col K = taux \u00e0 OC=100%.'],
    ['4.', 'Puret\u00e9 pour les extracteurs : Impur \u00D70,5 — Pur \u00D72,0.'],
    ['5.', 'Menu S.A.T. > Recalcul complet pour forcer la mise \u00e0 jour.']
  ];
  sh.getRange(24, 1, tips.length, 2).setValues(tips);
  sh.getRange(24, 1, tips.length, 1)
    .setFontWeight('bold').setFontColor('#546E7A').setHorizontalAlignment('center');
  sh.getRange(24, 2, tips.length, 1).setFontColor('#37474F').setFontSize(10);
  tips.forEach(function(_, i) { sh.setRowHeight(24 + i, 20); });

  // ── Changelog (A30:D...) ───────────────────────────────────────────────────
  sh.setRowHeight(29, 8);
  sh.getRange(29, 1, 1, 8).setBackground('#FFF3E0');
  var clRow = 30;
  secStyle(sh.getRange(clRow, 1, 1, 8), '#BF360C', '#FFFFFF');
  sh.getRange(clRow, 1).setValue('  CHANGELOG');
  sh.setRowHeight(clRow, 28);

  var changelog = [
    ['v3.4', '22 mar 2026',
      '\u2022 Colonne K \u00ab Qt/min STD \u00bb : taux de sortie \u00e0 OC=100% (sans boost)\n' +
      '\u2022 Colonne L \u00ab \u26A1 MW \u00bb : consommation \u00e9lectrique totale\n' +
      '\u2022 Dashboard : infos \u00e9lectrique, goulots, top ressources, graphiques permanents.\n' +
      '\u2022 Archivage usine avant migration de version de jeu.'],
    ['v3.3.1', '22 mar 2026',
      '\u2022 Mise \u00e0 jour structurelle Dashboard/Validations au changement de version.\n' +
      '\u2022 Doublons d\u2019onglets \u00e9limin\u00e9s (install par placeholder).\n' +
      '\u2022 B4 Dashboard \u2014 fin du #ERROR (formule remplac\u00e9e par setValue).'],
    ['v3.3', 'mar 2026',
      '\u2022 Ligne effac\u00e9e (\u00C9tage vide) \u2192 colonnes auto nettoy\u00e9es.\n' +
      '\u2022 Nouvelle ligne \u2192 OC=100 et Puret\u00e9=Normal pr\u00e9-remplis.\n' +
      '\u2022 Flag puret\u00e9 (\u00D70,5 / \u00D72,0) affich\u00e9 uniquement pour les extracteurs.'],
    ['v3.2', '16\u201321 mar 2026',
      '\u2022 Refonte compl\u00e8te \u2014 8 modules, donn\u00e9es Satisfactory 1.1.\n' +
      '\u2022 Puret\u00e9 foreuses corrig\u00e9e, machine auto-remplie, Mk.5 flag.'],
    ['v3.1', 'jan 2026',   '\u2022 Recalcul cibl\u00e9 par ligne (onEdit optimis\u00e9).'],
    ['v3.0', 'nov 2025',   '\u2022 Migration vers architecture SAT.* namespace.']
  ];
  sh.getRange(clRow + 1, 1, changelog.length, 3).setValues(
    changelog.map(function(r) { return [r[0], r[1], r[2]]; })
  );
  sh.getRange(clRow + 1, 1, changelog.length, 3).setWrap(true);
  sh.getRange(clRow + 1, 1, changelog.length, 1)
    .setFontWeight('bold').setFontColor('#E65100')
    .setHorizontalAlignment('center').setVerticalAlignment('top');
  sh.getRange(clRow + 1, 2, changelog.length, 1)
    .setFontColor('#757575').setFontStyle('italic').setFontSize(10).setVerticalAlignment('top');
  sh.getRange(clRow + 1, 3, changelog.length, 1)
    .setFontColor('#424242').setFontSize(10).setVerticalAlignment('top');
  sh.getRange(clRow, 1, changelog.length + 1, 3)
    .setBorder(true, true, true, true, false, true, '#FFE0B2', SpreadsheetApp.BorderStyle.SOLID);

  // ── Largeurs colonnes ──────────────────────────────────────────────────────
  sh.setColumnWidth(1, 210);  // A — libellé gauche
  sh.setColumnWidth(2, 100);  // B — valeur gauche
  sh.setColumnWidth(3, 20);   // C — espace
  sh.setColumnWidth(4, 20);   // D — espace
  sh.setColumnWidth(5, 180);  // E — ressource
  sh.setColumnWidth(6, 75);   // F — prod
  sh.setColumnWidth(7, 75);   // G — conso
  sh.setColumnWidth(8, 75);   // H — déficit
  sh.setFrozenRows(2);

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
 * Crée 2 graphiques permanents dans le Dashboard (col E–H, lignes 4–21).
 * Ils s'appuient sur une zone de données temporaire en col F–G ligne 36+.
 * Si la feuille Production est vide, les graphiques s'affichent vides (pas d'erreur).
 */
function _installDashboardCharts(sh) {
  // Supprimer les anciens graphiques
  sh.getCharts().forEach(function(c) { try { sh.removeChart(c); } catch(e) {} });

  // Zone tampon de données — ligne 40 (hors zone visible du Dashboard)
  // Col F(6)=Étage/Ressource, G(7)=Valeur  /  Col H(8)=Ressource, I(9)=Valeur
  var buf = 40;
  sh.getRange(buf, 6, 1, 2).setValues([['Étage','Machines']]);
  sh.getRange(buf, 8, 1, 2).setValues([['Ressource','Qt/min']]);

  // Graphique 1 : Machines par étage
  var chart1 = sh.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sh.getRange(buf, 6, 2, 2))
    .setPosition(4, 5, 5, 5)
    .setOption('title', 'Machines par étage')
    .setOption('width', 370).setOption('height', 200)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: 'Nb', minValue: 0 })
    .setOption('backgroundColor', '#F9FBE7')
    .build();
  sh.insertChart(chart1);

  // Graphique 2 : Top ressources produites
  var chart2 = sh.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sh.getRange(buf, 8, 2, 2))
    .setPosition(14, 5, 5, 5)
    .setOption('title', 'Top production (Qt/min)')
    .setOption('width', 370).setOption('height', 200)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: 'Qt/min', minValue: 0 })
    .setOption('backgroundColor', '#F9FBE7')
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
    'Machine',     // B — saisie
    'Recette',     // C — saisie (dropdown depuis 📖 Recettes)
    'Qt/min OUT',  // D — calculé auto
    'Qt/min IN',   // E — calculé auto
    'Nb machines', // F — saisie
    'Overclock %', // G — saisie
    'Pureté',      // H — saisie (extracteurs)
    'Flags',       // I — auto
    'Cause',       // J — auto
    'Qt/min STD',  // K — taux base (OC=100%) calculé auto
    '⚡ MW'         // L — consommation électrique totale calculée auto
  ];
  sh.getRange(cfg.HDR_ROW, 1, 1, headers.length).setValues([headers]);

  // Colonnes saisie utilisateur (A-C, F-H) = bleu
  _styleHeader(sh.getRange(cfg.HDR_ROW, 1, 1, 3));
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.NB, 1, 3));

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

  // ── Valeurs par défaut : OC = 100, Pureté = Normal
  sh.getRange(cfg.DAT_ROW, c.OC,  ROWS, 1).setValue(100);
  sh.getRange(cfg.DAT_ROW, c.PUR, ROWS, 1).setValue('Normal');

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
  sh.setColumnWidth(c.ETAGE,    130);
  sh.setColumnWidth(c.MACHINE,  155);
  sh.setColumnWidth(c.RECIPE,   220);
  sh.setColumnWidth(c.OUT_RATE,  90);
  sh.setColumnWidth(c.IN_RATE,   90);
  sh.setColumnWidth(c.NB,        65);
  sh.setColumnWidth(c.OC,        85);
  sh.setColumnWidth(c.PUR,       90);
  sh.setColumnWidth(c.FLAGS,    280);
  sh.setColumnWidth(c.CAUSE,    200);
  sh.setColumnWidth(c.STD_RATE,  90);
  sh.setColumnWidth(c.MW,        80);

  SAT.Log.ok('Production installée (' + ROWS + ' lignes pré-formatées)');
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

  SAT.Log.ok('Ressources installées (' + cfg.RESOURCES.length + ')');
}

// ─── Machines ────────────────────────────────────────────────────────────────
//
// SAT.CFG.MACHINES = [[Nom, MW, Entrées conv., Sorties conv., Catégorie], ...]

function _installMachines() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.MACH);

  var headers = ['Machine', 'Puissance (MW)', 'Entrées conv.', 'Sorties conv.', 'Catégorie', 'Larg. (m)', 'Long. (m)'];
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

  sh.setColumnWidth(1, 230).setColumnWidth(2, 130).setColumnWidth(3, 110)
    .setColumnWidth(4, 110).setColumnWidth(5, 120)
    .setColumnWidth(6, 80) .setColumnWidth(7, 80);

  SAT.Log.ok('Machines installées (' + cfg.MACHINES.length + ')  [W×L inclus]');
}

// ─── Étages ─────────────────────────────────────────────────────────────────
//
// Pré-remplie avec 3 étages exemples (à personnaliser).
// La validation dropdown de la colonne A (Production) pointe vers cette feuille.

function _installFloors() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.ETAG);

  var headers = ['Étage', 'Ordre', 'Description', 'Note'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#6A1B9A');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  // Étages exemples — à personnaliser selon votre usine
  var exemples = [
    ['Étage 0 — Extraction',  1, 'Foreuses, pompes, puits (matières premières)', ''],
    ['Étage 1 — Fonderie',    2, 'Lingots et matériaux de base',                 ''],
    ['Étage 2 — Production',  3, 'Composants intermédiaires et avancés',         '']
  ];
  sh.getRange(2, 1, exemples.length, 4).setValues(exemples);
  sh.getRange(2, 1, exemples.length, 4).setFontColor('#616161').setFontStyle('italic');

  sh.setColumnWidth(1, 200).setColumnWidth(2, 70)
    .setColumnWidth(3, 280).setColumnWidth(4, 200);

  SAT.Log.ok('Étages — 3 exemples pré-remplis (à personnaliser)');
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
