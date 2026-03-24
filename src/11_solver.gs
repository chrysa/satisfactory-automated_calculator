/* ============================================================
 * 11_solver.gs — Production solver
 *
 * Given a target item + Qt/min, recursively resolves the full
 * production tree down to raw resources, then writes all computed
 * lines into the Production sheet (or returns the tree as data).
 *
 * Entry points:
 *   SAT_solveFromObjectives()      — menu action: reads 🎯 Objectifs sheet
 *   SAT.Solver.solve(item, rate)   — programmatic API (returns tree)
 *   SAT.Solver.writeToProduction(nodes, etage) — writes tree to Production
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

SAT.Solver = {

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Resolves the production tree for `targetItem` at `targetRate` Qt/min.
   * Returns a flat list of {recipe, nb, rate, tier, depth, isRaw} nodes,
   * sorted from raw resources (depth=max) to finished product (depth=0).
   *
   * @param {string} targetItem  - output resource name (FR, as in RECIPES)
   * @param {number} targetRate  - desired Qt/min
   * @param {string} phaseId     - optional phase filter (e.g. 'P3'); null = all
   * @returns {{ nodes: Array, rawInputs: Object, warnings: Array }}
   */
  solve: function(targetItem, targetRate, phaseId) {
    SAT.loadGameData();
    var idx      = SAT.getRecipeIndex();       // name → recipe object
    var phases   = SAT.CFG.PHASES || [];
    var allowed  = null; // null = unrestricted

    // Build allowed tiers set from phase filter
    if (phaseId) {
      allowed = {};
      for (var pi = 0; pi < phases.length; pi++) {
        var ph = phases[pi];
        if (ph.id === phaseId) {
          ph.tiers.forEach(function(t) { allowed[t] = true; });
          break;
        }
        // Include all prior phases too (you always have their recipes)
        ph.tiers.forEach(function(t) { allowed[t] = true; });
        if (ph.id === phaseId) break;
      }
    }

    var nodes    = {};  // itemName → { recipe, nb, rate, depth }
    var rawInputs = {}; // itemName → Qt/min required (raw resources)
    var warnings  = [];

    this._resolve(targetItem, targetRate, 0, idx, allowed, nodes, rawInputs, warnings);

    // Flatten and sort deepest first (raw resources first = extraction first)
    var flat = Object.keys(nodes).map(function(k) { return nodes[k]; });
    flat.sort(function(a, b) { return b.depth - a.depth; });

    return { nodes: flat, rawInputs: rawInputs, warnings: warnings };
  },

  /**
   * Writes solved nodes into the Production sheet.
   * Appends rows after the last used row (does not overwrite existing data).
   * Each node becomes one Production row (Etage = etage param, OC = 100).
   *
   * @param {Array}  nodes  - output of solve().nodes
   * @param {string} etage  - floor name to use for all generated rows
   */
  writeToProduction: function(nodes, etage) {
    var cfg  = SAT.CFG;
    var sh   = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh) throw new Error('Production sheet not found');

    var c         = cfg.C;
    var startRow  = Math.max(sh.getLastRow() + 1, cfg.DAT_ROW);
    var written   = 0;

    nodes.forEach(function(node) {
      if (node.isRaw) return; // skip extraction — user places miners manually
      var r = startRow + written;
      sh.getRange(r, c.ETAGE).setValue(etage || node.tier || 'Solveur');
      sh.getRange(r, c.MACHINE).setValue(node.recipe.machine);
      sh.getRange(r, c.RECIPE).setValue(node.recipe.name);
      sh.getRange(r, c.NB).setValue(node.nb);
      sh.getRange(r, c.OC).setValue(100);
      sh.getRange(r, c.PUR).setValue('Normal');
      written++;
    });

    return written;
  },

  // ── Internal recursive resolver ──────────────────────────────────────────

  /**
   * Recursively resolves `item` at `rate` Qt/min.
   * Accumulates into `nodes` (keyed by item name — merges identical items).
   * Raw resources (no recipe, or extractor) go into `rawInputs`.
   */
  _resolve: function(item, rate, depth, idx, allowed, nodes, rawInputs, warnings) {
    var rec = idx[item];

    // No recipe found → raw resource (ore, fluid, etc.)
    if (!rec) {
      rawInputs[item] = (rawInputs[item] || 0) + rate;
      return;
    }

    // Out of phase → treat as raw (user must provide it manually)
    if (allowed && !allowed[rec.tier]) {
      rawInputs[item] = (rawInputs[item] || 0) + rate;
      warnings.push('Out-of-phase: ' + item + ' (' + rec.tier + ') used as raw input');
      return;
    }

    // Extractor recipes (foreuses, pompes) → raw resource
    if (rec.inRate1 === 0) {
      rawInputs[item] = (rawInputs[item] || 0) + rate;
      return;
    }

    // Number of machines needed (non-integer → round up)
    var nb = Math.ceil(rate / rec.outRate1 * 10) / 10; // keep 1 decimal

    // Merge if item already in tree (two branches need the same resource)
    if (nodes[item]) {
      var existing = nodes[item];
      var newRate  = existing.rate + rate;
      var newNb    = Math.ceil(newRate / rec.outRate1 * 10) / 10;
      existing.rate = newRate;
      existing.nb   = newNb;
      existing.depth = Math.max(existing.depth, depth);
    } else {
      nodes[item] = {
        item:    item,
        recipe:  rec,
        nb:      nb,
        rate:    rate,
        tier:    rec.tier,
        depth:   depth,
        isRaw:   false
      };
    }

    // Recurse on inputs
    var actualNb   = nodes[item].nb;
    var actualOut  = actualNb * rec.outRate1;
    var inScale    = actualOut / rec.outRate1; // = actualNb

    if (rec.inRes1 && rec.inRate1 > 0) {
      this._resolve(rec.inRes1, rec.inRate1 * inScale, depth + 1, idx, allowed, nodes, rawInputs, warnings);
    }
    if (rec.inRes2 && rec.inRate2 > 0) {
      this._resolve(rec.inRes2, rec.inRate2 * inScale, depth + 1, idx, allowed, nodes, rawInputs, warnings);
    }
  }
};

// ── Menu actions ─────────────────────────────────────────────────────────────

/**
 * Reads the 🎯 Objectifs sheet and runs the solver for each active row.
 * Columns: A=Item, B=Qt/min, C=Phase, D=Étage cible, E=Status, F=Nb machines
 */
function SAT_solveFromObjectives() {
  var cfg  = SAT.CFG;
  var ui   = SpreadsheetApp.getUi();
  var objSh = SAT.S.get(cfg.SHEETS.OBJ);
  if (!objSh) {
    ui.alert('Feuille \u{1F3AF} Objectifs introuvable. Lancez Mettre \u00e0 jour (reinstall).');
    return;
  }

  var last = objSh.getLastRow();
  if (last < 2) {
    ui.alert('Aucun objectif d\u00e9fini. Ajoutez des lignes dans \u{1F3AF} Objectifs.');
    return;
  }

  var rows    = objSh.getRange(2, 1, last - 1, 6).getValues();
  var total   = 0;
  var errors  = [];

  rows.forEach(function(row, i) {
    var item    = SAT.U.str(row[0]);
    var rate    = SAT.U.num(row[1]);
    var phase   = SAT.U.str(row[2]) || null;
    var etage   = SAT.U.str(row[3]) || item;
    var active  = SAT.U.str(row[4]).toLowerCase();

    if (!item || !rate || active === 'non' || active === 'false' || active === 'skip') return;

    try {
      var result  = SAT.Solver.solve(item, rate, phase);
      var written = SAT.Solver.writeToProduction(result.nodes, etage);

      // Write back status + machine count to Objectifs
      objSh.getRange(2 + i, 5).setValue('\u2705 \u00e9crit ' + written + ' lignes');
      objSh.getRange(2 + i, 6).setValue(result.nodes.filter(function(n) { return !n.isRaw; }).length);

      // Write raw inputs summary in col G
      var rawSummary = Object.keys(result.rawInputs).map(function(k) {
        return k + ' ' + Math.round(result.rawInputs[k] * 10) / 10 + '/min';
      }).join('\n');
      objSh.getRange(2 + i, 7).setValue(rawSummary);

      if (result.warnings.length) {
        objSh.getRange(2 + i, 5).setValue('\u26a0\ufe0f ' + result.warnings.length + ' avertissements');
      }
      total += written;
    } catch(e) {
      errors.push(item + ': ' + e.message);
      objSh.getRange(2 + i, 5).setValue('\u274c ' + e.message);
    }
  });

  // Trigger full recalc now that rows are written
  try { SAT_recalcAll(); } catch(e) {}

  var msg = total + ' ligne(s) \u00e9crites dans Production.';
  if (errors.length) msg += '\n\nErreurs :\n' + errors.join('\n');
  ui.alert('Solveur termin\u00e9', msg, ui.ButtonSet.OK);
}

/**
 * Clears all solver-generated rows from Production
 * (rows where col A starts with floor name used by solver).
 * Not destructive: only removes rows where Étage matches any OBJ row Étage cible.
 */
function SAT_clearSolverRows() {
  var cfg   = SAT.CFG;
  var ui    = SpreadsheetApp.getUi();
  var objSh = SAT.S.get(cfg.SHEETS.OBJ);
  if (!objSh) return;

  var last    = objSh.getLastRow();
  if (last < 2) return;
  var objRows = objSh.getRange(2, 1, last - 1, 4).getValues();
  var etages  = {};
  objRows.forEach(function(row) {
    var etage = SAT.U.str(row[3]);
    if (etage) etages[etage] = true;
  });

  var prodSh   = SAT.S.get(cfg.SHEETS.PROD);
  if (!prodSh) return;
  var prodLast = prodSh.getLastRow();
  if (prodLast < cfg.DAT_ROW) return;

  // Delete from bottom to top to preserve row indices
  for (var r = prodLast; r >= cfg.DAT_ROW; r--) {
    var etage = SAT.U.str(prodSh.getRange(r, cfg.C.ETAGE).getValue());
    if (etages[etage]) prodSh.deleteRow(r);
  }

  // Reset status column in Objectifs
  if (last >= 2) {
    objSh.getRange(2, 5, last - 1, 3).clearContent();
  }

  ui.alert('Lignes solveur effac\u00e9es de Production.');
}
