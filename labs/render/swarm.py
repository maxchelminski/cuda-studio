"""Interactive CUDA rendering lab. Run python swarm.py --help for headless modes."""
import argparse
import csv
import math
from pathlib import Path
import statistics
import sys
import time

sys.dont_write_bytecode = True
from cuda_host import GPU, MODES
from scene import SEGMENT, cpu_render, pack, scene, slow_id


VIEWS = ("beauty", "ids", "work")
FIXED_TIME = 2.15


def difference(reference, actual, width):
    if reference == actual:
        return 0, None
    bad = [i for i in range(0, len(actual), 3) if actual[i:i + 3] != reference[i:i + 3]]
    pixel = bad[0] // 3
    return len(bad), (pixel % width, pixel // width)

def checked_image(gpu, packed, count, width, height, mode, view):
    # 0xffffff is neither an encoded segment ID nor a color in the reference palette.
    size = width * height * 3
    gpu.reserve("image", size)
    gpu.call("cuMemsetD8_v2", gpu.image, 255, size)
    return gpu.render(packed, count, width, height, mode, view)[0]


def plausible_boundary_id(segments, x, y, encoded):
    """Cross-precision check for pixels in a narrow FP32 silhouette band."""
    if encoded > len(segments):
        return False
    for i in range(len(segments) - 1, max(-1, encoded - 2), -1):
        ax, ay, bx, by, radius, _, _ = segments[i]
        dx, dy = bx - ax, by - ay
        px, py = x - ax, y - ay
        t = min(1.0, max(0.0, (px * dx + py * dy) / max(1e-6, dx*dx + dy*dy)))
        gap = math.hypot(px - t*dx, py - t*dy) - radius
        # Coordinates and intermediate differences in the device kernel are FP32.
        band = 8 * 2**-23 * max(1.0, abs(px), abs(py), abs(dx), abs(dy), radius)
        if i + 1 == encoded:
            return gap <= band
        if gap < -band:
            return False
    return encoded == 0


def verify_frame(gpu, segments, width, height):
    packed = pack(segments)
    quantized = list(SEGMENT.iter_unpack(packed))
    ids = cpu_render(quantized, width, height, 1)
    # Independent reverse traversal checks the CPU painter's clipping bounds.
    for y in range(0, height, max(1, height // 8)):
        for x in range(0, width, max(1, width // 9)):
            i = (y * width + x) * 3
            if int.from_bytes(ids[i:i + 3], "little") != slow_id(quantized, x, y):
                raise ValueError(f"CPU coverage disagreement at ({x}, {y})")
    ambiguous = 0
    if gpu:
        device_ids = checked_image(gpu, packed, len(segments), width, height, "baseline", 1)
        if device_ids != ids:
            for i in range(0, len(ids), 3):
                if device_ids[i:i+3] == ids[i:i+3]:
                    continue
                x, y = (i // 3) % width, (i // 3) // width
                winner = int.from_bytes(device_ids[i:i+3], "little")
                if not plausible_boundary_id(quantized, x + 0.5, y + 0.5, winner):
                    raise ValueError(f"CPU/device coverage disagreement at ({x}, {y}), device ID {winner}")
                ambiguous += 1
        beauty = checked_image(gpu, packed, len(segments), width, height, "baseline", 0)
        for mode in ("tiled", "student"):
            for ref, view in ((device_ids, 1), (beauty, 0)):
                pixels = checked_image(gpu, packed, len(segments), width, height, mode, view)
                count, where = difference(ref, pixels, width)
                if count:
                    raise ValueError(f"{mode} {VIEWS[view]} differs at {count} pixel(s); first at {where}")
    return ambiguous


def checks(gpu):
    # Half-integer endpoints align exactly with pixel centers. The final point
    # capsule tests the zero-length case; offscreen endpoints stress clipping.
    edge = [(0.5, 7.5, 30.5, 7.5, 1.0, 0, 0), (15.5, -5.5, 15.5, 50.5, 2, 1, 1),
            (16.5, 16.5, 16.5, 16.5, 3, 2, 2), (-10, -10, -5, -8, 1, 0, 0)]
    cases = [("empty", 17, 9, []), ("one pixel", 1, 1, scene(1, 1, 1, 0)),
             ("tile edges and point", 33, 19, edge), ("dense partial batch", 31, 29, edge * 67),
             ("animated partial tiles", 93, 59, scene(93, 59, 19, FIXED_TIME, (0.75, 0.30))),
             ("rounded silhouette", 3, 2, [(-0.5, 0.50001, -0.5, 0.50001, 1.0, 0.0, 0)])]
    for name, w, h, segments in cases:
        rounded = verify_frame(gpu, segments, w, h)
        note = f", {rounded} CPU/FP32 boundary pixel(s)" if rounded else ""
        print(f"PASS {name} ({w} x {h}, {len(segments)} segments{note})")


def timed_render(gpu, segments, width, height, mode, view):
    start = time.perf_counter()
    if gpu:
        rgb, kernel_ms = gpu.render(pack(segments), len(segments), width, height, mode, view)
    else:
        rgb, kernel_ms = cpu_render(segments, width, height, view), None
    return rgb, kernel_ms, 1000 * (time.perf_counter() - start)


def bench(gpu, a):
    segments = scene(a.width, a.height, a.worms, FIXED_TIME)
    modes = list(MODES) if gpu else ["cpu-painter"]
    if gpu:
        packed = pack(segments)
        for view in (0, 1):
            reference = checked_image(gpu, packed, len(segments), a.width, a.height, "baseline", view)
            if view == 0:
                expected = reference
            for mode in modes[1:]:
                pixels = checked_image(gpu, packed, len(segments), a.width, a.height, mode, view)
                count, first = difference(reference, pixels, a.width)
                if count:
                    raise ValueError(f"{mode} {VIEWS[view]} failed benchmark preflight at "
                                     f"{count} pixel(s); first at {first}")
    else:
        expected = cpu_render(segments, a.width, a.height, 0)
    samples = {m: ([], []) for m in modes}
    for frame in range(a.frames + 5):
        offset = frame % len(modes)
        for mode in modes[offset:] + modes[:offset]:
            rgb, kernel_ms, wall_ms = timed_render(gpu, segments, a.width, a.height, mode, 0)
            if rgb != expected:
                raise ValueError(f"{mode} changed the benchmark image; run --check")
            if frame >= 5:
                if kernel_ms is not None:
                    samples[mode][0].append(kernel_ms)
                samples[mode][1].append(wall_ms)
    if a.samples_out:
        with a.samples_out.open("x", encoding="utf-8", newline="") as output:
            raw = csv.writer(output)
            raw.writerow(("mode", "width", "height", "worms", "sample", "kernel_ms", "host_ms"))
            for mode, (kernel, host) in samples.items():
                for i, elapsed in enumerate(host):
                    raw.writerow((mode, a.width, a.height, a.worms, i + 1, kernel[i] if kernel else "", elapsed))
        print(f"Raw samples: {a.samples_out.resolve()}", file=sys.stderr)
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(("device", "mode", "width", "height", "worms", "segments", "samples",
                     "kernel_p50_ms", "kernel_p95_ms", "host_p50_ms", "host_p95_ms"))
    for mode, (ks, ws) in samples.items():
        def summarize(values):
            if not values:
                return "", ""
            ordered = sorted(values)
            return f"{statistics.median(ordered):.4f}", f"{ordered[math.ceil(0.95 * len(ordered)) - 1]:.4f}"
        writer.writerow((gpu.name if gpu else "CPU", mode, a.width, a.height, a.worms, len(segments),
                         a.frames, *summarize(ks), *summarize(ws)))


def viewport(gpu, a):
    import tkinter as tk
    from tkinter import messagebox
    root = tk.Tk()
    root.title("Abyssal Swarm  |  CUDA rendering lab")
    root.configure(bg="#122128")
    device = gpu.name if gpu else "CPU painter"
    mode, view = a.mode, VIEWS.index(a.view)
    w, h, worms = a.width, a.height, a.worms
    paused, visible = False, True
    focus = (0.50, 0.51)
    phase = FIXED_TIME
    toolbar = tk.Frame(root, bg="#122128")
    toolbar.pack(fill="x", padx=8, pady=5)
    canvas = tk.Canvas(root, width=w, height=h, bg="#101a20", borderwidth=0, highlightthickness=0)
    canvas.pack()
    picture = canvas.create_image(0, 0, anchor="nw")
    status = tk.Label(root, text="", font=("Consolas", 10), anchor="w", bg="#122128", fg="#d5e8e1")
    status.pack(fill="x", padx=10, pady=(6, 0))
    help_label = tk.Label(root, text="Click to move colony   |   +/- worms   |   Space freeze   |   H hide controls",
                          font=("Segoe UI", 9), anchor="w", bg="#122128", fg="#9eafa9")
    help_label.pack(fill="x", padx=10, pady=(0, 7))
    note = ""
    mode_buttons = {}

    def choose(value):
        nonlocal mode
        mode = value
        for name, button in mode_buttons.items():
            button.configure(relief="sunken" if value == name else "flat")

    def button(label, callback):
        b = tk.Button(toolbar, text=label, command=callback, bg="#2a4145", fg="#e1f1e9",
                      activebackground="#57747a", activeforeground="white", relief="flat", padx=7)
        b.pack(side="left", padx=(0, 4))
        return b

    if gpu:
        for i, name in enumerate(MODES, 1):
            mode_buttons[name] = button(f"{i} {name.title()}", lambda n=name: choose(n))
            root.bind(str(i), lambda e, n=name: choose(n))
        choose(mode)

    def toggle_pause(*_):
        nonlocal paused, note
        paused = not paused
        if not paused:
            note = ""

    def cycle_view(*_):
        nonlocal view
        view = (view + 1) % (3 if gpu else 2)

    def validate(*_):
        nonlocal paused, note
        paused = True
        try:
            rounded = verify_frame(gpu, scene(w, h, worms, phase, focus), w, h)
            note = "Frozen frame passed" + (f", {rounded} CPU/FP32 boundary pixel(s)" if rounded else "")
        except ValueError as exc:
            note = "Validation failed"
            messagebox.showerror("Pixel difference", str(exc))

    def reload_cuda(*_):
        nonlocal note
        try:
            gpu.reload()
            choose("student")
            note = "Student kernel recompiled"
        except (OSError, RuntimeError) as exc:
            note = "Build failed; previous kernel active"
            messagebox.showerror("CUDA compile log", str(exc))

    def population(delta):
        nonlocal worms, note
        worms = max(1, min(256, worms + delta))
        note = ""

    def move(event):
        nonlocal focus, note
        focus = (event.x / w, event.y / h)
        note = ""

    def toggle_hud(*_):
        nonlocal visible
        visible = not visible
        if visible:
            toolbar.pack(before=canvas, fill="x", padx=8, pady=5)
            status.pack(fill="x", padx=10, pady=(6, 0))
            help_label.pack(fill="x", padx=10, pady=(0, 7))
        else:
            for item in (toolbar, status, help_label):
                item.pack_forget()

    button("Space  Freeze", toggle_pause)
    button("D  View", cycle_view)
    button("V  Check", validate)
    if gpu:
        button("R  Compile", reload_cuda)
        root.bind("r", reload_cuda)
    root.bind("<space>", toggle_pause)
    root.bind("d", cycle_view)
    root.bind("v", validate)
    root.bind("h", toggle_hud)
    root.bind("<Escape>", lambda e: root.destroy())
    for key in ("<plus>", "<equal>", "<KP_Add>"):
        root.bind(key, lambda e: population(8))
    for key in ("<minus>", "<KP_Subtract>"):
        root.bind(key, lambda e: population(-8))
    canvas.bind("<Button-1>", move)
    previous = fps_start = time.perf_counter()
    frames = 0
    fps = 0.0

    def draw():
        nonlocal previous, fps_start, frames, fps, phase
        now = time.perf_counter()
        if not paused:
            phase += min(0.14, now - previous)
        previous = now
        try:
            segments = scene(w, h, worms, phase, focus)
            rgb, kernel_ms, _ = timed_render(gpu, segments, w, h, mode, view)
            header = f"P6\n{w} {h}\n255\n".encode()
            canvas.photo = tk.PhotoImage(data=header + rgb, format="PPM")
            canvas.itemconfigure(picture, image=canvas.photo)
        except (RuntimeError, OSError) as exc:
            messagebox.showerror("Rendering stopped", str(exc))
            root.destroy()
            return
        frames += 1
        elapsed = now - fps_start
        if elapsed >= 0.45:
            fps, frames, fps_start = frames / elapsed, 0, now
        timing = f"{kernel_ms:.2f} ms GPU" if gpu else "CPU"
        run_mode = mode if gpu else "painter"
        status.config(text=f"{fps:.1f} FPS   {timing}   {worms} worms   {run_mode} / {VIEWS[view]}"
                      + ("   FROZEN" if paused else "") + (f"   {note}" if note else ""))
        root.title(f"Abyssal Swarm  |  {device}  |  {fps:.1f} FPS")
        root.after(1, draw)

    root.after(1, draw)
    root.mainloop()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    jobs = p.add_mutually_exclusive_group()
    jobs.add_argument("--check", action="store_true", help="check edge cases and exact GPU equivalence")
    jobs.add_argument("--bench", action="store_true", help="print fixed-scene interleaved measurements as CSV")
    jobs.add_argument("--snapshot", type=Path, metavar="IMAGE.ppm", help="write one fixed frame")
    p.add_argument("--cpu", action="store_true", help="use the independent CPU painter")
    p.add_argument("--width", type=int)
    p.add_argument("--height", type=int)
    p.add_argument("--worms", type=int)
    p.add_argument("--frames", type=int, default=30, help="measured samples per mode in --bench")
    p.add_argument("--samples-out", type=Path, help="save individual benchmark samples to a new CSV")
    p.add_argument("--mode", choices=MODES, default="tiled")
    p.add_argument("--view", choices=VIEWS, default="beauty")
    a = p.parse_args()
    if a.samples_out and not a.bench:
        p.error("--samples-out requires --bench")
    a.width = a.width if a.width is not None else (320 if a.cpu else 768)
    a.height = a.height if a.height is not None else (200 if a.cpu else 448)
    a.worms = a.worms if a.worms is not None else (16 if a.cpu else 56)
    if not (1 <= a.width <= 1920 and 1 <= a.height <= 1080 and 1 <= a.worms <= 256 and a.frames >= 1):
        p.error("use width 1..1920, height 1..1080, worms 1..256, and at least one measured frame")
    if a.cpu and a.view == "work":
        p.error("work view measures CUDA candidate evaluations; choose beauty or ids for the CPU painter")
    gpu = None
    try:
        if not a.cpu:
            gpu = GPU()
            print(f"{gpu.name}\nNVRTC: {gpu.compiler.path}", file=sys.stderr)
        if a.check:
            checks(gpu)
        elif a.bench:
            bench(gpu, a)
        elif a.snapshot:
            segments = scene(a.width, a.height, a.worms, FIXED_TIME)
            rgb, _, _ = timed_render(gpu, segments, a.width, a.height, a.mode, VIEWS.index(a.view))
            a.snapshot.write_bytes(f"P6\n{a.width} {a.height}\n255\n".encode() + rgb)
        else:
            viewport(gpu, a)
    finally:
        if gpu:
            gpu.close()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError, AttributeError) as exc:
        print(f"Render lab: {exc}", file=sys.stderr)
        sys.exit(1)
