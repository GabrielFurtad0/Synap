Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       SYNAP - Neural Task Engine (Smart Task Manager)  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Yellow
Write-Host "Porta configurada com fallback automatico (8080 -> 8081 -> 8082...)" -ForegroundColor Gray
Write-Host ""

Set-Location (Join-Path $PSScriptRoot "..")
npm run dev
