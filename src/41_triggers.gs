/* ============================================================
 * 41_triggers.gs — Déclencheurs onEdit
 * Recalcul automatique + automations ergonomiques.
 * ============================================================ */

function onEdit(e) {
  if (!e || !e.range) return;

  var cfg = SAT.CFG;
  var col = e.range.getColumn();
  var row = e.range.getRow();
  var sh  = e.range.getSheet();
  var c   = cfg.C;

  // Uniquement sur la feuille Production, lignes de données
  if (sh.getName() !== cfg.SHEETS.PROD) return;
  if (row < cfg.DAT_ROW) return;

  // Collage multi-lignes → recalcul complet
  if (e.range.getNumRows() > 1) {
    try { SAT.Engine.writeFlags(SAT.Engine.buildIndex()); } catch(err) {
      Logger.log('ERR onEdit multi: ' + err.message);
    }
    return;
  }

  // ── Colonne Étage (A) — démarrage ou suppression d'une ligne ──────────
  if (col === c.ETAGE) {
    var etage = SAT.U.str(e.range.getValue());
    if (!etage) {
      // Étage effacé : nettoyer les colonnes auto de la ligne
      try {
        sh.getRange(row, c.OUT_RATE, 1, 2).clearContent();
        sh.getRange(row, c.FLAGS,    1, 2).clearContent();
        sh.getRange(row, 1, 1, c.IN_RATE)
          .setBackgrounds([[null, null, null, '#F1F8E9', '#F1F8E9']]);
      } catch(err) { Logger.log('ERR onEdit clear row: ' + err.message); }
    } else {
      // Nouvelle ligne avec étage : pré-remplir OC et Pureté si vides
      try {
        if (!SAT.U.str(sh.getRange(row, c.OC).getValue()))
          sh.getRange(row, c.OC).setValue(100);
        if (!SAT.U.str(sh.getRange(row, c.PUR).getValue()))
          sh.getRange(row, c.PUR).setValue('Normal');
      } catch(err) { Logger.log('ERR onEdit init row: ' + err.message); }
    }
    return; // pas de recalcul de taux sur changement Étage seul
  }

  // ── Colonne Recette (C) — synchronisation automatique de la Machine ───
  // La recette détermine la machine de façon univoque dans Satisfactory.
  if (col === c.RECIPE) {
    try {
      var recipeName = SAT.U.str(e.range.getValue());
      if (recipeName) {
        var rec = SAT.getRecipeIndex()[recipeName];
        if (rec && rec.machine) sh.getRange(row, c.MACHINE).setValue(rec.machine);
      } else {
        // Recette effacée → effacer aussi la machine (incohérente sans recette)
        sh.getRange(row, c.MACHINE).clearContent();
      }
    } catch(err) { Logger.log('ERR onEdit auto-machine: ' + err.message); }
  }

  // ── Recalcul des taux et flags ─────────────────────────────────────────
  var recalcCols = [c.RECIPE, c.MACHINE, c.NB, c.OC, c.PUR];
  if (recalcCols.indexOf(col) === -1) return;

  try {
    SAT.Engine.writeRowFlags(row);
  } catch(err) {
    Logger.log('ERR onEdit recalc: ' + err.message);
  }
}
