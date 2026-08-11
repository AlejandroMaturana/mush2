@echo off
echo === Release mush2 v1.8.13 ===
echo.
git add VERSION package.json CHANGELOG.md
git add scripts/release.bat simulator/package.json
git add frontend/VERSION frontend/package.json frontend/public/version-manifest.json
git add backend/VERSION backend/package.json
git add firmware/VERSION firmware/package.json firmware/platformio.ini
git add docs/VERSION docs/package.json
echo.