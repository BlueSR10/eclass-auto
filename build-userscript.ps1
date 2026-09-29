# extension\auto.js 로 Tampermonkey용 eclass-auto.user.js 를 만든다. 실행할 때마다 버전 끝자리가 +1 된다.
# 실행:  powershell -ExecutionPolicy Bypass -File build-userscript.ps1
# 그다음 GitHub Desktop 에서 Commit → Push 하면 친구들에게 자동 업데이트된다.

$Version   = "1.1.3"   # 마지막으로 만든 버전 (스크립트가 알아서 고침)
$UpdateUrl = "https://raw.githubusercontent.com/BlueSR10/eclass-auto/main/eclass-auto.user.js"

$ErrorActionPreference = "Stop"
$self = $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $self
$src  = Join-Path $root "extension\auto.js"
$out  = Join-Path $root "eclass-auto.user.js"
$utf8Bom = New-Object Text.UTF8Encoding $true
$utf8    = New-Object Text.UTF8Encoding $false

# 버전 +1 하고 이 파일에 기록
$p = $Version.Split(".")
$Version = "{0}.{1}.{2}" -f $p[0], $p[1], ([int]$p[2] + 1)
$me = [IO.File]::ReadAllText($self, [Text.Encoding]::UTF8)
$me = [regex]::Replace($me, '(?m)^\$Version\s*=\s*"[\d.]+"', "`$Version   = `"$Version`"", 1)
[IO.File]::WriteAllText($self, $me, $utf8Bom)

$header = @"
// ==UserScript==
// @name         eClass 영상 자동 넘기기
// @namespace    astra-video-auto
// @version      $Version
// @description  서울과기대 eClass 온라인 강의를 1배속으로 재생하고, 출석인정 시간을 채우면 출석(종료) 후 다음 영상을 자동으로 엽니다.
// @match        https://eclass.seoultech.ac.kr/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @noframes
// @updateURL    $UpdateUrl
// @downloadURL  $UpdateUrl
// ==/UserScript==

window.__astraUserscript = true;


"@

$body = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)
[IO.File]::WriteAllText($out, $header + $body, $utf8)
Write-Output "만듦: $out (버전 $Version)"
Write-Output "이제 GitHub Desktop 에서 Commit → Push 하세요."
