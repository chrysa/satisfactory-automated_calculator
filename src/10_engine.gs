/* ============================================================
 * 10_engine.gs — Moteur de calcul SAT v3.3
 * Les taux IN/OUT sont calculés depuis la recette + OC + pureté.
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

SAT.Engine = {

  /**
   * Lit Production et retourne les lignes normalisées.
   * Les quantités sont calculées automatiquement depuis l'index des recettes.
   */
  buildIndex: function() {
    var cfg  = SAT.CFG;
    var sh   = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh) return [];

    var last = sh.getLastRow();
    if (last < cfg.DAT_ROW) return [];

    var data = sh.getRange(cfg.DAT_ROW, 1, last - cfg.DAT_ROW + 1, cfg.C.CAUSE)
                 .getValues();
    var c    = cfg.C;
    var idx  = SAT.getRecipeIndex();
    var rows = [];

    data.forEach(function(r, i) {
      var etage = SAT.U.str(r[c.ETAGE - 1]);
      if (!etage) return;

      var oc      = SAT.U.num(r[c.OC - 1]);
      if (oc <= 0) oc = 100;
      var nb      = SAT.U.num(r[c.NB - 1]);
      var pur     = SAT.U.str(r[c.PUR - 1]) || 'Normal';
      var purMult = cfg.PURITY[pur] || 1.0;
      var recipe  = SAT.U.str(r[c.RECIPE - 1]);
      var machine = SAT.U.str(r[c.MACHINE - 1]);
      var ocF     = oc / 100;

      var rec     = recipe ? idx[recipe] : null;

      // Calculer les taux à partir de la recette (si disponible)
      // isExtractor = taux d'entrée nul (Foreuses, Pompes, Puits) → la pureté s'applique
      var isExtractor = rec && (rec.inRate1 === 0);
      var inRate1 = 0, inRate2 = 0, outRate1 = 0, outRate2 = 0;

      if (rec) {
        inRate1  = Math.round(rec.inRate1  * ocF * (isExtractor ? purMult : 1) * 100) / 100;
        inRate2  = Math.round(rec.inRate2  * ocF * 100) / 100;
        outRate1 = Math.round(rec.outRate1 * ocF * (isExtractor ? purMult : 1) * 100) / 100;
        outRate2 = Math.round(rec.outRate2 * ocF * 100) / 100;
      }

      rows.push({
        row:         cfg.DAT_ROW + i,
        etage:       etage,
        machine:     machine || (rec ? rec.machine : ''),
        recipe:      recipe,
        isExtractor: isExtractor,
        inRes1:      rec ? rec.inRes1  : '',
        inRate1:     inRate1,
        inRes2:      rec ? rec.inRes2  : '',
        inRate2:     inRate2,
        outRes1:     rec ? rec.outRes1 : '',
        outRate1:    outRate1,
        outRes2:     rec ? rec.outRes2 : '',
        outRate2:    outRate2,
        nb:          nb,
        oc:          oc,
        purity:      pur,
        rec:         rec
      });
    });

    return rows;
  },

  /**
   * Écrit les taux calculés, flags et couleurs en BATCH.
   * 5 appels API max (au lieu de ~5 × nb_lignes).
   */
  writeFlags: function(rows) {
    var cfg  = SAT.CFG;
    var sh   = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh || rows.length === 0) return;

    var c       = cfg.C;
    var NUCLEAR = /Centrale nucl/i;

    var minRow = rows[0].row;
    var maxRow = rows[rows.length - 1].row;
    var span   = maxRow - minRow + 1;

    // Map rowNum → row pour gérer les éventuelles lignes intercalées
    var rowMap = {};
    rows.forEach(function(r) { rowMap[r.row] = r; });

    // Tableaux batch
    var outRates = [], inRates = [], flagsArr = [], causeArr = [], bgFull = [];

    for (var n = 0; n < span; n++) {
      var rn  = minRow + n;
      var row = rowMap[rn];

      if (!row) {
        // Ligne intercalée sans étage : effacer les colonnes auto
        outRates.push(['']); inRates.push(['']);
        flagsArr.push(['']); causeArr.push(['']);
        bgFull.push(new Array(c.IN_RATE).fill(null));
        continue;
      }

      var flags  = [];
      var causes = [];

      outRates.push([row.rec ? row.outRate1 : '']);
      inRates.push([row.rec  ? row.inRate1  : '']);

      // Détection d'erreurs
      if (!row.machine)           causes.push('Machine manquante');
      if (!row.recipe)            causes.push('Recette manquante');
      if (!row.nb)                causes.push('Nb = 0');
      if (row.recipe && !row.rec) causes.push('Recette inconnue !');

      // Flags automatiques
      if (row.oc > 150) {
        var pwr = Math.round(Math.pow(row.oc / 100, 1.321) * 100);
        flags.push('\u26A1 OC ' + row.oc + '% = ' + pwr + '% MW');
      }
      if (NUCLEAR.test(row.machine)) {
        flags.push('\u2622\uFE0F D\u00e9chets: ' + (row.nb * 12) + '/min');
      }
      if (row.purity === 'Impur' && row.isExtractor) flags.push('\u{1F4C9} N\u0153ud impur (\xD70,5)');
      if (row.purity === 'Pur'   && row.isExtractor) flags.push('\u{1F4C8} N\u0153ud pur (\xD72,0)');

      // V\u00e9rification limite convoyeur Mk.5 (780/min)
      var totalOut = row.outRate1 * (row.nb || 1);
      var totalIn  = row.inRate1  * (row.nb || 1);
      if (totalOut > 780) flags.push('\uD83D\uDFE5 D\u00e9bit OUT ' + totalOut + '/min \u2014 d\u00e9passe Mk.5');
      if (totalIn  > 780) flags.push('\uD83D\uDFE5 D\u00e9bit IN '  + totalIn  + '/min \u2014 d\u00e9passe Mk.5');

      flagsArr.push([flags.join('  ')]);
      causeArr.push([causes.join(' | ')]);

      // Couleur de fond :
      // - A–C (saisie) : rouge si erreur, sinon neutre (null = blanc)
      // - D–E (auto)  : rouge si erreur, sinon vert persistant (#F1F8E9)
      var bg   = causes.length > 0 ? '#FFEBEE' : null;
      var bgDE = causes.length > 0 ? '#FFEBEE' : '#F1F8E9';
      bgFull.push([bg, bg, bg, bgDE, bgDE]);
    }

    // Écriture batch : 5 appels max au lieu de ~5 × nb_lignes
    sh.getRange(minRow, c.OUT_RATE, span, 1).setValues(outRates);
    sh.getRange(minRow, c.IN_RATE,  span, 1).setValues(inRates);
    sh.getRange(minRow, c.FLAGS,    span, 1).setValues(flagsArr);
    sh.getRange(minRow, c.CAUSE,    span, 1).setValues(causeArr);
    sh.getRange(minRow, 1, span, c.IN_RATE).setBackgrounds(bgFull);
  },

  /**
   * Recalcule et écrit les flags pour une seule ligne.
   * Appelé par onEdit pour éviter un recalcul complet à chaque frappe.
   */
  writeRowFlags: function(rowNum) {
    var cfg = SAT.CFG;
    var sh  = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh || rowNum < cfg.DAT_ROW) return;

    var c = cfg.C;
    var r = sh.getRange(rowNum, 1, 1, c.CAUSE).getValues()[0];

    var etage = SAT.U.str(r[c.ETAGE - 1]);
    if (!etage) return;

    var idx     = SAT.getRecipeIndex();
    var oc      = SAT.U.num(r[c.OC - 1]);
    if (oc <= 0) oc = 100;
    var nb      = SAT.U.num(r[c.NB - 1]);
    var pur     = SAT.U.str(r[c.PUR - 1]) || 'Normal';
    var purMult = cfg.PURITY[pur] || 1.0;
    var recipe  = SAT.U.str(r[c.RECIPE - 1]);
    var machine = SAT.U.str(r[c.MACHINE - 1]);
    var ocF     = oc / 100;
    var rec     = recipe ? idx[recipe] : null;
    var isExt   = rec && (rec.inRate1 === 0);

    this.writeFlags([{
      row:         rowNum,
      etage:       etage,
      machine:     machine || (rec ? rec.machine : ''),
      recipe:      recipe,
      isExtractor: isExt,
      rec:         rec,
      outRate1:    rec ? Math.round(rec.outRate1 * ocF * (isExt ? purMult : 1) * 100) / 100 : 0,
      inRate1:     rec ? Math.round(rec.inRate1  * ocF * (isExt ? purMult : 1) * 100) / 100 : 0,
      nb:          nb,
      oc:          oc,
      purity:      pur
    }]);
  },

  /**
   * Calcule les statistiques globales.
   */
  stats: function(rows) {
    var totalMach = 0;
    var etageSet  = {};
    var resSet    = {};
    var errors    = 0;
    var todo      = 0;

    rows.forEach(function(r) {
      totalMach += (r.nb || 0);
      etageSet[r.etage] = true;
      if (r.outRes1) {
        resSet[r.outRes1] = (resSet[r.outRes1] || 0) + r.outRate1 * (r.nb || 1);
      }
      if (r.outRes2) {
        resSet[r.outRes2] = (resSet[r.outRes2] || 0) + r.outRate2 * (r.nb || 1);
      }
      if (!r.machine || !r.recipe) errors++;
      if (!r.nb) todo++;
    });

    return {
      lines:     rows.length,
      machines:  totalMach,
      etages:    Object.keys(etageSet).length,
      resources: Object.keys(resSet).length,
      errors:    errors,
      todo:      todo
    };
  }
};
