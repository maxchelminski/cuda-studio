"""Complete covers(), then compare each answer with a hand-constructed case."""
import argparse


def covers(a, b, radius, point):
    dx, dy = b[0] - a[0], b[1] - a[1]
    px, py = point[0] - a[0], point[1] - a[1]
    length2 = dx * dx + dy * dy
    raw = (px * dx + py * dy) / length2 if length2 else 0.0
    t = raw  # STUDENT: restrict the closest point to the finite segment.
    return (px - t * dx) ** 2 + (py - t * dy) ** 2 <= radius ** 2


def overlap_checks():
    segments = [(4, (0, 0), (4, 0)), (9, (3, 0), (3, 2))]
    passed = True
    for point, expected in [((2.5, 0.5), 9), ((0.5, 0.5), 4), ((8.5, 8.5), 0)]:
        seen = [[i for i, a, b in order if covers(a, b, 1, point)]
                for order in (segments, reversed(segments))]
        winners = [max(ids, default=0) for ids in seen]
        correct = winners == [expected, expected]
        print(f"{'PASS' if correct else 'TRY '} {point}: covering IDs {seen}, winners {winners}, expected {expected}")
        passed &= correct
    return 0 if passed else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--overlap", action="store_true", help="compare original IDs in two traversal orders")
    if parser.parse_args().overlap:
        return overlap_checks()
    cases = [
        ("horizontal rim", (0, 0), (4, 0), (2, 1), True),
        ("right tip", (0, 0), (4, 0), (5, 0), True),
        ("past right tip", (0, 0), (4, 0), (6, 0), False),
        ("past vertical start", (2, 1), (2, 5), (2, -1), False),
        ("near left tip", (0, 0), (4, 0), (-0.5, 0.5), True),
        ("point capsule rim", (1, 1), (1, 1), (1, 2), True),
        ("point capsule exterior", (1, 1), (1, 1), (2, 2), False),
    ]
    passed = True
    for label, a, b, point, expected in cases:
        got = covers(a, b, 1, point)
        print(f"{'PASS' if got == expected else 'TRY '} {label}: got {got}, expected {expected}")
        passed &= got == expected
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
