"""Compare explicit periodic diffusion with the analytic Taylor–Green velocity decay."""
import argparse
import math


def diffuse(field, alpha):
    """Advance by one step with alpha = viscosity * dt / h**2."""
    n = len(field)
    result = []
    for y, row in enumerate(field):
        up = field[y - 1]
        down = field[(y + 1) % n]
        next_row = []
        for x, value in enumerate(row):
            neighbors = row[x - 1] + row[(x + 1) % n] + up[x] + down[x]
            next_row.append((1 - 4 * alpha) * value + alpha * neighbors)
        result.append(next_row)
    return result


def experiment(n, viscosity, final_time, alpha):
    h = 2 * math.pi / n
    nominal_dt = alpha * h**2 / viscosity
    initial = [[math.sin(x * h) * math.cos(y * h) for x in range(n)] for y in range(n)]
    field = initial
    t = 0.0
    steps = 0
    while t < final_time:
        dt = min(nominal_dt, final_time - t)
        field = diffuse(field, viscosity * dt / h**2)
        t += dt
        steps += 1
    amplitude = math.exp(-2 * viscosity * final_time)
    square_error = sum((field[y][x] - amplitude * initial[y][x])**2
                       for y in range(n) for x in range(n))
    return nominal_dt, steps, math.sqrt(square_error / (n * n))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sizes", nargs="+", type=int, default=[32, 64],
                        help="increasing grid widths on the same 2π-periodic square")
    parser.add_argument("--alpha", type=float, default=0.2,
                        help="nominal viscosity * dt / h², in (0, 0.25]")
    parser.add_argument("--nu", type=float, default=0.1, help="kinematic viscosity")
    parser.add_argument("--time", type=float, default=1.0, help="final physical time")
    args = parser.parse_args()
    if any(n < 3 for n in args.sizes) or any(a >= b for a, b in zip(args.sizes, args.sizes[1:])):
        parser.error("use strictly increasing grid sizes of at least 3")
    if not 0 < args.alpha <= 0.25:
        parser.error("the explicit five-point scheme requires 0 < alpha <= 0.25")
    if any(not math.isfinite(v) or v <= 0 for v in (args.nu, args.time)):
        parser.error("use positive finite viscosity and final time")
    amplitude = math.exp(-2 * args.nu * args.time)
    print(f"At t={args.time:g}, analytic amplitude ratio={amplitude:.8f}, "
          f"kinetic energy ratio={amplitude**2:.8f}")
    print("N   nominal_dt    steps     RMS error      observed order")
    previous_n = previous_error = None
    for n in args.sizes:
        dt, steps, error = experiment(n, args.nu, args.time, args.alpha)
        order = "--"
        if previous_n is not None and error > 0 and previous_error > 0:
            order = f"{math.log(previous_error / error) / math.log(n / previous_n):.3f}"
        print(f"{n:<4} {dt:<12.6g} {steps:<9} {error:<14.7g} {order}")
        previous_n, previous_error = n, error


if __name__ == "__main__":
    main()
