param(
  [string]$DataFile = "radar-diarios-goias-data.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataPath = Join-Path $Root $DataFile
$CssFile = "radar-diarios-goias.css"
$MonthPage = "radar-diarios-goias.html"
$ChronoPage = "radar-diarios-goias-cronologia.html"
$DaysDir = Join-Path $Root "dias"

function HtmlText([string]$Text) {
  if ([string]::IsNullOrEmpty($Text)) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

function HtmlAttr([string]$Text) {
  if ([string]::IsNullOrEmpty($Text)) { return "" }
  return [System.Net.WebUtility]::HtmlEncode($Text)
}

function Get-MonthName([int]$Month) {
  $names = @{
    1 = "janeiro"; 2 = "fevereiro"; 3 = "marco"; 4 = "abril"; 5 = "maio"; 6 = "junho";
    7 = "julho"; 8 = "agosto"; 9 = "setembro"; 10 = "outubro"; 11 = "novembro"; 12 = "dezembro"
  }
  return $names[$Month]
}

function Get-WeekdayName([datetime]$Date) {
  switch ([int]$Date.DayOfWeek) {
    0 { "domingo" }
    1 { "segunda" }
    2 { "terca" }
    3 { "quarta" }
    4 { "quinta" }
    5 { "sexta" }
    default { "sabado" }
  }
}

function Get-ShortWeekday([datetime]$Date) {
  switch ([int]$Date.DayOfWeek) {
    0 { "Dom" }
    1 { "Seg" }
    2 { "Ter" }
    3 { "Qua" }
    4 { "Qui" }
    5 { "Sex" }
    default { "Sab" }
  }
}

function Format-LongDate([datetime]$Date) {
  $weekday = Get-WeekdayName $Date
  $month = Get-MonthName $Date.Month
  return "$weekday, $($Date.Day) de $month de $($Date.Year)"
}

function Get-DayFileName([string]$DateText) {
  return "$DateText.html"
}

function Get-DayRelativePath([string]$DateText) {
  return "dias/$(Get-DayFileName $DateText)"
}

function Get-DayBackPath([string]$FileName) {
  return "../$FileName"
}

function New-FallbackBlock([string]$Label) {
  $parts = ($Label -split "\s+" | Where-Object { $_ }) | Select-Object -First 2
  if (-not $parts) { $parts = @("GO") }
  $abbr = ($parts | ForEach-Object { $_.Substring(0, [Math]::Min($_.Length, 1)).ToUpperInvariant() }) -join ""
  return "<div class='story-image fallback'>$abbr</div>"
}

function Render-Image([pscustomobject]$Entry) {
  $hasImage = $Entry.PSObject.Properties.Name -contains "image_url" -and -not [string]::IsNullOrWhiteSpace([string]$Entry.image_url)
  if ($hasImage) {
    $url = HtmlAttr $Entry.image_url
    $alt = HtmlText ("Imagem relacionada a " + $Entry.city)
    return "<img class='story-image' loading='lazy' src='$url' alt='$alt'>"
  }
  return (New-FallbackBlock $Entry.city)
}

function Render-StoryCard([pscustomobject]$Entry, [bool]$Large = $false) {
  $image = Render-Image $Entry
  $credit = ""
  $hasCredit = $Entry.PSObject.Properties.Name -contains "image_credit" -and -not [string]::IsNullOrWhiteSpace([string]$Entry.image_credit)
  if ($hasCredit) {
    $credit = "<p class='story-credit'>Credito da imagem: $(HtmlText $Entry.image_credit)</p>"
  }

  $titleTag = if ($Large) { "h3" } else { "h4" }
  $sourceNote = if ($null -ne $Entry.source_note -and $Entry.source_note) { " <span>$(HtmlText $Entry.source_note)</span>" } else { "" }
  $sourceUrl = HtmlAttr $Entry.source_url

  return @"
<article class='story-card'>
  $image
  <div class='story-body'>
    $credit
    <div class='meta-row'><span class='tag'>$(HtmlText $Entry.tag)</span><span>$(HtmlText $Entry.city)</span><span>$(HtmlText $Entry.date)</span></div>
    <$titleTag>$(HtmlText $Entry.title)</$titleTag>
    <p class='story-line'>$(HtmlText $Entry.line)</p>
    <p class='story-summary'>$(HtmlText $Entry.summary)</p>
    <p class='story-source'>Fonte: <a href='$sourceUrl'>$(HtmlText $Entry.source_label)</a>$sourceNote</p>
  </div>
</article>
"@
}

function Render-TimelineCard([pscustomobject]$Entry) {
  $sourceUrl = HtmlAttr $Entry.source_url
  $sourceNote = if ($null -ne $Entry.source_note -and $Entry.source_note) { " | $(HtmlText $Entry.source_note)" } else { "" }
  return @"
<article class='timeline-card'>
  <div class='meta-row'><span class='tag'>$(HtmlText $Entry.tag)</span><span>$(HtmlText $Entry.city)</span><span>$(HtmlText $Entry.editoria)</span></div>
  <h3>$(HtmlText $Entry.title)</h3>
  <p class='story-line'>$(HtmlText $Entry.line)</p>
  <p>$(HtmlText $Entry.summary)</p>
  <p class='story-source'>Fonte: <a href='$sourceUrl'>$(HtmlText $Entry.source_label)</a>$sourceNote</p>
</article>
"@
}

function Render-DaySummaryCard([datetime]$Date, [System.Collections.Generic.List[object]]$Entries, [datetime]$Cutoff) {
  $dateText = $Date.ToString("yyyy-MM-dd")
  $hasEntries = $Entries.Count -gt 0
  $statusClass = if ($hasEntries) {
    "is-covered"
  }
  elseif ($Date -le $Cutoff) {
    "is-partial"
  }
  else {
    "is-future"
  }

  $note = if ($hasEntries) {
    $Entries[0].line
  }
  elseif ($Date -le $Cutoff) {
    "Sem pauta fechada nesta passada. Dia mantido aberto para segunda leitura."
  }
  else {
    "Data futura no calendario mensal. Aguardando publicacoes."
  }

  $countLabel = if ($hasEntries) {
    "$($Entries.Count) pauta(s) no dia"
  }
  elseif ($Date -le $Cutoff) {
    "Rodada parcial"
  }
  else {
    "Aguardando publicacao"
  }

  $dayPath = Get-DayRelativePath $dateText

  return @"
<a class='day-card $statusClass' href='$dayPath'>
  <span class='day-number'>$($Date.Day)</span>
  <h3>$(HtmlText (Format-LongDate $Date))</h3>
  <p>$(HtmlText $note)</p>
  <span class='count'>$countLabel</span>
</a>
"@
}

function Render-Calendar([datetime]$MonthStart, [datetime]$Cutoff, [hashtable]$EntriesByDate) {
  $weekdayLabels = @("Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom")
  $weekdayRow = ($weekdayLabels | ForEach-Object { "<div class='weekday'>$_</div>" }) -join "`n"

  $offset = ([int]$MonthStart.DayOfWeek + 6) % 7
  $daysInMonth = [datetime]::DaysInMonth($MonthStart.Year, $MonthStart.Month)
  $cells = New-Object System.Collections.Generic.List[string]

  for ($i = 0; $i -lt $offset; $i++) {
    [void]$cells.Add("<div class='day-chip is-empty'></div>")
  }

  for ($day = 1; $day -le $daysInMonth; $day++) {
    $date = Get-Date -Year $MonthStart.Year -Month $MonthStart.Month -Day $day
    $dateText = $date.ToString("yyyy-MM-dd")
    $count = 0
    if ($EntriesByDate.ContainsKey($dateText)) {
      $count = $EntriesByDate[$dateText].Count
    }
    $statusClass = if ($count -gt 0) {
      "is-covered"
    }
    elseif ($date -le $Cutoff) {
      "is-partial"
    }
    else {
      "is-future"
    }
    $caption = if ($count -gt 0) {
      "$count pauta(s)"
    }
    elseif ($date -le $Cutoff) {
      "parcial"
    }
    else {
      "futuro"
    }
    $href = Get-DayRelativePath $dateText
    [void]$cells.Add("<a class='day-chip $statusClass' href='$href'><strong>$day</strong><small>$caption</small></a>")
  }

  return @"
<div class='weekday-row'>
$weekdayRow
</div>
<div class='calendar-grid'>
$($cells -join "`n")
</div>
"@
}

function Render-Editorias([object[]]$Entries) {
  $groups = $Entries |
    Group-Object -Property editoria |
    Sort-Object -Property @{ Expression = "Count"; Descending = $true }, @{ Expression = "Name"; Descending = $false }

  $cards = foreach ($group in $groups) {
    @"
<div class='panel'>
  <div class='panel-item'>
    <span>$(HtmlText $group.Name)</span>
    <strong>$($group.Count)</strong>
  </div>
</div>
"@
  }

  return $cards -join "`n"
}

function Render-LineList([object[]]$Entries) {
  $items = foreach ($entry in ($Entries | Sort-Object -Property date, city, title)) {
    "<li><strong>$(HtmlText $entry.city)</strong>$(HtmlText $entry.line)</li>"
  }
  return $items -join "`n"
}

function Get-RelativeDateLabel([datetime]$Date) {
  return "{0:dd/MM}" -f $Date
}

function Render-MonthPage([pscustomobject]$Data, [object[]]$Entries, [hashtable]$EntriesByDate, [datetime]$MonthStart, [datetime]$Cutoff) {
  $monthName = Get-MonthName $MonthStart.Month
  $calendar = Render-Calendar $MonthStart $Cutoff $EntriesByDate
  $editoriasCount = ($Entries | Group-Object -Property editoria).Count
  $daysWithEntries = ($Entries | Group-Object -Property date).Count
  $highlights = $Entries |
    Sort-Object -Property @{Expression = "highlight_score"; Descending = $true}, @{Expression = "date"; Descending = $true} |
    Select-Object -First 6

  $featureCards = New-Object System.Collections.Generic.List[string]
  foreach ($entry in $highlights) {
    [void]$featureCards.Add((Render-StoryCard $entry ($featureCards.Count -lt 1)))
  }

  $dayCards = New-Object System.Collections.Generic.List[string]
  $daysInMonth = [datetime]::DaysInMonth($MonthStart.Year, $MonthStart.Month)
  for ($day = 1; $day -le $daysInMonth; $day++) {
    $date = Get-Date -Year $MonthStart.Year -Month $MonthStart.Month -Day $day
    $dateText = $date.ToString("yyyy-MM-dd")
    $list = New-Object "System.Collections.Generic.List[object]"
    if ($EntriesByDate.ContainsKey($dateText)) {
      $list = $EntriesByDate[$dateText]
    }
    [void]$dayCards.Add((Render-DaySummaryCard $date $list $Cutoff))
  }

  $sourceItems = foreach ($source in $Data.sources) {
    "<li><strong>$(HtmlText $source.label)</strong><br><a href='$(HtmlAttr $source.url)'>$(HtmlAttr $source.url)</a></li>"
  }

  $statsHtml = @"
<div class='stats'>
  <div class='stat'><strong>$($Data.sources.Count)</strong><span>fontes oficiais e familias de leitura nesta base mensal.</span></div>
  <div class='stat'><strong>$($Data.evaluated_units)</strong><span>paginas, edicoes e atos efetivamente abertos nesta passada de abril.</span></div>
  <div class='stat'><strong>$($Entries.Count)</strong><span>pautas com potencial claro de noticia ate 18 de abril de 2026.</span></div>
  <div class='stat'><strong>$editoriasCount</strong><span>editorias separadas com contagem automatica da base diaria.</span></div>
</div>
"@

  return @"
<!doctype html>
<html lang='pt-BR'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>$(HtmlText $Data.site_title)</title>
  <link rel='stylesheet' href='$CssFile'>
</head>
<body>
  <header class='topbar'>
    <div class='wrap top-grid'>
      <div>
        <p class='eyebrow'>Radar Diario GO | Base por dia</p>
        <h1 class='title'>Abril de 2026 virou base diaria, com calendario, cronologia e frente propria para o TJGO</h1>
        <p class='intro'>Estrutura mensal organizada para o periodo de 1 a 30 de abril de 2026, com preenchimento factual ate 18 de abril de 2026. O recorte prioriza fator-noticia em contratos, compras, estruturas de gestao, plantoes judiciais, obras, habitacao, saude e atos de tribunal.</p>
        <p class='meta-line'>Atualizado em 18 de abril de 2026. Dias 19 a 30 permanecem no calendario como placeholders da rodada futura.</p>
        $statsHtml
        <div class='chip-row'>
          <span class='chip'>Justica e DJE do TJGO entram como eixo fixo da leitura pesada.</span>
          <span class='chip'>Base separada por dia com paginas individuais em ordem cronologica.</span>
          <span class='chip'>Linha fina e editorias passam a ser calculadas a partir da base.</span>
        </div>
        <div class='top-links'>
          <a class='top-link' href='$ChronoPage'>Abrir cronologia completa</a>
          <a class='top-link' href='radar-diarios-goias-data.json'>Abrir base JSON</a>
          <a class='top-link' href='dias/2026-04-08.html'>Abrir dia com maior carga</a>
        </div>
      </div>
      <aside class='calendar-panel'>
        <p class='panel-kicker'>Calendario na rodada</p>
        <h2>$([char]0x0041)$($monthName.Substring(1)) 2026</h2>
        <p class='calendar-note'>Clique em qualquer data. Dias com pauta confirmada ficam em verde; dias lidos sem fechamento ficam em dourado; datas futuras ficam em cinza.</p>
        $calendar
      </aside>
    </div>
  </header>

  <main class='wrap'>
    <section class='section'>
      <div class='section-head'>
        <div>
          <p class='section-kicker'>Publicacoes em destaque</p>
          <h2>Manchetes que abriram a base mensal</h2>
        </div>
        <p class='section-intro'>Esses cards puxam o mes pelo que tem escala, valor, efeito administrativo ou repercussao institucional mais nitida. O bloco segue em formato de agencia, com foto quando a base ja trouxe um credito usavel.</p>
      </div>
      <div class='feature-grid'>
$($featureCards -join "`n")
      </div>
    </section>

    <section class='section'>
      <div class='section-head'>
        <div>
          <p class='section-kicker'>Dias de abril</p>
          <h2>Base organizada por dia</h2>
        </div>
        <p class='section-intro'>Cada data abre uma pagina propria, com navegacao entre dias, resumo do que entrou e alerta quando a rodada ainda esta parcial.</p>
      </div>
      <div class='day-board'>
$($dayCards -join "`n")
      </div>
    </section>

    <section class='section'>
      <div class='section-head'>
        <div>
          <p class='section-kicker'>Editorias</p>
          <h2>Separacao automatica por assunto</h2>
        </div>
        <p class='section-intro'>A contagem abaixo olha para a vocacao principal da pauta, nao apenas para o orgao que publicou o ato.</p>
      </div>
      <div class='editoria-grid'>
$((Render-Editorias $Entries))
      </div>
    </section>

    <section class='section'>
      <div class='section-head'>
        <div>
          <p class='section-kicker'>Linha fina</p>
          <h2>Assuntos do mes em uma passada curta</h2>
        </div>
      </div>
      <ul class='line-list'>
$((Render-LineList $Entries))
      </ul>
    </section>

    <section class='section'>
      <div class='section-head'>
        <div>
          <p class='section-kicker'>Fontes fixas</p>
          <h2>Familias de fonte que sustentam a base</h2>
        </div>
        <p class='section-intro'>O TJGO entra aqui como frente propria de leitura pesada. A pagina do DJE fica indexada e as noticias oficiais do tribunal ajudam a puxar atos para leitura posterior no diario.</p>
      </div>
      <ul class='sources-list'>
$($sourceItems -join "`n")
      </ul>
    </section>
  </main>

  <footer class='footer'>
    <div class='wrap'>
      <p class='footer-note'>Base mensal gerada a partir de <a href='radar-diarios-goias-data.json'>radar-diarios-goias-data.json</a>. Recorte factual preenchido ate 18 de abril de 2026. O calendario ja cobre o mes inteiro para receber novas rodadas sem precisar desmontar o template.</p>
    </div>
  </footer>
</body>
</html>
"@
}

function Render-ChronologyPage([pscustomobject]$Data, [object[]]$Entries, [hashtable]$EntriesByDate, [datetime]$MonthStart, [datetime]$Cutoff) {
  $dates = $EntriesByDate.Keys | Sort-Object
  $groups = New-Object System.Collections.Generic.List[string]

  foreach ($dateText in $dates) {
    $date = [datetime]::ParseExact($dateText, "yyyy-MM-dd", $null)
    $cards = $EntriesByDate[$dateText] | Sort-Object -Property @{Expression = "highlight_score"; Descending = $true}, title | ForEach-Object { Render-TimelineCard $_ }
    $count = $EntriesByDate[$dateText].Count
    [void]$groups.Add(@"
<section class='timeline-group'>
  <div class='timeline-date'>
    <strong>$($date.Day)</strong>
    <span>$(HtmlText (Get-ShortWeekday $date))</span>
    <span>$count pauta(s)</span>
  </div>
  <div>
$($cards -join "`n")
  </div>
</section>
"@)
  }

  return @"
<!doctype html>
<html lang='pt-BR'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>$(HtmlText $Data.site_title) | Cronologia</title>
  <link rel='stylesheet' href='$CssFile'>
</head>
<body>
  <main class='wrap page-shell'>
    <header class='page-header'>
      <div>
        <p class='eyebrow'>Cronologia do mes</p>
        <h1 class='page-title'>Linha do tempo de abril de 2026</h1>
        <p class='intro'>Aqui a base aparece em ordem cronologica crescente. O objetivo e enxergar o mes como fluxo: o que entrou no inicio, onde o volume se concentrou e em quais datas o TJGO fez a curva subir.</p>
        <div class='nav-row'>
          <a class='nav-pill' href='$MonthPage'>Voltar ao indice mensal</a>
          <a class='nav-pill' href='radar-diarios-goias-data.json'>Abrir base JSON</a>
        </div>
      </div>
      <aside class='sidebar-card'>
        <h3>Recorte</h3>
        <p class='muted'>Preenchimento factual ate 18/04/2026. Dias sem pauta confirmada permanecem no calendario do indice mensal e podem receber nova rodada depois.</p>
        <div class='panel-item'><span>Pautas na cronologia</span><strong>$($Entries.Count)</strong></div>
        <div class='panel-item'><span>Dias com entrada</span><strong>$($EntriesByDate.Keys.Count)</strong></div>
      </aside>
    </header>

    <section class='section timeline'>
$($groups -join "`n")
    </section>
  </main>
</body>
</html>
"@
}

function Render-DayPage([pscustomobject]$Data, [datetime]$Date, [System.Collections.Generic.List[object]]$Entries, [datetime]$Cutoff, [string]$PrevDateText, [string]$NextDateText) {
  $dateText = $Date.ToString("yyyy-MM-dd")
  $longDate = Format-LongDate $Date
  $isFuture = $Date -gt $Cutoff
  $hasEntries = $Entries.Count -gt 0
  $heroHtml = ""
  $stackHtml = ""

  if ($hasEntries) {
    $heroHtml = Render-StoryCard $Entries[0] $true
    $rest = if ($Entries.Count -gt 1) { $Entries | Select-Object -Skip 1 } else { @() }
    $stackCards = foreach ($entry in $rest) { Render-StoryCard $entry $false }
    $stackHtml = $stackCards -join "`n"
  }

  $stateCopy = if ($hasEntries) {
    "$($Entries.Count) pauta(s) confirmada(s) nesta data."
  }
  elseif ($isFuture) {
    "Data futura dentro do calendario mensal. A base ja deixa a pagina pronta para a rodada quando o diario sair."
  }
  else {
    "Data lida de forma parcial nesta primeira passada, ainda sem pauta fechada com fator-noticia suficiente para entrar no card principal."
  }

  $beats = if ($hasEntries) {
    ($Entries | Group-Object -Property editoria | Sort-Object Count -Descending | Select-Object -First 3 | ForEach-Object { $_.Name }) -join ", "
  }
  else {
    "Sem editoria dominante nesta data."
  }

  $prevLink = if ($PrevDateText) { "<a class='nav-pill' href='$(Get-DayFileName $PrevDateText)'>Dia anterior</a>" } else { "" }
  $nextLink = if ($NextDateText) { "<a class='nav-pill' href='$(Get-DayFileName $NextDateText)'>Dia seguinte</a>" } else { "" }

  $mainContent = if ($hasEntries) {
    @"
<div class='story-stack'>
  $heroHtml
  $stackHtml
</div>
"@
  }
  else {
    @"
<div class='empty-state'>
  <h3>Dia sem fechamento principal</h3>
  <p class='empty-copy'>$stateCopy</p>
</div>
"@
  }

  return @"
<!doctype html>
<html lang='pt-BR'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>$(HtmlText $Data.site_title) | $(HtmlText $dateText)</title>
  <link rel='stylesheet' href='../$CssFile'>
</head>
<body>
  <main class='wrap page-shell'>
    <header class='page-header'>
      <div>
        <p class='eyebrow'>Base diaria</p>
        <h1 class='page-title'>$(HtmlText $longDate)</h1>
        <p class='intro'>$stateCopy</p>
        <div class='nav-row'>
          <a class='nav-pill' href='../$MonthPage'>Voltar ao mes</a>
          <a class='nav-pill' href='../$ChronoPage'>Abrir cronologia</a>
          $prevLink
          $nextLink
        </div>
      </div>
      <aside class='sidebar-card'>
        <h3>Resumo do dia</h3>
        <div class='panel-item'><span>Data</span><strong>$($Date.ToString("dd/MM"))</strong></div>
        <div class='panel-item'><span>Pautas</span><strong>$($Entries.Count)</strong></div>
        <div class='panel-item'><span>Status</span><strong>$(if ($hasEntries) { "fechado" } elseif ($isFuture) { "futuro" } else { "parcial" })</strong></div>
        <p class='panel-note'>Editorias mais visiveis: $(HtmlText $beats)</p>
      </aside>
    </header>

    <section class='page-grid'>
      <div>
        $mainContent
      </div>
      <aside class='note-stack'>
        <div class='note-card'>
          <h3>Leitura editorial</h3>
          <p class='muted'>Nesta pagina o foco e a data. Quando houver pauta confirmada, o primeiro card sobe como abertura do dia e os demais ficam empilhados logo abaixo.</p>
        </div>
        <div class='note-card'>
          <h3>Navegacao</h3>
          <ul>
            <li>Calendario no indice mensal para saltar entre datas.</li>
            <li>Cronologia para enxergar o mes em ordem crescente.</li>
            <li>TJGO marcado como eixo fixo da leitura pesada.</li>
          </ul>
        </div>
      </aside>
    </section>
  </main>
</body>
</html>
"@
}

if (-not (Test-Path $DaysDir)) {
  New-Item -Path $DaysDir -ItemType Directory -Force | Out-Null
}

$Data = Get-Content -Path $DataPath -Raw | ConvertFrom-Json
$Entries = @($Data.entries | Sort-Object -Property date, @{Expression = "highlight_score"; Descending = $true}, title)
$MonthStart = [datetime]::ParseExact("$($Data.month)-01", "yyyy-MM-dd", $null)
$Cutoff = [datetime]::ParseExact($Data.cutoff_date, "yyyy-MM-dd", $null)
$DaysInMonth = [datetime]::DaysInMonth($MonthStart.Year, $MonthStart.Month)

$EntriesByDate = @{}
foreach ($entry in $Entries) {
  if (-not $EntriesByDate.ContainsKey($entry.date)) {
    $EntriesByDate[$entry.date] = New-Object "System.Collections.Generic.List[object]"
  }
  [void]$EntriesByDate[$entry.date].Add($entry)
}

$MonthHtml = Render-MonthPage -Data $Data -Entries $Entries -EntriesByDate $EntriesByDate -MonthStart $MonthStart -Cutoff $Cutoff
Set-Content -Path (Join-Path $Root $MonthPage) -Value $MonthHtml -Encoding UTF8

$ChronoHtml = Render-ChronologyPage -Data $Data -Entries $Entries -EntriesByDate $EntriesByDate -MonthStart $MonthStart -Cutoff $Cutoff
Set-Content -Path (Join-Path $Root $ChronoPage) -Value $ChronoHtml -Encoding UTF8

for ($day = 1; $day -le $DaysInMonth; $day++) {
  $date = Get-Date -Year $MonthStart.Year -Month $MonthStart.Month -Day $day
  $dateText = $date.ToString("yyyy-MM-dd")
  $prevText = if ($day -gt 1) { (Get-Date -Year $MonthStart.Year -Month $MonthStart.Month -Day ($day - 1)).ToString("yyyy-MM-dd") } else { "" }
  $nextText = if ($day -lt $DaysInMonth) { (Get-Date -Year $MonthStart.Year -Month $MonthStart.Month -Day ($day + 1)).ToString("yyyy-MM-dd") } else { "" }
  $dayEntries = New-Object "System.Collections.Generic.List[object]"
  if ($EntriesByDate.ContainsKey($dateText)) {
    $dayEntries = $EntriesByDate[$dateText]
  }
  $DayHtml = Render-DayPage -Data $Data -Date $date -Entries $dayEntries -Cutoff $Cutoff -PrevDateText $prevText -NextDateText $nextText
  Set-Content -Path (Join-Path $DaysDir (Get-DayFileName $dateText)) -Value $DayHtml -Encoding UTF8
}

Write-Output "Gerado: $MonthPage"
Write-Output "Gerado: $ChronoPage"
Write-Output "Gerado: $DaysDir"
