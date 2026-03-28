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

    // ── Stats électricité (B13:B19) — main line + 4 per-category sub-lines ───
    var mw       = stats.totalMW || 0;
    var maxMW    = stats.maxMW   || 0;
    var mwCat    = stats.mwByCategory || {};
    var energyNb = stats.energyNb     || 0;
    // Group into 3 consumption sub-lines + 1 energy machine count
    var mwExtract = (mwCat['Extraction']  || 0) + (mwCat['Fusion'] || 0);
    var mwProd    = (mwCat['Production']  || 0) + (mwCat['Raffinage'] || 0) + (mwCat['Conditionnement'] || 0);
    var mwAvance  = (mwCat['Avanc\u00e9'] || 0);
    dash.getRange(13, 2).setValue(mw);
    dash.getRange(14, 2).setValue(mwExtract > 0 ? Math.round(mwExtract * 10) / 10 : '\u2014');
    dash.getRange(15, 2).setValue(mwProd    > 0 ? Math.round(mwProd    * 10) / 10 : '\u2014');
    dash.getRange(16, 2).setValue(mwAvance  > 0 ? Math.round(mwAvance  * 10) / 10 : '\u2014');
    dash.getRange(17, 2).setValue(energyNb  > 0 ? energyNb + ' machine(s)' : '\u2014');
    dash.getRange(18, 2).setValue(maxMW);
    dash.getRange(19, 2).setValue(new Date().toLocaleString('fr-FR'));

    // ── Stats objectifs solveur (B17:B20) ──────────────────────────────────
    try {
      var objSh = SAT.S.get(cfg.SHEETS.OBJ);
      if (objSh && objSh.getLastRow() >= 2) {
        var objData = objSh.getRange(2, 1, objSh.getLastRow() - 1, 5).getValues()
          .filter(function(row) { return row[0] !== ''; });
        var nbTotal   = objData.length;
        var nbActifs  = objData.filter(function(r) { return r[4] === '▶ Actif'; }).length;
        var nbResolus = objData.filter(function(r) {
          return r[4] === '▶ Actif' && String(r[5]) !== '' && Number(r[5]) > 0;
        }).length;
        var phaseCounts = {};
        objData.forEach(function(r) {
          if (r[2]) phaseCounts[r[2]] = (phaseCounts[r[2]] || 0) + 1;
        });
        var dominantPhase = Object.keys(phaseCounts).reduce(function(a, b) {
          return phaseCounts[a] >= phaseCounts[b] ? a : b;
        }, 'P1');
        dash.getRange(22, 2).setValue(nbTotal);
        dash.getRange(23, 2).setValue(nbActifs);
        dash.getRange(24, 2).setValue(nbResolus);
        dash.getRange(25, 2).setValue(dominantPhase);
      } else {
        dash.getRange(22, 2).setValue(0);
        dash.getRange(23, 2).setValue(0);
        dash.getRange(24, 2).setValue(0);
        dash.getRange(25, 2).setValue('\u2014');
      }
    } catch(eObj) {
      Logger.log('WARN objectives stats: ' + eObj.message);
    }

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
 * Fills the 4 hidden data ranges backing the Dashboard permanent charts,
 * clears any stale buffer data from previous runs, then recreates all 4 charts.
 *
 * Chart layout (2 rows × 2 charts):
 *   Row 1 anchored at row 29: left=machines/stage (COLUMN) | right=top resources (BAR)
 *   Row 2 anchored at row 41: left=MW/category (PIE)       | right=bottleneck deficit (BAR)
 * Data buffer starts at row 66 (cols F-M), well below visible content (~row 60).
 */
function _refreshDashboardCharts(dash, stats) {
  try {
    var buf = 66; // must match _installDashboardCharts buf constant
    // Clear the full potential buffer zone — covers old buf=50 and new buf=66 data
    dash.getRange(50, 6, 200, 8).clearContent();

    // ── Chart 1 data: machines by stage (cols F-G) ──────────────────────────
    var etageMap = {};
    (stats._rows || []).forEach(function(row) {
      if (!row.etage) return;
      etageMap[row.etage] = (etageMap[row.etage] || 0) + (row.nb || 0);
    });
    var etages = Object.keys(etageMap);
    var g1 = [['Stage', 'Machines']];
    etages.forEach(function(e) { g1.push([e, etageMap[e]]); });
    if (g1.length === 1) g1.push(['\u2014', 0]);
    dash.getRange(buf, 6, g1.length, 2).setValues(g1);

    // ── Chart 2 data: top resources Qt/min (cols H-I) ───────────────────────
    var top = stats.topResources || [];
    var g2 = [['Resource', 'Qt/min']];
    top.forEach(function(r) { g2.push([r.name, r.rate]); });
    if (g2.length === 1) g2.push(['\u2014', 0]);
    dash.getRange(buf, 8, g2.length, 2).setValues(g2);

    // ── Chart 3 data: MW consumption by machine category (cols J-K) ─────────
    var mwCat = stats.mwByCategory || {};
    var g3 = [['Category', 'MW']];
    Object.keys(mwCat).sort().forEach(function(cat) {
      if (mwCat[cat] > 0) g3.push([cat, Math.round(mwCat[cat] * 10) / 10]);
    });
    if (g3.length === 1) g3.push(['\u2014', 0]);
    dash.getRange(buf, 10, g3.length, 2).setValues(g3);

    // ── Chart 4 data: top bottleneck deficits (cols L-M) ────────────────────
    var under = (stats.underProduced || []).slice(0, 8);
    var g4 = [['Resource', 'Deficit/min']];
    under.forEach(function(u) { g4.push([u.name, u.deficit]); });
    if (g4.length === 1) g4.push(['\u2014', 0]);
    dash.getRange(buf, 12, g4.length, 2).setValues(g4);

    // ── Recreate all 4 charts with correct ranges + anchor positions ─────────
    dash.getCharts().forEach(function(c) { try { dash.removeChart(c); } catch(e) {} });

    // Chart 1 — machines by stage (COLUMN: short labels read well vertically)
    dash.insertChart(dash.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(dash.getRange(buf, 6, g1.length, 2))
      .setPosition(29, 1, 4, 4)
      .setOption('title', 'Machines par \u00e9tage')
      .setOption('width', 360).setOption('height', 240)
      .setOption('legend', { position: 'none' })
      .setOption('vAxis', { title: 'Nb', minValue: 0, textStyle: { fontSize: 9 } })
      .setOption('hAxis', { textStyle: { fontSize: 8 } })
      .setOption('backgroundColor', '#F3E5F5')
      .setOption('chartArea', { width: '80%', height: '65%' })
      .build());

    // Chart 2 — top production Qt/min (BAR horizontal: resource names need width)
    dash.insertChart(dash.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(dash.getRange(buf, 8, g2.length, 2))
      .setPosition(29, 5, 4, 4)
      .setOption('title', 'Top production (Qt/min)')
      .setOption('width', 360).setOption('height', 240)
      .setOption('legend', { position: 'none' })
      .setOption('hAxis', { title: 'Qt/min', minValue: 0, textStyle: { fontSize: 9 } })
      .setOption('vAxis', { textStyle: { fontSize: 8 } })
      .setOption('backgroundColor', '#E8F5E9')
      .setOption('chartArea', { width: '65%', height: '75%' })
      .build());

    // Chart 3 — power by category (PIE: proportion of total MW is most useful)
    dash.insertChart(dash.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(dash.getRange(buf, 10, g3.length, 2))
      .setPosition(41, 1, 4, 4)
      .setOption('title', 'Conso. \u00e9lectrique par cat\u00e9gorie (MW)')
      .setOption('width', 360).setOption('height', 240)
      .setOption('pieSliceText', 'percentage')
      .setOption('legend', { position: 'right', textStyle: { fontSize: 9 } })
      .setOption('backgroundColor', '#FFF8E1')
      .setOption('chartArea', { width: '55%', height: '75%' })
      .build());

    // Chart 4 — top bottlenecks deficit (BAR horizontal)
    dash.insertChart(dash.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(dash.getRange(buf, 12, g4.length, 2))
      .setPosition(41, 5, 4, 4)
      .setOption('title', 'Goulots \u2014 d\u00e9ficit /min')
      .setOption('width', 360).setOption('height', 240)
      .setOption('legend', { position: 'none' })
      .setOption('hAxis', { title: 'D\u00e9ficit Qt/min', minValue: 0, textStyle: { fontSize: 9 } })
      .setOption('vAxis', { textStyle: { fontSize: 8 } })
      .setOption('backgroundColor', '#FFEBEE')
      .setOption('chartArea', { width: '65%', height: '75%' })
      .build());

  } catch (e) {
    Logger.log('WARN _refreshDashboardCharts: ' + e.message);
  }
}
