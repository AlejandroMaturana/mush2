@echo off
echo === Release mush2 v1.8.0 ===
echo.
git add VERSION package.json CHANGELOG.md scripts/release.bat
git add frontend/VERSION frontend/package.json
git add backend/VERSION backend/package.json
git add firmware/VERSION firmware/package.json firmware/platformio.ini
git add docs/VERSION docs/package.json 
echo.
git commit -m "chore(release): mush2 v1.8.0" -m "
- frontend → v1.14.0
- backend → v1.4.0
- firmware → v0.22.0
- docs → v0.2.0"
echo.
echo === Release mush2 v1.8.0 complete ===
