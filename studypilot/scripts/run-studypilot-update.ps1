$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Output "Running StudyPilot update..."
python ".\scripts\analyze_uploads.py"
node ".\scripts\sync_mistake_drafts.mjs"
node ".\scripts\fetch_classroom_updates.mjs"
node ".\scripts\sync_classroom_tasks.mjs"
Write-Output "StudyPilot update finished."
