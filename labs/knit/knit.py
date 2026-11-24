"""Tearable cloth on CUDA. Run --check for the solver tests or --bench for timed steps."""
import argparse
import csv
from math import ceil, dist, isfinite
import statistics
import sys
import time

sys.dont_write_bytecode = True
from physics import Mesh, MODES, POINT, Solver, backend, reference_sweep


def max_error(a, b):
    if not all(isfinite(v) for xyz in a + b for v in xyz):
        raise ValueError("Non-finite position")
    return max(dist(p, q) for p, q in zip(a, b))


def projected(points, w, h):
    return [((x + 0.35 * z) * w, (y - 0.12 * z) * h) for x, y, z in points]


def checks(gpu):
    for case in ("intact", "cut", "isolated"):
        mesh = Mesh(12, 13)  # 156 vertices includes a partial CUDA block.
        center = 6 * mesh.cols + 6
        x, y, z = mesh.points[center]
        mesh.points[center] = (x + 0.02, y - 0.04, z + 0.1)
        if case == "cut":
            n = mesh.cut(projected(mesh.points, 400, 400), 180, 155, 37)
            if n < 1 or n >= len(mesh.edges):
                raise ValueError("Cut brush did not produce a partial tear")
        if case == "isolated":
            for k in mesh.incident[center]:
                mesh.active[k] = 0
        before = mesh.strain(mesh.points)[0]
        cpu = mesh.points
        for _ in range(6):
            cpu = reference_sweep(mesh, cpu)
        after = mesh.strain(cpu)[0]
        if not after < before:
            raise ValueError("Projection did not reduce residual in the manufactured test")
        if any(cpu[i] != mesh.points[i] for i, pin in enumerate(mesh.pinned) if pin):
            raise ValueError("A pin moved")
        if case == "isolated" and cpu[center] != mesh.points[center]:
            raise ValueError("An isolated vertex received an edge correction")
        if gpu:
            solver = Solver(gpu, mesh, 1 / 60)
            try:
                for mode in MODES:
                    src, dst = solver.now, solver.work
                    for j in range(6):
                        # A skipped pin or tail store must not inherit the last
                        # correct variant's positions in this ping-pong buffer.
                        gpu.call("cuMemsetD8_v2", dst, 255, solver.n * POINT.size)
                        solver.sweep(mode, src, dst)
                        src, dst = dst, solver.spare if j % 2 == 0 else solver.work
                    error = max_error(solver.positions(src), cpu)
                    if error > 2e-6:
                        raise ValueError(f"{mode} max position error {error:g} exceeds 2e-6")
            finally:
                solver.close()
        print(f"PASS {case}: six sweeps, RMS strain {before:.6f} -> {after:.6f}")

    if gpu:
        mesh = Mesh(8, 7)
        index = 3 * mesh.cols + 4
        target = (0.5, 0.35, 0.125)
        solver = Solver(gpu, mesh, 1 / 60)
        try:
            solver.set_pin(index, True)
            solver.place_vertex(index, target)
            for mode in MODES:
                solver.step(mode, 3)
                if dist(solver.positions()[index], target) > 1e-6:
                    raise ValueError("A grabbed vertex moved away from the pointer")
            solver.set_pin(index, False)
            solver.step("gathered", 3)
            if dist(solver.positions()[index], target) < 1e-6:
                raise ValueError("A released vertex stayed fixed")
        finally:
            solver.close()
        print("PASS moving pin holds the grab and releases into the cloth solve")
        mesh = Mesh(2, 2)
        mesh.points = [(0, 0, 0), (1.5, 0, 0), (0, 0.25, 0), (2, 0.25, 0)]
        mesh.edges = [(i, j, 1.0 if mesh.visible[k] else 2.0**0.5)
                      for k, (i, j, _) in enumerate(mesh.edges)]
        lower = next(k for k, (i, j, _) in enumerate(mesh.edges) if (i, j) == (2, 3))
        precut = next(k for k, (i, j, _) in enumerate(mesh.edges) if (i, j) == (0, 2))
        mesh.active[precut] = 0
        solver = Solver(gpu, mesh, 1 / 60)
        try:
            solver.fracture(solver.now, 0.5)
            solver.download_cuts()
            if {k for k, active in enumerate(mesh.active) if not active} != {lower, precut}:
                raise ValueError("Fracture mask disagrees with the strict tensile threshold")
            solver.place_vertex(3, (1, 0.25, 0))
            solver.fracture(solver.now, 0.5)
            solver.download_cuts()
            if mesh.active[lower]:
                raise ValueError("A severed edge healed after unloading")
        finally:
            solver.close()
        print("PASS tensile fracture, exact-threshold tie, compression and permanent damage")


def benchmark(gpu, a):
    solvers = {}
    samples = {m: [] for m in MODES}
    try:
        for m in MODES:
            solvers[m] = Solver(gpu, Mesh(a.cols, a.rows), a.dt)
        for frame in range(5 + a.frames):
            start = frame % len(MODES)
            for m in MODES[start:] + MODES[:start]:
                ms = solvers[m].step(m, a.iterations, a.tear_strain)
                if frame >= 5:
                    samples[m].append(ms)
        reference = solvers["baseline"].positions()
        for solver in solvers.values():
            solver.download_cuts()
        writer = csv.writer(sys.stdout, lineterminator="\n")
        writer.writerow(("gpu", "mode", "vertices", "edges", "dt", "iterations", "samples",
                         "step_p50_ms", "step_p95_ms", "rms_strain", "max_position_delta",
                         "tear_strain", "broken_edges", "cols", "rows"))
        for m in MODES:
            mesh = solvers[m].mesh
            if mesh.active != solvers["baseline"].mesh.active:
                raise ValueError(f"{m} produced a different final tear topology")
            points = solvers[m].positions()
            error = max_error(reference, points)
            if error > 1e-5:
                raise ValueError(f"{m} diverged from baseline by {error:g}")
            timings = sorted(samples[m])
            writer.writerow((gpu.name, m, len(points), len(mesh.edges), a.dt, a.iterations, a.frames,
                             f"{statistics.median(timings):.5f}", f"{timings[ceil(0.95 * a.frames) - 1]:.5f}",
                             f"{mesh.strain(points)[0]:.6f}", f"{error:.7g}",
                             a.tear_strain, len(mesh.edges) - sum(mesh.active), a.cols, a.rows))
    finally:
        for solver in solvers.values():
            solver.close()


def viewport(gpu, a):
    import tkinter as tk
    from tkinter import messagebox
    root = tk.Tk()
    root.title(f"Tension study   |   {gpu.name}")
    root.configure(bg="#15232c")
    w, h = 640, 510
    mode, iters, paused, heat = "gathered", a.iterations, False, False
    tearing = a.tear_strain is not None
    tear_limit = a.tear_strain if tearing else 0.35
    mesh = Mesh(a.cols, a.rows)
    solver = Solver(gpu, mesh, a.dt)
    points = mesh.points
    xy = projected(points, w, h)
    bar = tk.Frame(root, bg="#15232c")
    bar.pack(fill="x", padx=7, pady=5)
    canvas = tk.Canvas(root, width=w, height=h, bg="#18262f", highlightthickness=0, cursor="crosshair")
    canvas.pack()
    status = tk.Label(root, fg="#edf4e4", bg="#15232c", font=("Consolas", 10), anchor="w")
    status.pack(fill="x", padx=10, pady=(5, 0))
    tk.Label(root, text="Left drag cuts   Right drag pulls   T tension tearing   Space freeze   [ / ] sweeps   D strain   N reset   R compile",
             bg="#15232c", fg="#bdcfcd", anchor="w").pack(fill="x", padx=10, pady=(0, 6))
    threads = {k: canvas.create_line(0, 0, 0, 0, width=2) for k, visible in enumerate(mesh.visible) if visible}
    anchors = {i: canvas.create_oval(0, 0, 0, 0, outline="#faf2d3", fill="#d4b675")
               for i, fixed in enumerate(mesh.pinned) if fixed}
    mode_buttons = {}
    palette = ("#776e88", "#86869b", "#94a1ad", "#a2b7b8", "#b5c9bc", "#d2d6bf")
    heat_palette = ("#79a9a9", "#abbca3", "#d0c574", "#dfa258", "#e27961", "#ed5269")
    last_brush = None
    held = None
    handle = canvas.create_oval(0, 0, 0, 0, outline="#ffe5a1", width=2, state="hidden")
    last_ms = 0.0
    last_status = time.perf_counter()
    frames = 0

    def select(value):
        nonlocal mode
        mode = value
        for name, b in mode_buttons.items():
            b.configure(relief="sunken" if value == name else "flat")

    def button(label, command):
        b = tk.Button(bar, text=label, command=command, bg="#344950", fg="#e3f1e9",
                      activebackground="#667b7c", relief="flat")
        b.pack(side="left", padx=(0, 4))
        return b

    for i, m in enumerate(MODES, 1):
        mode_buttons[m] = button(f"{i} {m.title()}", lambda name=m: select(name))
        root.bind(str(i), lambda e, name=m: select(name))
    select(mode)

    def toggle(*_):
        nonlocal paused
        paused = not paused

    def colors(*_):
        nonlocal heat
        heat = not heat

    def toggle_tearing(*_):
        nonlocal tearing
        tearing = not tearing

    def reset(*_):
        nonlocal solver, mesh, points, xy, last_brush, held
        fresh_mesh = Mesh(a.cols, a.rows)
        fresh_solver = Solver(gpu, fresh_mesh, a.dt)
        solver.close()
        mesh, solver, points = fresh_mesh, fresh_solver, fresh_mesh.points
        xy, last_brush = projected(points, w, h), None
        held = None
        canvas.itemconfigure(handle, state="hidden")

    def reload_kernel(*_):
        try:
            gpu.reload()
            select("student")
        except (RuntimeError, OSError) as exc:
            messagebox.showerror("CUDA compile log", str(exc))

    def change(n):
        nonlocal iters
        iters = max(1, min(32, iters + n))

    def release(*_):
        nonlocal last_brush
        last_brush = None

    def cut(event):
        nonlocal last_brush
        x, y = event.x, event.y
        prev = last_brush or (x, y)
        steps = max(1, ceil(dist(prev, (x, y)) / 9))
        changed = 0
        for j in range(1, steps + 1):
            changed += mesh.cut(xy, prev[0] + (x - prev[0]) * j / steps, prev[1] + (y - prev[1]) * j / steps, 11)
        if changed:
            solver.upload_cuts()
        last_brush = (x, y)

    def move_grab(event):
        if held is None:
            return
        z = points[held][2]
        x = min(w, max(0, event.x))
        y = min(h, max(0, event.y))
        point = (x / w - 0.35 * z, y / h + 0.12 * z, z)
        solver.place_vertex(held, point)
        points[held] = point
        xy[held] = (x, y)

    def start_grab(event):
        nonlocal held
        if held is not None:
            return
        cursor = (event.x, event.y)
        index = min((i for i in range(len(points)) if not mesh.pinned[i]),
                    key=lambda i: dist(cursor, xy[i]), default=None)
        if index is not None and dist(cursor, xy[index]) <= 20:
            held = index
            solver.set_pin(held, True)
            move_grab(event)
            canvas.itemconfigure(handle, state="normal")

    def end_grab(*_):
        nonlocal held
        if held is not None:
            solver.set_pin(held, False)
            held = None
            canvas.itemconfigure(handle, state="hidden")

    button("Freeze", toggle)
    button("Strain", colors)
    button("Reset", reset)
    button("Compile", reload_kernel)
    canvas.bind("<Button-1>", cut)
    canvas.bind("<B1-Motion>", cut)
    canvas.bind("<ButtonRelease-1>", release)
    canvas.bind("<Button-3>", start_grab)
    canvas.bind("<B3-Motion>", move_grab)
    canvas.bind("<ButtonRelease-3>", end_grab)
    root.bind("<space>", toggle)
    root.bind("<bracketleft>", lambda e: change(-1))
    root.bind("<bracketright>", lambda e: change(1))
    root.bind("d", colors)
    root.bind("t", toggle_tearing)
    root.bind("n", reset)
    root.bind("r", reload_kernel)
    root.bind("<Escape>", lambda e: root.destroy())

    def tick():
        nonlocal points, xy, last_ms, last_status, frames
        try:
            if not paused:
                last_ms = solver.step(mode, iters, tear_limit if tearing else None)
                if tearing:
                    solver.download_cuts()
                points = solver.positions()
                xy = projected(points, w, h)
            for k, item in threads.items():
                if not mesh.active[k]:
                    canvas.itemconfigure(item, state="hidden")
                    continue
                i, j, rest = mesh.edges[k]
                p, q = points[i], points[j]
                strain = abs(dist(p, q) / rest - 1)
                value = strain * 9 if heat else 2.5 + (p[2] + q[2]) * 6 + (i % mesh.cols == j % mesh.cols) * 0.8
                color = (heat_palette if heat else palette)[min(5, max(0, int(value)))]
                canvas.coords(item, *xy[i], *xy[j])
                canvas.itemconfigure(item, state="normal", fill=color)
            for i, item in anchors.items():
                x, y = xy[i]
                canvas.coords(item, x - 3, y - 3, x + 3, y + 3)
            if held is not None:
                x, y = xy[held]
                canvas.coords(handle, x - 6, y - 6, x + 6, y + 6)
            now = time.perf_counter()
            frames += 1
            if frames == 1 and not status.cget("text") or now - last_status >= 0.4:
                fps = frames / max(0.001, now - last_status)
                rms, _ = mesh.strain(points)
                step_time = "GPU idle" if paused else f"{last_ms:.3f} ms GPU step"
                status.configure(text=f"{fps:.0f} FPS   {step_time}   {iters} sweeps   RMS {rms:.1%}"
                                 f"   cuts {len(mesh.edges) - sum(mesh.active)}   t={solver.time:.2f}s"
                                 + (f"   tear >{tear_limit:.0%}" if tearing else "")
                                 + ("  FROZEN" if paused else ""))
                last_status, frames = now, 0
        except (RuntimeError, ValueError) as exc:
            messagebox.showerror("Simulation stopped", str(exc))
            root.destroy()
            return
        root.after(8, tick)

    root.after(1, tick)
    try:
        root.mainloop()
    finally:
        solver.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    action = p.add_mutually_exclusive_group()
    action.add_argument("--check", action="store_true")
    action.add_argument("--cpu-check", action="store_true", help="check scalar physics without a GPU")
    action.add_argument("--bench", action="store_true")
    p.add_argument("--cols", type=int, default=28)
    p.add_argument("--rows", type=int, default=34)
    p.add_argument("--iterations", type=int, default=6)
    p.add_argument("--dt", type=float, default=1 / 60, help="fixed simulation time per integration step")
    p.add_argument("--tear-strain", type=float, help="enable tensile tearing at a fractional extension, e.g. 0.35")
    p.add_argument("--frames", type=int, default=30)
    a = p.parse_args()
    if not (2 <= a.cols <= 72 and 2 <= a.rows <= 72 and 1 <= a.iterations <= 32 and 0 < a.dt <= 0.1 and a.frames > 0):
        p.error("use 2..72 rows and columns, 1..32 sweeps, dt in (0, 0.1], and positive frame count")
    if a.tear_strain is not None and (not isfinite(a.tear_strain) or a.tear_strain < 0):
        p.error("use a finite, nonnegative --tear-strain, e.g. 0.35 for 35% extension")
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
    except (ValueError, RuntimeError, OSError, AttributeError) as exc:
        print(f"Cloth lab: {exc}", file=sys.stderr)
        sys.exit(1)
