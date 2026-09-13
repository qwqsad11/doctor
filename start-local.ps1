$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runtime = Join-Path $root '.runtime'
$node = (Get-Command node.exe).Source
$pgCtl = Join-Path $runtime 'pgsql/bin/pg_ctl.exe'
$pgData = Join-Path $runtime 'pgdata'
& $pgCtl -D $pgData status *> $null
if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $pgData -l (Join-Path $runtime 'postgres.log') -o '-h localhost -p 5432' -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL failed to start.' }
}
foreach ($service in @(
    @{ Name = 'backend'; Port = 3001; Args = @('dist/main.js') },
    @{ Name = 'frontend'; Port = 3000; Args = @('node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '3000', '--strictPort') }
)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $service.Port -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host ($service.Name + ': port already listening; skipped.')
        continue
    }
    $process = Start-Process -FilePath $node -ArgumentList $service.Args -WorkingDirectory (Join-Path $root $service.Name) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime ($service.Name + '.log')) -RedirectStandardError (Join-Path $runtime ($service.Name + '-error.log')) -PassThru
    $process.Id | Set-Content (Join-Path $runtime ($service.Name + '.pid'))
}
foreach ($url in @('http://localhost:3001/api/docs', 'http://127.0.0.1:3000')) {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "Service not ready: $url. Check .runtime logs." }
    Write-Host "Ready: $url"
}
