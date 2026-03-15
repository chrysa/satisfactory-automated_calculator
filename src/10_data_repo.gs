/* 10_sat.repo.gs */
var SAT = this.SAT || (this.SAT = {});

SAT.Repo = SAT.Repo || (function () {
  function baseListRaw() {
    var cfg = SAT.CFG;
    var sh = SAT.S.sheet(cfg.SHEETS.REF_BASE);
    if (!sh) return [];
    var last = sh.getLastRow();
    if (last < cfg.REF_BASE.DATA_ROW) return [];
    return sh
      .getRange(cfg.REF_BASE.DATA_ROW, cfg.REF_BASE.COLS.RESSOURCE, last - (cfg.REF_BASE.DATA_ROW - 1), 1)
      .getValues()
      .flat()
      .filter(Boolean)
      .map(SAT.U.str);
  }

  function baseSet() {
    return new Set(baseListRaw().map(SAT.U.norm));
  }

  function machinesMap() {
    var cfg = SAT.CFG;
    var sh = SAT.S.sheet(cfg.SHEETS.REF_MACHINES);
    if (!sh) return {};
    var last = sh.getLastRow();
    if (last < cfg.REF_MACHINES.DATA_ROW) return {};
    var w = cfg.REF_MACHINES.COLS.NOTE;
    var data = sh.getRange(cfg.REF_MACHINES.DATA_ROW, 1, last - (cfg.REF_MACHINES.DATA_ROW - 1), w).getValues();

    var map = {};
    data.forEach(function (r) {
      var name = SAT.U.str(r[cfg.REF_MACHINES.COLS.MACHINE - 1]);
      if (!name) return;
      map[SAT.U.norm(name)] = {
        machine: name,
        hauteur: SAT.U.num(r[cfg.REF_MACHINES.COLS.HAUTEUR - 1]),
        largeur: SAT.U.num(r[cfg.REF_MACHINES.COLS.LARGEUR - 1]),
        longueur: SAT.U.num(r[cfg.REF_MACHINES.COLS.LONGUEUR - 1])
      };
    });
    return map;
  }

  function etagesMeta() {
    var cfg = SAT.CFG;
    var sh = SAT.S.sheet(cfg.SHEETS.REF_ETAGES);

    function fallbackMeta(etage) {
      var raw = SAT.U.str(etage);
      var nuclear = cfg.POLICY.NUCLEAR_PATTERN.test(raw);
      var m = raw.match(/(\d+)/);
      var num = m ? parseInt(m[1], 10) : 0;
      return {
        etage: raw,
        ordre: nuclear ? (1000000 + num) : num,
        type: nuclear ? "NUCLEAR" : "NORMAL",
        importAny: nuclear ? cfg.REF_ETAGES.DEFAULT_IMPORT_ANY_FOR_NUCLEAR : false
      };
    }

    if (!sh) return { byName: {}, fallback: fallbackMeta };

    var last = sh.getLastRow();
    if (last < cfg.REF_ETAGES.DATA_ROW) return { byName: {}, fallback: fallbackMeta };

    var w = cfg.REF_ETAGES.COLS.NOTE;
    var data = sh.getRange(cfg.REF_ETAGES.DATA_ROW, 1, last - (cfg.REF_ETAGES.DATA_ROW - 1), w).getValues();

    var byName = {};
    data.forEach(function (r) {
      var name = SAT.U.str(r[cfg.REF_ETAGES.COLS.ETAGE - 1]);
      if (!name) return;

      byName[SAT.U.norm(name)] = {
        etage: name,
        ordre: SAT.U.int(r[cfg.REF_ETAGES.COLS.ORDRE - 1]),
        type: (SAT.U.str(r[cfg.REF_ETAGES.COLS.TYPE - 1]).toUpperCase() === "NUCLEAR") ? "NUCLEAR" : "NORMAL",
        importAny: !!r[cfg.REF_ETAGES.COLS.IMPORT_ANY - 1]
      };
    });

    return { byName: byName, fallback: fallbackMeta };
  }

  function productionRows() {
    var cfg = SAT.CFG;
    var sh = SAT.S.sheet(cfg.SHEETS.PRODUCTION);
    if (!sh) return [];
    var last = sh.getLastRow();
    if (last < cfg.PRODUCTION.DATA_ROW) return [];
    var width = Math.max(cfg.PRODUCTION.COLS.CAUSE, sh.getLastColumn());
    var data = sh.getRange(cfg.PRODUCTION.DATA_ROW, 1, last - (cfg.PRODUCTION.DATA_ROW - 1), width).getValues();

    return data.map(function (r, i) {
      return {
        row: cfg.PRODUCTION.DATA_ROW + i,
        etage: SAT.U.str(r[cfg.PRODUCTION.COLS.ETAGE - 1]),
        machine: SAT.U.str(r[cfg.PRODUCTION.COLS.MACHINE - 1]),
        inRes: SAT.U.str(r[cfg.PRODUCTION.COLS.IN_RES - 1]),
        inRate: SAT.U.num(r[cfg.PRODUCTION.COLS.IN_RATE - 1]),
        outRes: SAT.U.str(r[cfg.PRODUCTION.COLS.OUT_RES - 1]),
        outRate: SAT.U.num(r[cfg.PRODUCTION.COLS.OUT_RATE - 1]),
        nb: (r[cfg.PRODUCTION.COLS.NB - 1] === "" || r[cfg.PRODUCTION.COLS.NB - 1] === null) ? "" : SAT.U.num(r[cfg.PRODUCTION.COLS.NB - 1])
      };
    });
  }

  return { baseListRaw: baseListRaw, baseSet: baseSet, machinesMap: machinesMap, etagesMeta: etagesMeta, productionRows: productionRows };
})();
