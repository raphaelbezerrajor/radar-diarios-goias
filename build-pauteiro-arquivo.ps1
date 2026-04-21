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

function Normalize-Text([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
  $formD = $Text.Normalize([Text.NormalizationForm]::FormD)
  $builder = New-Object System.Text.StringBuilder
  foreach ($char in $formD.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append([char]::ToLowerInvariant($char))
    }
  }
  return ([regex]::Replace($builder.ToString(), "[^a-z0-9]+", " ")).Trim()
}

function Get-ArchiveSourceKey($Entry) {
  $label = Normalize-Text ([string]$Entry.source_label)
  $city = Normalize-Text ([string]$Entry.city)
  $scope = Normalize-Text ([string]$Entry.scope)
  $note = Normalize-Text ([string]$Entry.source_note)

  if ($label -match "mpgo|ministerio publico|domp" -or $note -match "mpgo") { return "mpgo" }
  if ($label -match "tjgo|tribunal de justica|diario da justica" -or $scope -match "justica") { return "tjgo" }
  if ($label -match "goiania" -or $city -eq "goiania") { return "goiania" }
  if ($city -eq "estado de goias" -or $scope -match "estadual" -or $label -match "estado de goias|abc") { return "estado" }
  return "municipios"
}

$yearCounts = @{}
$sourceCounts = @{}
foreach ($entry in $entries) {
  $year = [string]$entry.date.Substring(0, 4)
  if (-not $yearCounts.ContainsKey($year)) {
    $yearCounts[$year] = 0
  }
  $yearCounts[$year] += 1

  if (-not $sourceCounts.ContainsKey($year)) {
    $sourceCounts[$year] = @{
      goiania = 0
      estado = 0
      mpgo = 0
      municipios = 0
      tjgo = 0
    }
  }

  $sourceKey = Get-ArchiveSourceKey $entry
  $sourceCounts[$year][$sourceKey] += 1
}

$activeOrder = @(
  [pscustomobject]@{
    id = "goiania"
    label = "Goiania / Sileg"
    status = "active"
    priority = 1
    years = @(2025, 2026)
    note = "Primeira frente de ingestao para nomeacoes, decretos, contratos, jetons e compras."
  },
  [pscustomobject]@{
    id = "estado"
    label = "Estado de Goias / DOE"
    status = "active"
    priority = 2
    years = @(2025, 2026)
    note = "Segunda frente de ingestao para DOE, SES, SSP e autarquias."
  },
  [pscustomobject]@{
    id = "mpgo"
    label = "MPGO / DOMP"
    status = "active"
    priority = 3
    years = @(2025, 2026)
    note = "Terceira frente para inqueritos, recomendacoes, TACs, ACPs e arquivamentos."
  },
  [pscustomobject]@{
    id = "municipios"
    label = "Municipios / AGM e diarios proprios"
    status = "active"
    priority = 4
    years = @(2025, 2026)
    note = "Quarta frente para escalar a cobertura municipal dos 246 municipios."
  }
)

$pausedSources = @(
  [pscustomobject]@{
    id = "tjgo"
    label = "TJGO / DJE"
    status = "paused"
    years = @(2025, 2026)
    note = "Fonte mapeada, mas pausada ate avaliacao editorial mais firme do material do DJE."
  }
)

function New-YearSources([string]$Year) {
  $counts = if ($sourceCounts.ContainsKey($Year)) { $sourceCounts[$Year] } else { @{
    goiania = 0
    estado = 0
    mpgo = 0
    municipios = 0
    tjgo = 0
  } }
  $loadedMonthsFor = {
    param([int]$Count)
    if ($Count -gt 0 -and $Year -eq [string]$currentYear) {
      return @("$Year-04")
    }
    return @()
  }

  return [ordered]@{
    goiania = [ordered]@{
      status = if ($counts.goiania -gt 0) { "active" } else { "ready" }
      entry_count = [int]$counts.goiania
      loaded_months = & $loadedMonthsFor $counts.goiania
    }
    estado = [ordered]@{
      status = if ($counts.estado -gt 0) { "active" } else { "ready" }
      entry_count = [int]$counts.estado
      loaded_months = & $loadedMonthsFor $counts.estado
    }
    mpgo = [ordered]@{
      status = if ($counts.mpgo -gt 0) { "active" } else { "ready" }
      entry_count = [int]$counts.mpgo
      loaded_months = & $loadedMonthsFor $counts.mpgo
    }
    municipios = [ordered]@{
      status = if ($counts.municipios -gt 0) { "active" } else { "ready" }
      entry_count = [int]$counts.municipios
      loaded_months = & $loadedMonthsFor $counts.municipios
    }
    tjgo = [ordered]@{
      status = "paused"
      entry_count = [int]$counts.tjgo
      loaded_months = & $loadedMonthsFor $counts.tjgo
    }
  }
}

$years = @()
$yearBuckets = [ordered]@{}
foreach ($yearMeta in @($json.archive_years)) {
  $year = [string]$yearMeta.year
  $yearSources = New-YearSources $year
  $loadedMonths = if ($year -eq [string]$currentYear) { @("$year-04") } else { @() }
  $yearBuckets[$year] = [ordered]@{
    year = [int]$yearMeta.year
    entries = @()
    loaded_months = $loadedMonths
    sources = $yearSources
    note = if (($yearCounts[$year] -as [int]) -gt 0) {
      "ano estruturado com carga parcial por fonte"
    } else {
      "ano estruturado para ingestao"
    }
  }
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
  ingestion = [pscustomobject]@{
    active_order = $activeOrder
    paused = $pausedSources
  }
  years = $years
  year_buckets = $yearBuckets
}

$archiveJsBody = "window.PAUTEIRO_ARCHIVE = " + ($payload | ConvertTo-Json -Depth 6) + ";"
[System.IO.File]::WriteAllText($ArchivePath, $archiveJsBody)

Write-Output "Gerado: $ArchiveJs"
