"""Week 6 CPU exercise. Project a single 2D edge using inverse masses."""

from math import hypot, isclose


def project_edge(a, b, rest, inv_a, inv_b):
    """Return the corrected endpoints for one isolated stitch."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    distance = hypot(dx, dy)
    total_inverse_mass = inv_a + inv_b
    # Two pins cannot move. A collapsed pair has no direction along which to move.
    if total_inverse_mass == 0.0 or distance < 1e-8:
        return a, b
    unit_x, unit_y = dx / distance, dy / distance
    # STUDENT: compute how far the current length is above or below its rest length.
    stretch = 0.0
    # STUDENT: compute the fraction of the correction assigned to endpoint a.
    share_a = 0.5
    move_a = stretch * share_a
    move_b = stretch * (1.0 - share_a)
    return ((a[0] + unit_x * move_a, a[1] + unit_y * move_a),
            (b[0] - unit_x * move_b, b[1] - unit_y * move_b))


def check(label, a, b, rest, inv_a, inv_b, expected_a, expected_b):
    actual_a, actual_b = project_edge(a, b, rest, inv_a, inv_b)
    for name, point, expected in (("a", actual_a, expected_a), ("b", actual_b, expected_b)):
        for axis, value, target in zip("xy", point, expected):
            if not isclose(value, target, abs_tol=1e-9):
                print(f"TRY  {label} | {name}.{axis} got {value:g}, expected {target:g}")
                return False
    print(f"PASS {label} | a=({actual_a[0]:g}, {actual_a[1]:g}), "
          f"b=({actual_b[0]:g}, {actual_b[1]:g})")
    return True


def main():
    # Fixed endpoints were worked out by hand before applying the solver.
    cases = [
        ("equal masses", (0, 0), (3, 0), 2, 1, 1, (0.5, 0), (2.5, 0)),
        ("left pinned", (0, 0), (3, 0), 2, 0, 1, (0, 0), (2, 0)),
        ("right twice as massive", (0, 0), (3, 0), 2, 1, 0.5, (2/3, 0), (8/3, 0)),
        ("both pinned", (0, 0), (3, 0), 2, 0, 0, (0, 0), (3, 0)),
        ("coincident endpoints", (1, 2), (1, 2), 2, 1, 1, (1, 2), (1, 2)),
        ("already at rest", (0, 0), (3, 0), 3, 1, 1, (0, 0), (3, 0)),
        ("compressed", (0, 0), (1, 0), 3, 1, 1, (-1, 0), (2, 0)),
        ("diagonal", (0, 0), (3, 4), 3, 1, 1, (0.6, 0.8), (2.4, 3.2)),
    ]
    results = [check(*case) for case in cases]
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
