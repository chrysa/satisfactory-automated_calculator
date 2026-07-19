#!/usr/bin/env node
// Syntax guard for the Google Apps Script sources. `.gs` files are JavaScript
// but tooling skips them (pre-commit excludes `\.gs$`, and this script — wired as
// `npm run lint:syntax` — did not exist, so a real syntax error in src/30_recalc.gs
// shipped unnoticed). We compile each file with the V8 parser via `vm.Script`,
// which validates syntax without executing (GAS globals are never referenced).
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOTS = ["src", "templates"];
const repoRoot = path.resolve(__dirname, "..");

function gsFiles(dir) {
  const abs = path.join(repoRoot, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((name) => name.endsWith(".gs"))
    .map((name) => path.join(dir, name))
    .sort();
}

const files = ROOTS.flatMap(gsFiles);
if (files.length === 0) {
  console.error("check-syntax: no .gs files found under " + ROOTS.join(", "));
  process.exit(1);
}

let failed = 0;
for (const rel of files) {
  const source = fs.readFileSync(path.join(repoRoot, rel), "utf8");
  try {
    new vm.Script(source, { filename: rel });
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${rel}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\ncheck-syntax: ${failed} file(s) failed to parse.`);
  process.exit(1);
}
console.log(`check-syntax: ${files.length} .gs file(s) parsed cleanly.`);
