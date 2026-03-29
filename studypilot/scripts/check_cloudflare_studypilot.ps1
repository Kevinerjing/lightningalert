$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configPath = Join-Path $repoRoot "studypilot\wrangler.toml"
$baseUrl = "https://studypilot.kevin-apps.com"

function Invoke-JsonCheck {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Url
  )

  Write-Host ""
  Write-Host "== $Label =="
  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing
  $response.Content
}

function Invoke-D1Check {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  Write-Host ""
  Write-Host "== $Label =="
  npx.cmd wrangler d1 execute studypilot --remote --command $Sql --config $configPath
}

Push-Location $repoRoot
try {
  Invoke-JsonCheck -Label "Health" -Url "$baseUrl/api/studypilot-chat/health"
  Invoke-JsonCheck -Label "Dashboard" -Url "$baseUrl/api/studypilot-dashboard"
  Invoke-D1Check -Label "Remote science card count" -Sql "SELECT COUNT(*) AS count FROM subject_topic_cards WHERE subject_slug='science';"
  Invoke-D1Check -Label "Remote task count" -Sql "SELECT COUNT(*) AS count FROM study_tasks;"
  Invoke-D1Check -Label "Remote upload count" -Sql "SELECT COUNT(*) AS count FROM uploads;"
  Invoke-D1Check -Label "Latest remote science cards" -Sql "SELECT title FROM subject_topic_cards WHERE subject_slug='science' ORDER BY updated_at DESC, rowid DESC LIMIT 5;"
}
finally {
  Pop-Location
}
