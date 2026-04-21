param(
  [string]$DataFile = "radar-diarios-goias-data.json",
  [string]$ArchiveJs = "pauteiro-arquivo.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataPath = Join-Path $Root $DataFile
$ArchivePath = Join-Path $Root $ArchiveJs
$ArchiveDir = Join-Path $Root "arquivo"

$json = ((Get-Content -Path $DataPath) -join "`n") | ConvertFrom-Json
$entries = @($json.entries)
$currentYear = [int]$json.year

$sourceLibrary = [ordered]@{
  goiania = [ordered]@{
    id = "goiania"
    label = "Goiania / Sileg"
    official_url = "https://www.goiania.go.gov.br/casa-civil/diario-oficial/"
    analysis_focus = "nomeacoes, decretos, contratos, compras, jetons, comissoes e reorganizacao administrativa"
    material_types = "diario oficial, sileg, decretos de pessoal, extratos de contrato e atos de governo"
    next_step = "carregar as edicoes de 2025 e fechar o retroativo de 2026 por atos de pessoal e contratos"
  }
  estado = [ordered]@{
    id = "estado"
    label = "Estado de Goias / DOE"
    official_url = "https://diariooficial.abc.go.gov.br/"
    analysis_focus = "notificacoes, devolucao, ressarcimento, dano ao erario, contratos, SES, SSP e autarquias"
    material_types = "diario oficial do estado, avisos, portarias, extratos, notificacoes e cobrancas"
    next_step = "varrer DOE, SES e SSP por notificacoes, cobrancas, contratos e extratos de saude"
  }
  mpgo = [ordered]@{
    id = "mpgo"
    label = "MPGO / DOMP"
    official_url = "https://www.mpgo.mp.br/portal/domp"
    analysis_focus = "inqueritos, recomendacoes, TACs, ACPs, arquivamentos e expedientes com impacto publico"
    material_types = "diario oficial do ministerio publico, editais, recomendacoes, inqueritos e termos"
    next_step = "abrir a coleta dos diarios do MPGO e cruzar recomendacoes, inqueritos e arquivamentos relevantes"
  }
  municipios = [ordered]@{
    id = "municipios"
    label = "Municipios / AGM e diarios proprios"
    official_url = "https://www.diariomunicipal.com.br/agm/"
    analysis_focus = "licitacoes, contratos, editais, nomeacoes, leis, gastos, shows, saude, educacao e urbanismo"
    material_types = "AGM, diarios municipais proprios, atos locais, extratos, leis e decretos"
    next_step = "escalar a ingestao por municipios e preencher os anos a partir da rota AGM ou diario proprio"
  }
  tjgo = [ordered]@{
    id = "tjgo"
    label = "TJGO / DJE"
    official_url = "https://www.tjgo.jus.br/index.php/processos/dj-eletronico"
    analysis_focus = "decisoes, plantoes, liminares, colegiados e atos do tribunal ainda em avaliacao editorial"
    material_types = "diario da justica eletronico e noticias do tribunal"
    next_step = "manter mapeado, mas fora da rodada atual ate fechar o criterio editorial do DJE"
  }
}

$sourcePriority = @(
  "Goiania / Sileg",
  "Estado de Goias / DOE",
  "MPGO / DOMP",
  "Municipios / AGM e diarios proprios"
)

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

function Slugify-Text([string]$Text) {
  return ((Normalize-Text $Text) -replace "\s+", "-").Trim("-")
}

function Get-EntryId($Entry) {
  $date = [string]$Entry.date
  $city = Slugify-Text ([string]$Entry.city)
  $title = (Slugify-Text ([string]$Entry.title))
  if ($title.Length -gt 48) {
    $title = $title.Substring(0, 48).Trim("-")
  }
  return "$date-$city-$title"
}

function Get-ArchiveSourceKey($Entry) {
  $label = Normalize-Text ([string]$Entry.source_label)
  $city = Normalize-Text ([string]$Entry.city)
  $scope = Normalize-Text ([string]$Entry.scope)
  $note = Normalize-Text ([string]$Entry.source_note)

  if ($label -match "mpgo|ministerio publico|domp" -or $note -match "mpgo") { return "mpgo" }
  if ($label -match "tjgo|tribunal de justica|diario da justica" -or $scope -match "justica") { return "tjgo" }
  if ($city -eq "goiania" -or $label -match "sileg goiania|diario oficial de goiania|diario oficial do municipio de goiania") { return "goiania" }
  if ($city -eq "estado de goias" -or $scope -match "estadual" -or $label -match "estado de goias|abc|ses go|ssp") { return "estado" }
  return "municipios"
}

function Get-SourceStatus([string]$SourceKey, [int]$Count) {
  if ($SourceKey -eq "tjgo") { return "paused" }
  if ($Count -gt 0) { return "active" }
  return "ready"
}

function Get-AnalysisStatus([string]$Status, [int]$Count) {
  if ($Status -eq "paused") { return "paused" }
  if ($Count -gt 0) { return "partial" }
  return "pending"
}

function Get-LoadedMonths([object[]]$EntryList) {
  $items = @($EntryList)
  $count = [int](($items | Measure-Object).Count)
  if ($count -eq 0) { return @() }
  return @($EntryList |
    ForEach-Object { [string]$_.date.Substring(0, 7) } |
    Sort-Object -Unique)
}

function Get-UniqueValues([object[]]$EntryList, [string]$PropertyName, [int]$Limit = 5) {
  $items = @($EntryList)
  $count = [int](($items | Measure-Object).Count)
  if ($count -eq 0) { return @() }
  return @($items |
    ForEach-Object { $_.$PropertyName } |
    Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } |
    Group-Object |
    Sort-Object @{ Expression = { $_.Count }; Descending = $true }, @{ Expression = { $_.Name }; Descending = $false } |
    Select-Object -First $Limit |
    ForEach-Object { $_.Name })
}

function Get-SourceNote([string]$SourceKey, [string]$Status, [int]$Count, [string]$Year) {
  switch ($Status) {
    "paused" {
      if ($Count -gt 0) {
        return "fonte mapeada com material de referencia em $Year, mas a leitura sistematica segue pausada nesta rodada"
      }
      return "fonte mapeada, ainda fora da rodada principal de ingestao"
    }
    "active" {
      return "$Count entrada(s) ja carregada(s) para $Year, com leitura editorial parcial"
    }
    default {
      return "fonte pronta para ingestao, ainda sem entradas carregadas em $Year"
    }
  }
}

function New-SourceReport([string]$Year, [string]$SourceKey, [object[]]$EntryList) {
  $meta = $sourceLibrary[$SourceKey]
  $entryItems = @($EntryList)
  $count = [int](($entryItems | Measure-Object).Count)
  $status = Get-SourceStatus -SourceKey $SourceKey -Count $count
  $analysisStatus = Get-AnalysisStatus -Status $status -Count $count
  $loadedMonths = Get-LoadedMonths -EntryList $entryItems
  $coveredCities = Get-UniqueValues -EntryList $entryItems -PropertyName "city" -Limit 6
  $mainEditorias = Get-UniqueValues -EntryList $entryItems -PropertyName "editoria" -Limit 4
  $topTags = Get-UniqueValues -EntryList $entryItems -PropertyName "tag" -Limit 5
  $highlights = @($entryItems |
    Sort-Object @{ Expression = { [int]($_.highlight_score -as [int]) }; Descending = $true }, @{ Expression = { [string]$_.date }; Descending = $true } |
    Select-Object -First 3 |
    ForEach-Object {
      [ordered]@{
        entry_id = Get-EntryId $_
        date = [string]$_.date
        city = [string]$_.city
        editoria = [string]$_.editoria
        tag = [string]$_.tag
        title = [string]$_.title
        line = [string]$_.line
        highlight_score = [int]($_.highlight_score -as [int])
        source_label = [string]$_.source_label
        source_url = [string]$_.source_url
        source_note = [string]$_.source_note
      }
    })

  return [ordered]@{
    year = [int]$Year
    source_id = $meta.id
    label = $meta.label
    status = $status
    analysis_status = $analysisStatus
    entry_count = $count
    loaded_months = $loadedMonths
    manifest = "arquivo/$Year/$SourceKey.json"
    official_url = $meta.official_url
    analysis_focus = $meta.analysis_focus
    material_types = $meta.material_types
    covered_cities = $coveredCities
    main_editorias = $mainEditorias
    top_tags = $topTags
    note = Get-SourceNote -SourceKey $SourceKey -Status $status -Count $count -Year $Year
    next_step = $meta.next_step
    highlight_entries = $highlights
  }
}

$yearCounts = @{}
$sourceEntries = @{}
foreach ($entry in $entries) {
  $year = [string]$entry.date.Substring(0, 4)
  if (-not $yearCounts.ContainsKey($year)) {
    $yearCounts[$year] = 0
  }
  $yearCounts[$year] += 1

  if (-not $sourceEntries.ContainsKey($year)) {
    $sourceEntries[$year] = @{
      goiania = @()
      estado = @()
      mpgo = @()
      municipios = @()
      tjgo = @()
    }
  }

  $sourceKey = Get-ArchiveSourceKey $entry
  $sourceEntries[$year][$sourceKey] += $entry
}

$years = @()
$yearBuckets = [ordered]@{}

foreach ($yearMeta in @($json.archive_years)) {
  $year = [string]$yearMeta.year
  $yearEntryCount = [int]($yearCounts[$year] -as [int])
  $yearEntries = @($entries | Where-Object { [string]$_.date.Substring(0, 4) -eq $year })
  $yearLoadedMonths = Get-LoadedMonths -EntryList $yearEntries
  $yearSourceReports = [ordered]@{}

  $yearDir = Join-Path $ArchiveDir $year
  if (-not (Test-Path -LiteralPath $yearDir)) {
    New-Item -ItemType Directory -Path $yearDir -Force | Out-Null
  }

  foreach ($sourceKey in @("goiania", "estado", "mpgo", "municipios", "tjgo")) {
    $entryList = if ($sourceEntries.ContainsKey($year)) { @($sourceEntries[$year][$sourceKey]) } else { @() }
    $report = New-SourceReport -Year $year -SourceKey $sourceKey -EntryList $entryList
    $yearSourceReports[$sourceKey] = $report

    $sourceManifestPath = Join-Path $yearDir "$sourceKey.json"
    ($report | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $sourceManifestPath -Encoding UTF8
  }

  $yearManifest = [ordered]@{
    year = [int]$yearMeta.year
    status = if ($year -eq [string]$currentYear) { "active" } else { "mapped" }
    analysis_status = if ($yearEntryCount -gt 0) { "partial" } else { "pending" }
    entry_count = $yearEntryCount
    loaded_months = $yearLoadedMonths
    sources_priority = $sourcePriority
    sources = $yearSourceReports
    note = if ($yearEntryCount -gt 0) {
      "bucket anual com carga parcial; a leitura por fonte e a consolidacao seguem em andamento."
    } else {
      "bucket anual aberto para ingestao historica com fonte e analise mapeadas."
    }
  }

  $yearManifestPath = Join-Path $yearDir "manifest.json"
  ($yearManifest | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $yearManifestPath -Encoding UTF8

  $yearBuckets[$year] = [ordered]@{
    year = [int]$yearMeta.year
    entries = @()
    loaded_months = $yearLoadedMonths
    sources = $yearSourceReports
    note = if ($yearEntryCount -gt 0) {
      "ano estruturado com carga parcial por fonte"
    } else {
      "ano estruturado para ingestao"
    }
  }

  $years += [pscustomobject]@{
    year = [int]$yearMeta.year
    status = if ($year -eq [string]$currentYear) { "active" } else { "mapped" }
    analysis_status = if ($yearEntryCount -gt 0) { "partial" } else { "pending" }
    entry_count = $yearEntryCount
    manifest = "arquivo/$year/manifest.json"
    note = if ($yearEntryCount -gt 0) {
      "bucket anual com carga parcial; revisar migracao das entradas."
    } else {
      "bucket anual aberto para ingestao historica; sem entradas carregadas nesta versao publica."
    }
  }
}

$payload = [ordered]@{
  generated_at = (Get-Date).ToString("yyyy-MM-dd")
  search_storage = [ordered]@{
    mode = "localStorage"
    key = "pauteiro:search-history"
  }
  source_library = $sourceLibrary
  ingestion = [ordered]@{
    active_order = $activeOrder
    paused = $pausedSources
  }
  years = $years
  year_buckets = $yearBuckets
}

$archiveJsBody = "window.PAUTEIRO_ARCHIVE = " + ($payload | ConvertTo-Json -Depth 8) + ";"
$archiveJsBody | Set-Content -LiteralPath $ArchivePath -Encoding UTF8

Write-Output "Gerado: $ArchiveJs"
