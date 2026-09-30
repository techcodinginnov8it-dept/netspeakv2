@echo off
title Netspeak Workstation Local Guard

:: Check for administrative rights and elevate if needed
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges to manage system shutdown policies...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo        Netspeak Workstation Local Guard (Admin)
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0workstation-local-guard.ps1"
pause
