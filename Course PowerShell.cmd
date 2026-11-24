@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -NoExit -ExecutionPolicy Bypass -File "%~dp0Course-Environment.ps1"

