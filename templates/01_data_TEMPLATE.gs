/* ============================================================
 * 01_data_TEMPLATE.gs — Template for a new Satisfactory game version
 *
 * HOW TO ADD SUPPORT FOR A NEW SATISFACTORY VERSION:
 * ─────────────────────────────────────────────────
 * 1. Copy this file:
 *      cp src/01_data_TEMPLATE.gs src/01_data_v2_0.gs
 *
 * 2. Rename the data key:
 *      SAT.DATA['2.0'] = { ... }
 *
 * 3. Fill MACHINES, RESOURCES, RECIPES arrays with data from:
 *      https://satisfactory.wiki.gg/wiki/
 *
 * 4. Update GAME_VERSION in 00_core_config.gs:
 *      GAME_VERSION: '2.0',
 *
 * 5. Deploy: make push (or clasp push)
 *
 * DATA STRUCTURES:
 * ─────────────────────────────────────────────────
 * MACHINES : [Name, MW, Inputs, Outputs, Category, W(m), L(m), H(m), Sloop slots]
 * RESOURCES: [Name, Category]
 * RECIPES  : [Name, Machine, inRes1, inRate1, inRes2, inRate2,
 *                            outRes1, outRate1, outRes2, outRate2, Tier]
 *
 * Rates are per-minute at 100% clock speed on a Normal node.
 * Tier values: T0 T1 T2 T3 T4 T5 T6 T7 T8 T9 MAM ALT
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});
SAT.DATA = SAT.DATA || {};

// Replace 'X.Y' with the actual Satisfactory version (e.g. '2.0')
SAT.DATA['X.Y'] = {

  // ── Machines ──────────────────────────────────────────────
  // [Name, MW, In-belts, Out-belts, Category, W(m), L(m), H(m), Sloop-slots]
  MACHINES: [
    // Extraction — no sloop slots
    // ['Miner Mk.1', 4, 0, 1, 'Extraction', 6, 14, 18, 0],

    // Production
    // ['Constructor', 4, 1, 1, 'Production', 8, 10, 8, 1],
  ],

  // ── Resources ─────────────────────────────────────────────
  // [Name, Category]
  // Categories: 'Minerai', 'Métal', 'Fluide', 'Composant', ...
  RESOURCES: [
    // ['Iron Ore', 'Minerai'],
  ],

  // ── Recipes ───────────────────────────────────────────────
  // [Name, Machine, inRes1, inRate1, inRes2, inRate2,
  //                 outRes1, outRate1, outRes2, outRate2, Tier]
  // Use '' and 0 for unused slots.
  RECIPES: [
    // ['Iron Ingot', 'Smelter', 'Iron Ore', 30, '', 0, 'Iron Ingot', 30, '', 0, 'T0'],
  ],
};

Logger.log('\u26a0\ufe0f 01_data_TEMPLATE.gs loaded — this file is a template, not real game data.');
