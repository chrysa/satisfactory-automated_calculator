#!/usr/bin/env node
/* ============================================================
 * scripts/parse-save.js — Parse a Satisfactory .sav file.
 *
 * Outputs two files next to the save (or at OUT path):
 *   <name>_production.csv  — import-ready for the S.A.T. Production sheet
 *   <name>_rapport.txt     — save summary: hard drives, somersloops,
 *                            Mercer spheres, power slugs, playtime
 *
 * Usage:
 *   node scripts/parse-save.js <path/to/save.sav> [output.csv]
 *
 * Output CSV columns:
 *   Étage, Machine, Recette, Nb, OC%, Pureté, Somersloops
 *
 * How floors are determined:
 *   Buildings are grouped by their Z coordinate (altitude), rounded
 *   to the nearest 400 cm (≈ 4 m = 1 foundation height) and named
 *   "Étage N" automatically. You can rename them in the sheet.
 * ============================================================ */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────
const [,, inputArg, outputArg] = process.argv;
if (!inputArg) {
  console.error('Usage: node scripts/parse-save.js <save.sav> [output.csv]');
  process.exit(1);
}
const inputPath  = path.resolve(inputArg);
const outputPath = outputArg ? path.resolve(outputArg) : inputPath.replace(/\.sav$/i, '_production.csv');
const rapportPath = outputPath.replace(/\.csv$/i, '').replace(/_production$/, '') + '_rapport.txt';

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

// ── Load parser ───────────────────────────────────────────────────────────────
let Parser;
try {
  ({ Parser } = require('@etothepii/satisfactory-file-parser'));
} catch (e) {
  console.error('Missing dependency. Run: npm install --save-dev @etothepii/satisfactory-file-parser');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINE CLASS PATH → French name (in-game UI, matches SAT data)
// Key = last segment of Unreal class path (Build_*_C)
// ─────────────────────────────────────────────────────────────────────────────
const MACHINE_MAP = {
  'Build_SmelterMk1_C':               'Fonderie',
  'Build_FoundryMk1_C':               'Fonderie avancée',
  'Build_ConstructorMk1_C':           'Constructeur',
  'Build_AssemblerMk1_C':             'Assembleuse',
  'Build_ManufacturerMk1_C':          'Façonneuse',
  'Build_OilRefinery_C':              'Raffinerie',
  'Build_Blender_C':                  'Mélangeur',
  'Build_Packager_C':                 'Conditionneur',
  'Build_HadronCollider_C':           'Accélérateur de particules',
  'Build_QuantumEncoder_C':           'Encodeur quantique',
  'Build_Converter_C':                'Convertisseur',
  'Build_GeneratorNuclear_C':         'Centrale nucléaire',
  'Build_MinerMk1_C':                 'Foreuse Mk.1',
  'Build_MinerMk2_C':                 'Foreuse Mk.2',
  'Build_MinerMk3_C':                 'Foreuse Mk.3',
  'Build_WaterPump_C':                'Pompe à eau',
  'Build_OilPump_C':                  'Puit de pétrole',
  'Build_FrackingExtractor_C':        'Pressuriseur de puits de ressources',
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE CLASS PATH → French name (matches SAT RECIPES[*][0])
// Key = last segment of recipe path (Recipe_*_C)
// ─────────────────────────────────────────────────────────────────────────────
const RECIPE_MAP = {
  // Fonderie
  'Recipe_IngotIron_C':                   'Lingot de fer',
  'Recipe_IngotCopper_C':                 'Lingot de cuivre',
  'Recipe_IngotCaterium_C':               'Lingot de caterium',
  // Fonderie avancée
  'Recipe_IngotSteel_C':                  "Lingot d'acier",
  'Recipe_IngotAluminum_C':               "Lingot d'aluminium",
  // Constructeur
  'Recipe_IronPlate_C':                   'Plaque de fer',
  'Recipe_IronRod_C':                     'Barre de fer',
  'Recipe_Screw_C':                       'Vis',
  'Recipe_Wire_C':                        'Fil électrique',
  'Recipe_Cable_C':                       'Câble',
  'Recipe_Concrete_C':                    'Béton',
  'Recipe_CopperSheet_C':                 'Tôle de cuivre',
  'Recipe_SteelBeam_C':                   'Poutre en acier',
  'Recipe_SteelPipe_C':                   'Tuyau en acier',
  'Recipe_CateriumWire_C':                'Filactif',
  'Recipe_QuartzCrystal_C':               'Cristal de quartz',
  'Recipe_Silica_C':                      'Silice',
  'Recipe_AluminumCasing_C':              "Boîtiers en aluminium",
  'Recipe_FicsiteTrigon_C':               'Trigon en ficsite',
  // Assembleuse
  'Recipe_IronPlateReinforced_C':         'Plaque de fer renforcée',
  'Recipe_Rotor_C':                       'Rotor',
  'Recipe_ModularFrame_C':                'Cadre modulaire',
  'Recipe_SmartPlating_C':                'Placage intelligent',
  'Recipe_VersatileFramework_C':          'Structure polyvalente',
  'Recipe_EncasedIndustrialBeam_C':       'Poutre en béton armé',
  'Recipe_Stator_C':                      'Stator',
  'Recipe_Motor_C':                       'Moteur',
  'Recipe_AutomatedWiring_C':             'Câblage automatisé',
  'Recipe_CircuitBoard_C':                'Circuit imprimé',
  'Recipe_AILimiter_C':                   "Contrôleur d'I.A.",
  'Recipe_HeatSink_C':                    'Dissipateur de chaleur',
  'Recipe_AlcladAluminumSheet_C':         "Tôle d'aluminium en alliage Alclad",
  'Recipe_ElectromagneticControlRod_C':   'Tige de contrôle électromagnétique',
  'Recipe_EncasedPlutoniumCell_C':        'Cellule de plutonium encastré',
  'Recipe_MagneticFieldGenerator_C':      'Générateur de champ magnétique',
  'Recipe_PressureConversionCube_C':      'Cube de conversion de pression',
  // Façonneuse
  'Recipe_Computer_C':                    'Ordinateur',
  'Recipe_ModularFrameHeavy_C':           'Cadre modulaire lourd',
  'Recipe_MotorLightweight_C':            'Moteur modulaire',
  'Recipe_AdaptiveControlUnit_C':         'Unité de contrôle adaptative',
  'Recipe_HighSpeedConnector_C':          'Connecteur haute vitesse',
  'Recipe_Supercomputer_C':               'Superordinateur',
  'Recipe_TurboMotor_C':                  'Turbomoteur',
  'Recipe_NuclearFuelRod_C':              "Barre d'uranium",
  'Recipe_ThermalPropulsionRocket_C':     'Fusée à propulsion thermique',
  'Recipe_AssemblyDirectorSystem_C':      "Système de directeur d'assemblage",
  'Recipe_RadioControlUnit_C':            'Unité de contrôle radio',
  'Recipe_Battery_C':                     'Batterie',
  // Raffinerie
  'Recipe_Plastic_C':                     'Plastique',
  'Recipe_Rubber_C':                      'Caoutchouc',
  'Recipe_LiquidFuel_C':                  'Carburant',
  'Recipe_PetroleumCoke_C':               'Coke de pétrole',
  'Recipe_AluminaSolution_C':             "Solution d'alumine",
  'Recipe_AluminumScrap_C':               "Copeaux d'aluminium",
  'Recipe_SulfuricAcid_C':                'Acide sulfurique',
  'Recipe_IonizedFuel_C':                 'Carburant ionisé',
  // Mélangeur
  'Recipe_CoolingSystem_C':               'Système de refroidissement',
  'Recipe_ModularFrameFused_C':           'Cadre modulaire fusionné',
  'Recipe_TurboBlend_C':                  'Turbocarburant mixte',
  'Recipe_NitricAcid_C':                  'Acide nitrique',
  'Recipe_NonFissileUranium_C':           'Uranium non fissile',
  'Recipe_PlutoniumPellet_C':             'Pastille de plutonium',
  'Recipe_RocketFuel_C':                  'Carburant de fusée',
  // Centrale nucléaire
  'Recipe_GeneratorNuclear_C':            'Énergie uranium',
  'Recipe_GeneratorNuclear_Plutonium_C':  'Énergie plutonium',
  // Foreuses / extracteurs
  'Recipe_MinerIron_C':                   'Extraire: Fer',
  'Recipe_MinerCopper_C':                 'Extraire: Cuivre',
  'Recipe_MinerLimestone_C':              'Extraire: Calcaire',
  'Recipe_MinerCoal_C':                   'Extraire: Charbon',
  'Recipe_MinerCaterium_C':               'Extraire: Caterium',
  'Recipe_MinerQuartz_C':                 'Extraire: Quartz',
  'Recipe_MinerSulfur_C':                 'Extraire: Soufre',
  'Recipe_MinerBauxite_C':                'Extraire: Bauxite',
  'Recipe_MinerUranium_C':                'Extraire: Uranium',
  'Recipe_MinerSAM_C':                    "Extraire: É.M.E.",
  'Recipe_WaterPump_C':                   'Pomper: Eau',
  'Recipe_OilPump_C':                     'Extraire: Pétrole',
  // Accélérateur de particules
  'Recipe_CopperDust_C':                  'Bon FICSIT',
  'Recipe_NuclearPasta_C':                'Pâte nucléaire',
  'Recipe_Diamonds_C':                    'Diamants',
  // Encodeur quantique
  'Recipe_AIExpansionServer_C':           "Serveur d'expansion IA",
  'Recipe_BallisticWarpDrive_C':          'Moteur à distorsion balistique',
  'Recipe_Ficsonium_C':                   'Ficsonium',
  'Recipe_FicsoniumFuelRod_C':            'Barre de ficsonium',
  // Convertisseur
  'Recipe_Diamonds_FromSAM_C':            'Diamants (Convertisseur)',
  'Recipe_TimeCrystal_C':                 'Cristal temporel',
  'Recipe_DarkMatterCrystal_C':           'Cristal de matière noire',
  'Recipe_FicsiteIngot_Iron_C':           'Lingot de ficsite (Fer)',
  'Recipe_FicsiteIngot_Aluminum_C':       'Lingot de ficsite (Alu)',
  'Recipe_SingularityCell_C':             'Cellule de singularité',
  'Recipe_SuperpositionOscillator_C':     'Oscillateur de superposition',
  'Recipe_NeuroquantumProcessor_C':       'Processeur neuro-quantique',
  'Recipe_BiochemicalSculptor_C':         'Sculpteur biochimique',
  'Recipe_SAMFluctuator_C':               "Fluctuateur d'É.M.E.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PURITY MAP (resource node purity class path last segment → FR label)
// ─────────────────────────────────────────────────────────────────────────────
const PURITY_MAP = {
  'EResourcePurity::RP_Inpure': 'Impur',
  'EResourcePurity::RP_Normal': 'Normal',
  'EResourcePurity::RP_Pure':   'Pur',
  // alternate representations
  'RP_Inpure': 'Impur',
  'RP_Normal': 'Normal',
  'RP_Pure':   'Pur',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the last segment (ClassName_C) from a full Unreal path. */
function classKey(path) {
  if (!path) return '';
  const parts = path.split('.');
  return parts[parts.length - 1];
}

/** Read a property value by name from a parsed object's properties map. */
function prop(obj, name) {
  return obj && obj.properties && obj.properties[name];
}

/** Get .value from a property, safely. */
function propVal(obj, name) {
  const p = prop(obj, name);
  return p ? p.value : undefined;
}

/** Round Z to nearest floor level (400 cm ≈ 4 m = 1 foundation). */
function zToFloor(z) {
  return Math.round(z / 400);
}

/** Wrap a CSV field in quotes if needed (RFC 4180). */
function csvField(v) {
  const s = String(v === undefined || v === null ? '' : v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(fields) {
  return fields.map(csvField).join(',');
}

/**
 * Count items matching a descriptor path substring across all inventory stacks
 * in every object in the save.
 * Inventory stacks are StructArrayProperties whose values have:
 *   .value.properties.Item.value.itemReference.pathName
 *   .value.properties.NumItems.value (int)
 */
function countInInventories(objects, descSubstr) {
  let total = 0;
  for (const obj of objects) {
    if (!obj || !obj.properties) continue;
    for (const p of Object.values(obj.properties)) {
      if (!p || !Array.isArray(p.values)) continue;
      for (const stack of p.values) {
        if (!stack || !stack.value) continue;
        const sv = stack.value;
        const props = sv.properties || (sv.value && sv.value.properties);
        if (!props) continue;
        const itemProp = props.Item;
        const numProp  = props.NumItems;
        const ref = itemProp && itemProp.value && itemProp.value.itemReference;
        if (ref && ref.pathName && ref.pathName.includes(descSubstr)) {
          total += (numProp && typeof numProp.value === 'number') ? numProp.value : 1;
        }
      }
    }
  }
  return total;
}

/**
 * Count objects still present in the world (uncollected) whose typePath
 * contains the given substring.
 */
function countInWorld(objects, typeSubstr) {
  return objects.filter(o => o && o.typePath && o.typePath.includes(typeSubstr)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

console.log(`Parsing: ${inputPath}`);
const fileBuffer = new Uint8Array(fs.readFileSync(inputPath)).buffer;

let save;
try {
  save = Parser.ParseSave(path.basename(inputPath, '.sav'), fileBuffer);
} catch (e) {
  console.error('Parse error:', e.message);
  process.exit(1);
}

// Flatten all objects across levels
const allObjects = Object.values(save.levels).flatMap(l => l.objects);

// ── Filter production buildings ───────────────────────────────────────────────
const PRODUCTION_KEYS = new Set(Object.keys(MACHINE_MAP));

const buildings = allObjects.filter(obj => {
  if (!obj || !obj.typePath) return false;
  return PRODUCTION_KEYS.has(classKey(obj.typePath));
});

console.log(`Found ${buildings.length} production buildings.`);

if (buildings.length === 0) {
  console.warn('No production buildings found. Check that the save is from Satisfactory v1.1.');
  process.exit(0);
}

// ── Extract data per building ─────────────────────────────────────────────────
const extracted = [];

for (const b of buildings) {
  const key     = classKey(b.typePath);
  const machine = MACHINE_MAP[key] || key;

  // Clock speed: stored as float [0.01 .. 2.5] → percentage 1..250
  const clockRaw  = propVal(b, 'mCurrentPotentialConversion') ??
                    propVal(b, 'mPendingPotentialConversion')  ??
                    1.0;
  const oc        = Math.round(clockRaw * 100);

  // Recipe
  const recipeProp = prop(b, 'mCurrentRecipe');
  let   recipeName = '';
  if (recipeProp && recipeProp.value && recipeProp.value.pathName) {
    const rKey = classKey(recipeProp.value.pathName);
    recipeName = RECIPE_MAP[rKey] || rKey;
  }

  // Somersloops slotted in this building
  const sloop = Number(
    propVal(b, 'mNumSomersloopsSlotted') ??
    propVal(b, 'mNumSlotsUsedForced')    ??
    0
  );

  // Purity (only for extractors — resource node purity)
  let purity = 'Normal';
  const purityProp = prop(b, 'mExtractorTypeName') ?? prop(b, 'mNodePurity');
  if (purityProp && purityProp.value) {
    const pKey = String(purityProp.value).split('::').pop();
    const pFull = String(purityProp.value);
    purity = PURITY_MAP[pFull] ?? PURITY_MAP[pKey] ?? 'Normal';
  }

  // Position Z → floor index
  const z     = b.transform && b.transform.translation ? b.transform.translation.z : 0;
  const floor = zToFloor(z);

  extracted.push({ machine, recipe: recipeName, oc, sloop, purity, floor, z });
}

// ── Group identical machines per floor ────────────────────────────────────────
// Key: floor|machine|recipe|oc|purity|sloop
const groups = {};
for (const e of extracted) {
  const k = `${e.floor}|${e.machine}|${e.recipe}|${e.oc}|${e.purity}|${e.sloop}`;
  if (!groups[k]) {
    groups[k] = { ...e, nb: 0 };
  }
  groups[k].nb++;
}

// ── Assign floor names ────────────────────────────────────────────────────────
// Sort floors by average Z ascending, name them Étage 1, 2, …
const floorLevels = [...new Set(Object.values(groups).map(g => g.floor))].sort((a, b) => a - b);
const floorNames  = {};
floorLevels.forEach((fl, i) => { floorNames[fl] = `Étage ${i + 1}`; });

// ── Sort rows: by floor then machine ─────────────────────────────────────────
const rows = Object.values(groups).sort((a, b) => {
  if (a.floor !== b.floor) return a.floor - b.floor;
  return a.machine.localeCompare(b.machine, 'fr');
});

// ── Build CSV ─────────────────────────────────────────────────────────────────
const HEADER = ['Étage', 'Machine', 'Recette', 'Nb', 'OC%', 'Pureté', 'Somersloops'];
const csvLines = [
  csvRow(HEADER),
  ...rows.map(r => csvRow([
    floorNames[r.floor],
    r.machine,
    r.recipe,
    r.nb,
    r.oc,
    r.purity,
    r.sloop
  ]))
];

fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');

console.log(`\n✅ Production CSV: ${rows.length} ligne(s) → ${outputPath}`);

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT DE SAUVEGARDE — collectibles & artefacts
// ─────────────────────────────────────────────────────────────────────────────

// Playtime from save header
const playSeconds = (save.header && save.header.playDurationSeconds) || 0;
const playHours   = Math.floor(playSeconds / 3600);
const playMinutes = Math.floor((playSeconds % 3600) / 60);

// Hard drives
// Crash sites still in world (unlooted) contain 'CrashSiteDebris' in typePath
// Hard drives already collected appear in inventories
const crashSitesRemaining = countInWorld(allObjects, 'CrashSiteDebris');
const hdCollected         = countInInventories(allObjects, 'Desc_HardDrive');
const hdTotal             = crashSitesRemaining + hdCollected;
const hdPct               = hdTotal > 0 ? Math.round((hdCollected / hdTotal) * 100) : 0;

// Somersloops
// Slotted: sum from extracted buildings
const sloopsSlotted = extracted.reduce((s, e) => s + e.sloop, 0);
// Still in world (uncollected artefact entities)
const sloopsWorld   = countInWorld(allObjects, 'BP_AlienArtifact');
// In inventories / storage (not yet slotted)
const sloopsInInv   = countInInventories(allObjects, 'Desc_AlienArtifact');
const sloopsTotal   = sloopsSlotted + sloopsWorld + sloopsInInv;

// Mercer Spheres (small, medium, large — all share AlienRemnant path)
const spheresWorld  = countInWorld(allObjects, 'BP_AlienRemnant');
const spheresInInv  = countInInventories(allObjects, 'Desc_AlienRemnant');
const spheresTotal  = spheresWorld + spheresInInv;

// Power Slugs — 3 tiers (Green ×1 shard / Yellow ×2 / Blue ×5)
// Note: 'Desc_Crystal_C' does not match 'Desc_Crystal_mk2_C' (substring safe)
const slugGreenWorld  = countInWorld(allObjects, 'BP_Crystal.BP_Crystal_C');
const slugYellowWorld = countInWorld(allObjects, 'BP_Crystal_mk2');
const slugBlueWorld   = countInWorld(allObjects, 'BP_Crystal_mk3');
const slugGreenInv    = countInInventories(allObjects, 'Desc_Crystal_C');
const slugYellowInv   = countInInventories(allObjects, 'Desc_Crystal_mk2');
const slugBlueInv     = countInInventories(allObjects, 'Desc_Crystal_mk3');
const shardsAvailable = slugGreenInv * 1 + slugYellowInv * 2 + slugBlueInv * 5;

// Format helpers
const pad   = (n, w) => String(n).padStart(w, ' ');
const line  = (label, value) => `  ${label.padEnd(30)} ${value}`;

const rapport = [
  '══════════════════════════════════════════════════════',
  '  RAPPORT DE SAUVEGARDE — S.A.T.',
  '══════════════════════════════════════════════════════',
  '',
  line('Fichier save :', path.basename(inputPath)),
  line('Durée de jeu :', `${playHours}h ${String(playMinutes).padStart(2, '0')}min`),
  line('Bâtiments de production :', String(buildings.length)),
  '',
  '── COLLECTIBLES ─────────────────────────────────────',
  '',
  line('Disques durs collectés :', `${hdCollected} / ${hdTotal}  (${hdPct}%)`),
  line('  Sites de crash restants :', String(crashSitesRemaining)),
  '',
  line('Somersloops :', `${sloopsTotal} au total`),
  line('  Slottés dans des machines :', String(sloopsSlotted)),
  line('  En inventaire / stockage :', String(sloopsInInv)),
  line('  Encore dans le monde :', String(sloopsWorld)),
  '',
  line('Sphères de Mercer :', `${spheresTotal} au total`),
  line('  En inventaire / stockage :', String(spheresInInv)),
  line('  Encore dans le monde :', String(spheresWorld)),
  '',
  '── LIMACES D\'ÉNERGIE ────────────────────────────────',
  '',
  line('Vertes  (×1 shard) :', `${slugGreenInv} collectées  +  ${slugGreenWorld} dans le monde`),
  line('Jaunes  (×2 shards) :', `${slugYellowInv} collectées  +  ${slugYellowWorld} dans le monde`),
  line('Bleues  (×5 shards) :', `${slugBlueInv} collectées  +  ${slugBlueWorld} dans le monde`),
  line('Shards disponibles :', String(shardsAvailable)),
  '',
  '══════════════════════════════════════════════════════',
].join('\n');

fs.writeFileSync(rapportPath, rapport, 'utf8');

console.log('\n' + rapport);
console.log(`\n✅ Rapport → ${rapportPath}`);
console.log(`\nFloor mapping (Z → name):`);
floorLevels.forEach((fl, i) => {
  console.log(`  ${floorNames[fl]}  (Z ≈ ${fl * 4} m)`);
});
console.log('\nNext step: in Google Sheets → S.A.T. → Production,');
console.log('paste the CSV content or use File → Import → Replace sheet.');
