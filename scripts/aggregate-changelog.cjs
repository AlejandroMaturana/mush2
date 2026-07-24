const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ROOT_CHANGELOG = path.join(PROJECT_ROOT, 'CHANGELOG.md');
const PACKAGE_DIRS = ['backend', 'frontend', 'firmware', 'docs'];

const LABELS = {
  'firmware': 'Firmware (ESP32-S3)',
  'mush2-backend': 'Backend',
  '@mush2/docs': 'Docs',
  'mush2-frontend': 'Frontend',
};

function getPkgVersion(dir) {
  try {
    const pkgDir = path.join(PROJECT_ROOT, dir);
    return JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version;
  } catch { return '?'; }
}

function collectVersions() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const components = {};
  for (const dir of PACKAGE_DIRS) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, dir, 'package.json'), 'utf8'));
      components[dir] = { name: pkg.name, version: pkg.version };
    } catch {
      components[dir] = { name: dir, version: '?' };
    }
  }
  return {
    system: { name: rootPkg.name, version: rootPkg.version },
    components,
  };
}

function readRootChangelog() {
  try { return fs.readFileSync(ROOT_CHANGELOG, 'utf8') || ''; } catch { return ''; }
}

function writeRootChangelog(content) {
  fs.writeFileSync(ROOT_CHANGELOG, content, 'utf8');
}

function findPackageDir(name) {
  for (const dir of PACKAGE_DIRS) {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, dir, 'package.json'), 'utf8'));
      if (p.name === name) return dir;
    } catch {}
  }
  return null;
}

function extractLatestEntry(changelogPath) {
  try {
    const content = fs.readFileSync(changelogPath, 'utf8');
    const lines = content.split('\n');
    let start = -1;
    let end = lines.length;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        if (start === -1) {
          start = i;
        } else {
          end = i;
          break;
        }
      }
    }

    if (start === -1) return null;

    // Extract version from the ## header
    const headerLine = lines[start];
    const versionMatch = headerLine.match(/##\s*([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : '?';

    return { version, content: lines.slice(start + 1, end).join('\n').trim() };
  } catch { return null; }
}

function syncVersionFile(dir, version) {
  const versionPath = path.join(PROJECT_ROOT, dir, 'VERSION');
  fs.writeFileSync(versionPath, version + '\n', 'utf8');
  console.log(`  ${dir}/VERSION → ${version}`);
}

function syncPlatformIO(version) {
  const pioPath = path.join(PROJECT_ROOT, 'firmware', 'platformio.ini');
  try {
    let content = fs.readFileSync(pioPath, 'utf8');
    const regex = /-DFIRMWARE_VERSION=.*/g;
    const replacement = `-DFIRMWARE_VERSION="\\"${version}\\""`;
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      fs.writeFileSync(pioPath, content, 'utf8');
      console.log(`  firmware/platformio.ini FIRMWARE_VERSION → ${version}`);
    }
  } catch (e) {
    console.warn(`  [WARN] No se pudo sincronizar platformio.ini: ${e.message}`);
  }
}

function generateVersionManifest(versions) {
  const manifest = {
    system: versions.system,
    components: {},
  };
  for (const [dir, info] of Object.entries(versions.components)) {
    manifest.components[dir] = info.version;
  }
  const json = JSON.stringify(manifest, null, 2) + '\n';
  const manifestPath = path.join(PROJECT_ROOT, '.changeset', 'version-manifest.json');
  fs.writeFileSync(manifestPath, json, 'utf8');
  console.log(`  .changeset/version-manifest.json → ${versions.system.version}`);
  const frontendCopy = path.join(PROJECT_ROOT, 'frontend', 'public', 'version-manifest.json');
  fs.writeFileSync(frontendCopy, json, 'utf8');
  console.log(`  frontend/public/version-manifest.json → copied`);
}

function generateReleaseScript(versions) {
  const sys = versions.system;
  const c = versions.components;
  const content = [
    '@echo off',
    `echo === Release ${sys.name} v${sys.version} ===`,
    'echo.',
    'git add VERSION package.json CHANGELOG.md .changeset/version-manifest.json',
    'git add frontend/VERSION frontend/package.json',
    'git add backend/VERSION backend/package.json',
    'git add firmware/VERSION firmware/package.json firmware/platformio.ini',
    'git add docs/VERSION docs/package.json',
    'echo.',
    `git commit -m "chore(release): ${sys.name} v${sys.version}" -m "`,
    `- frontend → v${c.frontend.version}`,
    `- backend → v${c.backend.version}`,
    `- firmware → v${c.firmware.version}`,
    `- docs → v${c.docs.version}"`,
    'echo.',
    `echo === Release ${sys.name} v${sys.version} complete ===`,
  ].join('\n');
  const batPath = path.join(PROJECT_ROOT, 'scripts', 'release.bat');
  fs.writeFileSync(batPath, content + '\n', 'utf8');
  console.log(`  scripts/release.bat → generated`);
}

function bumpRootPatch() {
  const rootPkgPath = path.join(PROJECT_ROOT, 'package.json');
  const rootVersionPath = path.join(PROJECT_ROOT, 'VERSION');
  try {
    const raw = fs.readFileSync(rootPkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const parts = pkg.version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    pkg.version = parts.join('.');
    fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    fs.writeFileSync(rootVersionPath, pkg.version + '\n', 'utf8');
    console.log(`Root OS version → ${pkg.version}`);
  } catch (e) {
    console.warn(`  [WARN] No se pudo bumpar versión root: ${e.message}`);
  }
}

function main() {
  const versions = collectVersions();

  // Find per-package CHANGELOG.md files
  const entries = [];

  for (const dir of PACKAGE_DIRS) {
    const changelogPath = path.join(PROJECT_ROOT, dir, 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) continue;

    const entry = extractLatestEntry(changelogPath);
    if (!entry) continue;

    const comp = versions.components[dir];
    const label = LABELS[comp.name] || comp.name;

    entries.push({ label, version: comp.version, content: entry.content });
  }

  // Sync VERSION files from package.json versions (even if no changelog was found)
  for (const dir of PACKAGE_DIRS) {
    const comp = versions.components[dir];
    if (!comp || comp.version === '?') continue;
    syncVersionFile(dir, comp.version);
    if (dir === 'firmware') {
      syncPlatformIO(comp.version);
    }
  }

  if (entries.length === 0) {
    console.log('No package changelogs found. Nothing to aggregate.');
    return;
  }

  // Bump root OS version (patch) for every sub-package change
  bumpRootPatch();
  versions.system.version = fs.readFileSync(path.join(PROJECT_ROOT, 'VERSION'), 'utf8').trim();

  // Generate version manifest and release script
  generateVersionManifest(versions);
  generateReleaseScript(versions);

  const now = new Date().toISOString().split('T')[0];
  const newSectionLines = [`## ${now}\n`];

  for (const { label, version, content } of entries) {
    newSectionLines.push(`### ${label} — v${version}\n`);
    // Strip sub-headings like "### Patch Changes", "### Minor Changes", etc.
    const cleaned = content
      .split('\n')
      .filter(l => !l.startsWith('### '))
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n');
    newSectionLines.push(cleaned);
    newSectionLines.push('');
  }

  const newSection = newSectionLines.join('\n');

  // Clean up per-package changelogs
  // We delete them BEFORE writing root to avoid partial state on crash
  for (const dir of PACKAGE_DIRS) {
    const p = path.join(PROJECT_ROOT, dir, 'CHANGELOG.md');
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Prepend to root CHANGELOG.md (after the title)
  const existing = readRootChangelog();
  const titleMatch = existing.match(/^# .+\n\n/);
  if (titleMatch) {
    const title = titleMatch[0];
    const rest = existing.slice(title.length);
    writeRootChangelog(title + newSection + '\n' + rest);
  } else {
    writeRootChangelog((existing ? existing + '\n' : '') + newSection + '\n');
  }

  console.log('Root CHANGELOG.md updated.');
}

main();

