[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory, Position=0)]
    [ValidateNotNullOrEmpty()]
    [string]$Path,

    [ValidateSet('Auto','VSCode','Notepad++','Notepad')]
    [string]$Editor = $(if ($env:CUDA_COURSE_EDITOR) { $env:CUDA_COURSE_EDITOR } else { 'Auto' })
)
$ErrorActionPreference = 'Stop'

function Find-CourseEditor([string]$name) {
    $program = @{ VSCode='Code.exe'; 'Notepad++'='notepad++.exe'; Notepad='notepad.exe' }[$name]
    $candidates = @(
        (Get-Command $program -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source)
        foreach ($root in @('HKCU:\Software','HKLM:\Software','HKLM:\Software\WOW6432Node')) {
            $key = Get-Item -LiteralPath "$root\Microsoft\Windows\CurrentVersion\App Paths\$program" -ErrorAction SilentlyContinue
            if ($key) { $key.GetValue('') }
        }
        if ($name -eq 'VSCode') {
            # A portable installation can expose bin\code.cmd on PATH.
            $cli = Get-Command code.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($cli) { Join-Path (Split-Path -Parent (Split-Path -Parent $cli.Source)) $program }
            Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
            Join-Path $env:ProgramFiles 'Microsoft VS Code\Code.exe'
        }
        if ($name -eq 'Notepad++') {
            foreach ($folder in @($env:ProgramFiles,${env:ProgramFiles(x86)},(Join-Path $env:LOCALAPPDATA 'Programs'))) {
                if ($folder) { Join-Path $folder 'Notepad++\notepad++.exe' }
            }
        }
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate.Trim('"') -PathType Leaf)) {
            return $candidate.Trim('"')
        }
    }
}

if (-not [IO.Path]::IsPathRooted($Path)) { $Path = Join-Path $PSScriptRoot $Path }
$file = [IO.Path]::GetFullPath($Path)
if (Test-Path -LiteralPath $file -PathType Container) { throw "Choose a file inside the folder: $file" }
if (-not (Test-Path -LiteralPath (Split-Path -Parent $file) -PathType Container)) {
    throw "Create the containing folder before opening this file: $file"
}

$choices = if ($Editor -eq 'Auto') { @('VSCode','Notepad++','Notepad') } else { @($Editor) }
foreach ($choice in $choices) {
    $program = Find-CourseEditor $choice
    if ($program) {
        if ($PSCmdlet.ShouldProcess($file,"Open in $choice ($program)")) {
            $argument = '"{0}"' -f $file
            if ($choice -eq 'VSCode') {
                # Detach Electron stdout/stderr to NUL so VS Code logs never pollute Course PowerShell.
                $prevAttach = $env:ELECTRON_NO_ATTACH_CONSOLE
                $prevNode = $env:ELECTRON_RUN_AS_NODE
                try {
                    $env:ELECTRON_NO_ATTACH_CONSOLE = '1'
                    Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
                    Start-Process -FilePath $program -ArgumentList $argument -RedirectStandardOutput 'NUL' -RedirectStandardError 'NUL'
                } finally {
                    if ($null -eq $prevAttach) { Remove-Item Env:\ELECTRON_NO_ATTACH_CONSOLE -ErrorAction SilentlyContinue } else { $env:ELECTRON_NO_ATTACH_CONSOLE = $prevAttach }
                    if ($null -ne $prevNode) { $env:ELECTRON_RUN_AS_NODE = $prevNode }
                }
            } else {
                Start-Process -FilePath $program -ArgumentList $argument
            }
        }
        return
    }
}
throw "Windows could not find the requested editor ($Editor)."
