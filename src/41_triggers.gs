/* ============================================================
 * 41_triggers.gs — Déclencheur onEdit
 * Recalcul automatique quand Recette, Machine, Nb, OC% ou Pureté changent.
 * Les colonnes Qt/min IN et OUT sont calculées automatiquement.
 * ============================================================ */

function onEdit(e) {
  if (!e || !e.range) return;

  var cfg   = SAT.CFG;
  var col   = e.range.getColumn();
  var sheet = e.range.getSheet().getName();
  var c     = cfg.C;

  // Uniquement sur la feuille Production
  if (sheet !== cfg.SHEETS.PROD) return;

  // Recalcul sur les colonnes qui affectent le calcul des taux et les flags
  // c.RECIPE (C) détermine les ressources IN/OUT et les taux de base
  var recalcCols = [c.RECIPE, c.MACHINE, c.NB, c.OC, c.PUR];
  if (recalcCols.indexOf(col) === -1) return;

  try {
    if (e.range.getNumRows() === 1) {
      // Optimisation : une seule ligne modifiée → recalcul ciblé
      SAT.Engine.writeRowFlags(e.range.getRow());
    } else {
      // Modifications multi-lignes (collage, etc.) → recalcul complet
      SAT.Engine.writeFlags(SAT.Engine.buildIndex());
    }
  } catch (err) {
    Logger.log('ERR onEdit: ' + err.message);
  }
}
