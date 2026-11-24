"""Night Shift, the native CUDA companion to Fieldwork's graphics sessions."""
import argparse
import csv
from dataclasses import replace
import math
import statistics
import sys

from engine import MODES, TITLES, VIEWS, Renderer, Shot, compare, save_image


def check(renderer):
    for shot in (Shot(width=127,height=73), Shot(width=145,height=91,time=5.2,yaw=.13,pitch=-.04,control=.83),
                 Shot(width=79,height=67,features=0,time=.2,control=.05),
                 Shot(width=97,height=59,samples=4,view="normals",yaw=-.15)):
        ref = renderer.render(replace(shot, mode="reference"), poison=True)
        ref.validate("reference")
        if len(set(ref.rgba[::4])) < 8:
            raise ValueError("Reference failed the nonuniform image check")
        for mode in ("optimized","student"):
            candidate = renderer.render(replace(shot, mode=mode), poison=True)
            count, delta, rmse = compare(ref, candidate)
            if count:
                raise ValueError(f"{mode}, {shot}: {count} unequal pixels, max delta {delta}/255, RMSE {rmse:g}")
        print(f"PASS {shot.width}x{shot.height} {shot.view} flags={shot.features} "
              f"samples={shot.samples}: all three frames identical")
    shot = Shot(width=159,height=95)
    on = renderer.render(shot, poison=True)
    for flag in (1,2,4):
        off = renderer.render(replace(shot, features=7 ^ flag), poison=True)
        different, _, _ = compare(on, off)
        if not different:
            raise ValueError(f"Feature bit {flag} produced no visible effect")
        print(f"PASS bit {flag} changes {different} pixels in this shot")
    if renderer.scene == "textile":
        from textile_input import verify_interaction
        verify_interaction(renderer)


def benchmark(renderer, shot, trials):
    if shot.view == "work":
        raise ValueError("Benchmark the beauty or normals pass. The work display intentionally changes between modes.")
    ref = renderer.render(replace(shot, mode="reference"), poison=True)
    for mode in MODES:
        candidate = renderer.render(replace(shot, mode=mode), poison=True)
        diff, _, _ = compare(ref, candidate)
        if diff:
            raise ValueError(f"{mode} changed {diff} pixels in benchmark preflight")
    timings = {m: [] for m in MODES}
    for trial in range(trials):
        offset = trial % len(MODES)
        for mode in MODES[offset:] + MODES[:offset]:
            frame = renderer.render(replace(shot, mode=mode))
            if frame.rgba != ref.rgba:
                raise ValueError(f"{mode} changed the frame during trial {trial+1}")
            timings[mode].append((frame.gpu_ms,frame.host_ms))
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(("device","scene","width","height","time","yaw","pitch","control","features","view",
                     "samples_per_pixel","exposure","mode","trials","gpu_p50_ms","gpu_p95_ms","host_p50_ms",
                     "host_p95_ms","different_pixels"))
    for mode in MODES:
        data = timings[mode]
        def stats(col):
            v = sorted(sample[col] for sample in data)
            return f"{statistics.median(v):.4f}", f"{v[math.ceil(.95*len(v))-1]:.4f}"
        writer.writerow((renderer.gpu.name,renderer.scene,shot.width,shot.height,shot.time,shot.yaw,
                         shot.pitch,shot.control,shot.features,shot.view,shot.samples,shot.exposure,
                         mode,trials,*stats(0),*stats(1),0))


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--scene", choices=TITLES, default="lighting")
    p.add_argument("--width", type=int)
    p.add_argument("--height", type=int)
    p.add_argument("--time", type=float, default=2.0)
    p.add_argument("--yaw", type=float, default=0.0, help="camera angle, radians")
    p.add_argument("--pitch", type=float, default=0.0)
    p.add_argument("--control", type=float, default=.5, help="scene-specific control in [0,1]")
    p.add_argument("--features", type=int, default=7, help="bit mask: material/reflections=1, shadows=2, detail=4")
    p.add_argument("--mode", choices=MODES, default="optimized")
    p.add_argument("--view", choices=VIEWS, default="beauty")
    p.add_argument("--samples", type=int, choices=(1,4,9),
                   help="samples per pixel (default 4 in the interactive viewer, 1 for command-line runs)")
    p.add_argument("--exposure", type=float, default=1.0)
    p.add_argument("--trials", type=int, default=9)
    actions = p.add_mutually_exclusive_group()
    actions.add_argument("--save", metavar="IMAGE", help="save a PNG, JPEG or dependency-free PPM")
    actions.add_argument("--check", action="store_true")
    actions.add_argument("--bench", action="store_true")
    a = p.parse_args()
    w = a.width if a.width is not None else (320 if a.bench else 768)
    h = a.height if a.height is not None else round(w*9/16)
    if not (1 <= w <= 3840 and 1 <= h <= 2160 and 0 <= a.control <= 1 and 0 <= a.features <= 7
            and 0 < a.exposure <= 8 and 1 <= a.trials <= 500 and all(math.isfinite(v) for v in (a.yaw,a.pitch,a.time))):
        p.error("Use finite settings, dimensions 1..3840 by 1..2160, control 0..1, exposure (0,8], features 0..7 and 1..500 trials")
    samples = a.samples or (1 if a.check or a.bench or a.save else 4)
    shot = Shot(w,h,a.time,a.yaw,a.pitch,a.control,a.features,a.mode,a.view,samples,a.exposure)
    if not (a.check or a.bench or a.save):
        from viewer import viewport
        return viewport(a.scene, shot)
    with Renderer(a.scene) as renderer:
        print(renderer.gpu.name, file=sys.stderr)
        if a.check:
            check(renderer)
        elif a.bench:
            benchmark(renderer, shot, a.trials)
        else:
            frame = renderer.render(shot, poison=True)
            save_image(a.save, frame, shot)
            print(f"{a.save}  {w}x{h}  {samples} spp  {frame.gpu_ms:.2f} GPU ms")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, ImportError) as exc:
        sys.exit(str(exc))
