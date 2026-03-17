/* ============================================================
 * 30_recalc.gs — Recalcul complet du classeur
 * ============================================================ */

/**
 * Recalcule toutes les lignes de production et met à jour le Dashboard.
 * Appelé manuellement depuis le menu ou automatiquement via onEdit.
 */
function SAT_recalcAll() {
  try {
    Logger.log('Recalcul en cours...');
    var rows = SAT.Engine.buildIndex();
    SAT.Engine.writeFlags(rows);
    _refreshDashboard(SAT.Engine.stats(rows));
    Logger.log('OK Recalcul termine — ' + rows.length + ' ligne(s)');
    SpreadsheetApp.getActiveSpreadsheet()
      .toast('OK ' + rows.length + ' ligne(s) recalculée(s)', 'SAT Recalcul', 3);
  } catch (e) {
    Logger.log('ERR SAT_recalcAll: ' + e.message);
  }
}

/**
 * Met à jour les cellules de stats dans le Dashboard (B5:B10).
 * B4 contient une formule COUNTA — on ne la touche pas.
 */
function _refreshDashboard(stats) {
  var dash = SAT.S.get(SAT.CFG.SHEETS.DASH);
  if (!dash) return;
  try {
    dash.getRange('B5').setValue(stats.machines);
    dash.getRange('B6').setValue(stats.etages);
    dash.getRange('B7').setValue(stats.resources);
    dash.getRange('B8').setValue(stats.errors);
    dash.getRange('B9').setValue(stats.todo);
    dash.getRange('B10').setValue(new Date().toLocaleString('fr-FR'));
  } catch (e) {
    Logger.log('ERR _refreshDashboard: ' + e.message);
  }
}
