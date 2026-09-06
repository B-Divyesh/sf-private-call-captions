$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-private-call-captions'
$base = if ($env:PCC_RELEASE_BASE) { $env:PCC_RELEASE_BASE } else { "https://github.com/$repo/releases/latest/download" }
$manifest = Invoke-RestMethod "$base/latest.json"
$url = $manifest.platforms.windows.url
if (-not $url) { throw 'No Windows installer is published yet.' }
$name = Split-Path $url -Leaf
if ($env:PCC_ASSET_BASE) { $url = "$($env:PCC_ASSET_BASE)/$name" }
$dir = Join-Path $env:TEMP ('private-call-captions-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
$path = Join-Path $dir $name
Invoke-WebRequest $url -OutFile $path
$sums = (Invoke-WebRequest "$base/SHA256SUMS").Content
$expected = (($sums -split "`n") | Where-Object { $_ -match ([regex]::Escape($name) + '$') }).Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)[0]
$actual = (Get-FileHash $path -Algorithm SHA256).Hash.ToLower()
if ($expected.ToLower() -ne $actual) { throw 'SHA256 verification failed; installer was not opened.' }
Write-Host "Verified $name. The installer is unsigned; review the Windows warning before continuing."
if ($env:PCC_INSTALLER_NO_OPEN -ne '1') { Start-Process $path }
