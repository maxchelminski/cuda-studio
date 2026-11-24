param([switch]$RuntimeOnly, [switch]$RequireCompiler)
$ErrorActionPreference = 'Stop'

# These settings apply only to this course process and its children.
$courseTools = Join-Path $PSScriptRoot 'tools'
$installedTools = 'G:\CUDA-Studio\tools'
$toolRoots = @($courseTools, $installedTools | Select-Object -Unique)
$localToolkit = $null
foreach ($toolsDir in $toolRoots) {
    $candidate = Join-Path $toolsDir 'cuda-12.8.1'
    if (Test-Path -LiteralPath (Join-Path $candidate 'bin\nvcc.exe')) {
        $localToolkit = $candidate
        break
    }
}

if (-not $RuntimeOnly -and $env:VSCMD_ARG_TGT_ARCH -ne 'x64') {
    $vsRoot = $null
    foreach ($toolsDir in $toolRoots) {
        $candidate = Join-Path $toolsDir 'VS2022'
        if (Test-Path -LiteralPath (Join-Path $candidate 'VC\Auxiliary\Build\vcvars64.bat')) {
            $vsRoot = $candidate
            break
        }
    }
    if (-not $vsRoot) {
        $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
        if (Test-Path -LiteralPath $vswhere) {
            $vsRoot = & $vswhere -latest -products '*' -version '[17.0,18.0)' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        }
    }
    if ($vsRoot) {
        $vcvars = Join-Path $vsRoot 'VC\Auxiliary\Build\vcvars64.bat'
        $variables = & $env:ComSpec /d /c ('call "{0}" >nul && set' -f $vcvars)
        if ($LASTEXITCODE -ne 0) { throw "MSVC x64 initialization failed at $vcvars." }
        foreach ($entry in $variables) {
            $split = $entry.IndexOf('=')
            if ($split -gt 0) {
                [Environment]::SetEnvironmentVariable($entry.Substring(0,$split), $entry.Substring($split+1), 'Process')
            }
        }
    }
}

$prepend = @()
if ($localToolkit) {
    $env:CUDA_PATH = $localToolkit
    $env:CUDAToolkit_ROOT = $localToolkit
    $bin = Join-Path $localToolkit 'bin'
    $prepend += $bin
    $compilerDll = Get-ChildItem -LiteralPath $bin -Filter 'nvrtc64*.dll' -File |
        Where-Object { $_.Name -match '^nvrtc64_[0-9]+_[0-9]+\.dll$' } | Select-Object -First 1
    if ($compilerDll) { $env:CUDA_LAB_NVRTC = $compilerDll.FullName }
    $sanitizer = Join-Path $localToolkit 'compute-sanitizer'
    if (Test-Path -LiteralPath (Join-Path $sanitizer 'compute-sanitizer.exe')) { $prepend += $sanitizer }
    foreach ($toolPattern in @('nsight-compute\nsight-compute\*\ncu.bat','nsight-systems\nsight-systems\*\target-windows-x64\nsys.exe')) {
        $profiler = Get-Item -Path (Join-Path $localToolkit $toolPattern) -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($profiler) { $prepend += $profiler.DirectoryName }
    }
}

if (-not $RuntimeOnly) {
    foreach ($toolsDir in $toolRoots) {
        $portableBin = Join-Path $toolsDir 'w64devkit\bin'
        if (Test-Path -LiteralPath (Join-Path $portableBin 'cmake.exe')) {
            # Keep the MSVC linker and Windows SDK ahead of any portable tools.
            if (($env:PATH -split ';') -notcontains $portableBin) { $env:PATH += ";$portableBin" }
            break
        }
    }
}
if ($prepend.Count) {
    $prior = @($env:PATH -split ';' | Where-Object { $_ -and $prepend -notcontains $_ })
    $env:PATH = (@($prepend) + $prior) -join ';'
}
if ($localToolkit) {
    $courseBuild = Join-Path $PSScriptRoot 'build'
    $scratch = Join-Path $courseBuild 'temp'
    $driverCache = Join-Path $courseBuild 'driver-cache'
    foreach ($dir in @($scratch,$driverCache)) {
        if (-not (Test-Path -LiteralPath $dir)) { [void][IO.Directory]::CreateDirectory($dir) }
    }
    $env:TEMP = $scratch
    $env:TMP = $scratch
    $env:CUDA_CACHE_PATH = $driverCache
}
if ($RequireCompiler -and -not (Get-Command cl.exe -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'MSVC x64 is unavailable. Install the Visual Studio 2022 C++ Build Tools and Windows SDK from Setup & reading.'
}
