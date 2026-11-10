[CmdletBinding()]
param([string]$OutputDirectory)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
. "$PSScriptRoot\install-functions.ps1"
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $root 'dist' }
$names = @(
    'src', 'assets', 'tests', 'scripts', '.github',
    'package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.js',
    '.gitignore', '.gitattributes', '.prettierignore', 'install.ps1', 'run.ps1',
    'README.md', 'AGENTS.md', 'DESIGN.md', 'REMOTE-AGENTS.md', 'LICENSE', 'USAGE.txt', 'INSTALL-WINDOWS.txt'
)
$paths = @($names | ForEach-Object {
    $path = Join-Path $root $_
    if (-not (Test-Path -LiteralPath $path)) { throw "Required release file is missing: $_" }
    $path
})
$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$zip = Join-Path $OutputDirectory 'pocket-ai-windows-source.zip'
Compress-Archive -LiteralPath $paths -DestinationPath $zip -CompressionLevel Optimal -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
    $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($required in @('install.ps1', 'scripts/install-functions.ps1', 'README.md', 'AGENTS.md', 'DESIGN.md', 'REMOTE-AGENTS.md', 'LICENSE', 'src/components/tool-command.tsx', 'src/lib/agents/openclaw.ts', 'assets/pocket-ai-native.png')) {
        if ($required -notin $entries) { throw "The archive is incomplete: $required" }
    }
    if (@($entries | Where-Object { $_ -match '(^|/)(node_modules|\.git|\.pocket-ai-install|\.env)(/|$)|\.rayext$' }).Count) {
        throw 'The archive includes files that must not be distributed.'
    }
} finally {
    $archive.Dispose()
}
$hash = Get-PocketFileHash $zip
$checksums = Join-Path $OutputDirectory 'SHA256SUMS'
[IO.File]::WriteAllText($checksums, "$hash  pocket-ai-windows-source.zip`n", [Text.UTF8Encoding]::new($false))
Write-Output "Source package: $zip"
Write-Output "SHA256: $hash"
