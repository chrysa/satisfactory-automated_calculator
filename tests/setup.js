// Jest setup file — imports GAS mock globals so tests can reference
// SpreadsheetApp, Session, Logger, etc. without a live GAS environment.
require('gas-mock-globals');

'use strict';

// Expose SAT namespace globally so GAS modules can attach to it
global.SAT = global.SAT || {};
