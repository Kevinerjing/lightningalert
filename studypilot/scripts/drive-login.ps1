$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

node ".\scripts\refresh_drive_session.mjs"
