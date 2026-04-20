param(
  [string]$DataFile = "radar-diarios-goias-data.json",
  [string]$CoverageJson = "pauteiro-cobertura.json",
  [string]$CoverageJs = "pauteiro-cobertura.js"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataPath = Join-Path $Root $DataFile
$CoverageJsonPath = Join-Path $Root $CoverageJson
$CoverageJsPath = Join-Path $Root $CoverageJs
$IbgeUrl = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/52/municipios"

function Normalize-Label([string]$Text) {
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

function New-CityCountBucket() {
  return @{
    total = 0
    "2025" = 0
    "2026" = 0
  }
}

$DiaryFamilies = @(
  [pscustomobject]@{
    id = "agm"
    label = "AGM / Municipios"
    kind = "municipal_compartilhado"
    url = "https://www.diariomunicipal.com.br/agm/"
    note = "Rota padrao para municipios sem diario proprio confirmado na base."
  },
  [pscustomobject]@{
    id = "goiania"
    label = "Goiania"
    kind = "municipal_proprio"
    url = "https://www.goiania.go.gov.br/casa-civil/diario-oficial/"
    note = "Diario proprio confirmado na base."
  },
  [pscustomobject]@{
    id = "aparecida"
    label = "Aparecida de Goiania"
    kind = "municipal_proprio"
    url = "https://webio.aparecida.go.gov.br/"
    note = "Diario proprio confirmado na base."
  },
  [pscustomobject]@{
    id = "senador-canedo"
    label = "Senador Canedo"
    kind = "municipal_proprio"
    url = "https://diario.senadorcanedo.go.gov.br/"
    note = "Diario proprio confirmado na base."
  },
  [pscustomobject]@{
    id = "anapolis"
    label = "Anapolis"
    kind = "municipal_proprio"
    url = "https://dom.anapolis.go.gov.br/"
    note = "Diario proprio confirmado na base."
  },
  [pscustomobject]@{
    id = "estado"
    label = "Estado de Goias"
    kind = "estadual"
    url = "https://diariooficial.abc.go.gov.br/"
    note = "Diario Oficial do Estado."
  },
  [pscustomobject]@{
    id = "tjgo"
    label = "TJGO"
    kind = "justica"
    url = "https://www.tjgo.jus.br/index.php/processos/dj-eletronico"
    note = "Diario da Justica Eletronico."
  },
  [pscustomobject]@{
    id = "mpgo"
    label = "MPGO"
    kind = "ministerio-publico"
    url = "https://www.mpgo.mp.br/portal/domp"
    note = "Diario Oficial do Ministerio Publico."
  }
)

$SourceOverrides = @{
  "goiania" = @{
    diary_mode = "proprio_confirmado"
    diary_family = "Goiania"
    diary_url = "https://www.goiania.go.gov.br/casa-civil/diario-oficial/"
    note = "Diario proprio confirmado na base."
  }
  "aparecida de goiania" = @{
    diary_mode = "proprio_confirmado"
    diary_family = "Aparecida de Goiania"
    diary_url = "https://webio.aparecida.go.gov.br/"
    note = "Diario proprio confirmado na base."
  }
  "senador canedo" = @{
    diary_mode = "proprio_confirmado"
    diary_family = "Senador Canedo"
    diary_url = "https://diario.senadorcanedo.go.gov.br/"
    note = "Diario proprio confirmado na base."
  }
  "anapolis" = @{
    diary_mode = "proprio_confirmado"
    diary_family = "Anapolis"
    diary_url = "https://dom.anapolis.go.gov.br/"
    note = "Diario proprio confirmado na base."
  }
  "trindade" = @{
    diary_mode = "agm_default"
    diary_family = "AGM / Municipios"
    diary_url = "https://www.diariomunicipal.com.br/agm/"
    note = "Usar AGM como rota principal para Trindade nesta fase da base."
  }
}

$PriorityMunicipalities = @(
  "goiania",
  "aparecida de goiania",
  "senador canedo",
  "rio verde",
  "anapolis",
  "trindade",
  "goias"
)

$EntryCounts = @{}
if (Test-Path $DataPath) {
  $Data = ((Get-Content -Path $DataPath) -join "`n") | ConvertFrom-Json
  foreach ($Entry in @($Data.entries)) {
    $CityKey = Normalize-Label ([string]$Entry.city)
    if (-not $EntryCounts.ContainsKey($CityKey)) {
      $EntryCounts[$CityKey] = New-CityCountBucket
    }

    $Year = ""
    if ($null -ne $Entry.date -and [string]$Entry.date.Length -ge 4) {
      $Year = [string]$Entry.date.Substring(0, 4)
    }

    $EntryCounts[$CityKey].total += 1
    if ($Year -and $EntryCounts[$CityKey].ContainsKey($Year)) {
      $EntryCounts[$CityKey][$Year] += 1
    }
  }
}

$IbgeCities = Invoke-RestMethod -Uri $IbgeUrl
$MunicipalityCatalog = foreach ($City in ($IbgeCities | Sort-Object -Property nome)) {
  $CityName = [string]$City.nome
  $CityKey = Normalize-Label $CityName
  $Override = if ($SourceOverrides.ContainsKey($CityKey)) { $SourceOverrides[$CityKey] } else { $null }
  $CountBucket = if ($EntryCounts.ContainsKey($CityKey)) { $EntryCounts[$CityKey] } else { New-CityCountBucket }

  $DiaryMode = if ($Override) { $Override.diary_mode } else { "agm_default" }
  $DiaryFamily = if ($Override) { $Override.diary_family } else { "AGM / Municipios" }
  $DiaryUrl = if ($Override) { $Override.diary_url } else { "https://www.diariomunicipal.com.br/agm/" }
  $DiaryNote = if ($Override) { $Override.note } else { "Usar AGM como rota padrao enquanto nao houver diario proprio confirmado na base." }

  [pscustomobject]@{
    ibge_id = [string]$City.id
    name = $CityName
    normalized_name = $CityKey
    priority = [bool]($PriorityMunicipalities -contains $CityKey)
    diary_mode = $DiaryMode
    diary_family = $DiaryFamily
    diary_url = $DiaryUrl
    note = $DiaryNote
    loaded_entries_total = [int]$CountBucket.total
    loaded_entries_2025 = [int]$CountBucket["2025"]
    loaded_entries_2026 = [int]$CountBucket["2026"]
  }
}

$CoverageRegistry = foreach ($Municipality in $MunicipalityCatalog) {
  foreach ($Year in @(2025, 2026)) {
    $LoadedCount = if ($Year -eq 2025) { $Municipality.loaded_entries_2025 } else { $Municipality.loaded_entries_2026 }
    [pscustomobject]@{
      year = $Year
      city = $Municipality.name
      diary_family = $Municipality.diary_family
      diary_mode = $Municipality.diary_mode
      loaded_entries = [int]$LoadedCount
      status = if ($LoadedCount -gt 0) { "loaded" } else { "mapped" }
    }
  }
}

$OwnDiaryConfirmed = @($MunicipalityCatalog | Where-Object { $_.diary_mode -eq "proprio_confirmado" }).Count
$AgmDefault = @($MunicipalityCatalog | Where-Object { $_.diary_mode -eq "agm_default" }).Count
$LoadedMunicipalities2025 = @($MunicipalityCatalog | Where-Object { $_.loaded_entries_2025 -gt 0 }).Count
$LoadedMunicipalities2026 = @($MunicipalityCatalog | Where-Object { $_.loaded_entries_2026 -gt 0 }).Count
$LoadedEntries2025 = (@($MunicipalityCatalog | Measure-Object -Property loaded_entries_2025 -Sum).Sum)
$LoadedEntries2026 = (@($MunicipalityCatalog | Measure-Object -Property loaded_entries_2026 -Sum).Sum)

if ($null -eq $LoadedEntries2025) { $LoadedEntries2025 = 0 }
if ($null -eq $LoadedEntries2026) { $LoadedEntries2026 = 0 }

$Payload = [pscustomobject]@{
  generated_at = (Get-Date).ToString("yyyy-MM-dd")
  ibge_source = [pscustomobject]@{
    label = "IBGE localidades"
    url = $IbgeUrl
    state = "Goias"
    state_code = 52
  }
  years = @(2025, 2026)
  diary_families = $DiaryFamilies
  summary = [pscustomobject]@{
    municipalities_total = $MunicipalityCatalog.Count
    own_diary_confirmed = $OwnDiaryConfirmed
    agm_default = $AgmDefault
    priority_municipalities = $PriorityMunicipalities.Count
    loaded_municipalities_2025 = $LoadedMunicipalities2025
    loaded_municipalities_2026 = $LoadedMunicipalities2026
    loaded_entries_2025 = [int]$LoadedEntries2025
    loaded_entries_2026 = [int]$LoadedEntries2026
    coverage_rows = $CoverageRegistry.Count
  }
  municipality_catalog = $MunicipalityCatalog
  coverage_registry = $CoverageRegistry
}

$Json = $Payload | ConvertTo-Json -Depth 8
Set-Content -Path $CoverageJsonPath -Value $Json -Encoding UTF8
Set-Content -Path $CoverageJsPath -Value ("window.PAUTEIRO_COVERAGE = " + $Json + ";") -Encoding UTF8

Write-Output "Gerado: $CoverageJson"
Write-Output "Gerado: $CoverageJs"
Write-Output ("Municipios: " + $MunicipalityCatalog.Count)
Write-Output ("Entradas 2025 carregadas: " + $LoadedEntries2025)
Write-Output ("Entradas 2026 carregadas: " + $LoadedEntries2026)
