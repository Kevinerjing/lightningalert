$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configPath = Join-Path $repoRoot "studypilot\wrangler.toml"
$schemaPath = Join-Path $repoRoot "studypilot\d1\migrations\0001_initial_schema.sql"
$seedPath = Join-Path $repoRoot "studypilot\d1\migrations\0002_seed_subjects.sql"
$importPath = Join-Path $repoRoot "studypilot\d1\generated\import-current-data.sql"

Write-Host "Exporting current StudyPilot JSON into SQL..."
Push-Location $repoRoot
try {
  npm.cmd run studypilot:d1:export

  Write-Host "Applying D1 schema locally..."
  npx.cmd wrangler d1 execute studypilot --local --file $schemaPath --config $configPath

  Write-Host "Seeding base subjects locally..."
  npx.cmd wrangler d1 execute studypilot --local --file $seedPath --config $configPath

  Write-Host "Importing current StudyPilot data locally..."
  npx.cmd wrangler d1 execute studypilot --local --file $importPath --config $configPath
}
finally {
  Pop-Location
}

Write-Host "Local StudyPilot D1 initialization completed."
