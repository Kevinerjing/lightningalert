$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot
node ".\scripts\refresh_classroom_session.mjs"
