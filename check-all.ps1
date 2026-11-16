$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Run-Step {
    param(
        [string]$Title,
        [string]$WorkDir,
        [scriptblock]$Command
    )
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
    Push-Location (Join-Path $PSScriptRoot $WorkDir)
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FAIL] $Title (Exit code: $LASTEXITCODE)" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } finally {
        Pop-Location
    }
    Write-Host "[PASS] $Title" -ForegroundColor Green
}

# 1. Backend (apps/api)
Run-Step "1/6 [API] Prisma Generate"      "apps/api" { npx prisma generate }
Run-Step "2/6 [API] Build NestJS"         "apps/api" { npm run build }
Run-Step "3/6 [API] Unit Tests"           "apps/api" { npm test }
Run-Step "4/6 [API] Integration/E2E Test" "apps/api" { npm run test:e2e }

# 2. Frontend (apps/web)
Run-Step "5/6 [WEB] ESLint"               "apps/web" { npm run lint }
Run-Step "6/6 [WEB] Build Next.js"        "apps/web" { npm run build }

Write-Host "`nTAT CA KIEM TRA BACKEND & FRONTEND DEU PASS!" -ForegroundColor Green