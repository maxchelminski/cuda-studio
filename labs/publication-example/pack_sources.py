"""Make a standalone source archive of the learner's current milestone code."""

import argparse
from pathlib import Path
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[2]
NUMERIC = (
    "labs/compute/CMakeLists.txt",
    "labs/compute/main.cu",
    "labs/compute/common.cuh",
    "labs/compute/inputs.hpp",
    "labs/compute/learner.cuh",
    "labs/compute/solutions.cuh",
    "labs/compute/gemm.cuh",
    "labs/compute/verification.hpp",
    # The unchanged entry point includes these headers at compile time.
    "labs/compute/chain.cuh",
    "labs/compute/other_labs.cuh",
    "labs/compute/data/digits.txt",
)
CREATURE = (
    "labs/nightshift/nightshift.py",
    "labs/nightshift/engine.py",
    "labs/nightshift/creature_counts.py",
    "labs/nightshift/creature_material.py",
    "labs/nightshift/common.cuh",
    "labs/nightshift/creature.cuh",
    "labs/nightshift/frame.cu",
    "labs/nightshift/assets/painted-concrete-512.rgba.zlib",
    "labs/nightshift/assets/painted-concrete-source.txt",
    "labs/render/cuda_host.py",
)

WINDOWS = """Extract the ZIP into a writable folder. Run the commands from the folder
containing this file. The reference setup uses 64-bit Windows, a GeForce RTX
5070, a compatible NVIDIA driver, and CUDA Toolkit 12.8 Update 1. Set
`CUDA_PATH` to the toolkit directory if the installer did not set it.
[NVIDIA toolkit download](https://developer.nvidia.com/cuda-12-8-1-download-archive)
"""

NUMERIC_GUIDE = r"""# Reproduce the handwritten digit search

""" + WINDOWS + r"""
Install Visual Studio 2022 C++ Build Tools with the x64 MSVC toolchain and
Windows SDK. Place CMake 3.24 or newer and Ninja on PATH. Open **x64 Native Tools
Command Prompt for VS 2022** and enter `powershell` to inherit the x64 compiler
environment. Change to the extracted folder.
[Microsoft command-line build tools](https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170)

```powershell
$env:Path = (Join-Path $env:CUDA_PATH 'bin') + ';' + $env:Path
$nvcc = (Get-Command nvcc.exe -ErrorAction Stop).Source
$cl = (Get-Command cl.exe -ErrorAction Stop).Source
cmake -S labs/compute -B build -G Ninja "-DCMAKE_CUDA_COMPILER=$nvcc" "-DCMAKE_CXX_COMPILER=$cl" "-DCUDAToolkit_ROOT=$env:CUDA_PATH" -DCMAKE_CUDA_ARCHITECTURES=120 -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF
if ($LASTEXITCODE) { throw 'Configuration failed.' }
cmake --build build --parallel
if ($LASTEXITCODE) { throw 'Build failed.' }
$lab = '.\build\compute_lab.exe'
& $lab digits 1797
if ($LASTEXITCODE) { throw 'Digit check failed.' }
& $lab gemm 360 1437 64
if ($LASTEXITCODE) { throw 'Matched random check failed.' }
& $lab gemm 360 1437 256
if ($LASTEXITCODE) { throw 'Longer dot-product check failed.' }
```

Look for the shape, nine CUDA-event timings per method, FP64 error checks and
a final PASS from each run. The digit run adds nearest-image label agreement
for 360 queries against 1,437 gallery images. The two seeded random runs report
numerical checks only. Substitute the author's chosen K for 256 if it differs.

The snapshot includes the author's current `student_gemm` in
`labs/compute/learner.cuh`. The baseline, tiled example, cuBLAS calls and
measurement harness come from the CUDA course. The original shared entry point
references other numerical headers during compilation. Only the digit dataset
is included. Its source, transformation, license and checksum are in
`labs/compute/data/DIGITS-CREDIT.md`.

**For the author.** Attach this ZIP to your case study alongside your own raw
timings. Give the actual K, precision, build configuration, device and driver
used for the published rows. Point readers to the lines you changed.
"""

CREATURE_GUIDE = r"""# Reproduce the Sluice 09 traversal study

""" + WINDOWS + r"""
Use 64-bit Python 3.10 or newer with the standard library. Install the toolkit's
NVRTC runtime and builtins. A C++ host compiler is unnecessary for these
headless runs. The driver bridge compiles the included CUDA scene for your GPU
on each launch. Open PowerShell and change to the extracted folder.

```powershell
$env:Path = (Join-Path $env:CUDA_PATH 'bin') + ';' + $env:Path
$scene = '.\labs\nightshift\nightshift.py'
$counter = '.\labs\nightshift\creature_counts.py'
$shot = @('--width','640','--height','360','--time','2','--yaw','0','--pitch','0')
foreach ($gate in '0.25','0.8') {
    python -B $counter @shot --control $gate
    if ($LASTEXITCODE) { throw 'Primary hit check failed.' }
    python -B $scene @shot --scene creature --control $gate --features 7 --samples 1 --view beauty --bench --trials 9
    if ($LASTEXITCODE) { throw 'Beauty check failed.' }
}
$gate = '0.25'
$frames = New-Item -ItemType Directory -Path ('panels-' + [guid]::NewGuid().ToString('N'))
foreach ($panel in 'student-beauty','reference-work','student-work') {
    $mode, $view = $panel.Split('-')
    python -B $scene @shot --scene creature --control $gate --features 7 --samples 1 --mode $mode --view $view --save (Join-Path $frames.FullName ($panel + '.ppm'))
    if ($LASTEXITCODE) { throw 'Frame export failed.' }
}
$frames.FullName
```

The counter checks primary-ray hits and reports mean and maximum link tests.
The beauty benchmark checks pixels and returns reference, optimized and student
rows for both gate settings. GPU time includes creature preparation and
rendering. Host time also includes synchronization and readback. The three PPMs
are full-color frames readable by image editors. To reproduce a published
shot, use its stated gate and camera. To export PNGs directly, install Pillow
in the selected Python environment and change `.ppm` to `.png`.

The snapshot includes the author's current traversal in
`labs/nightshift/creature.cuh`. Search for `studentVisitsGroup`. The Sluice 09
starter supplies the scene and reference. See
`labs/nightshift/assets/painted-concrete-source.txt` for the CC0 texture by
Dimitrios Savva and Dario Barresi, its source links and conversion details.

**For the author.** Attach this ZIP alongside your report, raw hit and timing
output, and captioned panels. Give the parameter values used for each figure
and identify your own change to the starter.
"""


def read_source(relative):
    path = ROOT / relative
    if path.resolve(strict=True) != path:
        raise ValueError(f"Expected a regular course source at {relative}")
    return path.read_bytes()


def package(week, destination):
    paths = NUMERIC if week == "2" else CREATURE
    files = {name: read_source(name) for name in paths}
    if week == "2":
        attribution = read_source("labs/compute/data/SOURCES.md").decode("utf-8-sig")
        paragraphs = [line for line in attribution.splitlines() if line.startswith("**digits.txt.**")]
        if len(paragraphs) != 1:
            raise ValueError("Expected the digit dataset attribution in labs/compute/data/SOURCES.md")
        files["labs/compute/data/DIGITS-CREDIT.md"] = "# Digit dataset\n\n" + paragraphs[0] + "\n"
    files["REPRODUCE.md"] = NUMERIC_GUIDE if week == "2" else CREATURE_GUIDE

    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("xb") as output:
        try:
            with ZipFile(output, "w", ZIP_DEFLATED) as archive:
                for name, content in files.items():
                    archive.writestr(name, content)
        except BaseException:
            output.close()
            destination.unlink()
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("week", choices=("2", "4"))
    parser.add_argument("--output", type=Path, help="path to a new ZIP file")
    args = parser.parse_args()
    label = "digits" if args.week == "2" else "sluice"
    target = args.output or ROOT / "build" / "portfolio" / f"{label}-sources-{uuid4().hex}.zip"
    if target.suffix.lower() != ".zip":
        parser.error("Choose a filename ending in .zip")
    try:
        package(args.week, target)
    except FileExistsError:
        parser.exit(1, f"That path already exists. Choose a new ZIP filename: {target}\n")
    except (OSError, ValueError) as error:
        parser.exit(1, f"Could not create source archive: {error}\n")
    print(f"Source archive: {target.resolve()}")


if __name__ == "__main__":
    main()
