@echo off
rem Double-click to run build-userscript.ps1 (bumps version, regenerates eclass-auto.user.js)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-userscript.ps1"
echo.
pause
