@echo off
setlocal
echo ========================================================
echo   Installing Netspeak Workstation Local Guard Auto-Start
echo ========================================================

set "SCRIPT_PATH=%~dp0workstation-local-guard.ps1"

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NetspeakWorkstationGuard" /t REG_SZ /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%SCRIPT_PATH%\"" /f

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Auto-start entry registered in Windows Startup.
    echo Guard will launch automatically in the background every time Windows logs in.
    echo Launching Guard background process now...
    start "" powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"
) else (
    echo.
    echo [ERROR] Failed to register auto-start entry.
)

pause
