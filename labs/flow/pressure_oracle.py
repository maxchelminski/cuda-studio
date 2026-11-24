"""Week 5 CPU exercise. Unit grid, fixed zero boundary, positive operator A = -Δ."""

from math import isclose


def jacobi_sweep(old, rhs, width, height):
    """Return the pressure after a single sweep. Keep the old snapshot intact."""
    new = [0.0] * (width * height)
    for y in range(1, height - 1):
        for x in range(1, width - 1):
            i = y * width + x
            neighbors = old[i - 1] + old[i + 1] + old[i - width] + old[i + width]
            # STUDENT: solve 4 * new[i] - neighbors = rhs[i] for this cell.
            new[i] = 0.0
    return new


def check_sweeps(label, width, height, sources, expected_snapshots):
    size = width * height
    rhs = [0.0] * size
    for (x, y), value in sources.items():
        rhs[y * width + x] = value
    pressure = [0.0] * size
    passed = True
    for sweep, expected in enumerate(expected_snapshots, start=1):
        before = pressure.copy()
        new = jacobi_sweep(pressure, rhs, width, height)
        name = f"{label}, sweep {sweep}"
        if pressure != before:
            print(f"TRY  {name} | old pressure changed during the sweep")
            return False
        if len(new) != size:
            print(f"TRY  {name} | got {len(new)} cells, expected {size}")
            return False
        for i, value in enumerate(new):
            cell = (i % width, i // width)
            target = expected.get(cell, 0.0)
            if not isclose(value, target, abs_tol=1e-9):
                print(f"TRY  {name} | (x, y) = {cell} got {value:g}, expected {target:g}")
                passed = False
                break
        else:
            print(f"PASS {name} | all {size} cells match")
        if label == "center source":
            print("     center, north, east, south, west:",
                  *(f"{new[i]:g}" for i in (12, 7, 13, 17, 11)))
        pressure = new
    return passed


def main():
    center = {(2, 2): 1.0}
    cross = {(2, 2): 1.0, (1, 2): 0.25, (3, 2): 0.25,
             (2, 1): 0.25, (2, 3): 0.25}
    # Hand-computed nonzero cells. All other entries, including the boundary, stay zero.
    zero = check_sweeps("zero field", 5, 5, {}, [{}])
    pulse = check_sweeps("center source", 5, 5, {(2, 2): 4.0}, [center, cross])
    negative = check_sweeps("off-center source", 6, 4, {(4, 1): -8.0}, [
        {(4, 1): -2.0}, {(4, 1): -2.0, (3, 1): -0.5, (4, 2): -0.5}])
    return 0 if zero and pulse and negative else 1


if __name__ == "__main__":
    raise SystemExit(main())
