"""Compare one frozen cloth sweep against the same patch by original vertex and edge ID."""
import argparse
from math import dist, sqrt

from physics import Mesh, POINT, Solver, backend, reference_sweep


def patch():
    mesh = Mesh(3, 3)
    x, y, z = mesh.points[4]
    mesh.points[4] = (x, y, z + 0.18)
    return mesh


def edge_id(mesh, a, b):
    return next(k for k, (i, j, _) in enumerate(mesh.edges) if (i, j) == (a, b))


def cuda_sweep(gpu, mesh, mode):
    solver = Solver(gpu, mesh, 1 / 60)
    try:
        solver.sweep(mode, solver.now, solver.work)
        return solver.positions(solver.work)
    finally:
        solver.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", choices=("intact", "cut", "omit", "swap"), default="intact")
    parser.add_argument("--gpu", action="store_true", help="compare the installed CUDA baseline and gathered kernels")
    args = parser.parse_args()
    ref, candidate = patch(), patch()
    diagonal = edge_id(ref, 4, 8)
    if args.case == "cut":
        ref.active[diagonal] = candidate.active[diagonal] = 0
    elif args.case == "omit":
        candidate.incident[4].remove(diagonal)
    elif args.case == "swap":
        ref.active[diagonal] = 0
        candidate.active[edge_id(candidate, 4, 5)] = 0

    if args.gpu:
        gpu = backend()
        try:
            expected = cuda_sweep(gpu, ref, "baseline")
            observed = cuda_sweep(gpu, candidate, "gathered")
        finally:
            gpu.close()
    else:
        # Reconstruct the baseline's adjacency by scanning the original edges.
        ref.incident = [[k for k, (a, b, _) in enumerate(ref.edges) if a == i or b == i]
                        for i in range(len(ref.points))]
        expected = reference_sweep(ref, ref.points)
        observed = reference_sweep(candidate, candidate.points)

    delta = [dist(a, b) for a, b in zip(expected, observed)]
    mismatched = [i for i, value in enumerate(delta) if value > 1e-6]
    # The GPU starts from float32 storage. Compare pins to the uploaded coordinates.
    start = [POINT.unpack(POINT.pack(*p)) for p in candidate.points] if args.gpu else candidate.points
    pins = max(dist(start[i], observed[i]) for i, fixed in enumerate(candidate.pinned) if fixed)
    flags = [k for k, (a, b) in enumerate(zip(ref.active, candidate.active)) if a != b]
    print(f"case={args.case}  reference/candidate broken={ref.active.count(0)}/{candidate.active.count(0)}")
    print(f"rms_position_delta={sqrt(sum(d*d for d in delta)/len(delta)):.8g}  max_pin_drift={pins:.8g}")
    print(f"vertices above 1e-6={mismatched}  differing edge IDs={flags}")
    print(f"reference/candidate RMS strain={ref.strain(expected)[0]:.8g}/{candidate.strain(observed)[0]:.8g}")
    # An intentional fault has passed the exercise when the comparison detects it.
    if args.case == "omit":
        passed = mismatched == [4] and not flags
    elif args.case == "swap":
        passed = bool(mismatched) and len(flags) == 2
    else:
        passed = not mismatched and not flags
    print("PASS expected comparison" if passed and pins <= 1e-6 else "FAIL unexpected comparison")
    return 0 if passed and pins <= 1e-6 else 1


if __name__ == "__main__":
    raise SystemExit(main())
