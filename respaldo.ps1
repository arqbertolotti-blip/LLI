# Copia data\data.json a backups\ con fecha y hora, y conserva los ultimos 30 respaldos.
$src = Join-Path $PSScriptRoot 'data\data.json'
$dir = Join-Path $PSScriptRoot 'backups'
if (-not (Test-Path $src)) { Write-Host 'Todavia no hay datos para respaldar.'; exit 0 }
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$name = 'data-' + (Get-Date -Format 'yyyyMMdd-HHmm') + '.json'
Copy-Item $src (Join-Path $dir $name)
Get-ChildItem $dir -Filter 'data-*.json' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 30 | Remove-Item
Write-Host "Respaldo creado: $name"
