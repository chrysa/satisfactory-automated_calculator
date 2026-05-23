#!/usr/bin/env node
/* ============================================================
 * scripts/sat-calc.js — SAT command-line interface
 *
 * Usage:
 *   node scripts/sat-calc.js <command> [args...]
 *
 * Commands:
 *   bottlenecks <save.sav>   Detect and rank production bottlenecks
 *
 * npm shortcut:
 *   npm run sat-calc -- bottlenecks path/to/save.sav
 * ============================================================ */

'use strict';

const [, , cmd, ...rest] = process.argv;

const COMMANDS = {
  bottlenecks: () => require('./bottleneck-analyzer').run(rest)
};

if (!cmd || !COMMANDS[cmd]) {
  const available = Object.keys(COMMANDS).join(', ');
  console.error(`Usage: sat-calc <command> [args...]`);
  console.error(`Available commands: ${available}`);
  process.exit(1);
}

COMMANDS[cmd]();
