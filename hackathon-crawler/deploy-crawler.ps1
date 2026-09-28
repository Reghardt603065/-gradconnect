$ErrorActionPreference = "Stop"

$CrawlerDirectory = $PSScriptRoot
$DeployExe = Join-Path $CrawlerDirectory ".venv\Scripts\scrapyd-deploy.exe"

if (-not (Test-Path $DeployExe)) {
    throw "scrapyd-deploy is not installed in .venv. Run: pip install -r requirements.txt"
}

Set-Location $CrawlerDirectory
& $DeployExe
