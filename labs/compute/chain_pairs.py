"""Collect matched CUDA measurements of the two matrix-chain orders on one fixed shape."""

import argparse
import csv
import math
from pathlib import Path
from statistics import median
import subprocess
from tempfile import mkdtemp

COURSE = Path(__file__).resolve().parents[2]
ORDERS = ("(AB)C", "A(BC)")


def read_medians(text):
    lines = text.splitlines()
    if not lines or lines[-1].strip() != "PASS":
        raise ValueError("The native correctness check did not finish.")
    medians = {}
    for index, line in enumerate(lines[:-1]):
        words = line.split()
        if not words or words[0] not in ORDERS or " ms (min " not in line:
            continue
        order = words[0]
        prefix = "samples_ms in run order:"
        sample_line = lines[index + 1].strip()
        if order in medians or not sample_line.startswith(prefix):
            raise ValueError(f"Unexpected timing output for {order}.")
        samples = [float(value) for value in sample_line[len(prefix):].split()]
        if len(samples) != 9 or any(not math.isfinite(ms) or ms <= 0 for ms in samples):
            raise ValueError(f"Expected nine positive finite event times for {order}.")
        medians[order] = median(samples)
    if set(medians) != set(ORDERS):
        raise ValueError("Missing a matching native timing row.")
    return medians[ORDERS[0]], medians[ORDERS[1]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("images", type=int)
    parser.add_argument("hidden", type=int)
    parser.add_argument("outputs", type=int)
    parser.add_argument("--pairs", type=int, default=5)
    parser.add_argument("--exe", type=Path, default=COURSE / "build/compute/Release/compute_lab.exe")
    parser.add_argument("--out", type=Path, default=COURSE / "build/capstone-results")
    args = parser.parse_args()
    if not (1 <= args.images <= 1797 and 1 <= args.hidden <= 2048 and 1 <= args.outputs <= 1024):
        parser.error("Choose 1–1797 images, 1–2048 hidden dimensions and 1–1024 outputs.")
    if args.pairs < 1:
        parser.error("--pairs must be positive.")
    if not args.exe.is_file():
        parser.error(f"Build the native compute lab first. Missing executable: {args.exe}")
    shape = [str(args.images), str(args.hidden), str(args.outputs)]
    args.out.mkdir(exist_ok=True, parents=True)
    folder = Path(mkdtemp(prefix="-".join(shape) + "-", dir=args.out)).resolve()
    print(f"Evidence folder: {folder}", flush=True)
    table = folder / "pairs.csv"
    ratios = []
    with table.open("x", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["images", "hidden", "outputs", "pair", "left_ms", "right_ms", "left_over_right"])
        for pair in range(1, args.pairs + 1):
            log = folder / f"pair-{pair}.txt"
            command = [str(args.exe.resolve()), "chain", *shape]
            with log.open("xb") as raw:
                run = subprocess.run(command, stdout=raw, stderr=subprocess.STDOUT)
            if run.returncode:
                parser.exit(1, f"Native check failed (exit {run.returncode}). Inspect {log}\n")
            try:
                left, right = read_medians(log.read_text(encoding="utf-8-sig"))
            except ValueError as error:
                parser.exit(1, f"{error} Inspect {log}\n")
            ratios.append(left / right)
            writer.writerow([*shape, pair, left, right, ratios[-1]])
    print(f"{args.pairs} pairs, nine event intervals per order per invocation; fixed left-then-right order.")
    print(f"Left/right ratio: median {median(ratios):.3f}x, range {min(ratios):.3f} to {max(ratios):.3f}x.")
    print(f"A ratio above 1 means A(BC) took less GPU time. Paired data: {table}")


if __name__ == "__main__":
    main()
