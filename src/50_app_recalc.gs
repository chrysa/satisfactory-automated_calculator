/* 50_app_recalc.gs - Orchestre principal du recalcul système */
var SAT = this.SAT || (this.SAT = {});

/**
 * Recalcul complet: pipeline central
 * 
 * Pipeline:
 *   1. buildIndex() → charge et normalise données
 *   2. computeErrors() → détecte erreurs dépendances
 *   3. computeTodo() → lignes à compléter (Nb vide/0)
 *   4. computeStatsAndDeps() → stats et graph
 *   5. Overview.* → remplit feuille vue d'ensemble
 *   6. Production rows → coloration MFC + causes
 */
function SAT_recalcAll() {
  var idx = SAT.Engine.buildIndex();
  var err = SAT.Engine.computeErrors(idx);
  var todo = SAT.Engine.computeTodo(idx);
  var stats = SAT.Engine.computeStatsAndDeps(idx);

  SAT.Overview.headers();
  SAT.Overview.writeTodo(todo);
  SAT.Overview.writeErrors(err.errors);
  SAT.Overview.writeStats(stats);
  SAT.Overview.stamps();

  SAT_applyProductionRowStyles(idx.rows, err.rowCause, err.rowRole, err.producerToHighlight);
  SAT_applyConditionalFormattingProduction();
}
