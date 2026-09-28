$ErrorActionPreference = "Stop"

$CrawlerDirectory = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $CrawlerDirectory
$EnvFile = Join-Path $ProjectRoot ".env"
$ScrapydExe = Join-Path $CrawlerDirectory ".venv\Scripts\scrapyd.exe"

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Could not find the GradConnect .env file at $Path"
    }

    foreach ($rawLine in Get-Content $Path) {
        $line = $rawLine.Trim()

        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }

        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")

        if ($name -and -not [Environment]::GetEnvironmentVariable($name, "Process")) {
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

Import-DotEnv $EnvFile

if (-not $env:GRADCONNECT_API_URL) {
    $env:GRADCONNECT_API_URL = "http://localhost:3000"
}

if (-not $env:HACKATHON_IMPORT_TOKEN) {
    throw "HACKATHON_IMPORT_TOKEN is missing from the GradConnect .env file."
}

if (-not (Test-Path $ScrapydExe)) {
    throw "Scrapyd is not installed in .venv. Run: pip install -r requirements.txt"
}

Write-Host "Starting Scrapyd with the GradConnect environment loaded."
Write-Host "GradConnect API: $env:GRADCONNECT_API_URL"
Write-Host "Scrapyd URL: http://localhost:6800"

Set-Location $CrawlerDirectory
& $ScrapydExe
