#!/usr/bin/env node
/* ============================================================
 * scripts/bottleneck-analyzer.js — CLI bottleneck detector
 *
 * Parses a Satisfactory .sav file and reports production
 * bottlenecks ranked by impact:
 *   1. Belt throughput saturation (>90% of tier capacity)
 *   2. Building efficiency deficit (OC < 70% = potential starvation)
 *
 * Output includes building XYZ coordinates for in-world location.
 *
 * Usage (via sat-calc):
 *   node scripts/sat-calc.js bottlenecks path/to/save.sav
 *
 * Direct usage:
 *   node scripts/bottleneck-analyzer.js path/to/save.sav
 * ============================================================ */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Belt tier data (mirrors SAT.Bottleneck.BELT_TIERS in GAS) ────────────────
const BELT_TIERS = [
  { mk: 1, capacity:   60, nextMk: 2, nextCapacity:  120 },
  { mk: 2, capacity:  120, nextMk: 3, nextCapacity:  270 },
  { mk: 3, capacity:  270, nextMk: 4, nextCapacity:  480 },
  { mk: 4, capacity:  480, nextMk: 5, nextCapacity:  780 },
  { mk: 5, capacity:  780, nextMk: 6, nextCapacity: 1200 },
  { mk: 6, capacity: 1200, nextMk: null, nextCapacity: null }
];

const SATURATION_MIN = 0.90;
const EFFICIENCY_MIN = 0.70;

// ── Machine class → base output rate at 100% OC (items/min), nominal MW ──────
// Source: Satisfactory 1.1 wiki. Rates are per-machine, single recipe default.
// Key = last segment of Unreal class path (Build_*_C)
const MACHINE_BASE = {
  'Build_SmelterMk1_C':          { rate: 30,   mw: 4   },
  'Build_FoundryMk1_C':          { rate: 20,   mw: 16  },
  'Build_ConstructorMk1_C':      { rate: 15,   mw: 4   },
  'Build_AssemblerMk1_C':        { rate: 15,   mw: 15  },
  'Build_ManufacturerMk1_C':     { rate: 7.5,  mw: 55  },
  'Build_OilRefinery_C':         { rate: 20,   mw: 30  },
  'Build_Blender_C':             { rate: 5,    mw: 75  },
  'Build_Packager_C':            { rate: 40,   mw: 10  },
  'Build_HadronCollider_C':      { rate: 1,    mw: 1500 },
  'Build_QuantumEncoder_C':      { rate: 0.5,  mw: 2000 },
  'Build_Converter_C':           { rate: 10,   mw: 1000 },
  'Build_MinerMk1_C':            { rate: 60,   mw: 5   },
  'Build_MinerMk2_C':            { rate: 120,  mw: 12  },
  'Build_MinerMk3_C':            { rate: 240,  mw: 30  },
  'Build_WaterPump_C':           { rate: 120,  mw: 20  },
  'Build_OilPump_C':             { rate: 120,  mw: 40  },
  'Build_FrackingExtractor_C':   { rate: 150,  mw: 150 },
  'Build_GeneratorNuclear_C':    { rate: 1,    mw: -2500 }  // negative = energy producer
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function classKey(typePath) {
  if (!typePath) return '';
  const parts = typePath.split('.');
  return parts[parts.length - 1];
}

function propVal(obj, name) {
  return obj && obj.properties && obj.properties[name]
    ? obj.properties[name].value
    : undefined;
}

function zToFloor(z) {
  return Math.round(z / 400);
}

/** Returns the belt tier whose capacity is the smallest value >= tpMin. */
function beltTier(tpMin) {
  for (const tier of BELT_TIERS) {
    if (tpMin <= tier.capacity) return tier;
  }
  return BELT_TIERS[BELT_TIERS.length - 1];
}

/** Extract XYZ from a building object's transform. Returns {x, y, z} in metres. */
function buildingXYZ(obj) {
  const tfm = obj && obj.transform;
  if (!tfm || !tfm.translation) return { x: 0, y: 0, z: 0 };
  return {
    x: Math.round(tfm.translation[0] / 100),
    y: Math.round(tfm.translation[1] / 100),
    z: Math.round(tfm.translation[2] / 100)
  };
}

// ── Core analysis ─────────────────────────────────────────────────────────────

/**
 * Analyse a list of parsed building records and return ranked bottlenecks.
 * @param {Array<{classKey, recipe, nb, oc, xyz, floor}>} buildingRows
 * @returns {Array}
 */
function analyzeBuildingRows(buildingRows) {
  const bottlenecks = [];

  for (const b of buildingRows) {
    const base = MACHINE_BASE[b.classKey];
    if (!base) continue;

    const nb          = b.nb || 1;
    const oc          = b.oc || 100;
    const baseRate    = base.rate;
    const actualRate  = baseRate * (oc / 100);
    const totalTp     = Math.round(actualRate * nb * 10) / 10;

    // ── A. Building efficiency (OC < EFFICIENCY_MIN) ─────────────────────
    if (oc > 0 && oc < EFFICIENCY_MIN * 100) {
      const lostPerMin = Math.round(baseRate * nb * (1 - oc / 100) * 10) / 10;
      if (lostPerMin > 0.1) {
        bottlenecks.push({
          type:       'building_efficiency',
          location:   'Floor ' + b.floor,
          xyz:        b.xyz,
          classKey:   b.classKey,
          recipe:     b.recipe || '(unknown)',
          metric:     oc,
          impact:     lostPerMin,
          suggestion: oc < 40
            ? 'Severe starvation suspected — check input belts/pipes'
            : 'Raise OC to 100% or replace with ' + Math.ceil(nb * oc / 100) + ' building(s) @100% OC'
        });
      }
    }

    // ── B. Belt throughput saturation ─────────────────────────────────────
    if (totalTp > 0) {
      const tier       = beltTier(totalTp);
      const saturation = totalTp / tier.capacity;
      if (saturation >= SATURATION_MIN) {
        const isOver = totalTp > 1200;
        bottlenecks.push({
          type:       'belt_throughput',
          location:   'Floor ' + b.floor,
          xyz:        b.xyz,
          classKey:   b.classKey,
          recipe:     b.recipe || '(unknown)',
          metric:     Math.round(saturation * 100),
          impact:     totalTp,
          suggestion: isOver
            ? 'Split across ' + Math.ceil(totalTp / 1200) + ' Mk.6 belt(s)'
            : (tier.nextMk
                ? 'Upgrade to Mk.' + tier.nextMk + ' belt (' + tier.nextCapacity + '/min capacity)'
                : 'Belt Mk.6 at limit — split across ' + Math.ceil(totalTp / 1200) + ' belt(s)')
        });
      }
    }
  }

  bottlenecks.sort((a, b) => b.impact - a.impact);
  return bottlenecks;
}

/**
 * Render ranked bottleneck list as a text report.
 * @param {Array} bottlenecks
 * @param {string} saveName
 * @returns {string}
 */
function renderReport(bottlenecks, saveName) {
  if (bottlenecks.length === 0) {
    return `✅ No bottlenecks detected in ${saveName}.`;
  }

  const counts = { belt_throughput: 0, building_efficiency: 0 };
  for (const b of bottlenecks) counts[b.type] = (counts[b.type] || 0) + 1;

  const lines = [
    `=== SAT Bottleneck Report — ${saveName} ===`,
    `  Belt throughput   : ${counts.belt_throughput || 0}`,
    `  Building efficiency: ${counts.building_efficiency || 0}`,
    `  Total             : ${bottlenecks.length}`,
    ''
  ];

  bottlenecks.forEach((b, i) => {
    const icon  = b.type === 'belt_throughput' ? '🟠' : '📉';
    const label = b.type === 'belt_throughput'
      ? `Belt ${b.metric}% saturated`
      : `OC ${b.metric}% (below 70%)`;
    const { x, y, z } = b.xyz;
    lines.push(
      `${i + 1}. ${icon} ${b.recipe} [${b.location} · X=${x} Y=${y} Z=${z}]`,
      `   Type   : ${label}`,
      `   Impact : ${b.impact}/min blocked/lost`,
      `   Fix    : ${b.suggestion}`,
      ''
    );
  });

  return lines.join('\n');
}

// ── Main entry point ──────────────────────────────────────────────────────────

function run(args) {
  const [inputArg] = args;

  if (!inputArg) {
    console.error('Usage: sat-calc bottlenecks <save.sav>');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  let Parser;
  try {
    ({ Parser } = require('@etothepii/satisfactory-file-parser'));
  } catch (e) {
    console.error('Missing dependency. Run: npm install --save-dev @etothepii/satisfactory-file-parser');
    process.exit(1);
  }

  console.log(`Parsing: ${inputPath}`);
  const fileBuffer = new Uint8Array(fs.readFileSync(inputPath)).buffer;

  let save;
  try {
    save = Parser.ParseSave(path.basename(inputPath, '.sav'), fileBuffer);
  } catch (e) {
    console.error('Parse error:', e.message);
    process.exit(1);
  }

  const allObjects   = Object.values(save.levels).flatMap(l => l.objects);
  const validClasses = new Set(Object.keys(MACHINE_BASE));

  const buildingRows = allObjects
    .filter(obj => obj && obj.typePath && validClasses.has(classKey(obj.typePath)))
    .map(obj => {
      const ck      = classKey(obj.typePath);
      const ocRaw   = propVal(obj, 'mCurrentPotential');
      const recipe  = propVal(obj, 'mCurrentRecipe');
      const xyz     = buildingXYZ(obj);

      // mCurrentPotential is a fraction (1.0 = 100%), default 1.0
      const oc = ocRaw !== undefined ? Math.round(ocRaw * 100) : 100;

      // Recipe path → extract last segment
      const recipeKey = recipe && recipe.pathName
        ? recipe.pathName.split('.').pop()
        : null;

      return {
        classKey: ck,
        recipe:   recipeKey || '(unknown)',
        nb:       1,  // each save object is one building
        oc,
        xyz,
        floor:    zToFloor(xyz.z * 100)  // xyz.z already in metres, convert back
      };
    });

  const bottlenecks = analyzeBuildingRows(buildingRows);
  const report      = renderReport(bottlenecks, path.basename(inputPath));

  console.log('\n' + report);
}

module.exports = { run, analyzeBuildingRows, renderReport, beltTier };

// Direct invocation
if (require.main === module) {
  run(process.argv.slice(2));
}
