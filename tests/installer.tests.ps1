$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\..\scripts\install-functions.ps1"
$checks = 0
function Assert-Installer([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:checks++
}
foreach ($version in @('v22.22.2', '22.23.4', 'v24.0.0', 'v26.0.0')) {
    Assert-Installer (Test-PocketNodeVersion $version) "Rejected supported version $version"
}
foreach ($version in @('v20.19.0', 'v22.22.1', 'v22.22.2-rc.1', 'unknown', '')) {
    Assert-Installer (-not (Test-PocketNodeVersion $version)) "Accepted unsupported version $version"
}
$temp = Join-Path ([IO.Path]::GetTempPath()) ('pocket-ai-installer-test-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $temp
try {
    $hashInput = Join-Path $temp 'hash-input.txt'
    [IO.File]::WriteAllText($hashInput, 'abc', [Text.Encoding]::ASCII)
    Assert-Installer ((Get-PocketFileHash $hashInput) -eq 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') 'File hashing must work without optional PowerShell modules.'
    $pidFile = Join-Path $temp 'cli.pid'
    [IO.File]::WriteAllText($pidFile, [string]$PID)
    $rejected = $false
    try { Assert-PocketInactiveDeveloper $pidFile } catch { $rejected = $true }
    Assert-Installer $rejected 'An active developer PID must block installation.'
    Assert-Installer (Test-Path -LiteralPath $pidFile) 'An active developer PID file must not be deleted.'
    [IO.File]::WriteAllText($pidFile, 'not-a-pid')
    $rejected = $false
    try { Assert-PocketInactiveDeveloper $pidFile } catch { $rejected = $true }
    Assert-Installer $rejected 'Malformed PID files must not be used to terminate a process.'
    $build = Join-Path $temp 'build'
    $null = New-Item -ItemType Directory -Path (Join-Path $build 'assets')
    $manifest = [pscustomobject]@{ name = 'mae-ai'; version = '1.0.0'; icon = 'icon.png'; commands = @([pscustomobject]@{ name = 'ask-ai' }) }
    [IO.File]::WriteAllText((Join-Path $build 'package.json'), ($manifest | ConvertTo-Json -Depth 3))
    [IO.File]::WriteAllText((Join-Path $build 'assets\icon.png'), 'test')
    $rejected = $false
    try { Assert-PocketBuild $build $manifest } catch { $rejected = $true }
    Assert-Installer $rejected 'An incomplete build must not be reported as installed.'
    [IO.File]::WriteAllText((Join-Path $build 'ask-ai.js'), 'test')
    Assert-PocketBuild $build $manifest
    Assert-Installer $true 'A complete build must pass verification.'
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force
}
Write-Output "Installer checks passed: $checks"
