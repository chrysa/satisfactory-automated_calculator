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
const args = process.argv.slice(2).filter(a => a !== '--dump');
const dumpMode = process.argv.includes('--dump');
const [inputArg, outputArg] = args;
if (!inputArg) {
  console.error('Usage: node scripts/parse-save.js <save.sav> [output.csv] [--dump]');
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

// ── Build priority switch + circuit maps ───────────────────────────────────
// Structure:
//   switchTagMap:     switchInstanceBase → mBuildingTag (user-set name)
//   circuitToSwitch:  circuitID → switchInstanceBase  (only if circuit has exactly 1 switch)
//   instanceToCircuit: machineInstanceBase → circuitID
//
// Approach: scan all FGPowerCircuit.mComponents. Each pathName is:
//   "Persistent_Level:PersistentLevel.Build_XYZ_C_NNNN.PowerConnection"
//   → instBase = "Build_XYZ_C_NNNN"  (strip everything before last '.')
//   → classK   = "Build_XYZ_C"       (strip numeric _NNNN suffix)

const allCircuits = allObjects.filter(o => o?.typePath?.includes('FGPowerCircuit'));

// Build switchTagMap from switch objects
const switchTagMap = new Map(); // switchInstanceBase → mBuildingTag
for (const obj of allObjects) {
  if (!obj?.typePath?.includes('PriorityPowerSwitch')) continue;
  const instBase = obj.instanceName?.split('.').pop();
  const tag = obj.properties?.mBuildingTag?.value ?? null;
  if (instBase) switchTagMap.set(instBase, tag);
}

// Build instanceToCircuit and circuitToSwitch
const instanceToCircuit = new Map(); // machineInstanceBase → circuitID
const circuitSwitchCount = new Map(); // circuitID → list of switch instanceBases
for (const circuit of allCircuits) {
  const circuitID = circuit.properties?.mCircuitID?.value ?? null;
  if (circuitID === null) continue;
  const components = circuit.properties?.mComponents?.values ?? [];
  for (const comp of components) {
    const pn = comp?.pathName ?? comp?.value?.pathName ?? null;
    if (!pn) continue;
    const dotIdx = pn.lastIndexOf('.');
    if (dotIdx < 0) continue;
    const instBase = pn.slice(0, dotIdx).split('.').pop();
    if (!instBase) continue;
    const classK = instBase.replace(/_\d+$/, '');
    if (classK === 'Build_PriorityPowerSwitch_C') {
      // Record switch in this circuit
      if (!circuitSwitchCount.has(circuitID)) circuitSwitchCount.set(circuitID, []);
      circuitSwitchCount.get(circuitID).push(instBase);
    } else {
      // Machine or power pole — record instance → circuit
      instanceToCircuit.set(instBase, circuitID);
    }
  }
}

// circuitToSwitch: only circuits with exactly 1 switch → unambiguous mapping
const circuitToSwitch = new Map(); // circuitID → switchInstanceBase
for (const [cid, switchList] of circuitSwitchCount) {
  if (switchList.length === 1) circuitToSwitch.set(cid, switchList[0]);
}

console.log(`Power circuits: ${allCircuits.length} circuits, ${switchTagMap.size} switches, ${instanceToCircuit.size} machine→circuit mappings.`);


// ── Mode --dump : JSON brut de chaque bâtiment avant regroupement ─────────────
if (dumpMode) {
  const dumpPath = inputPath.replace(/\.sav$/i, '_dump.json');
  const dumpData = buildings.map(b => {
    const key = classKey(b.typePath);
    const props = {};
    if (b.properties) {
      for (const [k, v] of Object.entries(b.properties)) {
        try { props[k] = JSON.parse(JSON.stringify(v)); } catch(e) { props[k] = String(v); }
      }
    }
    return {
      typePath: b.typePath,
      classKey: key,
      machine_mapped: MACHINE_MAP[key] || null,
      z: b.transform && b.transform.translation ? b.transform.translation.z : null,
      x: b.transform && b.transform.translation ? b.transform.translation.x : null,
      y: b.transform && b.transform.translation ? b.transform.translation.y : null,
      properties: props,
    };
  });
  fs.writeFileSync(dumpPath, JSON.stringify(dumpData, null, 2), 'utf8');
  console.log(`\n✅ Dump JSON : ${buildings.length} bâtiments → ${dumpPath}`);
  process.exit(0);
}

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
  const clockRaw  = propVal(b, 'mCurrentPotential') ??
                    propVal(b, 'mPendingPotential')  ??
                    1;
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

  // Position Z + étage via switch
  const z = b.transform?.translation?.z ?? 0;

  // Get étage name from priority switch via circuit membership
  const instanceBase = b.instanceName?.split('.').pop() ?? null;
  const circuitID = instanceBase ? (instanceToCircuit.get(instanceBase) ?? null) : null;
  const switchInst = circuitID === null ? null : (circuitToSwitch.get(circuitID) ?? null);
  const etageName  = switchInst ? (switchTagMap.get(switchInst) ?? null) : null;

  // Only include machines with a recipe (verify production)
  if (!recipeName) continue;

  extracted.push({ machine, recipe: recipeName, oc, sloop, purity, z, etageName });
}

// ── Group identical machines per ligne de production ─────────────────────────
// Key: etageName|machine|recipe|oc|purity|sloop
const groups = {};
for (const e of extracted) {
  const key = `${e.etageName ?? '_aucun'}|${e.machine}|${e.recipe}|${e.oc}|${e.purity}|${e.sloop}`;
  if (!groups[key]) groups[key] = { ...e, nb: 0, zSum: 0 };
  groups[key].nb++;
  groups[key].zSum += e.z;
}
for (const g of Object.values(groups)) g.avgZ = g.zSum / g.nb;

// ── Sort rows: by étage name (alphabetical), then machine ────────────────────
const allRows = Object.values(groups).sort((a, b) => {
  const na = a.etageName ?? '', nb2 = b.etageName ?? '';
  if (na !== nb2) return na.localeCompare(nb2, 'fr');
  return a.machine.localeCompare(b.machine, 'fr');
});

// ── Build CSV ─────────────────────────────────────────────────────────────────
const HEADER = ['Étage', 'Machine', 'Recette', 'Nb', 'OC%', 'Pureté', 'Somersloops'];
const csvLines = [
  csvRow(HEADER),
  ...allRows.map(r => csvRow([
    r.etageName ?? 'Sans circuit',
    r.machine,
    r.recipe,
    r.nb,
    r.oc,
    r.purity,
    r.sloop
  ]))
];

fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');

console.log(`\n✅ Production CSV: ${allRows.length} ligne(s) → ${outputPath}`);

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT DE SAUVEGARDE — collectibles & artefacts
// ─────────────────────────────────────────────────────────────────────────────

// Playtime from save header
const playSeconds = (save.header?.playDurationSeconds) || 0;
const playHours   = Math.floor(playSeconds / 3600);
const playMinutes = Math.floor((playSeconds % 3600) / 60);

// Hard drives — 3 types of crash site debris objects
const crashSitesRemaining = countInWorld(allObjects, 'BP_CrashSiteDebris')
                           + countInWorld(allObjects, 'BP_DebrisActor_02')
                           + countInWorld(allObjects, 'BP_DebrisActor_03');
const hdCollected         = countInInventories(allObjects, 'Desc_HardDrive');
const hdTotal             = crashSitesRemaining + hdCollected;
const hdPct               = hdTotal > 0 ? Math.round((hdCollected / hdTotal) * 100) : 0;

// Somersloops (BP_WAT1 in-world, Desc_WAT1 in inventory)
const sloopsSlotted    = extracted.reduce((s, e) => s + e.sloop, 0);
const sloopsWorld      = countInWorld(allObjects, 'BP_WAT1');
const sloopsInInv      = countInInventories(allObjects, 'Desc_WAT1');
const sloopsCollected  = sloopsSlotted + sloopsInInv;
const sloopsTotal      = sloopsCollected + sloopsWorld;
const sloopsPct        = sloopsTotal > 0 ? Math.round(sloopsCollected / sloopsTotal * 100) : 0;

// Mercer Spheres (BP_WAT2 in-world, Desc_WAT2 in inventory)
const spheresWorld  = countInWorld(allObjects, 'BP_WAT2');
const spheresInInv  = countInInventories(allObjects, 'Desc_WAT2');
const spheresTotal  = spheresInInv + spheresWorld;
const spheresPct    = spheresTotal > 0 ? Math.round(spheresInInv / spheresTotal * 100) : 0;

// Power Slugs — 3 tiers (Green ×1 / Yellow ×2 / Blue ×5)
// Raw slugs in inventory (0 if all converted to shards already)
const slugGreenWorld  = countInWorld(allObjects, 'BP_Crystal.BP_Crystal_C');
const slugYellowWorld = countInWorld(allObjects, 'BP_Crystal_mk2');
const slugBlueWorld   = countInWorld(allObjects, 'BP_Crystal_mk3');
const slugGreenInv    = countInInventories(allObjects, 'Desc_Crystal.Desc_Crystal_C');
const slugYellowInv   = countInInventories(allObjects, 'Desc_Crystal_mk2');
const slugBlueInv     = countInInventories(allObjects, 'Desc_Crystal_mk3');
// Shards already processed + equivalent from raw slugs in inventory
const shardsReady     = countInInventories(allObjects, 'Desc_CrystalShard');
const shardsAvailable = shardsReady + slugGreenInv * 1 + slugYellowInv * 2 + slugBlueInv * 5;
const slugRemainingPotential = slugGreenWorld * 1 + slugYellowWorld * 2 + slugBlueWorld * 5;
const slugMaxShards   = shardsAvailable + slugRemainingPotential;
const slugPct         = slugMaxShards > 0 ? Math.round(shardsAvailable / slugMaxShards * 100) : 0;

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
  line('Disques durs :', `${hdCollected} / ${hdTotal}  (${hdPct}%)`),
  line('  Sites de crash restants :', String(crashSitesRemaining)),
  '',
  line('Somersloops :', `${sloopsCollected} / ${sloopsTotal}  (${sloopsPct}%)`),
  line('  Slottés dans des machines :', String(sloopsSlotted)),
  line('  En inventaire / stockage :', String(sloopsInInv)),
  line('  Encore dans le monde :', String(sloopsWorld)),
  '',
  line('Sphères de Mercer :', `${spheresInInv} / ${spheresTotal}  (${spheresPct}%)`),
  line('  Encore dans le monde :', String(spheresWorld)),
  '',
  '── LIMACES D\'ÉNERGIE ────────────────────────────────',
  '',
  line('Shards disponibles :', `${shardsAvailable} / ${slugMaxShards} max  (${slugPct}%)`),
  line('  Shards transformés :', String(shardsReady)),
  slugGreenInv + slugYellowInv + slugBlueInv > 0
    ? line('  Limaces brutes (inv) :', `🟢${slugGreenInv}  🟡${slugYellowInv}  🔵${slugBlueInv}`)
    : line('  Limaces brutes (inv) :', 'aucune (toutes transformées)'),
  line('Encore dans le monde :', `🟢${slugGreenWorld}  🟡${slugYellowWorld}  🔵${slugBlueWorld}`),
  line('  Potentiel restant :', `+${slugRemainingPotential} shards`),
  '',
  '══════════════════════════════════════════════════════',
].join('\n');

fs.writeFileSync(rapportPath, rapport, 'utf8');

console.log('\n' + rapport);
console.log(`\n✅ Rapport → ${rapportPath}`);

// List unique étages found
const etageNames = [...new Set(allRows.map(r => r.etageName ?? 'Sans circuit'))].sort((a, b) => a.localeCompare(b, 'fr'));
console.log(`\nLignes de production détectées : ${etageNames.length}`);
for (const name of etageNames) {
  const count = allRows.filter(r => (r.etageName ?? 'Sans circuit') === name).reduce((s, r) => s + r.nb, 0);
  console.log(`  ${name}  (${count} machines)`);
}
console.log('\nProchaine étape : dans Google Sheets → S.A.T. → importer le CSV.');
