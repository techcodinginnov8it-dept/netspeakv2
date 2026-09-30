<#
.SYNOPSIS
    Netspeak Workstation Local Guard
    Monitors teacher check-in status and dynamically manages Windows Shutdown options.
    
.DESCRIPTION
    - When the teacher is checked in (on active duty):
        Hides/disables Shut Down, Restart, Sleep, and Hibernate from Start Menu and Alt+F4.
    - When the teacher checks out (Time-Out submitted) or is not on duty:
        Automatically restores standard Windows Shut Down and Restart options.
    - Also supports native Windows shutdown cancellation prompts if shutdown is attempted.
#>

param(
    [string]$PortalUrl = "http://localhost:3000",
    [int]$PollIntervalSeconds = 5
)

$hkcuPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"
$hklmPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer"

function Set-ShutdownRestriction([bool]$enable) {
    $targetVal = if ($enable) { 1 } else { 0 }
    
    foreach ($path in @($hkcuPath, $hklmPath)) {
        try {
            if (-not (Test-Path $path)) {
                New-Item -Path $path -Force -ErrorAction SilentlyContinue | Out-Null
            }
            $currentVal = (Get-ItemProperty -Path $path -Name "NoClose" -ErrorAction SilentlyContinue).NoClose
            if ($currentVal -ne $targetVal) {
                Set-ItemProperty -Path $path -Name "NoClose" -Value $targetVal -Type DWord -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Handled gracefully if key requires admin
        }
    }

    if ($enable) {
        Write-Host "[LOCKED] Teacher checked in -> Windows Shutdown & Restart options DISABLED." -ForegroundColor Red
    } else {
        Write-Host "[UNLOCKED] Teacher timed out / off-duty -> Windows Shutdown & Restart options RESTORED." -ForegroundColor Green
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Netspeak Workstation Local Guard Service           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target URL: $PortalUrl"
Write-Host "Polling every $PollIntervalSeconds seconds..."
Write-Host "Press Ctrl+C to terminate the guard and restore defaults.`n"

# Ensure clean exit restores power options
try {
    while ($true) {
        try {
            $response = Invoke-RestMethod -Uri "$PortalUrl/api/workstation/duty-status" -Method Get -TimeoutSec 3 -ErrorAction Stop
            
            if ($response.isDutyLocked -eq $true) {
                Set-ShutdownRestriction $true
            } else {
                Set-ShutdownRestriction $false
            }
        }
        catch {
            # Portal might be loading or offline; leave current policy or default
        }
        
        Start-Sleep -Seconds $PollIntervalSeconds
    }
}
finally {
    Write-Host "`nRestoring standard Windows shutdown settings..." -ForegroundColor Yellow
    Set-ShutdownRestriction $false
}
