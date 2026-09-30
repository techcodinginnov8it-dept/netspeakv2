@echo off
setlocal
echo ========================================================
echo   Uninstalling Netspeak Workstation Local Guard Auto-Start
echo ========================================================

echo Removing auto-start entry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NetspeakWorkstationGuard" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoClose" /f 2>nul

echo Terminating running guard processes...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*workstation-local-guard*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" 2>nul

echo [SUCCESS] Netspeak Guard task removed and shutdown restriction reset.
pause
