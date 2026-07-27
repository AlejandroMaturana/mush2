@echo off
echo === Release mush2 v1.7.22 ===
echo.
git add VERSION package.json CHANGELOG.md .changeset/version-manifest.json
git add frontend/VERSION frontend/package.json frontend/public/version-manifest.json
git add backend/VERSION backend/package.json
git add firmware/VERSION firmware/package.json firmware/platformio.ini
git add docs/VERSION docs/package.json scripts/release.bat


echo.
git commit -m "chore(release): mush2 v1.7.22" -m "
- frontend → v1.13.0
- backend → v1.3.0
- firmware → v0.22.0
- docs → v0.1.5"
echo.
echo === Release mush2 v1.7.22 complete ===
