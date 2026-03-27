/* ============================================================
 * 51_import.gs — Save File Import Sidebar
 *
 * Opens the 51_import.html sidebar which parses a Satisfactory .sav
 * file directly in the user's browser (via @etothepii/satisfactory-file-parser
 * loaded from esm.sh CDN), then calls SAT_importFromSave() server-side
 * to write the extracted rows into the Production sheet.
 *
 * No local tooling required — parsing happens entirely client-side.
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

// ── Open the import sidebar ───────────────────────────────────────────────────

function SAT_openImportSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('51_import_ui')
    .setTitle('Importer une sauvegarde .sav')
    .setWidth(460);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ── Receive rows from browser and write to Production sheet ───────────────────

/**
 * Called by the sidebar after client-side .sav parsing.
 * @param {Array<{etage,machine,recipe,nb,oc,purity,sloop}>} rows
 * @param {boolean} append  true = append after last row, false = overwrite
 * @returns {{ok:boolean, count:number}|{error:string}}
 */
function SAT_importFromSave(rows, append) {
  try {
    var cfg = SAT.CFG;
    var sh  = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh)                           return { error: 'Feuille Production introuvable' };
    if (!rows || rows.length === 0)    return { error: 'Aucune ligne à importer' };

    var ncols    = cfg.C.SLOOP;    // 13 — last column (M)
    var startRow;

    if (append) {
      // Append after last row with data
      var lastRow = sh.getLastRow();
      startRow = Math.max(lastRow + 1, cfg.DAT_ROW);
    } else {
      // Overwrite: clear existing data rows first
      var lastExisting = sh.getLastRow();
      if (lastExisting >= cfg.DAT_ROW) {
        sh.getRange(cfg.DAT_ROW, 1, lastExisting - cfg.HDR_ROW, ncols).clearContent();
      }
      startRow = cfg.DAT_ROW;
    }

    var data = rows.map(function(r) {
      var row                      = new Array(ncols).fill('');
      row[cfg.C.ETAGE   - 1]      = String(r.etage   || '');
      row[cfg.C.MACHINE - 1]      = String(r.machine || '');
      row[cfg.C.RECIPE  - 1]      = String(r.recipe  || '');
      row[cfg.C.NB      - 1]      = Number(r.nb)    || 1;
      row[cfg.C.OC      - 1]      = Number(r.oc)    || 100;
      row[cfg.C.PUR     - 1]      = String(r.purity || 'Normal');
      row[cfg.C.SLOOP   - 1]      = Number(r.sloop) || 0;
      return row;
    });

    sh.getRange(startRow, 1, data.length, ncols).setValues(data);

    // ── Synchroniser la feuille Étages avec les nouveaux noms d'étages ──────
    var etagSh = SAT.S.get(cfg.SHEETS.ETAG);
    if (etagSh) {
      // Collecter les noms d'étages déjà présents dans la feuille
      var existingFloors = {};
      var etagLast = etagSh.getLastRow();
      if (etagLast >= 2) {
        etagSh.getRange(2, 1, etagLast - 1, 1).getValues()
          .forEach(function(r) { if (r[0]) existingFloors[String(r[0]).trim()] = true; });
      }
      // Ajouter les étages importés qui n'existent pas encore
      var newFloors = [];
      rows.forEach(function(r) {
        var name = String(r.etage || '').trim();
        if (name && !existingFloors[name]) {
          existingFloors[name] = true;
          newFloors.push(name);
        }
      });
      if (newFloors.length > 0) {
        var nextRow = etagSh.getLastRow() + 1;
        var floorData = newFloors.map(function(name, i) {
          return [name, nextRow - 2 + i, '', ''];
        });
        etagSh.getRange(nextRow, 1, floorData.length, 4).setValues(floorData);
        SAT.Log.ok('SAT_importFromSave: ' + newFloors.length + ' étage(s) ajouté(s) dans la feuille Étages');
        // Mettre à jour les validations dropdown
        try { _setupValidations(); } catch(ve) {}
      }
    }

    // Trigger full recalc to populate D, E, I, J, K, L columns
    SAT_recalcAll();

    SAT.Log.ok('SAT_importFromSave: ' + rows.length + ' rows imported (append=' + append + ')');
    return { ok: true, count: rows.length };

  } catch (e) {
    SAT.Log.error('SAT_importFromSave: ' + e.message);
    return { error: e.message };
  }
}

Logger.log('\u2705 51_import.gs loaded');
