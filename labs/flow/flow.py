"""CUDA ink tunnel. Drag to stir, or run --check / --bench in a terminal."""

import argparse
import csv
import math
import statistics
import struct
import sys
import time

sys.dont_write_bytecode = True
from solver import FLOAT, INT, Grid, MODES, backend, student_span  # noqa: E402


def neighbors(x, y, w, h):
    return y * w + (x - 1) % w, y * w + (x + 1) % w, ((y - 1) % h) * w + x, ((y + 1) % h) * w + x


def manufactured(w, h):
    phi = [
        math.sin(2 * math.pi * (3 * x / w + 2 * y / h)) + 0.2 * math.cos(2 * math.pi * x / w)
        for y in range(h)
        for x in range(w)
    ]
    u, v = [], []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            _, r, _, d = neighbors(x, y, w, h)
            u.append(0.75 + phi[r] - phi[i])
            v.append(-0.5 + phi[d] - phi[i])
    return u, v


def cpu_projection(u, v, w, h, sweeps):
    sites = [neighbors(i % w, i // w, w, h) for i in range(w * h)]
    b = [(u[i] - u[left]) + (v[i] - v[top]) for i, (left, _, top, _) in enumerate(sites)]
    p = [0.0] * (w * h)
    for _ in range(sweeps):
        p = [
            pi + ((p[left] + p[right] + p[top] + p[bottom]) - 4 * pi - b[i]) / 6
            for i, (pi, (left, right, top, bottom)) in enumerate(zip(p, sites))
        ]
    return (
        b,
        p,
        [u[i] - (p[r] - p[i]) for i, (_, r, _, _) in enumerate(sites)],
        [v[i] - (p[d] - p[i]) for i, (_, _, _, d) in enumerate(sites)],
    )


def upload(grid, ptr, values):
    data = struct.pack(f"<{len(values)}f", *values)
    grid.g.call("cuMemcpyHtoD_v2", ptr, data, len(data))


def rms(values):
    return math.sqrt(sum(v * v for v in values) / len(values))

def max_field_error(actual, expected, label):
    if not all(math.isfinite(a) and math.isfinite(b) for a, b in zip(actual, expected)):
        raise ValueError(f"Non-finite value in {label}")
    return max(abs(a - b) for a, b in zip(actual, expected))


class Brush:
    """Collect pointer motion between fixed simulation steps."""
    def __init__(self):
        self.position = None
        self.previous = None
        self.pending = False
        self.dx = self.dy = 0.0

    def move(self, x, y):
        if self.previous is not None:
            self.dx += x - self.previous[0]
            self.dy += y - self.previous[1]
        self.position = self.previous = (x, y)
        self.pending = True

    def release(self):
        # Keep any unsampled stroke until the next step, including a quick tap.
        self.previous = None
        if not self.pending:
            self.position = None

    def sample(self):
        if self.position is None:
            return (-1, -1, 0, 0)
        x, y = self.position
        impulse = (x, y, max(-2, min(2, 0.5 * self.dx)), max(-2, min(2, 0.5 * self.dy)))
        self.dx = self.dy = 0.0
        self.position = self.previous
        self.pending = False
        return impulse


def checks(gpu):
    brush = Brush()
    brush.move(2, 3)
    brush.move(3, 3)
    brush.move(5, 4)
    brush.release()
    if brush.sample() != (5, 4, 1.5, 0.5) or brush.sample() != (-1, -1, 0, 0):
        raise ValueError("A rapid pointer stroke lost motion or injected it more than once")
    brush.move(3, 2)
    brush.sample()
    brush.release()
    if brush.sample() != (-1, -1, 0, 0):
        raise ValueError("A released stationary brush kept injecting dye")
    print("PASS drag accumulation between simulation steps")
    for w, h in ((9, 7), (31, 19)):
        u, v = manufactured(w, h)
        grid = Grid(gpu, w, h) if gpu else None
        try:
            for sweeps in (0, 1, 2, 7, 34):
                b, p, up, vp = cpu_projection(u, v, w, h, sweeps)
                residual, after = [], []
                for i in range(w * h):
                    left, right, top, bottom = neighbors(i % w, i // w, w, h)
                    residual.append(b[i] - (p[left] + p[right] + p[top] + p[bottom] - 4 * p[i]))
                    after.append((up[i] - up[left]) + (vp[i] - vp[top]))
                if max(abs(a - r) for a, r in zip(after, residual)) > 2e-13 or abs(sum(b)) > 1e-11:
                    raise ValueError("CPU periodic operator identity or compatibility failed")
                if sweeps and not rms(after) < rms(b):
                    raise ValueError("Pressure solve did not reduce divergence")
                if grid:
                    upload(grid, grid.us, u)
                    upload(grid, grid.vs, v)
                    for mode in MODES:
                        # Make a missing first pressure store observable even
                        # when a previous variant produced the expected answer.
                        grid.g.call("cuMemsetD8_v2", grid.tmp, 255, w * h * 4)
                        grid.pressure(mode, sweeps)
                        for ptr, ref in ((grid.b, b), (grid.p, p), (grid.u, up), (grid.v, vp)):
                            vals = grid.scalars(ptr)
                            if not all(math.isfinite(a) and abs(a - e) < 5e-6 for a, e in zip(vals, ref)):
                                raise ValueError(f"{mode} differs from CPU on {w}x{h} after {sweeps} sweeps")
                        before_gpu, after_gpu, res_gpu, gap = grid.metrics()
                        if (
                            gap > 3e-6
                            or max(
                                abs(before_gpu - rms(b)),
                                abs(after_gpu - rms(after)),
                                abs(res_gpu - rms(residual)),
                            )
                            > 1e-6
                        ):
                            raise ValueError(f"{mode} divergence/residual diagnostics disagree with CPU")
            print(f"PASS {w}x{h}, 0/1/2/7/34 sweeps; RMS divergence {rms(b):.6f} -> {rms(after):.6f}")
            if grid:
                ux = [2.0] * (w * h)
                vy = [math.sin(2 * math.pi * (i % w) / w) for i in range(w * h)]
                upload(grid, grid.u, ux)
                upload(grid, grid.v, vy)
                grid.kernel(
                    "advect_velocity",
                    grid.u,
                    grid.v,
                    grid.us,
                    grid.vs,
                    INT(w),
                    INT(h),
                    FLOAT(0.5),
                    FLOAT(-1),
                    FLOAT(-1),
                    FLOAT(0),
                    FLOAT(0),
                )
                got = grid.scalars(grid.vs)
                translated = [0.999 * vy[(i // w) * w + (i % w - 1) % w] for i in range(w * h)]
                if max_field_error(got, translated, "periodic advection") > 3e-6:
                    raise ValueError("Periodic semi-Lagrangian one-cell translation failed")
                print("PASS one-cell periodic backtrace including the left seam")
        finally:
            if grid:
                grid.close()


def benchmark(gpu, a):
    grids, samples = {}, {m: [] for m in MODES}
    try:
        for m in MODES:
            grids[m] = Grid(gpu, a.width, a.height)
        for frame in range(a.frames + 5):
            offset = frame % 3
            for m in MODES[offset:] + MODES[:offset]:
                grid = grids[m]
                grid.step(m, a.sweeps)
                ms = grid.pressure_ms()
                if frame >= 5:
                    samples[m].append(ms)
        expected = grids["baseline"].image(0)
        reference = grids["baseline"]
        fields = {name: reference.scalars(getattr(reference, name)) for name in ("u", "v", "rose", "aqua")}
        writer = csv.writer(sys.stdout, lineterminator="\n")
        writer.writerow(
            (
                "device",
                "mode",
                "width",
                "height",
                "sweeps",
                "samples",
                "pressure_p50_ms",
                "pressure_p95_ms",
                "rms_div_before",
                "rms_div_after",
                "rms_residual",
                "max_operator_defect",
            )
        )
        for m in MODES:
            grid = grids[m]
            for name, values in fields.items():
                gap = max_field_error(grid.scalars(getattr(grid, name)), values, f"{m} {name}")
                if gap > 5e-6:
                    raise ValueError(f"{m} {name} differs from the reference by {gap:.7g}")
            if grid.image(0) != expected:
                raise ValueError(f"{m} changed the final dye image")
            values = sorted(samples[m])
            writer.writerow(
                (
                    gpu.name,
                    m,
                    a.width,
                    a.height,
                    a.sweeps,
                    a.frames,
                    f"{statistics.median(values):.5f}",
                    f"{values[math.ceil(0.95 * a.frames) - 1]:.5f}",
                    *(f"{v:.7g}" for v in grid.metrics()),
                )
            )
    finally:
        for g in grids.values():
            g.close()


def viewport(gpu, a):
    import tkinter as tk
    from tkinter import messagebox

    grid = Grid(gpu, a.width, a.height)
    root = tk.Tk()
    root.configure(bg="#122228")
    root.title(f"Ink Tunnel  |  {gpu.name}")
    bar = tk.Frame(root, bg="#122228")
    bar.pack(fill="x", padx=7, pady=5)
    scale = max(1, min(4, 800 // a.width, 560 // a.height))
    canvas = tk.Canvas(
        root,
        width=grid.w * scale,
        height=grid.h * scale,
        bg="#0a121e",
        highlightthickness=0,
        cursor="crosshair",
    )
    canvas.pack()
    pic = canvas.create_image(0, 0, anchor="nw")
    status = tk.Label(root, bg="#122228", fg="#dbe8dc", font=("Consolas", 10), anchor="w", justify="left")
    status.pack(fill="x", padx=8, pady=4)
    tk.Label(
        root,
        text="Drag to inject dye and momentum    [ / ] sweeps    Space freeze    D field    N reset    R compile",
        bg="#122228",
        fg="#acbdbc",
        anchor="w",
    ).pack(fill="x", padx=8, pady=(0, 5))
    mode, view, sweeps, paused = "fused", 0, a.sweeps, False
    brush = Brush()
    buttons = {}

    def button(label, callback):
        b = tk.Button(
            bar,
            text=label,
            command=callback,
            bg="#32494b",
            fg="#e2efe5",
            activebackground="#67827c",
            relief="flat",
        )
        b.pack(side="left", padx=(0, 5))
        return b

    def select(name):
        nonlocal mode
        mode = name
        if paused and grid.time > 0:
            grid.pressure(mode, sweeps)
        for m, b in buttons.items():
            b.configure(relief="sunken" if m == name else "flat")

    for i, m in enumerate(MODES, 1):
        buttons[m] = button(f"{i} {m.title()}", lambda n=m: select(n))
        root.bind(str(i), lambda e, n=m: select(n))
    select(mode)

    def change(delta):
        nonlocal sweeps
        sweeps = max(0, min(128, sweeps + delta))
        if paused and grid.time > 0:
            grid.pressure(mode, sweeps)

    def cycle(*_):
        nonlocal view
        view = (view + 1) % 3

    def pause(*_):
        nonlocal paused
        paused = not paused

    def reload_kernel(*_):
        try:
            span = student_span()
            gpu.reload()
            grid.span = span
            select("student")
        except (RuntimeError, ValueError, OSError) as ex:
            messagebox.showerror("CUDA compile log", str(ex))

    def drag(e):
        x, y = min(grid.w - 1, max(0, e.x / scale)), min(grid.h - 1, max(0, e.y / scale))
        brush.move(x, y)

    def reset(*_):
        nonlocal paused, brush
        grid.reset()
        paused = False
        brush = Brush()

    def release(*_):
        brush.release()

    button("Freeze", pause)
    button("View", cycle)
    button("Reset", reset)
    button("Compile", reload_kernel)
    canvas.bind("<Button-1>", drag)
    canvas.bind("<B1-Motion>", drag)
    canvas.bind("<ButtonRelease-1>", release)
    root.bind("<space>", pause)
    root.bind("d", cycle)
    root.bind("r", reload_kernel)
    root.bind("n", reset)
    root.bind("<bracketleft>", lambda e: change(-2))
    root.bind("<bracketright>", lambda e: change(2))
    root.bind("<Escape>", lambda e: root.destroy())
    last = time.perf_counter()
    frames = 0

    def tick():
        nonlocal last, frames
        try:
            if not paused or grid.time == 0:
                grid.step(mode, sweeps, brush.sample())
            rgb = grid.image(view)
            img = tk.PhotoImage(data=f"P6\n{grid.w} {grid.h}\n255\n".encode() + rgb, format="PPM")
            canvas.photo = img.zoom(scale) if scale != 1 else img
            canvas.itemconfigure(pic, image=canvas.photo)
            now = time.perf_counter()
            frames += 1
            if now - last >= 0.35 or not status.cget("text"):
                before, after, res, defect = grid.metrics()
                status.configure(
                    text=f"{frames / max(0.001, now - last):.0f} FPS   {grid.pressure_ms():.3f} ms pressure   "
                    f"{sweeps} sweeps   {('dye', 'divergence before', 'divergence after')[view]}"
                    + ("   FROZEN" if paused else "")
                    + f"\nRMS divergence {before:.5f} -> {after:.5f}   residual {res:.5f}   max defect {defect:.1e}"
                )
                last, frames = now, 0
        except (RuntimeError, ValueError) as ex:
            messagebox.showerror("Flow stopped", str(ex))
            root.destroy()
            return
        root.after(8, tick)

    root.after(1, tick)
    try:
        root.mainloop()
    finally:
        grid.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    job = p.add_mutually_exclusive_group()
    job.add_argument("--check", action="store_true")
    job.add_argument("--cpu-check", action="store_true")
    job.add_argument("--bench", action="store_true")
    p.add_argument("--width", type=int, default=192)
    p.add_argument("--height", type=int, default=128)
    p.add_argument("--sweeps", type=int, default=24)
    p.add_argument("--frames", type=int, default=30)
    a = p.parse_args()
    if not (4 <= a.width <= 1024 and 4 <= a.height <= 1024 and 0 <= a.sweeps <= 128 and a.frames > 0):
        p.error("use width/height 4..1024, sweeps 0..128, and positive frames")
    if a.cpu_check:
        checks(None)
        return
    gpu = backend()
    try:
        print(gpu.name, file=sys.stderr)
        if a.check:
            checks(gpu)
        elif a.bench:
            benchmark(gpu, a)
        else:
            viewport(gpu, a)
    finally:
        gpu.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, AttributeError) as exc:
        print(f"Flow lab: {exc}", file=sys.stderr)
        sys.exit(1)
