/**
 * tests/setup.js
 * Mock minimal de l'environnement Google Apps Script pour Jest.
 * On recrée les globaux utilisés par les fichiers .gs : Logger, SpreadsheetApp, etc.
 * Le code GAS est chargé via vm.runInThisContext après injection des mocks.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

// ── 1. Mocks des APIs GAS ──────────────────────────────────────────────────

global.Logger = {
  _logs: [],
  log: function(msg) { this._logs.push(msg); },
  getLogs: function() { return this._logs.join('\n'); },
  clear: function() { this._logs = []; }
};

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => null,
  getUi: () => ({
    alert: () => {},
    ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' },
    Button: { OK: 'OK', YES: 'YES', NO: 'NO', CLOSE: 'CLOSE' },
    createMenu: () => ({
      addItem: function() { return this; },
      addSeparator: function() { return this; },
      addToUi: function() {}
    })
  }),
  newDataValidation: () => ({
    requireValueInList: function() { return this; },
    build: function() { return {}; }
  }),
  BorderStyle: { SOLID: 'SOLID', DASHED: 'DASHED', DOTTED: 'DOTTED' }
};

global.PropertiesService = {
  getDocumentProperties: () => ({
    getProperty: () => null,
    setProperty: () => {}
  })
};

global.UrlFetchApp = {
  fetch: () => ({ getContentText: () => '{}' })
};

// ── 2. Chargement des fichiers .gs dans l'ordre ────────────────────────────
// GAS concatène tout dans un seul scope global — on fait pareil.

const SRC_DIR = path.join(__dirname, '..', 'src');
const GS_FILES = [
  '00_core_config.gs',
  '01_data_v1_1.gs',
  '10_engine.gs',
  '11_solver.gs'
  // 20/30/40/41/42 ignorés : dépendent de Spreadsheet réel
];

GS_FILES.forEach(function(file) {
  const filePath = path.join(SRC_DIR, file);
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    vm.runInThisContext(code, { filename: file });
  } catch (e) {
    console.warn(`⚠️  ${file}: ${e.message}`);
  }
});
