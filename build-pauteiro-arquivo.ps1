param(
  [string]$DataFile = "radar-diarios-goias-data.json",
  [string]$ArchiveJs = "pauteiro-arquivo.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataPath = Join-Path $Root $DataFile
$ArchivePath = Join-Path $Root $ArchiveJs

$json = ((Get-Content -Path $DataPath) -join "`n") | ConvertFrom-Json
$entries = @($json.entries)
$currentYear = [int]$json.year

$yearCounts = @{}
foreach ($entry in $entries) {
  $year = [string]$entry.date.Substring(0, 4)
  if (-not $yearCounts.ContainsKey($year)) {
    $yearCounts[$year] = 0
  }
  $yearCounts[$year] += 1
}

$years = @()
foreach ($yearMeta in @($json.archive_years)) {
  $year = [string]$yearMeta.year
  $years += [pscustomobject]@{
    year = [int]$yearMeta.year
    status = if ($year -eq [string]$currentYear) { "active" } else { "mapped" }
    analysis_status = if (($yearCounts[$year] -as [int]) -gt 0) { "partial" } else { "pending" }
    entry_count = [int]($yearCounts[$year] -as [int])
    manifest = "arquivo/$year/manifest.json"
    note = if (($yearCounts[$year] -as [int]) -gt 0) {
      "bucket anual com carga parcial; revisar migracao das entradas."
    } else {
      "bucket anual aberto para ingestao historica; sem entradas carregadas nesta versao publica."
    }
  }
}

$payload = [pscustomobject]@{
  generated_at = (Get-Date).ToString("yyyy-MM-dd")
  search_storage = [pscustomobject]@{
    mode = "localStorage"
    key = "pauteiro:search-history"
  }
  years = $years
  year_buckets = @{}
}

$archiveJsBody = "window.PAUTEIRO_ARCHIVE = " + ($payload | ConvertTo-Json -Depth 6) + ";"
[System.IO.File]::WriteAllText($ArchivePath, $archiveJsBody)

Write-Output "Gerado: $ArchiveJs"
