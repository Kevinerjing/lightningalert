$projectRoot = Split-Path -Parent $PSScriptRoot
$taskName = "StudyPilot Upload Analysis"
$scriptPath = Join-Path $projectRoot "scripts\run-upload-analysis.ps1"
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Recreate the task with schtasks so hourly repetition works consistently on Windows.
schtasks /Delete /TN $taskName /F | Out-Null 2>$null
schtasks /Create `
  /TN $taskName `
  /SC MINUTE `
  /MO 60 `
  /TR $taskCommand `
  /F | Out-Null

Write-Output "Registered scheduled task: $taskName"
