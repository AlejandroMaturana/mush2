@echo off
echo === Release mush2 v1.7.23 ===
echo.
git add VERSION package.json CHANGELOG.md .changeset/version-manifest.json scripts/release.bat
git add frontend/VERSION frontend/package.json
git add backend/VERSION backend/package.json
git add firmware/VERSION firmware/package.json firmware/platformio.ini
git add docs/VERSION docs/package.json 
echo.
git commit -m "chore(release): mush2 v1.7.23" -m "
- frontend → v1.13.0
- backend → v1.3.0
- firmware → v0.22.0
- docs → v0.1.6"
echo.
echo === Release mush2 v1.7.23 complete ===
