[CmdletBinding()]
param(
    [string]$NodePath,
    [string]$Registry,
    [switch]$BuildOnly,
    [switch]$SkipDependencies,
    [ValidateRange(15, 600)]
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\scripts\install-functions.ps1"
try {
    $result = Invoke-PocketInstall -SourcePath $PSScriptRoot -NodePath $NodePath -Registry $Registry -BuildOnly:$BuildOnly -SkipDependencies:$SkipDependencies -TimeoutSeconds $TimeoutSeconds
    $result | ConvertTo-Json -Depth 3
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    [pscustomobject]@{ status = 'failed'; error = $_.Exception.Message } | ConvertTo-Json -Depth 3
    exit 1
}
