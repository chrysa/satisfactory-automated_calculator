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

  // 2. Vérification version → install si feuilles absentes, mise à jour silencieuse sinon
  // NOTE : on vérifie l'EXISTENCE des feuilles (pas le nb de lignes de données)
  //        pour éviter de re-installer quand Production est vide mais déjà configurée.
  try {
    var props  = PropertiesService.getDocumentProperties();
    var stored = props.getProperty('SAT_VERSION') || '';
    var cur    = SAT.CFG.VERSION;
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var cfg    = SAT.CFG;

    if (stored !== cur) {
      var isInstalled = ss.getSheetByName(cfg.SHEETS.PROD) &&
                        ss.getSheetByName(cfg.SHEETS.DASH);
      if (!isInstalled) {
        // Première ouverture sans feuilles SAT → installation complète
        Logger.log('SAT v' + stored + ' -> v' + cur + ' : installation initiale');
        ss.toast('Installation SAT ' + cur + '\u2026', 'SAT', 10);
        SAT_install();
      } else {
        // Feuilles déjà présentes : mise à jour mineure (ne pas effacer les données)
        props.setProperty('SAT_VERSION', cur);
        // Forcer le recalcul pour mettre à jour B2 (version) dans le Dashboard
        try { SAT_recalcAll(); } catch(e2) {}
        ss.toast('SAT v' + cur + ' charg\u00e9.', 'S.A.T.', 4);
        Logger.log('SAT v' + cur + ' \u2014 mise \u00e0 jour silencieuse (was v' + stored + ')');
      }
    } else {
      Logger.log('SAT v' + cur + ' \u2014 \u00e0 jour');
    }
  } catch (err) {
    Logger.log('ERR onOpen version check: ' + err.message);
  }

  // 3. Recalcul automatique (met à jour le Dashboard y compris la version en B2)
  try { SAT_recalcAll(); } catch(e) {}
}

// ─── Construction du menu ─────────────────────────────────────────────────

function _buildMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('S.A.T.')
      .addItem('Recalcul complet',                    'SAT_recalcAll')
      .addItem('Résumé de production',                'SAT_SHOW_SUMMARY')
      .addSeparator()
      .addItem('Ajouter un étage',                    'SAT_ADD_FLOOR')
      .addItem('Lister les étages',                   'SAT_LIST_FLOORS')
      .addSeparator()
      .addItem('Afficher / Masquer les référentiels', 'SAT_TOGGLE_REFS')
      .addItem('Créer graphiques Dashboard',          'SAT_CREATE_CHARTS')
      .addSeparator()
      .addItem('Nettoyer les doublons d\'onglets',    'SAT_cleanupDuplicates')
      .addItem('Diagnostic',                          'SAT_DIAGNOSTIC')
      .addItem('Mettre à jour (reinstall)',            'SAT_forceUpdate')
      .addItem('RESET complet',                       'SAT_resetAll')
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
    _setupValidations(); // met à jour le dropdown Étage dans Production
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

/** Affiche ou masque les 3 onglets de référence (Recettes, Ressources, Machines). */
function SAT_TOGGLE_REFS() {
  var cfg  = SAT.CFG;
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var refs = [cfg.SHEETS.REC, cfg.SHEETS.RES, cfg.SHEETS.MACH];
  // Lire l'état du premier onglet pour déterminer le sens du toggle
  var first  = ss.getSheetByName(refs[0]);
  if (!first) { SpreadsheetApp.getUi().alert('Feuilles de référence introuvables.'); return; }
  var hidden = first.isSheetHidden(); // true = actuellement masqué → on va afficher
  refs.forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    try { hidden ? sh.showSheet() : sh.hideSheet(); } catch(e) {}
  });
  ss.toast(
    hidden ? 'Référentiels affichés (Recettes, Ressources, Machines).' :
             'Référentiels masqués — accessibles via ce menu.',
    'S.A.T.', 4
  );
}

/** Crée les graphiques dans le Dashboard. */
function SAT_CREATE_CHARTS() {
  var ui = SpreadsheetApp.getUi();
  try {
    SAT.Charts.createAllCharts();
    ui.alert('Graphiques créés dans le Dashboard.');
  } catch(e) {
    ui.alert('Erreur graphiques : ' + e.message);
  }
}

// ─── Diagnostic ─────────────────────────────────────────────────────────────────────────

/** Supprime les onglets en double (même nom, conserve le premier). */
function SAT_cleanupDuplicates() {
  var ui = SpreadsheetApp.getUi();
  try {
    var ss   = SpreadsheetApp.getActiveSpreadsheet();
    var before = ss.getSheets().length;
    _deduplicateSheets();
    var removed = before - ss.getSheets().length;
    if (removed > 0) {
      ui.alert(removed + ' doublon(s) supprimé(s).');
    } else {
      ui.alert('Aucun doublon trouvé.');
    }
  } catch(e) {
    ui.alert('Erreur : ' + e.message);
  }
}

function SAT_DIAGNOSTIC() {
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
