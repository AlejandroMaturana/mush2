#!/usr/bin/env node
// release.js — paso "publish" del changesets/action (release train D11, I062/I082).
// Se ejecuta tras mergear la PR "Release: version packages" a main:
//   - crea el tag anotado vX.Y.Z (versión root de package.json),
//   - lo publica en origin,
//   - crea la GitHub Release (si gh y token están disponibles).
const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const pkg = require(path.join(PROJECT_ROOT, 'package.json'));
const version = pkg.version;
const tag = `v${version}`;

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'inherit' });
}

run(`git tag -a ${tag} -m "mush2 ${version}"`);
run(`git push origin ${tag}`);

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (token) {
  try {
    run(`gh release create ${tag} --generate-notes --verify-tag`);
  } catch (e) {
    console.warn(`[release] No se pudo crear la GitHub Release: ${e.message}`);
  }
}

console.log(`[release] ${tag} creado y publicado.`);
