#!/usr/bin/env node
// Post-build sanity checks. Fails the build if a critical file is missing or
// the service worker is not a syntactically valid ES module. Without this it
// is very easy to break MV3 by accidentally importing a non-worker-safe
// dependency into serviceWorker.ts.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const dist = resolve(root, 'dist');

const required = [
  'manifest.json',
  'src/background/serviceWorker.js',
  'index.html',
  'src/popup/popup.html',
  'src/options/options.html',
  'src/offscreen/offscreen.html',
  'public/audio/pcm-tap.worklet.js',
  'public/icons/icon-128.png',
];

const errors = [];

for (const rel of required) {
  const path = resolve(dist, rel);
  if (!existsSync(path)) errors.push(`missing required output: ${rel}`);
}

// Parse the manifest to ensure JSON validity and side-panel + background paths.
try {
  const manifestPath = resolve(dist, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.manifest_version !== 3) errors.push('manifest_version is not 3');
  if (manifest.background?.service_worker !== 'src/background/serviceWorker.js') {
    errors.push(
      `manifest background.service_worker is ${manifest.background?.service_worker}, expected src/background/serviceWorker.js`,
    );
  }
  if (manifest.side_panel?.default_path !== 'index.html') {
    errors.push('manifest side_panel.default_path is not index.html');
  }
} catch (err) {
  errors.push(`manifest.json is not valid JSON: ${err instanceof Error ? err.message : err}`);
}

// Parse the service worker to ensure it is a syntactically valid ES module.
// Catches the classic MV3 failure where an accidental CommonJS-only dependency
// produces a worker file that Chrome refuses to register with code 15.
try {
  const swPath = resolve(dist, 'src/background/serviceWorker.js');
  const source = readFileSync(swPath, 'utf8');
  parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
} catch (err) {
  errors.push(`service worker is not a valid ES module: ${err instanceof Error ? err.message : err}`);
}

if (errors.length) {
  console.error('Build verification failed:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

console.log('Build verification passed.');
