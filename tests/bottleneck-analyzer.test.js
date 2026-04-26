/* ============================================================
 * tests/bottleneck-analyzer.test.js — Unit tests for CLI bottleneck analyzer
 * ============================================================ */

'use strict';

const { analyzeBuildingRows, renderReport, beltTier } = require('../scripts/bottleneck-analyzer');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBuilding(overrides) {
  return Object.assign(
    {
      classKey: 'Build_SmelterMk1_C',  // base rate 30/min
      recipe:   'Recipe_IngotIron_C',
      nb:       1,
      oc:       100,
      xyz:      { x: 100, y: 200, z: 0 },
      floor:    0
    },
    overrides
  );
}

// ── analyzeBuildingRows ───────────────────────────────────────────────────────

describe('analyzeBuildingRows', () => {

  it('returns empty array for no buildings', () => {
    expect(analyzeBuildingRows([])).toEqual([]);
  });

  it('ignores unknown machine classes', () => {
    const rows = [makeBuilding({ classKey: 'Build_Unknown_C' })];
    expect(analyzeBuildingRows(rows)).toHaveLength(0);
  });

  it('flags building efficiency below 70%', () => {
    const rows = [makeBuilding({ oc: 50 })];  // smelter 30/min × 1, OC 50% → lost 15/min
    const eff = analyzeBuildingRows(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(1);
    expect(eff[0].metric).toBe(50);
    expect(eff[0].impact).toBe(15);
    expect(eff[0].xyz).toEqual({ x: 100, y: 200, z: 0 });
  });

  it('does not flag OC >= 70%', () => {
    const rows = [makeBuilding({ oc: 80 })];
    const eff = analyzeBuildingRows(rows).filter(b => b.type === 'building_efficiency');
    expect(eff).toHaveLength(0);
  });

  it('flags belt throughput at 90% saturation of Mk.5 (Miner Mk.3 ×3 = 720/min)', () => {
    // Miner Mk.3 base rate = 240/min, 3 miners = 720/min (>= 90% of 780)
    const rows = [makeBuilding({ classKey: 'Build_MinerMk3_C', nb: 3, oc: 100 })];
    const belts = analyzeBuildingRows(rows).filter(b => b.type === 'belt_throughput');
    expect(belts).toHaveLength(1);
    expect(belts[0].impact).toBe(720);
    expect(belts[0].suggestion).toContain('Mk.6');
  });

  it('flags > Mk.6 throughput with split suggestion', () => {
    // Miner Mk.3 ×6 = 1440/min > 1200
    const rows = [makeBuilding({ classKey: 'Build_MinerMk3_C', nb: 6, oc: 100 })];
    const belts = analyzeBuildingRows(rows).filter(b => b.type === 'belt_throughput');
    expect(belts).toHaveLength(1);
    expect(belts[0].impact).toBe(1440);
    expect(belts[0].suggestion).toMatch(/split/i);
  });

  it('includes XYZ coordinates in each bottleneck entry', () => {
    const xyz  = { x: 42, y: -100, z: 300 };
    // 5 × Miner Mk.3 (240/min) = 1200/min → saturation 100% of Mk.6 ≥ 90%
    const rows = [makeBuilding({ classKey: 'Build_MinerMk3_C', nb: 5, oc: 100, xyz })];
    const result = analyzeBuildingRows(rows);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].xyz).toEqual(xyz);
  });

  it('sorts bottlenecks by impact descending', () => {
    const rows = [
      makeBuilding({ classKey: 'Build_SmelterMk1_C', nb: 1, oc: 40  }),  // low impact
      makeBuilding({ classKey: 'Build_MinerMk3_C',   nb: 5, oc: 100 })   // high impact
    ];
    const result = analyzeBuildingRows(rows);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].impact).toBeGreaterThanOrEqual(result[i].impact);
    }
  });
});

// ── renderReport ──────────────────────────────────────────────────────────────

describe('renderReport', () => {

  it('returns a no-bottleneck message for empty array', () => {
    const txt = renderReport([], 'test.sav');
    expect(txt).toContain('No bottlenecks');
    expect(txt).toContain('test.sav');
  });

  it('includes save name in header', () => {
    const b = [{
      type: 'belt_throughput', location: 'Floor 2', xyz: { x: 0, y: 0, z: 0 },
      recipe: 'Recipe_A', metric: 95, impact: 800, suggestion: 'Upgrade'
    }];
    expect(renderReport(b, 'mySave.sav')).toContain('mySave.sav');
  });

  it('lists total count and type breakdown', () => {
    const bottlenecks = [
      { type: 'belt_throughput',     location: 'Floor 1', xyz: { x: 0, y: 0, z: 0 }, recipe: 'R1', metric: 95, impact: 800, suggestion: 'A' },
      { type: 'building_efficiency', location: 'Floor 2', xyz: { x: 0, y: 0, z: 0 }, recipe: 'R2', metric: 50, impact: 30,  suggestion: 'B' }
    ];
    const txt = renderReport(bottlenecks, 'test.sav');
    expect(txt).toContain('Total             : 2');
    expect(txt).toContain('Belt throughput   : 1');
    expect(txt).toContain('Building efficiency: 1');
  });

  it('includes XYZ in each entry', () => {
    const b = [{
      type: 'belt_throughput', location: 'Floor 0', xyz: { x: 123, y: -456, z: 789 },
      recipe: 'R', metric: 95, impact: 700, suggestion: 'Fix'
    }];
    const txt = renderReport(b, 'test.sav');
    expect(txt).toContain('X=123');
    expect(txt).toContain('Y=-456');
    expect(txt).toContain('Z=789');
  });
});

// ── beltTier ──────────────────────────────────────────────────────────────────

describe('beltTier', () => {

  it('returns Mk.1 for 1/min', () => {
    expect(beltTier(1).mk).toBe(1);
  });

  it('returns Mk.1 at exact capacity (60/min)', () => {
    expect(beltTier(60).mk).toBe(1);
  });

  it('returns Mk.2 for 61/min', () => {
    expect(beltTier(61).mk).toBe(2);
  });

  it('returns Mk.6 at exact capacity (1200/min)', () => {
    expect(beltTier(1200).mk).toBe(6);
  });

  it('returns Mk.6 for throughput > 1200/min', () => {
    expect(beltTier(2000).mk).toBe(6);
    expect(beltTier(2000).nextMk).toBeNull();
  });
});
