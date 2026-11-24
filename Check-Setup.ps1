param([switch]$VerifyLabs)
$base = $PSScriptRoot
& (Join-Path $base 'Course-Environment.ps1')
Write-Output "Course root $base"
[IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and $_.Name.Substring(0,1) -in @('C','E','G') } |
    Select-Object Name,@{Name='FreeGiB';Expression={[Math]::Round($_.AvailableFreeSpace / 1GB,1)}} | Format-Table
foreach ($tool in @('python','nvidia-smi','nvcc','cl','cmake','ctest','ncu','nsys','compute-sanitizer')) {
    $cmd = Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) {Write-Output "$tool => $($cmd.Source)"} else {Write-Output "$tool => unavailable in this shell"}
}
if (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue) { & nvidia-smi.exe --query-gpu=name,driver_version,memory.total --format=csv,noheader }
if (Get-Command nvcc.exe -ErrorAction SilentlyContinue) { & nvcc.exe --version; & nvcc.exe --list-gpu-code | Select-String 'sm_120' }
Write-Output ("Portable C++ compiler on G: " + (Test-Path 'G:/CUDA-Studio/tools/w64devkit/bin/g++.exe'))
Write-Output "CUDA Toolkit path: $env:CUDA_PATH"
if (-not $VerifyLabs) { return }

$ErrorActionPreference = 'Stop'
Push-Location -LiteralPath $base
try {
    $scenes = @('labs/render/swarm.py','labs/knit/knit.py','labs/flow/flow.py','labs/pipeline/pipeline.py')
    foreach ($scene in $scenes) {
        & python -B $scene --check
        if ($LASTEXITCODE) { throw "Check failed in $scene. Read the first reported mismatch or compiler error." }
    }
    foreach ($scene in @('lighting','creature','textile','soundstage')) {
        & python -B labs/nightshift/nightshift.py --scene $scene --check
        if ($LASTEXITCODE) { throw "Night Shift validation failed in $scene." }
    }
    & python -B labs/nightshift/radio_checks.py
    if ($LASTEXITCODE) { throw 'Radio geometry disagrees with the independent CPU ray packet.' }
    foreach ($opening in @('0.25','0.8')) {
        & python -B labs/nightshift/creature_counts.py --control $opening
        if ($LASTEXITCODE) { throw "Sluice primary-hit comparison failed at gate opening $opening." }
    }
    & python -B labs/launch/check_now.py
    if ($LASTEXITCODE) { throw 'First-launch edge checks failed. See the reported index and expected value.' }
    & python -B labs/flow/vortex_refinement.py
    if ($LASTEXITCODE) { throw 'The manufactured vortex experiment failed.' }
    & python -B labs/blackwell/probe_scales.py --group 16 --query 1
    if ($LASTEXITCODE) { throw 'CPU quantization check failed.' }
    $native = 'build/compute/Release/compute_lab.exe'
    if (Test-Path -LiteralPath $native) {
        & ctest --test-dir build/compute -C Release --output-on-failure
        if ($LASTEXITCODE) { throw 'Native compute tests failed. Rebuild for the installed GPU and rerun.' }
        & .\build\first_kernel.exe
        if ($LASTEXITCODE) { throw 'First-launch test failed.' }
        Write-Output 'Verified the Windows visual, simulation, launch and native compute labs.'
    } else {
        Write-Output 'Native compute executable has not been built. Build-Native.ps1 runs its acceptance tests when the toolkit is ready.'
        $cap = @(& nvidia-smi.exe --query-gpu=compute_cap --format=csv,noheader)
        if ($LASTEXITCODE -eq 0 -and $cap.Count -eq 1 -and $cap[0].Trim() -eq '8.6') {
            & python -B labs/compute/practice_now.py all
            if ($LASTEXITCODE) {throw 'The existing RTX 3070 compute runtime failed its numerical checks.'}
        }
        Write-Output 'Partial verification. The native CUDA exercises still require a build. Run .\Build-Native.ps1 in Course PowerShell, then rerun .\Check-Setup.ps1 -VerifyLabs.'
    }
} finally { Pop-Location }

