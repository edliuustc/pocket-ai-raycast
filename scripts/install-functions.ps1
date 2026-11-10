function Test-PocketNodeVersion {
    param([string]$Version)
    if ($Version -notmatch '^v?(\d+)\.(\d+)\.(\d+)$') { return $false }
    return ([version]"$($Matches[1]).$($Matches[2]).$($Matches[3])") -ge [version]'22.22.2'
}

function Resolve-PocketNode {
    param([string]$NodePath)
    $candidates = @()
    if ($NodePath) {
        $candidates = @($NodePath)
    } else {
        $command = Get-Command node.exe -ErrorAction SilentlyContinue
        if ($command) { $candidates += $command.Source }
        $tools = Join-Path $env:LOCALAPPDATA 'raycast-mae-tools'
        if (Test-Path -LiteralPath $tools) {
            $candidates += @(Get-ChildItem -LiteralPath $tools -Directory |
                Where-Object { $_.Name -like 'node-v*-win-*' } |
                Sort-Object Name -Descending |
                ForEach-Object { Join-Path $_.FullName 'node.exe' })
        }
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $version = & $candidate --version
            if ($LASTEXITCODE -eq 0 -and (Test-PocketNodeVersion $version)) {
                return (Resolve-Path -LiteralPath $candidate).Path
            }
        }
    }
    throw 'Install stable Node.js 22.22.2 or newer with npm, then open a new PowerShell window. Alternatively pass -NodePath with the full path to node.exe.'
}

function Get-PocketFileHash {
    param([string]$Path)
    $stream = [IO.File]::OpenRead($Path)
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
        $stream.Dispose()
    }
}

function Get-PocketDependencyHash {
    param([string]$SourcePath)
    $manifest = Get-PocketFileHash (Join-Path $SourcePath 'package.json')
    $lock = Get-PocketFileHash (Join-Path $SourcePath 'package-lock.json')
    return "$manifest`:$lock"
}

function Assert-PocketBuild {
    param([string]$BuildPath, $Manifest)
    $installedManifest = Join-Path $BuildPath 'package.json'
    if (-not (Test-Path -LiteralPath $installedManifest)) { throw "Missing built manifest: $installedManifest" }
    $installed = Get-Content -LiteralPath $installedManifest -Raw | ConvertFrom-Json
    if ($installed.name -ne $Manifest.name -or $installed.version -ne $Manifest.version) {
        throw 'The built manifest does not match this source release.'
    }
    foreach ($command in $Manifest.commands) {
        $file = Join-Path $BuildPath ($command.name + '.js')
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing built command: $($command.name)" }
    }
    $icon = Join-Path (Join-Path $BuildPath 'assets') $Manifest.icon
    if (-not (Test-Path -LiteralPath $icon -PathType Leaf)) { throw 'The built extension icon is missing.' }
}

function Assert-PocketInactiveDeveloper {
    param([string]$PidFile)
    if (-not (Test-Path -LiteralPath $PidFile)) { return }
    $recorded = 0
    if (-not [int]::TryParse((Get-Content -LiteralPath $PidFile -Raw).Trim(), [ref]$recorded) -or $recorded -le 0) {
        throw "Unrecognized developer PID file: $PidFile. Inspect it before retrying."
    }
    if (Get-Process -Id $recorded -ErrorAction SilentlyContinue) {
        throw "A developer PID file points to a running process ($recorded). Close your Pocket AI developer session before installing. The installer will not terminate that process."
    }
    Remove-Item -LiteralPath $PidFile
}

function Stop-PocketDeveloper {
    param($Process, [string]$PidFile, [string]$SourcePath)
    if (-not $Process) { return }
    $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId = $($Process.Id)" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -eq 'esbuild.exe' -and $_.ExecutablePath -and $_.ExecutablePath.StartsWith((Join-Path $SourcePath 'node_modules'), [StringComparison]::OrdinalIgnoreCase) })
    if (-not $Process.HasExited) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        $null = $Process.WaitForExit(5000)
    }
    foreach ($child in $children) {
        $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($child.ProcessId)" -ErrorAction SilentlyContinue
        if ($current -and $current.CreationDate -eq $child.CreationDate -and $current.ExecutablePath -eq $child.ExecutablePath) {
            Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
        }
    }
    if (Test-Path -LiteralPath $PidFile) {
        if ((Get-Content -LiteralPath $PidFile -Raw).Trim() -eq [string]$Process.Id) {
            Remove-Item -LiteralPath $PidFile
        }
    }
}

function Invoke-PocketInstall {
    param(
        [string]$SourcePath,
        [string]$NodePath,
        [string]$Registry,
        [switch]$BuildOnly,
        [switch]$SkipDependencies,
        [int]$TimeoutSeconds = 120
    )
    if ($env:OS -ne 'Windows_NT') { throw 'This installer supports Windows only.' }
    $manifest = Get-Content -LiteralPath (Join-Path $SourcePath 'package.json') -Raw | ConvertFrom-Json
    if ($manifest.name -ne 'mae-ai') { throw 'This folder is not a Pocket AI source distribution.' }
    if ($Registry) {
        $uri = $null
        if (-not [uri]::TryCreate($Registry, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne 'https' -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
            throw 'Registry must be a plain HTTPS npm registry URL without embedded credentials or query parameters.'
        }
    }
    $node = Resolve-PocketNode $NodePath
    $npm = Join-Path (Split-Path $node) 'npm.cmd'
    if (-not (Test-Path -LiteralPath $npm)) { throw 'npm.cmd is missing next to node.exe. Install Node.js with npm included.' }
    $installedPath = Join-Path $env:USERPROFILE ".config\raycast\extensions\$($manifest.name)"
    $pidFile = Join-Path $installedPath 'cli.pid'
    if (-not $BuildOnly) {
        $raycast = @(Get-AppxPackage -Name Raycast.Raycast -ErrorAction SilentlyContinue)
        if (-not $raycast.Count) { throw 'Install Raycast for Windows, open it, and sign in before running this installer.' }
        $session = (Get-Process -Id $PID).SessionId
        $running = @(Get-Process -Name Raycast -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session })
        if (-not $running.Count) { throw 'Open Raycast and sign in, then run this installer again.' }
        Assert-PocketInactiveDeveloper $pidFile
    }
    $state = Join-Path $SourcePath '.pocket-ai-install'
    $null = New-Item -ItemType Directory -Path $state -Force
    $hashFile = Join-Path $state 'dependencies.sha256'
    $hash = Get-PocketDependencyHash $SourcePath
    $ready = (Test-Path -LiteralPath (Join-Path $SourcePath 'node_modules\@raycast\api\bin\run.js')) -and
        (Test-Path -LiteralPath $hashFile) -and
        ((Get-Content -LiteralPath $hashFile -Raw).Trim() -eq $hash)
    $previousPath = $env:PATH
    $developer = $null
    Push-Location $SourcePath
    try {
        $env:PATH = "$(Split-Path $node);$previousPath"
        if (-not $SkipDependencies -and -not $ready) {
            Write-Host 'Installing dependencies from the lockfile...'
            $arguments = @('ci', '--no-audit', '--no-fund')
            if ($Registry) { $arguments += "--registry=$Registry" }
            & $npm @arguments | Out-Host
            if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check the registry/network settings above; do not disable TLS verification.' }
            [IO.File]::WriteAllText($hashFile, $hash)
        }
        $cli = Join-Path $SourcePath 'node_modules\@raycast\api\bin\run.js'
        if (-not (Test-Path -LiteralPath $cli)) { throw 'Dependencies are missing. Run again without -SkipDependencies.' }
        if ($BuildOnly) {
            $output = Join-Path $state 'build'
            & $node $cli build -e dist -o $output | Out-Host
            if ($LASTEXITCODE -ne 0) { throw 'The production build failed.' }
            Assert-PocketBuild $output $manifest
            return [pscustomobject]@{ status = 'built'; version = $manifest.version; buildPath = $output; imported = $false }
        }
        $logId = [guid]::NewGuid().ToString('N')
        $stdout = Join-Path $state "$logId.stdout.log"
        $stderr = Join-Path $state "$logId.stderr.log"
        Write-Host 'Building and requesting Raycast source import...'
        $developer = Start-Process -FilePath $node -ArgumentList @("`"$cli`"", 'develop', '--non-interactive') -WorkingDirectory $SourcePath -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
        $compiled = $false
        while ([DateTime]::UtcNow -lt $deadline) {
            if ($developer.HasExited) {
                $details = (Get-Content -LiteralPath $stdout, $stderr -ErrorAction SilentlyContinue) -join "`n"
                throw "The development import process exited before installation completed.`n$details"
            }
            if ((Test-Path -LiteralPath $stdout) -and ((Get-Content -LiteralPath $stdout -Raw) -match 'built extension successfully')) {
                $compiled = $true
                break
            }
            Start-Sleep -Milliseconds 250
        }
        if (-not $compiled) { throw "Timed out after $TimeoutSeconds seconds waiting for the import build. See $stdout and $stderr." }
        Start-Sleep -Seconds 3
        Stop-PocketDeveloper $developer $pidFile $SourcePath
        $developer = $null
        Write-Host 'Writing the persistent production build...'
        & $node $cli build -e dist | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'The final production build failed.' }
        Assert-PocketBuild $installedPath $manifest
        return [pscustomobject]@{
            status = 'installed'
            version = $manifest.version
            installedPath = $installedPath
            commands = $manifest.commands.Count
            watcherRunning = $false
            uiVerification = 'required'
            nextStep = 'Open Pocket AI Settings in Raycast, configure AI Provider, choose a model, and send a test question.'
        }
    } finally {
        Stop-PocketDeveloper $developer $pidFile $SourcePath
        $env:PATH = $previousPath
        Pop-Location
    }
}
