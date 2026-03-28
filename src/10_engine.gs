/* ============================================================
 * 10_engine.gs — Moteur de calcul SAT v3.4
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

    var data = sh.getRange(cfg.DAT_ROW, 1, last - cfg.DAT_ROW + 1, cfg.C.SLOOP)
                 .getValues();
    var c       = cfg.C;
    var idx     = SAT.getRecipeIndex();
    var machIdx = SAT.getMachineIndex();
    // Build category index for per-category power tracking
    var catIdx  = {};
    if (SAT.CFG.MACHINES) {
      SAT.CFG.MACHINES.forEach(function(m) { catIdx[m[0]] = m[4] || ''; });
    }
    var rows    = [];

    data.forEach(function(r, i) {
      var etage = SAT.U.str(r[c.ETAGE - 1]);
      if (!etage) return;

      var oc      = SAT.U.num(r[c.OC - 1]);
      if (oc <= 0) oc = 100;
      var nb      = SAT.U.num(r[c.NB - 1]);
      var pur     = SAT.U.str(r[c.PUR - 1]) || 'Normal';
      var purMult = cfg.PURITY[pur] || 1.0;
      var sloop   = Math.max(0, Math.min(4, parseInt(r[c.SLOOP - 1], 10) || 0));
      var recipe  = SAT.U.str(r[c.RECIPE - 1]);
      var machine = SAT.U.str(r[c.MACHINE - 1]);
      var ocF     = oc / 100;
      // Somersloops : chaque loop double le taux de sortie (×2^N) et la conso (×2^N)
      var sloopMult = Math.pow(2, sloop);

      var rec     = recipe ? idx[recipe] : null;

      // Calculer les taux à partir de la recette (si disponible)
      // isExtractor = taux d'entrée nul (Foreuses, Pompes, Puits) → la pureté s'applique
      var isExtractor = rec && (rec.inRate1 === 0);
      var inRate1 = 0, inRate2 = 0, outRate1 = 0, outRate2 = 0;
      var stdRate1 = 0, totalMW = 0;

      if (rec) {
        inRate1  = Math.round(rec.inRate1  * ocF * (isExtractor ? purMult : 1) * 100) / 100;
        inRate2  = Math.round(rec.inRate2  * ocF * 100) / 100;
        // Somersloops : appliqués aux sorties uniquement (les entrées ne changent pas)
        outRate1 = Math.round(rec.outRate1 * ocF * (isExtractor ? purMult : 1) * sloopMult * 100) / 100;
        outRate2 = Math.round(rec.outRate2 * ocF * sloopMult * 100) / 100;
        // Taux STD = taux base à OC=100% sans Somersloops (référence)
        stdRate1 = Math.round(rec.outRate1 * (isExtractor ? purMult : 1) * 100) / 100;
      }

      // Consommation électrique : MW_base × Nb × (OC%)^1,321 × 2^sloop
      var machineName = machine || (rec ? rec.machine : '');
      var baseMW      = machIdx[machineName] || 0;
      if (baseMW > 0) {
        totalMW = Math.round(baseMW * nb * Math.pow(ocF, 1.321) * sloopMult * 10) / 10;
      }

      rows.push({
        row:         cfg.DAT_ROW + i,
        etage:       etage,
        machine:     machineName,
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
        stdRate1:    stdRate1,
        totalMW:     totalMW,
        nominalMW:   baseMW * nb,
        nb:          nb,
        oc:          oc,
        sloop:       sloop,
        purity:      pur,
        cat:         catIdx[machineName] || '',
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
    var stdRates = [], mwArr   = [];

    for (var n = 0; n < span; n++) {
      var rn  = minRow + n;
      var row = rowMap[rn];

      if (!row) {
        // Ligne intercalée sans étage : effacer les colonnes auto
        outRates.push(['']); inRates.push(['']);
        flagsArr.push(['']); causeArr.push(['']);
        stdRates.push(['']); mwArr.push(['']);
        bgFull.push(new Array(c.IN_RATE).fill(null));
        continue;
      }

      var flags  = [];
      var causes = [];

      outRates.push([row.rec ? row.outRate1 : '']);
      inRates.push([row.rec  ? row.inRate1  : '']);
      stdRates.push([row.rec ? row.stdRate1 : '']);
      mwArr.push([row.totalMW || '']);

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
      if ((row.sloop || 0) > 0) {
        flags.push('\uD83D\uDD04 Sloop \u00d7' + Math.pow(2, row.sloop) + ' (' + row.sloop + ' loop' + (row.sloop > 1 ? 's' : '') + ')');
      }
      if (NUCLEAR.test(row.machine)) {
        flags.push('\u2622\uFE0F D\u00e9chets: ' + (row.nb * 12) + '/min');
      }
      if (row.purity === 'Impur' && row.isExtractor) flags.push('\u{1F4C9} N\u0153ud impur (\xD70,5)');
      if (row.purity === 'Pur'   && row.isExtractor) flags.push('\u{1F4C8} N\u0153ud pur (\xD72,0)');

      // Vérification limites convoyeur — Mk.5=780/min, Mk.6=1200/min
      var totalOut = row.outRate1 * (row.nb || 1);
      var totalIn  = row.inRate1  * (row.nb || 1);
      if (totalOut > 1200)     flags.push('🟥 Débit OUT ' + totalOut + '/min — dépasse Mk.6 (split requis)');
      else if (totalOut > 780) flags.push('🟠 Débit OUT ' + totalOut + '/min — convoyeur Mk.6 requis');
      if (totalIn  > 1200)     flags.push('🟥 Débit IN '  + totalIn  + '/min — dépasse Mk.6 (split requis)');
      else if (totalIn  > 780) flags.push('🟠 Débit IN '  + totalIn  + '/min — convoyeur Mk.6 requis');

      flagsArr.push([flags.join('  ')]);
      causeArr.push([causes.join(' | ')]);

      // Couleur de fond :
      // - A–C (saisie) : rouge si erreur, sinon neutre (null = blanc)
      // - D–E (auto)  : rouge si erreur, sinon vert persistant (#F1F8E9)
      var bg   = causes.length > 0 ? '#FFEBEE' : null;
      var bgDE = causes.length > 0 ? '#FFEBEE' : '#F1F8E9';
      bgFull.push([bg, bg, bg, bgDE, bgDE]);
    }

    // Écriture batch : 7 appels max
    sh.getRange(minRow, c.OUT_RATE,  span, 1).setValues(outRates);
    sh.getRange(minRow, c.IN_RATE,   span, 1).setValues(inRates);
    sh.getRange(minRow, c.FLAGS,     span, 1).setValues(flagsArr);
    sh.getRange(minRow, c.CAUSE,     span, 1).setValues(causeArr);
    sh.getRange(minRow, c.STD_RATE,  span, 1).setValues(stdRates);
    sh.getRange(minRow, c.MW,        span, 1).setValues(mwArr);
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
    var r = sh.getRange(rowNum, 1, 1, c.SLOOP).getValues()[0];

    var etage = SAT.U.str(r[c.ETAGE - 1]);
    if (!etage) return;

    var idx     = SAT.getRecipeIndex();
    var oc      = SAT.U.num(r[c.OC - 1]);
    if (oc <= 0) oc = 100;
    var nb      = SAT.U.num(r[c.NB - 1]);
    var pur     = SAT.U.str(r[c.PUR - 1]) || 'Normal';
    var purMult = cfg.PURITY[pur] || 1.0;
    var sloop   = Math.max(0, Math.min(4, parseInt(r[c.SLOOP - 1], 10) || 0));
    var sloopMult = Math.pow(2, sloop);
    var recipe  = SAT.U.str(r[c.RECIPE - 1]);
    var machine = SAT.U.str(r[c.MACHINE - 1]);
    var ocF     = oc / 100;
    var rec     = recipe ? idx[recipe] : null;
    var isExt   = rec && (rec.inRate1 === 0);

    var machineName = machine || (rec ? rec.machine : '');
    var machIdx     = SAT.getMachineIndex();
    var baseMW      = machIdx[machineName] || 0;
    var stdRate1    = rec ? Math.round(rec.outRate1 * (isExt ? purMult : 1) * 100) / 100 : 0;
    var totalMW     = baseMW > 0 ? Math.round(baseMW * nb * Math.pow(ocF, 1.321) * sloopMult * 10) / 10 : 0;

    this.writeFlags([{
      row:         rowNum,
      etage:       etage,
      machine:     machineName,
      recipe:      recipe,
      isExtractor: isExt,
      rec:         rec,
      outRate1:    rec ? Math.round(rec.outRate1 * ocF * (isExt ? purMult : 1) * sloopMult * 100) / 100 : 0,
      inRate1:     rec ? Math.round(rec.inRate1  * ocF * (isExt ? purMult : 1) * 100) / 100 : 0,
      stdRate1:    stdRate1,
      totalMW:     totalMW,
      nominalMW:   baseMW * nb,
      nb:          nb,
      oc:          oc,
      sloop:       sloop,
      purity:      pur
    }]);
  },

  /**
   * Calcule les statistiques globales.
   * Retourne aussi : totalMW, topResources (top 8 par Qt/min OUT),
   * underProduced (ressources consommées > produites, signe de goulot).
   */
  stats: function(rows) {
    var totalMach = 0;
    var totalMW   = 0;
    var maxMW     = 0; // nominal MW at max overclock (250%)
    var etageSet  = {};
    var produced  = {}; // ressource → Qt/min produite totale
    var consumed  = {}; // ressource → Qt/min consommée totale
    var errors        = 0;
    var todo          = 0;
    var mwByCategory  = {};
    var energyNb      = 0;

    rows.forEach(function(r) {
      var nb = r.nb || 0;
      totalMach += nb;
      totalMW   += (r.totalMW || 0);
      maxMW     += (r.nominalMW || 0);
      etageSet[r.etage] = true;

      if (r.outRes1) produced[r.outRes1] = (produced[r.outRes1] || 0) + r.outRate1 * nb;
      if (r.outRes2) produced[r.outRes2] = (produced[r.outRes2] || 0) + r.outRate2 * nb;
      if (r.inRes1 && r.inRate1 > 0)
        consumed[r.inRes1] = (consumed[r.inRes1] || 0) + r.inRate1 * nb;
      if (r.inRes2 && r.inRate2 > 0)
        consumed[r.inRes2] = (consumed[r.inRes2] || 0) + r.inRate2 * nb;

      if (!r.machine || !r.recipe) errors++;
      if (!r.nb) todo++;
      // Track per-category power draw
      var mwCur = r.totalMW || 0;
      var cat   = r.cat || '';
      if (cat) { mwByCategory[cat] = (mwByCategory[cat] || 0) + mwCur; }
      if (cat === '\u00c9nergie') energyNb += (r.nb || 0);
    });

    // Top 8 ressources produites (Qt/min décroissante)
    var topResources = Object.keys(produced)
      .map(function(k) { return { name: k, rate: Math.round(produced[k] * 10) / 10 }; })
      .sort(function(a, b) { return b.rate - a.rate; })
      .slice(0, 8);

    // Ressources sous-produites : consommées mais pas (assez) produites en interne
    var underProduced = [];
    Object.keys(consumed).forEach(function(res) {
      var prod = produced[res] || 0;
      var cons = consumed[res];
      if (cons > prod + 0.01) {
        underProduced.push({
          name:    res,
          deficit: Math.round((cons - prod) * 10) / 10,
          cons:    Math.round(cons * 10) / 10,
          prod:    Math.round(prod * 10) / 10
        });
      }
    });
    underProduced.sort(function(a, b) { return b.deficit - a.deficit; });

    return {
      lines:          rows.length,
      machines:       totalMach,
      etages:         Object.keys(etageSet).length,
      resources:      Object.keys(produced).length,
      errors:         errors,
      todo:           todo,
      totalMW:        Math.round(totalMW * 10) / 10,
      maxMW:          Math.round(maxMW * Math.pow(2.5, 1.321) * 10) / 10,
      topResources:   topResources,
      underProduced:  underProduced,
      mwByCategory:   mwByCategory,
      energyNb:       energyNb,
      _rows:          rows
    };
  }
};
