/* ============================================================
 * tests/bottleneck.test.js — Unit tests for SAT.Bottleneck (GAS module)
 *
 * The GAS source is loaded via vm.runInThisContext() so that
 * `this.SAT` resolves to `global.SAT`.
 * ============================================================ */

'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Load the GAS module in an isolated context with a pre-initialised SAT namespace.
// GAS files use `var SAT = this.SAT || (this.SAT = {})` which needs `this` = the
// context object; vm.createContext ensures that.
const _ctx = vm.createContext({ SAT: {} });
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../src/52_bottleneck.gs'), 'utf8'),
  _ctx
);
const SAT = _ctx.SAT;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides) {
  return Object.assign(
    {
      nb: 1, oc: 100, etage: 'Étage 1',
      recipe: 'Lingot de fer', machine: 'Fonderie',
      outRate1: 30, inRate1: 30,
      inRes1: 'Minerai de fer',
      rec: { outRate1: 30, inRes1: 'Minerai de fer', inRate1: 30 }
    },
    overrides
  );
}

// ── SAT.Bottleneck.analyze ────────────────────────────────────────────────────

describe('SAT.Bottleneck.analyze', () => {

  it('returns empty array for no rows', () => {
    expect(SAT.Bottleneck.analyze([])).toEqual([]);
  });

  it('ignores rows with nb = 0', () => {
    const rows = [makeRow({ nb: 0 })];
    expect(SAT.Bottleneck.analyze(rows)).toHaveLength(0);
  });

  it('ignores rows without a rec object', () => {
    const rows = [makeRow({ rec: null })];
    expect(SAT.Bottleneck.analyze(rows)).toHaveLength(0);
  });

  // ── Belt throughput tests ──────────────────────────────────────────────────

  it('does not flag throughput below 90% of Mk.1 (< 54/min)', () => {
    const rows = [makeRow({ nb: 1, oc: 100, outRate1: 50, inRate1: 0 })];
    const belts = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'belt_throughput');
    expect(belts).toHaveLength(0);
  });

  it('flags throughput at 90% of Mk.5 (702/min)', () => {
    // 702/min = 90% of 780
    const rows = [makeRow({ nb: 1, oc: 100, outRate1: 702, inRate1: 0 })];
    const belts = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'belt_throughput');
    expect(belts).toHaveLength(1);
    expect(belts[0].type).toBe('belt_throughput');
    expect(belts[0].metric).toBeGreaterThanOrEqual(90);
    expect(belts[0].impact).toBe(702);
    expect(belts[0].suggestion).toContain('Mk.6');
  });

  it('flags throughput exceeding Mk.6 (>1200/min) with split suggestion', () => {
    const rows = [makeRow({ nb: 2, oc: 100, outRate1: 750, inRate1: 0 })];
    const belts = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'belt_throughput');
    // 2 × 750 = 1500/min > 1200
    expect(belts).toHaveLength(1);
    expect(belts[0].impact).toBe(1500);
    expect(belts[0].suggestion).toMatch(/split/i);
    expect(belts[0].suggestion).toContain('2');
  });

  it('uses inRate1 × nb when inRate1 > outRate1', () => {
    const rows = [makeRow({ nb: 1, oc: 100, outRate1: 50, inRate1: 720 })];
    const belts = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'belt_throughput');
    expect(belts).toHaveLength(1);
    expect(belts[0].impact).toBe(720);  // inRate1 drives the check
  });

  // ── Building efficiency tests ─────────────────────────────────────────────

  it('does not flag OC >= 70%', () => {
    const rows = [makeRow({ oc: 70 })];
    const eff = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(0);
  });

  it('does not flag OC = 100%', () => {
    const rows = [makeRow({ oc: 100 })];
    const eff = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(0);
  });

  it('flags building efficiency at OC = 50%', () => {
    const rows = [makeRow({ nb: 2, oc: 50, rec: { outRate1: 30, inRes1: 'X', inRate1: 30 } })];
    const eff = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(1);
    expect(eff[0].metric).toBe(50);
    // impact = 30 × 2 × (1 - 0.5) = 30
    expect(eff[0].impact).toBe(30);
    expect(eff[0].suggestion).toContain('100%');
  });

  it('flags severe starvation (OC < 40%) with specific suggestion', () => {
    const rows = [makeRow({ oc: 30, rec: { outRate1: 20, inRes1: 'Fer', inRate1: 30 } })];
    const eff = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(1);
    expect(eff[0].suggestion).toMatch(/starvation/i);
    expect(eff[0].suggestion).toMatch(/[Ff]er/);  // inRes1 = 'Minerai de fer'
  });

  it('does not flag efficiency when lost output is < 0.1/min', () => {
    // outRate1 = 0.05 × 1 machine, OC = 60% → lost = 0.02 → below threshold
    const rows = [makeRow({ nb: 1, oc: 60, rec: { outRate1: 0.05, inRes1: 'X', inRate1: 0 } })];
    const eff = SAT.Bottleneck.analyze(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(0);
  });

  // ── Ranking ───────────────────────────────────────────────────────────────

  it('sorts bottlenecks by impact descending', () => {
    const rows = [
      makeRow({ nb: 1, oc: 100, outRate1: 200, inRate1: 0 }),   // impact 200 (belt)
      makeRow({ nb: 1, oc: 100, outRate1: 1100, inRate1: 0 }),  // impact 1100 (belt)
      makeRow({ nb: 4, oc: 40, rec: { outRate1: 30, inRes1: 'Y', inRate1: 30 }, outRate1: 12, inRate1: 30 })  // building
    ];
    const result = SAT.Bottleneck.analyze(rows);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].impact).toBeGreaterThanOrEqual(result[i].impact);
    }
  });

  it('includes location and recipe in each entry', () => {
    const rows = [makeRow({ etage: 'Zone Acier', recipe: 'Lingot d\'acier', nb: 3, oc: 100, outRate1: 750 })];
    const result = SAT.Bottleneck.analyze(rows);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].location).toBe('Zone Acier');
    expect(result[0].recipe).toBe('Lingot d\'acier');
  });
});

// ── SAT.Bottleneck.report ─────────────────────────────────────────────────────

describe('SAT.Bottleneck.report', () => {

  it('returns no-bottleneck message for empty array', () => {
    expect(SAT.Bottleneck.report([])).toContain('No bottlenecks');
  });

  it('returns no-bottleneck message for null input', () => {
    expect(SAT.Bottleneck.report(null)).toContain('No bottlenecks');
  });

  it('formats header with total count', () => {
    const b = [{
      type: 'belt_throughput', location: 'Étage 1', recipe: 'Fer',
      machine: 'Fonderie', metric: 95, impact: 741, suggestion: 'Upgrade to Mk.6'
    }];
    const txt = SAT.Bottleneck.report(b);
    expect(txt).toContain('1 detected');
    expect(txt).toContain('Belt throughput  : 1');
  });

  it('lists each bottleneck with location and suggestion', () => {
    const b = [
      { type: 'belt_throughput',      location: 'Étage A', recipe: 'Recette A', machine: 'M', metric: 95, impact: 800, suggestion: 'Do X' },
      { type: 'building_efficiency',  location: 'Étage B', recipe: 'Recette B', machine: 'M', metric: 50, impact: 30,  suggestion: 'Do Y' }
    ];
    const txt = SAT.Bottleneck.report(b);
    expect(txt).toContain('Étage A');
    expect(txt).toContain('Étage B');
    expect(txt).toContain('Do X');
    expect(txt).toContain('Do Y');
    expect(txt).toContain('Belt throughput  : 1');
    expect(txt).toContain('Building efficiency: 1');
  });
});

// ── SAT.Bottleneck._beltTier ──────────────────────────────────────────────────

describe('SAT.Bottleneck._beltTier', () => {

  it('returns Mk.1 for 1/min', () => {
    expect(SAT.Bottleneck._beltTier(1).mk).toBe(1);
  });

  it('returns Mk.1 for 60/min (exact capacity)', () => {
    expect(SAT.Bottleneck._beltTier(60).mk).toBe(1);
  });

  it('returns Mk.2 for 61/min', () => {
    expect(SAT.Bottleneck._beltTier(61).mk).toBe(2);
  });

  it('returns Mk.3 for 270/min (exact capacity)', () => {
    expect(SAT.Bottleneck._beltTier(270).mk).toBe(3);
  });

  it('returns Mk.5 for 700/min', () => {
    expect(SAT.Bottleneck._beltTier(700).mk).toBe(5);
  });

  it('returns Mk.6 for 1200/min (exact capacity)', () => {
    expect(SAT.Bottleneck._beltTier(1200).mk).toBe(6);
  });

  it('returns Mk.6 for throughput exceeding 1200/min', () => {
    expect(SAT.Bottleneck._beltTier(5000).mk).toBe(6);
    expect(SAT.Bottleneck._beltTier(5000).nextMk).toBeNull();
  });
});
