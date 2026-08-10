@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  echo Install Node.js or add node.exe to PATH, then try again.
  pause
  exit /b 1
)

node "%~dp0serve-dist.cjs" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
