#!/usr/bin/env node
import fs from 'node:fs';

function fail(msg) {
  console.error(`tylo-lens: ${msg}`);
  process.exit(1);
}

const file = process.argv[2];
if (!file) fail('Usage: validate-trace <trace.json>');

let raw = '';
try {
  raw = fs.readFileSync(file, 'utf8');
} catch {
  fail(`Cannot read file: ${file}`);
}

let trace;
try {
  trace = JSON.parse(raw);
} catch {
  fail('Invalid JSON');
}

if (!trace?.traceId) fail('Missing traceId');
if (!trace?.app?.name) fail('Missing app.name');
if (!Array.isArray(trace?.spans)) fail('Missing spans[]');

console.log('OK');

