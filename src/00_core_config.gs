/* ============================================================
 * 00_core_config.gs — Configuration application SAT v3.4
 * Contient uniquement la config de l'outil (feuilles, colonnes,
 * pureté, version). Les données du jeu sont dans 01_data_vX_Y.gs.
 *
 * Pour mettre à jour vers une nouvelle version de Satisfactory :
 *   1. Créer src/01_data_vX_Y.gs avec SAT.DATA['X.Y'] = {...}
 *   2. Changer GAME_VERSION ci-dessous
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

SAT.CFG = {
  VERSION: '3.5.1',

  // ── Version du jeu Satisfactory — change ici pour une MàJ ─
  // Doit correspondre à une clé dans SAT.DATA (fichier 01_data_vX_Y.gs)
  GAME_VERSION: '1.1',

  // ── Noms des onglets (ordre logique) ──────────────────────
  SHEETS: {
    PROD: '\u{1F3ED} Production',       // 1  ← onglet le plus utilisé
    ETAG: '\u{1F3D7}\uFE0F \u00C9tages', // 2
    DASH: '\u{1F4CA} Tableau de bord',   // 3
    OBJ:  '\u{1F3AF} Objectifs',         // 4  ← solveur / objectifs de production
    REC:  '\u{1F4D6} Recettes',          // 5
    RES:  '\u{1F48E} Ressources',        // 6
    MACH: '\u2699\uFE0F Machines'        // 7
  },

  // ── Phases de jeu (tiers débloqués par phase) ──────────────
  // Chaque phase correspond à une étape de progression dans Satisfactory.
  // Les recettes ont un champ Tier : T0..T9, MAM, ALT (alternatives)
  PHASES: [
    { id: 'P1', label: 'Phase 1 — Basiques',    tiers: ['T0', 'T1', 'T2'],        color: '#C8E6C9' },
    { id: 'P2', label: 'Phase 2 — Acier',       tiers: ['T3', 'T4'],              color: '#FFF9C4' },
    { id: 'P3', label: 'Phase 3 — Pétrole',     tiers: ['T5', 'T6', 'MAM'],       color: '#FFE0B2' },
    { id: 'P4', label: 'Phase 4 — Aluminium',   tiers: ['T7'],                    color: '#B3E5FC' },
    { id: 'P5', label: 'Phase 5 — Avancé',      tiers: ['T8'],                    color: '#E1BEE7' },
    { id: 'P6', label: 'Phase 6 — \u00c9.M.E.', tiers: ['T9'],                    color: '#FFCDD2' }
  ],

  // ── Colonnes feuille Production (1-based) ─────────────────
  // A(1)   B(2)      C(3)      D(4)         E(5)       F(6)  G(7)  H(8)
  // Étage  Machine   Recette   Qt/min OUT   Qt/min IN   Nb   OC%  Pureté
  // I(9)    J(10)   K(11)            L(12)       M(13)
  // Flags   Cause   Qt/min STD   ⚡ MW total  Somersloops
  C: {
    ETAGE:    1,   // A — \u00C9tage (dropdown depuis 🏗️ \u00C9tages)
    MACHINE:  2,   // B — Machine (déduite de la recette)
    RECIPE:   3,   // C — Recette (dropdown depuis 📖 Recettes)
    OUT_RATE: 4,   // D — Qt/min OUT (auto depuis Recette × OC × Nb)
    IN_RATE:  5,   // E — Qt/min IN  (auto depuis Recette × OC × Nb)
    NB:       6,   // F — Nb machines
    OC:       7,   // G — Overclock %
    PUR:      8,   // H — Pureté (extracteurs seulement)
    FLAGS:    9,   // I — Flags auto
    CAUSE:    10,  // J — Cause erreur
    STD_RATE: 11,  // K — Qt/min STD (taux base à OC=100%, sans suralimentation)
    MW:       12,  // L — ⚡ Consommation électrique totale (MW)
    SLOOP:    13   // M — Somersloops (0-4, selon machine)
  },

  HDR_ROW: 1,
  DAT_ROW: 2,

  PURITY: { 'Impur': 0.5, 'Normal': 1.0, 'Pur': 2.0 },

  // ── Index des recettes par nom (construit au runtime) ──────
  RECIPE_INDEX:  null,
  MACHINE_INDEX: null,

  // ── Données du jeu (injectées depuis 01_data_vX_Y.gs) ─────
  // Accéder via SAT.CFG.MACHINES, SAT.CFG.RESOURCES, SAT.CFG.RECIPES
  // après appel de SAT.loadGameData() (auto au 1er getRecipeIndex())
  MACHINES:  null,
  RESOURCES: null,
  RECIPES:   null
};

// ── Helpers ────────────────────────────────────────────────────────────
SAT.U = {
  str: function(v) { return (v === null || v === undefined) ? '' : String(v).trim(); },
  num: function(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
};

SAT.S = {
  /** Retourne la feuille par nom exact, ou par nom normalisé (fallback encodage emoji). */
  get: function(name) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(name);
    if (sh) return sh;
    var norm = name.replace(/[^\w\s\u00C0-\u024F\-]/g, '').trim().toLowerCase();
    var all  = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().replace(/[^\w\s\u00C0-\u024F\-]/g, '').trim().toLowerCase() === norm) {
        return all[i];
      }
    }
    return null;
  },
  ensure: function(name) {
    return SAT.S.get(name) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(name);
  }
};

SAT.Log = {
  info:  function(m) { Logger.log('     ' + m); },
  ok:    function(m) { Logger.log('  OK ' + m); },
  warn:  function(m) { Logger.log('  /!\\ ' + m); },
  error: function(m) { Logger.log('  ERR ' + m); }
};

/**
 * Charge les données du jeu (MACHINES, RESOURCES, RECIPES) depuis
 * SAT.DATA[GAME_VERSION] dans SAT.CFG. Appelé automatiquement au
 * premier getRecipeIndex(). Peut aussi être appelé explicitement.
 */
SAT.loadGameData = function() {
  var v = SAT.CFG.GAME_VERSION;
  var d = SAT.DATA && SAT.DATA[v];
  if (!d) throw new Error('SAT: données introuvables pour Satisfactory v' + v +
    '. Vérifier que 01_data_v' + v.replace('.', '_') + '.gs est présent.');
  SAT.CFG.MACHINES  = d.MACHINES;
  SAT.CFG.RESOURCES = d.RESOURCES;
  SAT.CFG.RECIPES   = d.RECIPES;
  SAT.CFG.RECIPE_INDEX  = null; // reset index si rechargement
  SAT.CFG.MACHINE_INDEX = null;
  SAT.Log.info('Données jeu v' + v + ' chargées (' +
    d.MACHINES.length + ' machines, ' + d.RESOURCES.length +
    ' ressources, ' + d.RECIPES.length + ' recettes)');
};

/**
 * Construit l'index des recettes (nom -> objet recette) au premier appel.
 * Charge automatiquement les données de jeu si nécessaire.
 */
SAT.getRecipeIndex = function() {
  if (!SAT.CFG.RECIPES) SAT.loadGameData();
  if (SAT.CFG.RECIPE_INDEX) return SAT.CFG.RECIPE_INDEX;
  var idx = {};
  SAT.CFG.RECIPES.forEach(function(r) {
    // r = [name, machine, inRes1, inRate1, inRes2, inRate2, outRes1, outRate1, outRes2, outRate2, tier]
    idx[r[0]] = {
      name:     r[0],
      machine:  r[1],
      inRes1:   r[2],  inRate1:  r[3],
      inRes2:   r[4],  inRate2:  r[5],
      outRes1:  r[6],  outRate1: r[7],
      outRes2:  r[8],  outRate2: r[9],
      tier:     r[10]
    };
  });
  SAT.CFG.RECIPE_INDEX = idx;
  return idx;
};

/**
 * Construit l'index des machines (nom → puissance de base en MW) au premier appel.
 */
SAT.getMachineIndex = function() {
  if (!SAT.CFG.MACHINES) SAT.loadGameData();
  if (SAT.CFG.MACHINE_INDEX) return SAT.CFG.MACHINE_INDEX;
  var idx = {};
  SAT.CFG.MACHINES.forEach(function(m) {
    idx[m[0]] = m[1]; // [Nom, MW, In, Out, Catégorie]
  });
  SAT.CFG.MACHINE_INDEX = idx;
  return idx;
};
