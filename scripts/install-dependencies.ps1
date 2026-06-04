param(
  [string]$NodeVersion = "22.16.0"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Tools = Join-Path $Root ".tools"
$ZipPath = Join-Path $Tools "node-v$NodeVersion-win-x64.zip"
$NodeDir = Join-Path $Tools "node"
$NodeExtracted = Join-Path $Tools "node-v$NodeVersion-win-x64"
$Url = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"

New-Item -ItemType Directory -Force -Path $Tools | Out-Null

if (-not (Test-Path (Join-Path $NodeDir "npm.cmd"))) {
  if (-not (Test-Path $ZipPath)) {
    Write-Host "Downloading Node.js $NodeVersion..."
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath
  }

  if (Test-Path $NodeExtracted) {
    Remove-Item -Recurse -Force $NodeExtracted
  }

  Write-Host "Extracting Node.js..."
  Expand-Archive -Path $ZipPath -DestinationPath $Tools -Force

  if (Test-Path $NodeDir) {
    Remove-Item -Recurse -Force $NodeDir
  }
  Move-Item -Path $NodeExtracted -Destination $NodeDir
}

$env:Path = "$NodeDir;$env:Path"
Write-Host "Using Node:"
& (Join-Path $NodeDir "node.exe") -v
Write-Host "Using npm:"
& (Join-Path $NodeDir "npm.cmd") -v

Write-Host "Installing project dependencies..."
Push-Location $Root
try {
  & (Join-Path $NodeDir "npm.cmd") install
  & (Join-Path $NodeDir "npm.cmd") run typecheck
}
finally {
  Pop-Location
}

Write-Host "Done. Start the app with:"
Write-Host ".tools\node\npm.cmd run dev"
