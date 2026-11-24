param([ValidateSet('Auto','120','86')][string]$Architecture='Auto')
$ErrorActionPreference='Stop'
$base = $PSScriptRoot
$build = Join-Path $base 'build'
& (Join-Path $base 'Course-Environment.ps1') -RequireCompiler
foreach ($tool in @('nvcc.exe','cl.exe','cmake.exe','ctest.exe')) {
    if (-not (Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue)) { throw "Missing $tool. Check the toolkit and C++ Build Tools on the course Setup page." }
}
if ($Architecture -eq 'Auto') {
    if (-not (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue)) {
        throw 'Cannot detect the card. Pass -Architecture 120 for the RTX 5070 or -Architecture 86 for the RTX 3070.'
    }
    $devices = @(& nvidia-smi.exe --query-gpu=compute_cap --format=csv,noheader | ForEach-Object { $_.Trim().Replace('.','') } | Sort-Object -Unique)
    if ($LASTEXITCODE -or $devices.Count -ne 1 -or $devices[0] -notin @('120','86')) {
        throw 'Select the course card explicitly with -Architecture 120 (RTX 5070) or -Architecture 86 (RTX 3070).'
    }
    $Architecture = $devices[0]
}
$supported = & nvcc.exe --list-gpu-code
if ($LASTEXITCODE -or -not (($supported -join ' ') -match ('\bsm_' + $Architecture + '\b'))) {
    throw "The selected nvcc does not list sm_$Architecture. Check nvcc --version and the toolkit path in this shell."
}
Write-Output "Compiling for sm_$Architecture with $((Get-Command nvcc.exe).Source)"
$tmp = Join-Path $build 'temp'
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$priorTemp = $env:TEMP
$priorTmp = $env:TMP
$priorCache = $env:CUDA_CACHE_PATH
$env:TEMP = $tmp
$env:TMP = $tmp
$env:CUDA_CACHE_PATH = Join-Path $build 'driver-cache'
Push-Location $build
try {
    & nvcc.exe -std=c++17 -lineinfo "-arch=sm_$Architecture" (Join-Path $base 'labs/launch/first_kernel.cu') -o first_kernel.exe
    if ($LASTEXITCODE) {throw 'First CUDA compilation failed.'}
    & .\first_kernel.exe
    if ($LASTEXITCODE) {throw 'First kernel failed its checks.'}
    $compute = Join-Path $build 'compute'
    $nvcc = (Get-Command nvcc.exe -CommandType Application).Source
    $cudaRoot = Split-Path -Parent (Split-Path -Parent $nvcc)
    $ninja = Get-Command ninja.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($ninja) {
        # The NVIDIA redistributable toolkit supplies nvcc without installing
        # Visual Studio's machine-wide CUDA .props and .targets. Ninja drives
        # nvcc and cl directly and keeps the Release output used by every lab.
        $generator = 'Ninja Multi-Config'
        $buildOptions = @("-DCMAKE_MAKE_PROGRAM=$($ninja.Source)", "-DCMAKE_CUDA_COMPILER=$nvcc",
                          "-DCMAKE_CXX_COMPILER=$((Get-Command cl.exe -CommandType Application).Source)")
    } else {
        $generator = 'Visual Studio 17 2022'
        $buildOptions = @('-A','x64', '-T', "cuda=$cudaRoot")
    }
    $cacheFile = Join-Path $compute 'CMakeCache.txt'
    if (Test-Path -LiteralPath $cacheFile) {
        $cached = Get-Content -LiteralPath $cacheFile
        $priorGenerator = ($cached | Where-Object { $_ -like 'CMAKE_GENERATOR:INTERNAL=*' }) -replace '^[^=]*=', ''
        $priorNvcc = ($cached | Where-Object { $_ -match '^CMAKE_CUDA_COMPILER:[^=]+=' }) -replace '^[^=]*=', ''
        if ($priorGenerator -ne $generator -or ($priorNvcc -and ($priorNvcc -replace '/','\') -ne $nvcc)) {
            Write-Output "Reconfiguring the CMake build for $generator and $nvcc."
            $buildOptions += '--fresh'
        }
    }
    & cmake -S (Join-Path $base 'labs/compute') -B $compute -G $generator @buildOptions "-DCUDAToolkit_ROOT=$cudaRoot" "-DCMAKE_CUDA_ARCHITECTURES=$Architecture"
    if ($LASTEXITCODE) {throw 'CMake configuration failed.'}
    & cmake --build $compute --config Release --parallel
    if ($LASTEXITCODE) {throw 'Compute lab build failed.'}
    # The private toolkit is outside Windows' default DLL search path. A hard
    # link beside the executable supports direct launches without copying cuBLAS.
    if ($cudaRoot -eq (Join-Path $base 'tools\cuda-12.8.1')) {
        foreach ($library in @('cudart64_12.dll','cublas64_12.dll','cublasLt64_12.dll')) {
            $sourceDll = Join-Path $cudaRoot "bin\$library"
            $besideExe = Join-Path $compute "Release\$library"
            if (-not (Test-Path -LiteralPath $besideExe)) {
                New-Item -ItemType HardLink -Path $besideExe -Target $sourceDll -ErrorAction Stop | Out-Null
            }
        }
    }
    & ctest --test-dir $compute -C Release --output-on-failure
    if ($LASTEXITCODE) {throw 'Compute lab validation failed.'}
    Write-Output "Ready: $compute\Release\compute_lab.exe"
} finally {
    Pop-Location
    $env:TEMP = $priorTemp
    $env:TMP = $priorTmp
    $env:CUDA_CACHE_PATH = $priorCache
}

