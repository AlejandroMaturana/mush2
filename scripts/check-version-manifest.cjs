#!/usr/bin/env node
// check-version-manifest.cjs — valida la consistencia de versiones (I078/INF-019):
//   version-manifest.json == package.json de cada componente == VERSION files == VERSION root.
// Usado en CI para evitar drift entre el manifest servido al frontend y las versiones reales.
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_DIRS = ['backend', 'frontend', 'firmware', 'docs'];
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'frontend', 'public', 'version-manifest.json');

function readJson(relativePath) {
  const full = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function readVersionFile(relativePath) {
  const full = path.join(PROJECT_ROOT, relativePath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8').trim();
}

function fail(message) {
  console.error(`[version-manifest] MISMATCH: ${message}`);
  process.exitCode = 1;
}

const rootPkg = readJson('package.json');
const manifest = readJson('frontend/public/version-manifest.json');

if (!rootPkg || !rootPkg.version) fail('package.json raíz no legible o sin versión');
if (!manifest) fail('frontend/public/version-manifest.json no legible');

const rootVersion = rootPkg ? rootPkg.version : '?';
const rootVERSION = readVersionFile('VERSION');

if (rootVersion !== rootVERSION) {
  fail(`root package.json (${rootVersion}) != VERSION (${rootVERSION})`);
}
if (manifest && manifest.system && manifest.system.version !== rootVersion) {
  fail(`manifest system.version (${manifest.system.version}) != root package.json (${rootVersion})`);
}

for (const dir of PACKAGE_DIRS) {
  const pkg = readJson(`${dir}/package.json`);
  const versionFile = readVersionFile(`${dir}/VERSION`);

  if (!pkg || !pkg.version) {
    fail(`${dir}/package.json no legible o sin versión`);
    continue;
  }

  if (versionFile !== null && versionFile !== pkg.version) {
    fail(`${dir}/package.json (${pkg.version}) != ${dir}/VERSION (${versionFile})`);
  }

  if (manifest && manifest.components && manifest.components[dir] !== undefined) {
    if (manifest.components[dir] !== pkg.version) {
      fail(`manifest.components.${dir} (${manifest.components[dir]}) != ${dir}/package.json (${pkg.version})`);
    }
  } else {
    fail(`manifest no incluye componente ${dir}`);
  }
}

if (process.exitCode) {
  console.error('[version-manifest] Versiones inconsistentes — regenera con `pnpm version-packages` o `pnpm aggregate`.');
  process.exit(1);
}

console.log(`[version-manifest] OK — root ${rootVersion}, manifest y VERSION files consistentes.`);
