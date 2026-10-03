# ネオアーケードに「アストラの大地」を追加するスクリプト
# 使い方：リポジトリ直下の neo_install.bat をダブルクリック
param(
  [string]$NeoPath = 'C:\Users\owner\Desktop\aymu\deploy-6a670abb38fa3db924a29720',
  [string]$GameName = 'astra',
  [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'

Write-Host '=== アストラの大地 を ネオアーケード に追加します ==='
if (-not (Test-Path -LiteralPath $NeoPath)) {
  Write-Host ('ネオアーケードのフォルダが見つかりません: ' + $NeoPath)
  exit 1
}

# 1) ゲームの元ファイル（このスクリプトの1つ上のフォルダ。なければGitHubからダウンロード）
$repoRoot = Split-Path -Parent $PSScriptRoot
$src = $null
if ((Test-Path -LiteralPath (Join-Path $repoRoot 'index.html')) -and (Test-Path -LiteralPath (Join-Path (Join-Path $repoRoot 'js') 'main.js'))) {
  $src = $repoRoot
  Write-Host ('ゲームのファイル: ' + $src)
} else {
  Write-Host 'GitHubからゲームをダウンロードしています...'
  $tmp = Join-Path $env:TEMP 'astra_download'
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'astra.zip'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri 'https://github.com/ichigopan0-boop/aaa/archive/refs/heads/claude/nice-fermat-l2r1dw.zip' -OutFile $zip -UseBasicParsing
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  $found = Get-ChildItem -LiteralPath $tmp -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'index.html') } | Select-Object -First 1
  if (-not $found) { Write-Host 'ダウンロードしたファイルにゲームが見つかりませんでした'; exit 1 }
  $src = $found.FullName
}

# 2) ネオアーケードのトップページ（index.html）がある場所を探す
$root = $null
if (Test-Path -LiteralPath (Join-Path $NeoPath 'index.html')) {
  $root = $NeoPath
} else {
  $sub = Get-ChildItem -LiteralPath $NeoPath -Directory | Where-Object { $_.Name -ne $GameName -and (Test-Path -LiteralPath (Join-Path $_.FullName 'index.html')) } | Select-Object -First 1
  if ($sub) { $root = $sub.FullName } else { $root = $NeoPath }
}
Write-Host ('ネオアーケードの場所: ' + $root)

# 3) ゲームをコピー（前のバージョンがあれば入れ替え）
$dest = Join-Path $root $GameName
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
New-Item -ItemType Directory -Path $dest | Out-Null
foreach ($item in @('index.html', 'README.md', 'css', 'js', 'lib')) {
  $p = Join-Path $src $item
  if (Test-Path -LiteralPath $p) { Copy-Item -LiteralPath $p -Destination $dest -Recurse -Force }
}
Write-Host ('ゲームをコピーしました: ' + $dest)

# 4) トップページにボタンを追加（すでにあれば何もしない）
$index = Join-Path $root 'index.html'
if (Test-Path -LiteralPath $index) {
  $text = [IO.File]::ReadAllText($index, [Text.Encoding]::UTF8)
  if ($text -notmatch 'ASTRA-RPG-LINK') {
    Copy-Item -LiteralPath $index -Destination ($index + '.bak_astra') -Force
    $btn = '<!-- ASTRA-RPG-LINK --><a href="' + $GameName + '/index.html" style="position:fixed;right:16px;bottom:16px;z-index:99999;display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:16px;background:linear-gradient(135deg,#2f7a44,#1e3a6a);border:2px solid #e8c872;color:#fff;font:bold 16px sans-serif;text-decoration:none;box-shadow:0 4px 18px rgba(0,0,0,.45)">&#x2694; &#x30A2;&#x30B9;&#x30C8;&#x30E9;&#x306E;&#x5927;&#x5730;</a><!-- /ASTRA-RPG-LINK -->'
    $m = [regex]::Matches($text, '</body>', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($m.Count -gt 0) {
      $pos = $m[$m.Count - 1].Index
      $text = $text.Substring(0, $pos) + $btn + "`r`n" + $text.Substring($pos)
    } else {
      $text = $text + "`r`n" + $btn
    }
    [IO.File]::WriteAllText($index, $text, (New-Object Text.UTF8Encoding($false)))
    Write-Host 'トップページに「アストラの大地」ボタンを追加しました（元のファイルは index.html.bak_astra に保存）'
  } else {
    Write-Host 'トップページにはすでにボタンがあります'
  }
  if (-not $NoOpen) { Start-Process $index }
} else {
  Write-Host ('トップページ(index.html)が見つからなかったので、ボタンは追加していません。ゲームは ' + (Join-Path $dest 'index.html') + ' から開けます')
  if (-not $NoOpen) { Start-Process (Join-Path $dest 'index.html') }
}
Write-Host '完了しました！'
