@echo off
setlocal
node "%~dp0..\node_modules\playwright\cli.js" test -c "%~dp0..\playwright.hero.config.mjs" %*
set TEST_EXIT_CODE=%ERRORLEVEL%
node "%~dp0format-hero-e2e-report.mjs"
node "%~dp0sync-hero-e2e-report.mjs"
exit /b %TEST_EXIT_CODE%
