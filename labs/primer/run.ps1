param(
    [Parameter(Mandatory=$true,Position=0,ParameterSetName='Primer')]
    [ValidateRange(1,5)][int]$Exercise,
    [Parameter(ParameterSetName='Primer')]
    [switch]$ExtraChecks,
    [Parameter(Mandatory=$true,ParameterSetName='Study')]
    [ValidateSet('coverage','sectors','tree','transpose','chain','compact','ink','csr_setup','lateness')][string]$Study
)
$ErrorActionPreference = 'Stop'
$files = @('01_frames.cpp','02_loop.cpp','03_matrix.cpp','04_buffers.cpp','05_threads.cpp')
$defines = @()
if ($Study) {
    $source = Join-Path $PSScriptRoot ("study_" + $Study + ".cpp")
    $name = "study-" + $Study
} elseif ($ExtraChecks) {
    $source = Join-Path $PSScriptRoot 'extra_checks.cpp'
    $name = "exercise-$Exercise-extra"
    $defines = @("-DPRIMER_EXERCISE=$Exercise")
} else {
    $source = Join-Path $PSScriptRoot $files[$Exercise-1]
    $name = "exercise-" + $Exercise
}
$base = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$build = Join-Path $base 'build/primer'
New-Item -ItemType Directory -Force -Path $build | Out-Null
$binary = Join-Path $build ($name + ".exe")
$portable = Join-Path $base 'tools/w64devkit/bin/g++.exe'
if (-not (Test-Path -LiteralPath $portable)) {
    $portable = 'G:/CUDA-Studio/tools/w64devkit/bin/g++.exe'
}
$savedTemp = $env:TEMP
$savedTmp = $env:TMP
try {
    $env:TEMP = $build
    $env:TMP = $build
    if (Test-Path -LiteralPath $portable) {
        & $portable -std=c++17 -Wall -Wextra -O1 @defines $source -o $binary
    } elseif (Get-Command g++ -ErrorAction SilentlyContinue) {
        & g++ -std=c++17 -Wall -Wextra -O1 @defines $source -o $binary
    } elseif (Get-Command cl.exe -ErrorAction SilentlyContinue) {
        $object = Join-Path $build ($name + ".obj")
        & cl.exe /nologo /std:c++17 /EHsc @defines "/Fo$object" "/Fe$binary" $source
    } else { throw 'Use the portable compiler in G:/CUDA-Studio/tools or launch a Developer PowerShell with C++ tools.' }
    $compileResult = $LASTEXITCODE
} finally {
    $env:TEMP = $savedTemp
    $env:TMP = $savedTmp
}
if ($compileResult -ne 0) { exit $compileResult }
Push-Location -LiteralPath $base
try {
    & $binary
    $result = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $result
