/* ============================================================
 * 40_install.gs — Installation complète SAT v3.2
 * SAT_install() crée / recrée toutes les feuilles proprement.
 *
 * Feuilles créées (dans l'ordre d'affichage) :
 *   1. 📊 Dashboard
 *   2. 🏭 Production
 *   3. 📖 Recettes        ← NOUVEAU : toutes les recettes wiki 1.1
 *   4. 💎 Ressources
 *   5. ⚙️ Machines
 *   6. 🏗️ Étages           ← vide, à remplir par l'utilisateur
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

  _installDashboard();
  _installProduction();
  _installRecipes();
  _installResources();
  _installMachines();
  _installFloors();
  _setupValidations();
  _setupProtections();

  // Réordonner les onglets
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
    if (sh) ss.moveSheet(sh, i + 1);
  });

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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Encapsule un nom de feuille pour formule (gère les apostrophes/emojis) */
function _q(name) {
  return "'" + name.replace(/'/g, "''") + "'";
}

/** Vide et retourne la feuille (la crée si absente). */
function _clearSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.clearFormats();
  sh.clearConditionalFormatRules();
  try { var f = sh.getFilter(); if (f) f.remove(); } catch(e) {}
  sh.getCharts().forEach(function(c) { try { sh.removeChart(c); } catch(e) {} });
  return sh;
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

  // Ligne 1 — Titre
  sh.getRange(1, 1, 1, 4).merge()
    .setValue('S.A.T.  —  Satisfactory Automated Tracker')
    .setBackground('#0D47A1')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(18)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 48);

  // Ligne 2 — Sous-titre version
  sh.getRange(2, 1, 1, 4).merge()
    .setValue('v' + cfg.VERSION + '  —  wiki officiel Satisfactory ' + cfg.GAME_VERSION)
    .setBackground('#1565C0')
    .setFontColor('#BBDEFB')
    .setFontStyle('italic')
    .setFontSize(11)
    .setHorizontalAlignment('center');
  sh.setRowHeight(2, 24);

  // Ligne 3 — En-tête section stats
  sh.getRange(3, 1, 1, 4).merge()
    .setValue('STATISTIQUES DE PRODUCTION')
    .setBackground('#E3F2FD')
    .setFontWeight('bold')
    .setFontSize(12)
    .setFontColor('#0D47A1')
    .setHorizontalAlignment('left');
  sh.getRange(3, 1).setValue('  STATISTIQUES DE PRODUCTION');
  sh.setRowHeight(3, 30);

  // Lignes 4-10 — Stats (B4 = formule live, B5:B10 = écrits par recalcAll)
  var labels = [
    'Lignes de production',
    'Machines totales',
    'Étages distincts',
    'Ressources produites',
    'Lignes avec erreurs',
    'À compléter  (Nb = 0)',
    'Dernière mise à jour'
  ];
  var labRange = sh.getRange(4, 1, labels.length, 1);
  labRange.setValues(labels.map(function(l) { return [l]; }));
  labRange.setBackground('#F5F5F5').setFontWeight('bold').setFontSize(11);

  var valRange = sh.getRange(4, 2, labels.length, 1);
  valRange.setBackground('#FFFFFF').setFontSize(12).setFontWeight('bold').setFontColor('#1565C0');

  // B4 — formule COUNTA en temps réel
  sh.getRange('B4').setFormula(
    '=IFERROR(COUNTA(' + _q(cfg.SHEETS.PROD) + '!A' + cfg.DAT_ROW + ':A),0)'
  );

  // Bordures légères sur les cellules de stats
  sh.getRange(4, 1, labels.length, 2)
    .setBorder(true, true, true, true, true, true, '#E0E0E0', SpreadsheetApp.BorderStyle.SOLID);

  // Ligne 12 — Guide rapide
  sh.getRange(12, 1, 1, 4).merge()
    .setValue('  GUIDE RAPIDE')
    .setBackground('#E8F5E9')
    .setFontWeight('bold')
    .setFontColor('#2E7D32')
    .setFontSize(12);
  sh.setRowHeight(12, 28);

  var tips = [
    ['1.', 'Dans  ' + cfg.SHEETS.PROD + '  : saisir Étage, Machine, Recette, Nb, OC%.'],
    ['2.', 'Les colonnes Qt/min IN et OUT sont calculées automatiquement.'],
    ['3.', 'OC% = overclock (100 = normal, 250 = max possible).'],
    ['4.', 'Pureté s\'applique aux extracteurs (Impur ×0,5 — Pur ×2,0).'],
    ['5.', 'Les colonnes Flags et Cause se remplissent automatiquement.'],
    ['6.', 'Menu  S.A.T. > Recalcul complet  pour forcer la mise à jour.']
  ];
  sh.getRange(13, 1, tips.length, 2).setValues(tips);
  sh.getRange(13, 1, tips.length, 1)
    .setFontWeight('bold').setFontColor('#388E3C').setHorizontalAlignment('center');
  sh.getRange(13, 2, tips.length, 1).setFontColor('#424242').setFontSize(11);

  // Dimensions
  sh.setColumnWidth(1, 260).setColumnWidth(2, 180).setColumnWidth(3, 80).setColumnWidth(4, 80);
  sh.setFrozenRows(2);

  SAT.Log.ok('Dashboard installé');
}

// ─── Production ─────────────────────────────────────────────────────────────
//
// Colonnes (1-based) — alignées sur SAT.CFG.C :
//   A(1) Étage | B(2) Machine | C(3) Recette
//   D(4) Qt/min OUT (auto) | E(5) Qt/min IN (auto)
//   F(6) Nb | G(7) Overclock % | H(8) Pureté
//   I(9) Flags | J(10) Cause

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
    'Cause'        // J — auto
  ];
  sh.getRange(cfg.HDR_ROW, 1, 1, headers.length).setValues([headers]);

  // Colonnes saisie utilisateur (A-C, F-H) = bleu
  _styleHeader(sh.getRange(cfg.HDR_ROW, 1, 1, 3));
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.NB, 1, 3));

  // Colonnes calculées auto (D-E) = vert
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.OUT_RATE, 1, 2), '#2E7D32');

  // Colonnes auto (I-J) = gris ardoise
  _styleHeader(sh.getRange(cfg.HDR_ROW, c.FLAGS, 1, 2), '#455A64');

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

  // ── Note info sur les colonnes auto
  sh.getRange(cfg.HDR_ROW, c.OUT_RATE)
    .setNote('Calculé automatiquement depuis la recette sélectionnée.');
  sh.getRange(cfg.HDR_ROW, c.IN_RATE)
    .setNote('Calculé automatiquement depuis la recette sélectionnée.');

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

  var headers = ['Machine', 'Puissance (MW)', 'Entrées conv.', 'Sorties conv.', 'Catégorie'];
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
    .setColumnWidth(4, 110).setColumnWidth(5, 120);

  SAT.Log.ok('Machines installées (' + cfg.MACHINES.length + ')');
}

// ─── Étages ─────────────────────────────────────────────────────────────────
//
// Feuille VIDE — l'utilisateur la remplit manuellement.
// La validation dropdown de la colonne A (Production) pointe vers cette feuille.

function _installFloors() {
  var cfg = SAT.CFG;
  var sh  = _clearSheet(cfg.SHEETS.ETAG);

  var headers = ['Étage', 'Ordre', 'Description', 'Note'];
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  _styleHeader(sh.getRange(1, 1, 1, headers.length), '#6A1B9A');
  sh.setRowHeight(1, 28);
  sh.setFrozenRows(1);

  // Aide contextuelle
  sh.getRange(2, 1)
    .setValue('(Ajoutez vos étages ici)')
    .setFontStyle('italic')
    .setFontColor('#9E9E9E');

  sh.setColumnWidth(1, 180).setColumnWidth(2, 70)
    .setColumnWidth(3, 250).setColumnWidth(4, 200);

  SAT.Log.ok('Étages — feuille vide créée (à remplir par l\'utilisateur)');
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
      .setAllowInvalid(false).build()
  );

  // ── H — Pureté : liste fixe (noms EN officiel wiki)
  prod.getRange(datRow, c.PUR, ROWS, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Impur', 'Normal', 'Pur'], true)
      .setAllowInvalid(false).build()
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

    // I-J : Flags et Cause (auto)
    var pIJ = prod.getRange(datRow, c.FLAGS, ROWS, 2).protect();
    pIJ.setDescription('Flags\/Cause — écrites automatiquement par le moteur');
    pIJ.setWarningOnly(true);

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
