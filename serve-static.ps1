param(
  [int]$Port = 4173
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add("http://127.0.0.1:$Port/")
$Listener.Start()

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
  ".ico" = "image/x-icon"
}

Write-Output "Radar GO server running at http://127.0.0.1:$Port"

try {
  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    try {
      $PathPart = [System.Uri]::UnescapeDataString($Request.Url.AbsolutePath)
      if ([string]::IsNullOrWhiteSpace($PathPart) -or $PathPart -eq "/") {
        $PathPart = "/radar-diarios-goias.html"
      }

      $Relative = $PathPart.TrimStart("/") -replace "/", "\"
      $FilePath = [System.IO.Path]::GetFullPath((Join-Path $Root $Relative))

      if (-not $FilePath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $FilePath -PathType Leaf)) {
        $Response.StatusCode = 404
        $Bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        $Response.Close()
        continue
      }

      $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
      $ContentType = if ($MimeTypes.ContainsKey($Extension)) { $MimeTypes[$Extension] } else { "application/octet-stream" }
      $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
      $Response.StatusCode = 200
      $Response.ContentType = $ContentType
      $Response.ContentLength64 = $Bytes.Length
      $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
      $Response.Close()
    }
    catch {
      $Response.StatusCode = 500
      $Bytes = [System.Text.Encoding]::UTF8.GetBytes("Server error")
      $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
      $Response.Close()
    }
  }
}
finally {
  $Listener.Stop()
  $Listener.Close()
}
