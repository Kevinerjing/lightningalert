$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

python ".\scripts\analyze_uploads.py"
