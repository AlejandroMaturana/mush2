@echo off
echo === Release mush2 v1.8.2 ===
echo.
git add VERSION package.json CHANGELOG.md
git add scripts/release.bat simulator/package.json
git add frontend/VERSION frontend/package.json frontend/public/version-manifest.json
git add backend/VERSION backend/package.json
git add firmware/VERSION firmware/package.json firmware/platformio.ini
git add docs/VERSION docs/package.json
echo.
git commit -m "chore(release): mush2 v1.8.2" -m "
- frontend → v1.15.1
- backend → v1.5.1
- firmware → v0.23.0
- docs → v0.2.1"
echo.
echo === Release mush2 v1.8.2 complete ===
