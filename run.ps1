param(
    [ValidateSet('Validate', 'Build', 'Develop', 'Bundle')]
    [string]$Action = 'Validate'
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\scripts\install-functions.ps1"
$runtime = Split-Path (Resolve-PocketNode)
$previousPath = $env:PATH
Push-Location $PSScriptRoot
try {
    $env:PATH = "$runtime;$env:PATH"
    $npm = Join-Path $runtime 'npm.cmd'
    if (-not (Test-Path 'node_modules\@raycast\api')) {
        throw 'Dependencies are missing. Add the user-local Node runtime to PATH, then run npm ci.'
    }
    $scripts = switch ($Action) {
        'Validate' { @('typecheck', 'lint', 'format:check', 'test', 'test:installer', 'build') }
        'Build' { @('build') }
        'Develop' { @('dev') }
        'Bundle' { @('build') }
    }
    foreach ($script in $scripts) {
        & $npm run $script
        if ($LASTEXITCODE -ne 0) { throw "$script failed with exit code $LASTEXITCODE." }
    }
    if ($Action -eq 'Bundle') {
        & (Join-Path $runtime 'npx.cmd') ray bundle --output pocket-ai.rayext
        if ($LASTEXITCODE -ne 0) { throw "Bundle failed with exit code $LASTEXITCODE." }
    }
} finally {
    $env:PATH = $previousPath
    Pop-Location
}
