$ErrorActionPreference = 'Stop'
$repo = 'B-Divyesh/sf-private-call-captions'
$base = if ($env:PCC_RELEASE_BASE) { $env:PCC_RELEASE_BASE } else { "https://github.com/$repo/releases/latest/download" }
$manifest = Invoke-RestMethod "$base/latest.json"
$url = $manifest.platforms.windows.url
if (-not $url) { throw 'No Windows installer is published yet.' }
$name = $manifest.platforms.windows.file
if (-not $name) { $name = [System.Uri]::UnescapeDataString(([System.Uri]$url).Segments[-1]) }
if ($env:PCC_ASSET_BASE) { $url = "$($env:PCC_ASSET_BASE)/$name" }
$dir = Join-Path $env:TEMP ('private-call-captions-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $dir | Out-Null
$path = Join-Path $dir $name
Invoke-WebRequest $url -OutFile $path
$sumsPath = Join-Path $dir 'SHA256SUMS'
Invoke-WebRequest "$base/SHA256SUMS" -OutFile $sumsPath
$sumLine = Get-Content -LiteralPath $sumsPath | Where-Object { $_ -match ('  ' + [regex]::Escape($name) + '$') } | Select-Object -First 1
if (-not $sumLine) { throw "No checksum was published for $name." }
$expected = ($sumLine -split '\s+')[0]
$actual = (Get-FileHash $path -Algorithm SHA256).Hash.ToLower()
if ($expected.ToLower() -ne $actual) { throw 'SHA256 verification failed; installer was not opened.' }
Write-Host "Verified $name. The installer is unsigned; review the Windows warning before continuing."
if ($env:PCC_INSTALLER_NO_OPEN -ne '1') { Start-Process $path }
