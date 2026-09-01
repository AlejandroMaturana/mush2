#!/usr/bin/env node
// generate-version-manifest.cjs — generates version-manifest.json from package.json files
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'frontend', 'public', 'version-manifest.json');
const PACKAGE_DIRS = ['backend', 'frontend', 'firmware', 'docs'];

function readJson(relativePath) {
  const full = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

const rootPkg = readJson('package.json');
const rootVersion = rootPkg ? rootPkg.version : '0.0.0';

const components = {};
for (const dir of PACKAGE_DIRS) {
  const pkg = readJson(`${dir}/package.json`);
  components[dir] = pkg ? pkg.version : '0.0.0';
}

const manifest = {
  system: { name: 'mush2', version: rootVersion },
  components,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[generate-version-manifest] OK — v${rootVersion}`);
