$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = "StudyPilot Update"
$scriptPath = Join-Path $projectRoot "scripts\run-studypilot-update.ps1"
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

schtasks /Delete /TN $taskName /F | Out-Null 2>$null
schtasks /Create `
  /TN $taskName `
  /SC MINUTE `
  /MO 60 `
  /TR $taskCommand `
  /F | Out-Null

Write-Output "Registered scheduled task: $taskName"
