$filePath = "css\components\layout.css"
$lines = Get-Content $filePath
$trimmed = $lines[0..1591]
Set-Content -Path $filePath -Value $trimmed -Encoding UTF8
Write-Host ("Done. Final line count: " + (Get-Content $filePath).Count)
