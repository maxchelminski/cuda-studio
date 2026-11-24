@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& .\Course-Environment.ps1 -RuntimeOnly; if (-not $?) { exit 1 }; python -B labs\nightshift\nightshift.py; exit $LASTEXITCODE"
if errorlevel 1 pause
