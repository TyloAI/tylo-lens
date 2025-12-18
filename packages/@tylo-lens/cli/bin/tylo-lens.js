#!/usr/bin/env node
import fs from 'node:fs';

function printHelp() {
  console.log(`tylo-lens (CLI)

Usage:
  tylo-lens validate <trace.json>

Commands:
  validate   Validate a LensTrace JSON payload
`);
}

function fail(msg, code = 1) {
  console.error(`tylo-lens: ${msg}`);
  process.exit(code);
}

function validateTrace(trace) {
  if (!trace || typeof trace !== 'object') return 'Trace must be an object';
  if (!trace.traceId || typeof trace.traceId !== 'string') return 'Missing traceId';
  if (!trace.app || typeof trace.app !== 'object') return 'Missing app';
  if (!trace.app.name || typeof trace.app.name !== 'string') return 'Missing app.name';
  if (!trace.startedAt || typeof trace.startedAt !== 'string') return 'Missing startedAt';
  if (!Array.isArray(trace.spans)) return 'Missing spans[]';

  for (const span of trace.spans) {
    if (!span.id || typeof span.id !== 'string') return 'Span missing id';
    if (!span.traceId || typeof span.traceId !== 'string') return 'Span missing traceId';
    if (!span.kind || typeof span.kind !== 'string') return 'Span missing kind';
    if (!span.name || typeof span.name !== 'string') return 'Span missing name';
    if (!span.startTime || typeof span.startTime !== 'string') return 'Span missing startTime';
  }

  return null;
}

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === '-h' || cmd === '--help') {
  printHelp();
  process.exit(0);
}

if (cmd !== 'validate') {
  printHelp();
  fail(`Unknown command "${cmd}"`);
}

const file = args[1];
if (!file) fail('Usage: tylo-lens validate <trace.json>');

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

const err = validateTrace(trace);
if (err) fail(err, 2);

console.log('OK');

