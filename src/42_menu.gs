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

  // 2. Vérification version / install automatique
  // On installe si : classeur vierge (≤1 onglet) OU install précédente jamais
  // terminée (stored vide = SAT_VERSION jamais écrit, ex: crash sur moveSheet).
  // On ne réinstalle PAS si stored est défini et différent de cur → mise à jour silencieuse.
  try {
    var props  = PropertiesService.getDocumentProperties();
    var stored = props.getProperty('SAT_VERSION') || '';
    var cur    = SAT.CFG.VERSION;
    var ss     = SpreadsheetApp.getActiveSpreadsheet();

    if (stored !== cur) {
      var sheetCount = ss.getSheets().length;
      // !stored = install jamais terminée (SAT_VERSION jamais écrit)
      // sheetCount <= 1 = classeur vierge
      if (!stored || sheetCount <= 1) {
        Logger.log('SAT v' + stored + ' -> v' + cur + ' : installation');
        ss.toast('Installation SAT ' + cur + '\u2026', 'SAT', 10);
        SAT_install();
      } else {
        // Sheets existantes + version antérieure connue → mise à jour structurelle
        // (Dashboard + validations reconstruits, données de production préservées)
        ss.toast('Mise à jour SAT ' + stored + ' \u2192 ' + cur + '\u2026', 'SAT', 8);
        try {
          _installDashboard();
          _setupValidations();
        } catch(e) {
          Logger.log('ERR soft update: ' + e.message);
        }
        props.setProperty('SAT_VERSION', cur);
        Logger.log('SAT v' + cur + ' \u2014 mise \u00e0 jour structurelle (was v' + stored + ')');
      }
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
      .addItem('➕ Ajouter une ligne de production',    'SAT_showAddProductionForm')
      .addSeparator()
      .addItem('Ajouter un étage',                    'SAT_ADD_FLOOR')
      .addItem('Lister les étages',                   'SAT_LIST_FLOORS')
      .addItem('Taille des étages',                  'SAT_computeStageSizes')
      .addItem('Marge des machines…',               'SAT_setMachineMargin')
      .addSeparator()
      .addItem('Afficher / Masquer les référentiels', 'SAT_TOGGLE_REFS')
      .addItem('Créer graphiques Dashboard',          'SAT_CREATE_CHARTS')
      .addSeparator()
      .addItem('Archiver usine & changer version jeu', 'SAT_archiveAndMigrate')
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

// ─── Formulaires d'ajout ─────────────────────────────────────────────────────

/**
 * Affiche le formulaire modal d'ajout d'une ligne de production.
 * Alimente les listes depuis les feuilles Étages, Machines et Recettes.
 */
function SAT_showAddProductionForm() {
  var cfg      = SAT.CFG;
  var etages   = _getSheetCol1(cfg.SHEETS.ETAG);
  var machines = _getSheetCol1(cfg.SHEETS.MACH);
  var recipes  = _getSheetCol1(cfg.SHEETS.REC);
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(
      _buildProductionFormHtml(etages, machines, recipes)
    ).setWidth(500).setHeight(530),
    'Nouvelle ligne de production'
  );
}

/**
 * Callback serveur depuis le formulaire de production.
 * Valide les données, append une ligne dans Production, déclenche un recalcul.
 * @param {Object} d  {etage, machine, recipe, nb, oc, purity}
 * @returns {Object}  {ok:true, row:N} | {ok:false, error:'...'}
 */
function SAT_addProductionRow(d) {
  try {
    if (!d || typeof d !== 'object') throw new Error('Invalid data object.');
    var cfg = SAT.CFG;
    var c   = cfg.C;

    // Sanitize
    var etage   = String(d.etage   || '').trim().substring(0, 200);
    var machine = String(d.machine || '').trim().substring(0, 200);
    var recipe  = String(d.recipe  || '').trim().substring(0, 200);
    var nb      = Math.max(1, Math.min(999,   parseInt(d.nb, 10)  || 1));
    var oc      = Math.max(1, Math.min(250,   parseInt(d.oc, 10)  || 100));
    var purity  = (['Normal','Pur','Impur'].indexOf(String(d.purity)) >= 0)
                    ? String(d.purity) : 'Normal';

    if (!machine) throw new Error('Machine is required.');
    if (!recipe)  throw new Error('Recipe is required.');

    var sh = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh) throw new Error('Production sheet not found.');

    var nextRow = Math.max(cfg.DAT_ROW, sh.getLastRow() + 1);

    // Écriture — setValue uniquement, jamais setFormula
    sh.getRange(nextRow, c.ETAGE  ).setValue(etage);
    sh.getRange(nextRow, c.MACHINE).setValue(machine);
    sh.getRange(nextRow, c.RECIPE ).setValue(recipe);
    sh.getRange(nextRow, c.NB     ).setValue(nb);
    sh.getRange(nextRow, c.OC     ).setValue(oc);
    sh.getRange(nextRow, c.PUR    ).setValue(purity);

    // Recalcul pour remplir D/E (taux auto) et K/L (STD rate / MW)
    try { SAT_recalcAll(); } catch(e) {}

    return { ok: true, row: nextRow };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Helpers HTML ─────────────────────────────────────────────────────────────

/** Retourne les valeurs non vides de la colonne A d'une feuille (sans entête). */
function _getSheetCol1(sheetName) {
  try {
    var sh = SAT.S.get(sheetName);
    if (!sh || sh.getLastRow() < 2) return [];
    return sh.getRange(2, 1, sh.getLastRow() - 1, 1)
      .getValues()
      .map(function(r)  { return r[0]; })
      .filter(function(v) { return !!v; });
  } catch(e) { return []; }
}

/** Échappe les caractères spéciaux HTML. */
function _htmlEsc(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/** Construit les <option> d'un <select> depuis un tableau de valeurs. */
function _buildSelectOptions(values) {
  return values.map(function(v) {
    var e = _htmlEsc(v);
    return '<option value="' + e + '">' + e + '</option>';
  }).join('');
}

/** Retourne le CSS du formulaire de production. */
function _formCss() {
  return [
    '* { box-sizing: border-box; }',
    'body { font-family: "Google Sans", Arial, sans-serif; margin: 0; padding: 16px 18px 10px; background: #f8f9fa; color: #202124; font-size: 13px; }',
    'h2 { font-size: 15px; font-weight: 600; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }',
    '.fg { margin-bottom: 10px; }',
    'label { display: block; font-size: 11px; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 3px; }',
    'select, input { width: 100%; padding: 7px 10px; border: 1px solid #dadce0;',
    '  border-radius: 6px; font-size: 13px; background: #fff; transition: border-color .15s; }',
    'select:focus, input:focus { outline: none; border-color: #1a73e8;',
    '  box-shadow: 0 0 0 2px rgba(26,115,232,.15); }',
    '.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }',
    '.btn { width: 100%; padding: 9px; border: none; border-radius: 6px; font-size: 13px;',
    '  font-weight: 600; cursor: pointer; margin-top: 6px; transition: background .15s; }',
    '.bp { background: #1a73e8; color: #fff; }',
    '.bp:hover { background: #1557b0; }',
    '.bp:disabled { background: #9aa0a6; cursor: default; }',
    '.bc { background: #f1f3f4; color: #3c4043; }',
    '.bc:hover { background: #e8eaed; }',
    '.st { display: none; padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-size: 12px; }',
    '.ok  { display: block !important; background: #e6f4ea; color: #137333; }',
    '.er  { display: block !important; background: #fce8e6; color: #c5221f; }',
    '.hint { font-size: 11px; color: #80868b; margin: 2px 0 0; }'
  ].join(' ');
}

/** Construit le HTML complet du formulaire "Nouvelle ligne de production". */
function _buildProductionFormHtml(etages, machines, recipes) {
  var etageOpts   = '<option value="">\u2014 none \u2014</option>' + _buildSelectOptions(etages);
  var machOpts    = '<option value="">\u2014 select \u2014</option>' + _buildSelectOptions(machines);
  var recipeOpts  = '<option value="">\u2014 select \u2014</option>' + _buildSelectOptions(recipes);

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + _formCss() + '</style></head><body>' +
    '<h2>\uD83C\uDFED New production line</h2>' +
    '<form id="f" onsubmit="go(event)">' +

    '<div class="fg"><label>Stage</label>' +
    '<select id="etage">' + etageOpts + '</select></div>' +

    '<div class="fg"><label>Machine \u2731</label>' +
    '<select id="machine" required>' + machOpts + '</select></div>' +

    '<div class="fg"><label>Recipe \u2731</label>' +
    '<select id="recipe" required>' + recipeOpts + '</select></div>' +

    '<div class="g2">' +
    '<div class="fg"><label>Qty (machines)</label>' +
    '<input type="number" id="nb" value="1" min="1" max="999" required></div>' +
    '<div class="fg"><label>Overclock %</label>' +
    '<input type="number" id="oc" value="100" min="1" max="250" required></div>' +
    '</div>' +

    '<div class="fg"><label>Purity (extractors only)</label>' +
    '<select id="purity">'+
    '<option value="Normal">Normal</option>' +
    '<option value="Pur">Pure</option>' +
    '<option value="Impur">Impure</option>' +
    '</select>' +
    '<p class="hint">Ignored for production machines.</p></div>' +

    '<button type="submit" class="btn bp" id="btn">\u2795 Add line</button>' +
    '<button type="button" class="btn bc" onclick="google.script.host.close()">Cancel</button>' +
    '<div id="st" class="st"></div>' +
    '</form>' +

    '<script>(function(){' +
    'function go(e){' +
    '  e.preventDefault();' +
    '  var b=document.getElementById("btn");' +
    '  b.disabled=true; b.textContent="\u23F3 Adding...";' +
    '  google.script.run' +
    '    .withSuccessHandler(function(r){' +
    '      var s=document.getElementById("st");' +
    '      s.className="st"+(r.ok?" ok":" er");' +
    '      s.textContent=r.ok ? "\u2713 Line added (row "+r.row+"). Recalculated." : "Error: "+r.error;' +
    '      if(r.ok){ document.getElementById("f").reset(); }' +
    '      b.disabled=false; b.textContent="\u2795 Add line";' +
    '    })' +
    '    .withFailureHandler(function(err){' +
    '      var s=document.getElementById("st");' +
    '      s.className="st er"; s.textContent="Error: "+err.message;' +
    '      b.disabled=false; b.textContent="\u2795 Add line";' +
    '    })' +
    '    .SAT_addProductionRow({' +
    '      etage:   document.getElementById("etage").value,' +
    '      machine: document.getElementById("machine").value,' +
    '      recipe:  document.getElementById("recipe").value,' +
    '      nb:      parseInt(document.getElementById("nb").value,10)||1,' +
    '      oc:      parseInt(document.getElementById("oc").value,10)||100,' +
    '      purity:  document.getElementById("purity").value' +
    '    });' +
    '}' +
    'document.getElementById("f").onsubmit=go;' +
    '})()</script>' +
    '</body></html>';
}

// ─── Taille des étages ─────────────────────────────────────────────────────

/**
 * Calculates each stage's floor footprint from machine dimensions + margin.
 *
 * Algorithm:
 *   effective slot = (W + 2 × margin) × (L + 2 × margin)  per machine
 *   stage area     = Σ  nb × effective slot
 *   foundations    = ⌈ area / 64 ⌉   (1 foundation = 8 × 8 m = 64 m²)
 *
 * W and L are read from cols F and G of the Machines sheet.
 * The margin is stored in document property SAT_MACHINE_MARGIN (default 2 m).
 * Results are written to the Stages sheet cols E–G.
 */
function SAT_computeStageSizes() {
  var cfg    = SAT.CFG;
  var props  = PropertiesService.getDocumentProperties();
  var margin = parseFloat(props.getProperty('SAT_MACHINE_MARGIN') || '2');

  // Build machine dimension index: name → {w, l}
  var machSh = SAT.S.get(cfg.SHEETS.MACH);
  var dimIdx = {};
  if (machSh && machSh.getLastRow() >= 2) {
    machSh.getRange(2, 1, machSh.getLastRow() - 1, 7).getValues().forEach(function(r) {
      var name = String(r[0] || '').trim();
      var w    = parseFloat(r[5]) || 0;   // col F — Larg. (m)
      var l    = parseFloat(r[6]) || 0;   // col G — Long. (m)
      if (name) dimIdx[name] = { w: w, l: l };
    });
  }

  // Aggregate by stage from Production sheet
  var prodSh  = SAT.S.get(cfg.SHEETS.PROD);
  var byStage = {}; // stageName → {area, count, missing[]}
  if (prodSh && prodSh.getLastRow() >= cfg.DAT_ROW) {
    prodSh.getRange(cfg.DAT_ROW, 1, prodSh.getLastRow() - cfg.DAT_ROW + 1, cfg.C.NB)
      .getValues().forEach(function(r) {
        var etage   = String(r[cfg.C.ETAGE   - 1] || '').trim();
        var machine = String(r[cfg.C.MACHINE - 1] || '').trim();
        var nb      = Math.max(0, parseFloat(r[cfg.C.NB - 1]) || 0);
        if (!etage || !machine || nb <= 0) return;
        if (!byStage[etage]) byStage[etage] = { area: 0, count: 0, missing: [] };
        var dim = dimIdx[machine];
        if (dim && dim.w > 0 && dim.l > 0) {
          byStage[etage].area  += nb * (dim.w + 2 * margin) * (dim.l + 2 * margin);
          byStage[etage].count += nb;
        } else {
          byStage[etage].count += nb;
          if (byStage[etage].missing.indexOf(machine) < 0)
            byStage[etage].missing.push(machine);
        }
      });
  }

  // Write results to Stages sheet cols E–G
  var etagSh = SAT.S.get(cfg.SHEETS.ETAG);
  if (!etagSh) { SpreadsheetApp.getUi().alert('Stages sheet not found.'); return; }

  var hdrRange = etagSh.getRange(1, 5, 1, 3);
  hdrRange.setValues([['Surface (m²)', 'Fondations', 'Marge (m)']]);
  hdrRange.setFontWeight('bold').setBackground('#6A1B9A').setFontColor('#ffffff');
  etagSh.setColumnWidth(5, 110).setColumnWidth(6, 100).setColumnWidth(7, 90);

  var lastRow = etagSh.getLastRow();
  if (lastRow >= 2) {
    etagSh.getRange(2, 1, lastRow - 1, 1).getValues().forEach(function(r, i) {
      var name = String(r[0] || '').trim();
      var sd   = byStage[name] || { area: 0, count: 0 };
      var area = Math.round(sd.area);
      var fnd  = area > 0 ? Math.ceil(area / 64) : '—';
      etagSh.getRange(i + 2, 5, 1, 3).setValues([[area > 0 ? area : '—', fnd, margin]]);
    });
  }

  // Summary
  var missingList = [];
  Object.keys(byStage).forEach(function(s) {
    if (byStage[s].missing.length > 0)
      missingList.push(s + ': ' + byStage[s].missing.join(', '));
  });
  var msg = 'Results written to the Stages sheet (cols E\u2013G).\n' +
    'Margin: ' + margin + ' m per side  \u2014  1 foundation = 8\u00d78 m = 64 m\u00b2\n' +
    'Tip: edit W/L columns in the Machines sheet to fine-tune values.';
  if (missingList.length > 0)
    msg += '\n\n\u26a0 No dimensions found for:\n' + missingList.join('\n');

  SpreadsheetApp.getActiveSpreadsheet().toast('Stage sizes written to Stages sheet.', 'S.A.T.', 4);
  SpreadsheetApp.getUi().alert('Stage Sizes', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Prompts the user to update the clearance margin (meters per side) added
 * around each machine footprint when computing stage sizes.
 * Stored as document property SAT_MACHINE_MARGIN.
 */
function SAT_setMachineMargin() {
  var ui  = SpreadsheetApp.getUi();
  var cur = PropertiesService.getDocumentProperties().getProperty('SAT_MACHINE_MARGIN') || '2';
  var r   = ui.prompt(
    'Machine clearance margin',
    'Clearance added on EACH side of a machine footprint (meters).\n' +
    'Current value: ' + cur + ' m\n\n' +
    'Example: 2 m margin on a 10\u00d79 m machine \u2192 effective slot = 14\u00d713 m.',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var val = parseFloat(r.getResponseText().trim());
  if (isNaN(val) || val < 0) { ui.alert('Invalid value. Enter a number ≥ 0.'); return; }
  PropertiesService.getDocumentProperties().setProperty('SAT_MACHINE_MARGIN', String(val));
  ui.alert('Margin set to ' + val + ' m.\nRun \u201cStage sizes\u201d to recompute.');
}

// ─── Archivage & migration ───────────────────────────────────────────────────

/**
 * Archive la feuille Production courante (copie en lecture seule avec horodatage)
 * puis vide Production pour accueillir une nouvelle version du jeu.
 *
 * Flux :
 *  1. Demande la nouvelle version jeu à l'utilisateur.
 *  2. Copie Production → "📦 Archive YYYY-MM-DD vX.X" (protection avertissement).
 *  3. Vide les lignes de données dans Production (garde entêtes + validations).
 *  4. Met à jour la propriété de document SAT_GAME_VERSION_OVERRIDE.
 *  5. Recalcule (Dashboard mis à 0 / vide).
 */
function SAT_archiveAndMigrate() {
  var ui = SpreadsheetApp.getUi();
  var r  = ui.prompt(
    'Archiver usine & changer version jeu',
    'La feuille Production sera archivée (lecture seule, conservée).\n' +
    'Les données actuelles seront effacées de Production.\n\n' +
    'Entrez la nouvelle version du jeu (ex: 1.1, 1.2, 2.0) :',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var newVersion = r.getResponseText().trim();
  // Validation simple : ne doit pas être vide et ne doit contenir que chiffres et points
  if (!newVersion || !/^[\d]+\.[\d]+$/.test(newVersion)) {
    ui.alert('Version invalide. Utilisez le format X.Y (ex: 1.1 ou 2.0).');
    return;
  }

  try {
    var ss     = SpreadsheetApp.getActiveSpreadsheet();
    var cfg    = SAT.CFG;
    var prodSh = SAT.S.get(cfg.SHEETS.PROD);
    if (!prodSh) throw new Error('Feuille Production introuvable.');

    // ── 1. Créer la copie archive ─────────────────────────────────────────
    var tz   = Session.getScriptTimeZone();
    var date = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var archiveName = '\uD83D\uDCE6 Archive ' + date + ' v' + cfg.GAME_VERSION;

    // Vérifier qu'une archive du même nom n'existe pas déjà
    if (ss.getSheetByName(archiveName)) {
      archiveName = archiveName + ' (' + Utilities.formatDate(new Date(), tz, 'HH-mm') + ')';
    }

    var archiveSh = prodSh.copyTo(ss);
    archiveSh.setName(archiveName);

    // Positionner l'archive après la feuille Production (garde l'ordre logique)
    var prodIdx = ss.getSheets().indexOf(prodSh);
    try { ss.moveActiveSheet(); } catch(e) {} // no-op si moveActiveSheet non dispo
    try { ss.setActiveSheet(archiveSh); ss.moveActiveSheet(prodIdx + 2); } catch(e) {}

    // Protection en avertissement (empêche les modifications accidentelles)
    var prot = archiveSh.protect();
    prot.setDescription('Archive production v' + cfg.GAME_VERSION + ' — ' + date);
    prot.setWarningOnly(true);

    // ── 2. Vider les données de Production (lignes DAT_ROW+) ─────────────
    var datRow  = cfg.DAT_ROW;
    var lastRow = prodSh.getLastRow();
    if (lastRow >= datRow) {
      // Effacer uniquement les colonnes A-L (données, pas les formules hors portée)
      prodSh.getRange(datRow, 1, lastRow - datRow + 1, cfg.C.MW).clearContent();
      // Remettre OC à 100 % et Pureté à "Normal" sur 200 lignes (valeurs par défaut)
      prodSh.getRange(datRow, cfg.C.OC,  200, 1).setValue(100);
      prodSh.getRange(datRow, cfg.C.PUR, 200, 1).setValue('Normal');
    }

    // ── 3. Enregistrer la nouvelle version jeu ───────────────────────────
    PropertiesService.getDocumentProperties()
      .setProperty('SAT_GAME_VERSION_OVERRIDE', newVersion);

    // ── 4. Recalcul (Dashboard remis à zéro) ─────────────────────────────
    try { SAT_recalcAll(); } catch(e) {}

    ss.toast('Archive "' + archiveName + '" créée. Production vidée.', 'S.A.T.', 6);
    ui.alert(
      'Migration réussie',
      'Archive : "' + archiveName + '"\n' +
      'Production vidée pour la version jeu : ' + newVersion + '\n\n' +
      'Conseil : si la version ' + newVersion + ' dispose d\'un fichier de données\n' +
      '(01_data_v' + newVersion.replace('.', '_') + '.gs), exécutez make push pour\n' +
      'activer les nouvelles recettes.',
      ui.ButtonSet.OK
    );

  } catch(e) {
    ui.alert('Erreur lors de l\'archivage : ' + e.message);
  }
}
