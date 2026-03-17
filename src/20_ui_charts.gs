/* ============================================================
 * 20_ui_charts.gs — Graphiques du Dashboard
 * Utilise SAT.Engine.buildIndex() et SAT.Engine.stats()
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

SAT.Charts = {

  /**
   * Crée tous les graphiques du Dashboard.
   * Appelé depuis SAT_CREATE_CHARTS() dans le menu.
   */
  createAllCharts: function() {
    var cfg  = SAT.CFG;
    var dash = SAT.S.get(cfg.SHEETS.DASH);
    if (!dash) throw new Error('Dashboard introuvable');

    // Supprimer les anciens graphiques
    dash.getCharts().forEach(function(c) {
      try { dash.removeChart(c); } catch(e) {}
    });

    var rows = SAT.Engine.buildIndex();
    if (rows.length === 0) {
      Logger.log('/!\\ SAT.Charts: aucune donnee a representer');
      return;
    }

    SAT.Charts._chartMachinesParEtage(dash, rows);
    SAT.Charts._chartProductionParRessource(dash, rows);
    Logger.log('OK Graphiques crees');
  },

  /** Graphique : nombre de machines par étage */
  _chartMachinesParEtage: function(dash, rows) {
    // Agréger machines par étage
    var agg = {};
    rows.forEach(function(r) {
      agg[r.etage] = (agg[r.etage] || 0) + (r.nb || 0);
    });
    var keys = Object.keys(agg).sort();
    if (keys.length === 0) return;

    // Zone temporaire de données (col F, à partir de la ligne 20)
    var startRow = 20;
    var startCol = 6;
    dash.getRange(startRow, startCol).setValue('Étage');
    dash.getRange(startRow, startCol + 1).setValue('Machines');
    keys.forEach(function(k, i) {
      dash.getRange(startRow + 1 + i, startCol).setValue(k);
      dash.getRange(startRow + 1 + i, startCol + 1).setValue(agg[k]);
    });

    var dataRange = dash.getRange(startRow, startCol, keys.length + 1, 2);
    var chart = dash.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(dataRange)
      .setPosition(4, 4, 0, 0)
      .setOption('title', 'Machines par étage')
      .setOption('width', 440)
      .setOption('height', 280)
      .setOption('legend', { position: 'none' })
      .setOption('hAxis', { title: 'Nb machines', minValue: 0 })
      .build();
    dash.insertChart(chart);
  },

  /** Graphique : production totale par ressource (Top 10) */
  _chartProductionParRessource: function(dash, rows) {
    // Agréger production par ressource
    var agg = {};
    rows.forEach(function(r) {
      if (!r.outRes1 || !r.nb) return;
      agg[r.outRes1] = (agg[r.outRes1] || 0) + r.outRate1 * r.nb;
      if (r.outRes2) {
        agg[r.outRes2] = (agg[r.outRes2] || 0) + r.outRate2 * r.nb;
      }
    });

    // Top 10 ressources
    var sorted = Object.keys(agg).sort(function(a, b) { return agg[b] - agg[a]; });
    var top    = sorted.slice(0, 10);
    if (top.length === 0) return;

    // Zone temporaire de données (col I, à partir de la ligne 20)
    var startRow = 20;
    var startCol = 9;
    dash.getRange(startRow, startCol).setValue('Ressource');
    dash.getRange(startRow, startCol + 1).setValue('Qt/min');
    top.forEach(function(k, i) {
      dash.getRange(startRow + 1 + i, startCol).setValue(k);
      dash.getRange(startRow + 1 + i, startCol + 1).setValue(Math.round(agg[k] * 10) / 10);
    });

    var dataRange = dash.getRange(startRow, startCol, top.length + 1, 2);
    var chart = dash.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(dataRange)
      .setPosition(14, 4, 0, 0)
      .setOption('title', 'Production totale — Top 10 ressources (Qt/min)')
      .setOption('width', 440)
      .setOption('height', 320)
      .setOption('legend', { position: 'none' })
      .setOption('hAxis', { title: 'Qté/min totale', minValue: 0 })
      .build();
    dash.insertChart(chart);
  }
};
