#!/usr/bin/env node
/* ============================================================
 * scripts/parse-save-json.js — Parse a Satisfactory .sav file,
 * output a WorldState JSON document to stdout.
 *
 * Used by the SAT Python backend (extractor.py) to convert
 * binary .sav files into structured data.
 *
 * Output schema (WorldState):
 *   {
 *     saveName:    string,        // base filename without .sav
 *     saveVersion: number,        // integer from save header
 *     playTime:    number,        // seconds played (float)
 *     parsedAt:    string,        // ISO 8601 UTC timestamp
 *     buildings:   Building[],
 *     powerGrids:  PowerGrid[]
 *   }
 *
 * Building:
 *   { className, friendlyName, location:{x,y,z}, floorId,
 *     state, overclock, recipe, recipeName, somersloops, purity }
 *
 * PowerGrid:
 *   { id, production, consumption, batteryBuffer, fuseTripped }
 *
 * Usage:
 *   node scripts/parse-save-json.js <path/to/save.sav>
 * ============================================================ */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CLI ───────────────────────────────────────────────────────────────────────
const [,, inputArg] = process.argv;
if (!inputArg) {
  process.stderr.write('Usage: node scripts/parse-save-json.js <save.sav>\n');
  process.exit(1);
}
const inputPath = path.resolve(inputArg);
if (!fs.existsSync(inputPath)) {
  process.stderr.write(`File not found: ${inputPath}\n`);
  process.exit(1);
}

// ── Load parser ───────────────────────────────────────────────────────────────
let Parser;
try {
  ({ Parser } = require('@etothepii/satisfactory-file-parser'));
} catch {
  process.stderr.write('Missing dependency. Run: npm install\n');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// MACHINE CLASS PATH → French name
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
// RECIPE CLASS PATH → French name
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
  'Recipe_QuartzCrystal_C':              'Cristal de quartz',
  'Recipe_Silica_C':                      'Silice',
  'Recipe_AluminumCasing_C':              'Boîtiers en aluminium',
  'Recipe_FicsiteTrigon_C':               'Trigon en ficsite',
  // Assembleuse
  'Recipe_IronPlateReinforced_C':         'Plaque de fer renforcée',
  'Recipe_Rotor_C':                       'Rotor',
  'Recipe_ModularFrame_C':                'Cadre modulaire',
  'Recipe_SmartPlating_C':               'Placage intelligent',
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
  'Recipe_AluminumScrap_C':              "Copeaux d'aluminium",
  'Recipe_SulfuricAcid_C':               'Acide sulfurique',
  'Recipe_IonizedFuel_C':                'Carburant ionisé',
  // Mélangeur
  'Recipe_CoolingSystem_C':              'Système de refroidissement',
  'Recipe_ModularFrameFused_C':          'Cadre modulaire fusionné',
  'Recipe_TurboBlend_C':                 'Turbocarburant mixte',
  'Recipe_NitricAcid_C':                 'Acide nitrique',
  'Recipe_NonFissileUranium_C':          'Uranium non fissile',
  'Recipe_PlutoniumPellet_C':            'Pastille de plutonium',
  'Recipe_RocketFuel_C':                 'Carburant de fusée',
  // Centrale nucléaire
  'Recipe_GeneratorNuclear_C':           'Énergie uranium',
  'Recipe_GeneratorNuclear_Plutonium_C': 'Énergie plutonium',
  // Foreuses / extracteurs
  'Recipe_MinerIron_C':                  'Extraire: Fer',
  'Recipe_MinerCopper_C':               'Extraire: Cuivre',
  'Recipe_MinerLimestone_C':            'Extraire: Calcaire',
  'Recipe_MinerCoal_C':                 'Extraire: Charbon',
  'Recipe_MinerCaterium_C':             'Extraire: Caterium',
  'Recipe_MinerQuartz_C':               'Extraire: Quartz',
  'Recipe_MinerSulfur_C':              'Extraire: Soufre',
  'Recipe_MinerBauxite_C':             'Extraire: Bauxite',
  'Recipe_MinerUranium_C':             'Extraire: Uranium',
  'Recipe_MinerSAM_C':                 "Extraire: É.M.E.",
  'Recipe_WaterPump_C':                'Pomper: Eau',
  'Recipe_OilPump_C':                  'Extraire: Pétrole',
  // Accélérateur de particules
  'Recipe_CopperDust_C':               'Bon FICSIT',
  'Recipe_NuclearPasta_C':             'Pâte nucléaire',
  'Recipe_Diamonds_C':                 'Diamants',
  // Encodeur quantique
  'Recipe_AIExpansionServer_C':        "Serveur d'expansion IA",
  'Recipe_BallisticWarpDrive_C':       'Moteur à distorsion balistique',
  'Recipe_Ficsonium_C':                'Ficsonium',
  'Recipe_FicsoniumFuelRod_C':         'Barre de ficsonium',
  // Convertisseur
  'Recipe_Diamonds_FromSAM_C':         'Diamants (Convertisseur)',
  'Recipe_TimeCrystal_C':              'Cristal temporel',
  'Recipe_DarkMatterCrystal_C':        'Cristal de matière noire',
  'Recipe_FicsiteIngot_Iron_C':        'Lingot de ficsite (Fer)',
  'Recipe_FicsiteIngot_Aluminum_C':    'Lingot de ficsite (Alu)',
  'Recipe_SingularityCell_C':          'Cellule de singularité',
  'Recipe_SuperpositionOscillator_C':  'Oscillateur de superposition',
  'Recipe_NeuroquantumProcessor_C':    'Processeur neuro-quantique',
  'Recipe_BiochemicalSculptor_C':      'Sculpteur biochimique',
  'Recipe_SAMFluctuator_C':            "Fluctuateur d'É.M.E.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PURITY MAP → normalized English strings (for JSON)
// ─────────────────────────────────────────────────────────────────────────────
const PURITY_MAP = {
  'EResourcePurity::RP_Inpure': 'impure',
  'EResourcePurity::RP_Normal': 'normal',
  'EResourcePurity::RP_Pure':   'pure',
  'RP_Inpure': 'impure',
  'RP_Normal': 'normal',
  'RP_Pure':   'pure',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract the last segment (ClassName_C) from a full Unreal class path. */
function classKey(p) {
  if (!p) return '';
  const parts = p.split('.');
  return parts[parts.length - 1];
}

/** Safely get a property value by name. */
function propVal(obj, name) {
  return obj && obj.properties && obj.properties[name]
    ? obj.properties[name].value
    : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse the save file
// ─────────────────────────────────────────────────────────────────────────────
process.stderr.write(`[parse-save-json] Parsing: ${inputPath}\n`);
const fileBuffer = new Uint8Array(fs.readFileSync(inputPath)).buffer;

let save;
try {
  save = Parser.ParseSave(path.basename(inputPath, '.sav'), fileBuffer);
} catch (e) {
  process.stderr.write(`[parse-save-json] Parse error: ${e.message}\n`);
  process.exit(1);
}

// Flatten all objects from all levels
const allObjects = Object.values(save.levels).flatMap(l => l.objects);

// ─────────────────────────────────────────────────────────────────────────────
// Floor detection via priority power switches (same logic as parse-save.js)
// ─────────────────────────────────────────────────────────────────────────────
const allCircuitObjects = allObjects.filter(o => o?.typePath?.includes('FGPowerCircuit'));

const switchTagMap     = new Map(); // switchInstanceBase → mBuildingTag
const instanceToCircuit = new Map(); // machineInstanceBase → circuitID
const circuitSwitchCount = new Map(); // circuitID → [switchInstanceBase, ...]

for (const obj of allObjects) {
  if (!obj?.typePath?.includes('PriorityPowerSwitch')) continue;
  const instBase = obj.instanceName?.split('.').pop();
  const tag      = obj.properties?.mBuildingTag?.value ?? null;
  if (instBase) switchTagMap.set(instBase, tag);
}

for (const circuit of allCircuitObjects) {
  const circuitID = propVal(circuit, 'mCircuitID');
  if (circuitID === null || circuitID === undefined) continue;
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
      if (!circuitSwitchCount.has(circuitID)) circuitSwitchCount.set(circuitID, []);
      circuitSwitchCount.get(circuitID).push(instBase);
    } else {
      instanceToCircuit.set(instBase, circuitID);
    }
  }
}

// Map circuits with exactly one switch → unambiguous floor name
const circuitToSwitch = new Map();
for (const [cid, switchList] of circuitSwitchCount) {
  if (switchList.length === 1) circuitToSwitch.set(cid, switchList[0]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract production buildings
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTION_KEYS = new Set(Object.keys(MACHINE_MAP));

const productionBuildings = allObjects.filter(
  obj => obj?.typePath && PRODUCTION_KEYS.has(classKey(obj.typePath))
);

process.stderr.write(`[parse-save-json] Found ${productionBuildings.length} production buildings.\n`);

const buildings = productionBuildings.map(b => {
  const key = classKey(b.typePath);

  // Clock speed: float [0.01 .. 2.5] → percentage integer
  const clockRaw = propVal(b, 'mCurrentPotential') ?? propVal(b, 'mPendingPotential') ?? 1.0;
  const overclock = Math.round(Number(clockRaw) * 100);

  // Recipe
  const recipePathName = b.properties?.mCurrentRecipe?.value?.pathName ?? null;
  const recipeKey  = recipePathName ? classKey(recipePathName) : null;
  const recipe     = recipeKey || null;
  const recipeName = recipeKey ? (RECIPE_MAP[recipeKey] ?? recipeKey) : null;

  // Building state
  // mIsProducing: Unreal may omit this when at default (false).
  // Heuristic: if recipe present and not explicitly paused → active.
  const isProducingProp = propVal(b, 'mIsProducing');
  const isStandby       = propVal(b, 'mIsCurrentlyProductionPaused') ?? propVal(b, 'mCurrentRecipeChanged') ?? null;
  let state = 'off';
  if (recipe) {
    if (isProducingProp === true || isProducingProp === undefined || isProducingProp === null) {
      state = 'active';
    } else if (isProducingProp === false) {
      state = isStandby ? 'paused' : 'idle';
    }
  }

  // Somersloops
  const somersloops = Number(propVal(b, 'mNumSomersloopsSlotted') ?? propVal(b, 'mNumSlotsUsedForced') ?? 0);

  // Purity (extractors)
  const purityRaw = String(propVal(b, 'mNodePurity') ?? propVal(b, 'mExtractorTypeName') ?? '');
  const purityKey = purityRaw.split('::').pop();
  const purity    = PURITY_MAP[purityRaw] ?? PURITY_MAP[purityKey] ?? 'normal';

  // Location
  const tx = b.transform?.translation;
  const location = {
    x: Number(tx?.x ?? 0),
    y: Number(tx?.y ?? 0),
    z: Number(tx?.z ?? 0),
  };

  // Floor ID from priority switch
  const instanceBase = b.instanceName?.split('.').pop() ?? null;
  const circuitID    = instanceBase ? (instanceToCircuit.get(instanceBase) ?? null) : null;
  const switchInst   = circuitID !== null ? (circuitToSwitch.get(circuitID) ?? null) : null;
  const floorId      = switchInst ? (switchTagMap.get(switchInst) ?? null) : null;

  return {
    className:    key,
    friendlyName: MACHINE_MAP[key] ?? key,
    location,
    floorId,
    state,
    overclock,
    recipe,
    recipeName,
    somersloops,
    purity,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Extract power grids from FGPowerCircuit objects
// ─────────────────────────────────────────────────────────────────────────────
const powerGrids = [];
for (const circuit of allCircuitObjects) {
  const id = Number(propVal(circuit, 'mCircuitID') ?? 0);
  if (id <= 0) continue; // skip invalid circuit IDs

  const production    = Number(propVal(circuit, 'mPowerProduction')   ?? 0);
  const consumption   = Number(propVal(circuit, 'mPowerConsumed')     ?? 0);
  const batteryBuffer = Number(propVal(circuit, 'mBatteryPowerStore') ?? 0);
  const fuseTripped   = Boolean(propVal(circuit, 'mIsFuseTripped')    ?? false);

  powerGrids.push({ id, production, consumption, batteryBuffer, fuseTripped });
}

process.stderr.write(`[parse-save-json] Found ${powerGrids.length} power grid(s).\n`);

// ─────────────────────────────────────────────────────────────────────────────
// Build and emit the WorldState JSON
// ─────────────────────────────────────────────────────────────────────────────
const worldState = {
  saveName:    path.basename(inputPath, '.sav'),
  saveVersion: Number(save.header?.saveVersion ?? 0),
  playTime:    Number(save.header?.playDurationSeconds ?? 0),
  parsedAt:    new Date().toISOString(),
  buildings,
  powerGrids,
};

process.stdout.write(JSON.stringify(worldState));
process.stderr.write(`\n[parse-save-json] Done — ${buildings.length} buildings, ${powerGrids.length} grids.\n`);
