"""Implement the coarse tile predicate, then compare work for one fixed swarm pose."""
import argparse
from statistics import mean, median

from scene import scene
from swarm import FIXED_TIME


def overlaps(segment, left, top, right, bottom):
    ax, ay, bx, by, radius, _, _ = segment
    return True  # STUDENT: test the expanded segment against both tile intervals.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worms", type=int, choices=range(1, 257), metavar="1..256", default=8)
    args = parser.parse_args()
    passed = True
    for label, ends, expected in [
        ("crosses", (10, 5, -2, 5), True), ("touches right rim", (9, 3, 11, 3), True),
        ("beyond right", (10, 3, 11, 3), False), ("above", (2, -2, 4, -2), False),
        ("left", (-4, 3, -2, 3), False), ("below", (2, 10, 4, 10), False),
    ]:
        got = overlaps((*ends, 1, 0, 0), 0, 0, 8, 8)
        print(f"{'PASS' if got == expected else 'TRY '} {label}: got {got}, expected {expected}")
        passed &= got == expected
    w, h = 161, 91
    segments = scene(w, h, args.worms, FIXED_TIME)
    print(f"{w}x{h}, {len(segments)} segments, pose time {FIXED_TIME}. Columns count candidate work.")
    print("side  mean  median  least_tile/count  busiest_tile/count  box_tests  pixel_candidates")
    for side in (8, 16, 32):
        counts = {(x, y): sum(overlaps(s, x+.5, y+.5, x+side-.5, y+side-.5) for s in segments)
                  for y in range(0, h, side) for x in range(0, w, side)}
        few, many = min(counts, key=counts.get), max(counts, key=counts.get)
        calls = sum(min(side, w-x) * min(side, h-y) * n for (x, y), n in counts.items())
        print(side, round(mean(counts.values()), 2), median(counts.values()), few, counts[few],
              many, counts[many], len(counts)*len(segments), calls)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
