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
        try {
          _installDashboard();
          _setupValidations();
        } catch(e) {
          Logger.log('ERR soft update: ' + e.message);
        }
        props.setProperty('SAT_VERSION', cur);
        props.setProperty('SAT_NOTIFY_VERSION',
          'Version ' + stored + ' \u2192 ' + cur + '\n\nDashboard et validations reconstruits.\nDonnées de production préservées.');
        Logger.log('SAT v' + cur + ' \u2014 mise \u00e0 jour structurelle (was v' + stored + ')');
      }
    }
  } catch (err) {
    Logger.log('ERR onOpen version check: ' + err.message);
  }

  // 3. Recalcul automatique (met à jour le Dashboard y compris la version en B2)
  try { SAT_recalcAll(); } catch(e) {}

  // 4. Reminder si le trigger installable n'a pas encore été activé
  try {
    var triggerProp = PropertiesService.getDocumentProperties().getProperty('SAT_TRIGGER_SETUP');
    if (!triggerProp) {
      SpreadsheetApp.getActiveSpreadsheet()
        .toast('💡 Active l\'assistant au démarrage : menu S.A.T. → ⚙️ Activer l\'assistant au démarrage', 'S.A.T.', 8);
    }
  } catch(eT) {}
}

// ─── Construction du menu ─────────────────────────────────────────────────

function _buildMenu() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('S.A.T.')
      .addItem('🤖 Ouvrir l\'assistant',               'SAT_openAssistant')
      .addSeparator()
      .addItem('Recalcul complet',                    'SAT_recalcAll')
      .addItem('Résumé de production',                'SAT_SHOW_SUMMARY')
      .addSeparator()
      .addItem('➕ Ajouter une ligne de production',    'SAT_showAddProductionForm')
      .addItem('📂 Importer depuis une sauvegarde',    'SAT_openImportSidebar')
      .addSeparator()
      .addItem('Ajouter un étage',                    'SAT_ADD_FLOOR')
      .addItem('Lister les étages',                   'SAT_LIST_FLOORS')
      .addItem('Taille des étages',                  'SAT_computeStageSizes')
      .addSeparator()
      .addItem('🎯 Résoudre objectifs',               'SAT_solveFromObjectives')
      .addItem('🗑️ Effacer lignes solveur',           'SAT_clearSolverRows')
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
      .addSeparator()
      .addItem('⚙️ Activer l\'assistant au démarrage',  'SAT_setupTriggers')
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
  var cfg = SAT.CFG;
  SAT.getRecipeIndex(); // charge les données jeu si besoin

  var etages = _getSheetCol1(cfg.SHEETS.ETAG);

  // Liste des recettes + map recette → machine (depuis les données jeu chargées)
  var recipes = [], recipeToMachine = {};
  (cfg.RECIPES || []).forEach(function(r) {
    if (r[0]) { recipes.push(r[0]); recipeToMachine[r[0]] = r[1] || ''; }
  });

  // Map machine → {sloop, cat} pour adapter le formulaire
  var machineInfo = {};
  (cfg.MACHINES || []).forEach(function(m) {
    if (m[0]) machineInfo[m[0]] = { sloop: m[8] || 0, cat: m[4] || '' };
  });

  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(
      _buildProductionFormHtml(etages, recipes, recipeToMachine, machineInfo)
    ).setWidth(510).setHeight(550),
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
    var nb      = Math.max(1, Math.min(999,   parseInt(d.nb,    10) || 1));
    var oc      = Math.max(1, Math.min(250,   parseInt(d.oc,    10) || 100));
    var sloop   = Math.max(0, Math.min(4,     parseInt(d.sloop, 10) || 0));
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
    sh.getRange(nextRow, c.SLOOP  ).setValue(sloop);

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

/** Construit le HTML complet du formulaire "Nouvelle ligne de production".
 * @param {string[]} etages          Étages disponibles
 * @param {string[]} recipes         Recettes disponibles
 * @param {Object}   recipeToMachine Map nom recette → nom machine
 * @param {Object}   machineInfo     Map nom machine → {sloop:N, cat:'...'}
 */
function _buildProductionFormHtml(etages, recipes, recipeToMachine, machineInfo) {
  var etageOpts  = '<option value="">\u2014 aucun \u2014</option>' + _buildSelectOptions(etages);
  var recipeOpts = '<option value="">\u2014 choisir \u2014</option>' + _buildSelectOptions(recipes);

  // Encoder les maps en JSON pour injection sécurise dans la balise <script>
  var r2mJson   = JSON.stringify(recipeToMachine).replace(/<\//g, '<\\/');
  var mInfoJson = JSON.stringify(machineInfo).replace(/<\//g, '<\\/');

  var extraCss = [
    '.mach-box{background:#f1f3f4;border:1px solid #dadce0;border-radius:6px;',
    'padding:7px 10px;font-size:13px;color:#3c4043;min-height:33px;line-height:1.8;}',
    '.sl-wrap{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;}',
    '.sl-cap{font-size:12px;color:#5f6368;padding-bottom:7px;white-space:nowrap;}'
  ].join('');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + _formCss() + extraCss + '</style></head><body>' +
    '<h2>\uD83C\uDFED Nouvelle ligne de production</h2>' +
    '<form id="f">' +

    '<div class="fg"><label>\u00c9tage</label>' +
    '<select id="etage">' + etageOpts + '</select></div>' +

    '<div class="fg"><label>Recette \u2731</label>' +
    '<select id="recipe" required onchange="sync()">' + recipeOpts + '</select></div>' +

    '<div class="fg"><label>Machine <span style="font-weight:400;font-size:11px;color:#80868b;">\u2014 d\u00e9duite de la recette</span></label>' +
    '<div id="mbox" class="mach-box">\u2014</div>' +
    '<input type="hidden" id="machine"></div>' +

    '<div class="g2">' +
    '<div class="fg"><label>Nb machines</label>' +
    '<input type="number" id="nb" value="1" min="1" max="999" required></div>' +
    '<div class="fg"><label>Overclock %</label>' +
    '<input type="number" id="oc" value="100" min="1" max="250" required></div>' +
    '</div>' +

    '<div class="fg" id="pur-row" style="display:none"><label>Puret\u00e9 du n\u0153ud</label>' +
    '<select id="purity">' +
    '<option value="Normal">Normal (\u00d71,0)</option>' +
    '<option value="Pur">Pur (\u00d72,0)</option>' +
    '<option value="Impur">Impur (\u00d70,5)</option>' +
    '</select>' +
    '<p class="hint">Pour les extracteurs (Foreuses, Pompes\u2026)</p></div>' +

    '<div class="fg" id="sl-row" style="display:none"><label>Somersloops</label>' +
    '<div class="sl-wrap">' +
    '<input type="number" id="sloop" value="0" min="0" max="0">' +
    '<span class="sl-cap">/ <span id="slmax">0</span> emplacement(s)</span>' +
    '</div>' +
    '<p class="hint">Chaque Somersloop double le taux de sortie (\u00d72<sup>N</sup>).</p></div>' +

    '<button type="submit" class="btn bp" id="btn" disabled>\u2795 Ajouter</button>' +
    '<button type="button" class="btn bc" onclick="google.script.host.close()">Annuler</button>' +
    '<div id="st" class="st"></div>' +
    '</form>' +

    '<script>(function(){' +
    'var R2M=' + r2mJson + ',MI=' + mInfoJson + ';' +
    'function sync(){' +
    '  var rec=document.getElementById("recipe").value,' +
    '      mach=R2M[rec]||"",' +
    '      info=MI[mach]||{sloop:0,cat:""};' +
    '  document.getElementById("machine").value=mach;' +
    '  document.getElementById("mbox").textContent=mach||"\u2014";' +
    '  var ext=info.cat==="Extraction";' +
    '  document.getElementById("pur-row").style.display=ext?"":"none";' +
    '  var hasSl=!ext&&(info.sloop||0)>0;' +
    '  document.getElementById("sl-row").style.display=hasSl?"":"none";' +
    '  document.getElementById("slmax").textContent=info.sloop||0;' +
    '  var si=document.getElementById("sloop");' +
    '  si.max=info.sloop||0;' +
    '  si.value=Math.min(parseInt(si.value,10)||0,info.sloop||0);' +
    '  document.getElementById("btn").disabled=!rec;' +
    '}' +
    'window.sync=sync;' +
    'document.getElementById("f").addEventListener("submit",function(e){' +
    '  e.preventDefault();' +
    '  var b=document.getElementById("btn");' +
    '  b.disabled=true;b.textContent="\u23f3 Ajout\u2026";' +
    '  google.script.run' +
    '    .withSuccessHandler(function(r){' +
    '      var s=document.getElementById("st");' +
    '      s.className="st"+(r.ok?" ok":" er");' +
    '      s.textContent=r.ok?"\u2713 Ligne ajout\u00e9e (ligne "+r.row+"). Recalcul\u00e9.":"Erreur\u00a0: "+r.error;' +
    '      if(r.ok){document.getElementById("f").reset();sync();}' +
    '      b.disabled=false;b.textContent="\u2795 Ajouter";' +
    '    })' +
    '    .withFailureHandler(function(err){' +
    '      var s=document.getElementById("st");' +
    '      s.className="st er";s.textContent="Erreur\u00a0: "+err.message;' +
    '      b.disabled=false;b.textContent="\u2795 Ajouter";' +
    '    })' +
    '    .SAT_addProductionRow({' +
    '      etage:   document.getElementById("etage").value,' +
    '      machine: document.getElementById("machine").value,' +
    '      recipe:  document.getElementById("recipe").value,' +
    '      nb:      parseInt(document.getElementById("nb").value,10)||1,' +
    '      oc:      parseInt(document.getElementById("oc").value,10)||100,' +
    '      purity:  document.getElementById("purity").value,' +
    '      sloop:   parseInt(document.getElementById("sloop").value,10)||0' +
    '    });' +
    '});' +
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
  var cfg = SAT.CFG;

  // ── 1. Index machines : nom → {larg, long, haut, cat} ────────────────
  var machSh = SAT.S.get(cfg.SHEETS.MACH);
  var dimIdx = {}; // nom → {larg, long, haut, cat}
  if (machSh && machSh.getLastRow() >= 2) {
    machSh.getRange(2, 1, machSh.getLastRow() - 1, 8).getValues().forEach(function(r) {
      var nom  = String(r[0] || '').trim();
      if (!nom) return;
      dimIdx[nom] = {
        larg: parseFloat(r[5]) || 0,   // col F — Larg. (m)
        long: parseFloat(r[6]) || 0,   // col G — Long. (m)
        haut: parseFloat(r[7]) || 0,   // col H — Haut. (m)
        cat:  String(r[4] || '').trim() // col E — Catégorie
      };
    });
  }

  // ── 2. Agrégation par étage depuis la feuille Production ─────────────
  // byStage[nom] = { machines: [{larg,long,haut,cat,nb}], missing: [] }
  var prodSh  = SAT.S.get(cfg.SHEETS.PROD);
  var byStage = {};
  if (prodSh && prodSh.getLastRow() >= cfg.DAT_ROW) {
    prodSh.getRange(cfg.DAT_ROW, 1, prodSh.getLastRow() - cfg.DAT_ROW + 1, cfg.C.NB)
      .getValues().forEach(function(r) {
        var etage   = String(r[cfg.C.ETAGE   - 1] || '').trim();
        var machine = String(r[cfg.C.MACHINE - 1] || '').trim();
        var nb      = Math.max(0, parseFloat(r[cfg.C.NB - 1]) || 0);
        if (!etage || !machine || nb <= 0) return;
        if (!byStage[etage]) byStage[etage] = { machines: [], missing: [] };
        var dim = dimIdx[machine];
        if (dim && dim.larg > 0 && dim.long > 0) {
          // Regrouper les machines identiques
          var found = false;
          byStage[etage].machines.forEach(function(m) {
            if (m.nom === machine) { m.nb += nb; found = true; }
          });
          if (!found) byStage[etage].machines.push({ nom: machine, nb: nb,
            larg: dim.larg, long: dim.long, haut: dim.haut, cat: dim.cat });
        } else {
          if (byStage[etage].missing.indexOf(machine) < 0)
            byStage[etage].missing.push(machine);
        }
      });
  }

  // ── 3. Lire la feuille Étages (cols A-F) ─────────────────────────────
  var etagSh = SAT.S.get(cfg.SHEETS.ETAG);
  if (!etagSh) { SpreadsheetApp.getUi().alert('Feuille Étages introuvable.'); return; }

  var lastRow = etagSh.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Aucun étage dans la feuille Étages.');
    return;
  }

  var etagRows = etagSh.getRange(2, 1, lastRow - 1, 6).getValues();

  // ── 4. Calcul et écriture par étage ──────────────────────────────────
  var results  = [];
  var warnings = [];

  etagRows.forEach(function(row, i) {
    var nom       = String(row[0] || '').trim(); // col A
    var ascenseur = String(row[4] || '').trim().toLowerCase() === 'oui'; // col E
    var aeration  = String(row[5] || '').trim().toLowerCase() === 'oui'; // col F

    if (!nom) { results.push(['', '', '', '', '', '']); return; }

    var sd = byStage[nom];
    if (!sd || sd.machines.length === 0) {
      results.push(['', '—', '—', '—', '—', '—']);
      if (sd && sd.missing.length > 0)
        warnings.push(nom + ': ' + sd.missing.join(', '));
      return;
    }

    // Isolement nucléaire : au moins une machine de catégorie 'Énergie'
    var isNuclear = sd.machines.some(function(m) { return m.cat === '\u00C9nergie'; });

    // Hauteur : max(haut) + 2 m de dégagement
    var maxHaut = 0;
    sd.machines.forEach(function(m) { if (m.haut > maxHaut) maxHaut = m.haut; });
    var hauteur = maxHaut + 2;

    // Modèle bus central (machines des deux côtés d'un bus de convoyeurs) :
    //   Largeur = 2 × max(Long + 2) + (ascenseur ? 4 m : 0)
    //   Longueur = Σ(nb × (Larg + 2)) + (aération ? 4 m : 0)
    var maxLong = 0;
    var sumLarg = 0;
    sd.machines.forEach(function(m) {
      if (m.long + 2 > maxLong) maxLong = m.long + 2;
      sumLarg += m.nb * (m.larg + 2);
    });
    var largeur  = 2 * maxLong + (ascenseur ? 4 : 0);
    var longueur = sumLarg      + (aeration  ? 4 : 0);
    var surface  = largeur * longueur;
    var fondations = surface > 0 ? Math.ceil(surface / 64) : 0;

    results.push([
      isNuclear ? '\u26A0\uFE0F ISOL\u00C9' : '',
      hauteur,
      largeur,
      longueur,
      surface,
      fondations
    ]);

    if (sd.missing.length > 0)
      warnings.push(nom + ': ' + sd.missing.join(', '));
  });

  // Écriture en une seule opération (cols G–L = 7–12)
  etagSh.getRange(2, 7, results.length, 6).setValues(results);

  // ── 5. Résumé ─────────────────────────────────────────────────────────
  var msg = 'Dimensions écrites dans la feuille Étages (cols G–L).\n' +
    'Modèle bus central  \u2014  1 fondation = 8\u00d78 m = 64 m\u00b2\n' +
    'Ascenseur (+4 m larg.)  \u2014  A\u00e9ration (+4 m long.)';
  if (warnings.length > 0)
    msg += '\n\n\u26a0 Dimensions manquantes pour :\n' + warnings.join('\n');

  SpreadsheetApp.getActiveSpreadsheet().toast('Dimensions des étages mises à jour.', 'S.A.T.', 4);
  SpreadsheetApp.getUi().alert('Tailles des étages', msg, SpreadsheetApp.getUi().ButtonSet.OK);
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

// ─── Trigger installable pour l'ouverture auto de l'assistant ────────────────

/**
 * Enregistre un trigger installable onOpen qui ouvre l'assistant au démarrage.
 * Doit être appelé avec les autorisations complètes (depuis le menu, pas un
 * simple trigger). Sans risque de doublon — vérifie si déjà présent.
 */
function SAT_setupTriggers() {
  try {
    var ss       = SpreadsheetApp.getActive();
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'SAT_onOpenInstallable') {
        ss.toast('Trigger déjà configuré.', 'S.A.T.', 3);
        return;
      }
    }
    ScriptApp.newTrigger('SAT_onOpenInstallable')
      .forSpreadsheet(ss)
      .onOpen()
      .create();
    PropertiesService.getDocumentProperties().setProperty('SAT_TRIGGER_SETUP', 'true');
    ss.toast('Assistant configuré : il s\'ouvrira au prochain démarrage.', 'S.A.T.', 4);
    Logger.log('SAT: installable onOpen trigger registered');
  } catch(e) {
    SpreadsheetApp.getUi().alert('Erreur setup trigger : ' + e.message);
    Logger.log('ERR SAT_setupTriggers: ' + e.message);
  }
}

/**
 * Handler du trigger installable onOpen.
 * Contrairement au simple trigger onOpen(), il peut appeler showSidebar().
 * Affiche d'abord le popup de nouvelle version si en attente, puis l'assistant.
 */
function SAT_onOpenInstallable() {
  // Popup nouvelle version si en attente
  try {
    var props = PropertiesService.getDocumentProperties();
    var msg   = props.getProperty('SAT_NOTIFY_VERSION');
    if (msg) {
      props.deleteProperty('SAT_NOTIFY_VERSION');
      SpreadsheetApp.getUi().alert('🆕 S.A.T. mis à jour', msg, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  } catch(e) {
    Logger.log('ERR SAT_onOpenInstallable notify: ' + e.message);
  }
  // Ouvrir l'assistant
  try { SAT_openAssistant(); } catch(e) {
    Logger.log('ERR SAT_onOpenInstallable assistant: ' + e.message);
  }
}
