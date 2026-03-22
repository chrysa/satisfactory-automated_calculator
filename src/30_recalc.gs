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
 * Met à jour le Dashboard avec les stats complètes (production + électricité
 * + top ressources + goulots + graphiques).
 * Layout v3.4 : stats gauche (B5:B15), tableaux droite (E6:H22), graphiques col F+H ligne 40.
 */
function _refreshDashboard(stats) {
  var cfg  = SAT.CFG;
  var dash = SAT.S.get(cfg.SHEETS.DASH);
  if (!dash) return;
  try {
    // Sous-titre version (A2, ancre de la plage fusionnée)
    dash.getRange(2, 1).setValue('v' + cfg.VERSION + '  —  wiki officiel Satisfactory ' + cfg.GAME_VERSION);

    // ── Stats production (B5:B10) ──────────────────────────────────────────
    dash.getRange(5,  2).setValue(stats.lines);
    dash.getRange(6,  2).setValue(stats.machines);
    dash.getRange(7,  2).setValue(stats.etages);
    dash.getRange(8,  2).setValue(stats.resources);
    dash.getRange(9,  2).setValue(stats.errors);
    dash.getRange(10, 2).setValue(stats.todo);

    // ── Stats électricité (B13:B15) ────────────────────────────────────────
    var mw    = stats.totalMW    || 0;
    var mach  = stats.machines   || 0;
    dash.getRange(13, 2).setValue(mw);
    dash.getRange(14, 2).setValue(mach > 0 ? Math.round(mw / mach * 10) / 10 : 0);
    dash.getRange(15, 2).setValue(new Date().toLocaleString('fr-FR'));

    // ── Top ressources produites (E6:H13 — 8 lignes) ──────────────────────
    var top = stats.topResources || [];
    for (var i = 0; i < 8; i++) {
      var r = top[i];
      dash.getRange(6 + i, 5, 1, 4).setValues([[
        r ? r.name : '', '', r ? r.rate : '', ''
      ]]);
    }

    // ── Goulots / sous-produits (E16:H22 — 7 lignes) ──────────────────────
    var under = stats.underProduced || [];
    for (var j = 0; j < 7; j++) {
      var u = under[j];
      dash.getRange(16 + j, 5, 1, 4).setValues([[
        u ? u.name    : '',
        u ? u.prod    : '',
        u ? u.cons    : '',
        u ? u.deficit : ''
      ]]);
    }

    // ── Mise à jour des zones tampon des graphiques (ligne 40) ─────────────
    _refreshDashboardCharts(dash, stats);

  } catch (e) {
    Logger.log('ERR _refreshDashboard: ' + e.message);
  }
}

/**
 * Remplit les zones tampon des 2 graphiques permanents du Dashboard.
 * Graphique 1 (col F+G, ligne 40+) : répartition machines par étage.
 * Graphique 2 (col H+I, ligne 40+) : top ressources Qt/min.
 */
function _refreshDashboardCharts(dash, stats) {
  try {
    var buf = 50; // must match _installDashboardCharts buf constant

    // Graphique 1 — machines par étage
    var etageMap = {};
    (stats._rows || []).forEach(function(row) {
      if (!row.etage) return;
      etageMap[row.etage] = (etageMap[row.etage] || 0) + (row.nb || 0);
    });
    var etages = Object.keys(etageMap);
    if (etages.length === 0) {
      dash.getRange(buf, 6, 1, 2).setValues([['Étage','Machines']]);
    } else {
      var g1data = [['Étage','Machines']];
      etages.forEach(function(e) { g1data.push([e, etageMap[e]]); });
      dash.getRange(buf, 6, g1data.length, 2).setValues(g1data);
    }

    // Graphique 2 — top ressources
    var top = stats.topResources || [];
    if (top.length === 0) {
      dash.getRange(buf, 8, 1, 2).setValues([['Ressource','Qt/min']]);
    } else {
      var g2data = [['Ressource','Qt/min']];
      top.forEach(function(r) { g2data.push([r.name, r.rate]); });
      dash.getRange(buf, 8, g2data.length, 2).setValues(g2data);
    }

    // Réancrer les graphiques sur les nouvelles plages
    var charts = dash.getCharts();
    charts.forEach(function(chart, idx) {
      var col = (idx === 0) ? 6 : 8;
      var rows = (idx === 0)
        ? (etages.length > 0 ? etages.length + 1 : 2)
        : (top.length   > 0 ? top.length   + 1 : 2);
      var builder = chart.modify()
        .clearRanges()
        .addRange(dash.getRange(buf, col, rows, 2));
      dash.updateChart(builder.build());
    });

  } catch (e) {
    Logger.log('WARN _refreshDashboardCharts: ' + e.message);
  }
}
