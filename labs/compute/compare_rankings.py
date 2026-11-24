"""Week 7. Compare every query in two policies' per-query readouts."""

import argparse
import math
import re
import subprocess
from pathlib import Path

ROW = re.compile(r"(.+?) query=(\d+) image=(\d+) label=(\d+) gap=(\S+)")


def read_rankings(text, policies, queries):
    results = {policy: {} for policy in policies}
    for line in text.splitlines():
        match = ROW.fullmatch(line.strip())
        if not match or match[1] not in results:
            continue
        policy, query, image, label, gap = match.groups()
        q, neighbor, digit, margin = int(query), int(image), int(label), float(gap)
        if q in results[policy]:
            raise ValueError(f"Repeated query {q} for {policy}. Use a log from one run.")
        if digit > 9 or not math.isfinite(margin) or margin < 0:
            raise ValueError(f"Invalid digit label or score gap at {policy} query {q}.")
        results[policy][q] = (neighbor, digit, margin)
    expected = set(range(queries))
    for policy, rows in results.items():
        if set(rows) != expected:
            raise ValueError(f"{policy} has {len(rows)} distinct rows. Expected IDs 0 through {queries - 1}. "
                             "Check the readout and the input size.")
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("log", type=Path)
    parser.add_argument("--capture", type=Path, metavar="COMPUTE_LAB",
                        help="Run the edited executable on all 1,797 digits and save its output to a new log.")
    parser.add_argument("--reference", default="cuBLAS FP32")
    parser.add_argument("--candidate", default="cuBLAS TF32 allowed")
    parser.add_argument("--queries", type=int, default=360)
    args = parser.parse_args()
    if args.queries < 1 or args.candidate == args.reference:
        parser.error("Choose a positive query count and two distinct policy names.")
    try:
        if args.capture:
            executable = args.capture.resolve(strict=True)
            with args.log.open("xb") as log:
                result = subprocess.run([str(executable), "digits", "1797"], stdout=log,
                                        stderr=subprocess.STDOUT)
            print(f"Rankings log: {args.log.resolve()}", flush=True)
            if result.returncode:
                raise ValueError(f"Digit checks failed (exit {result.returncode}). Inspect the log.")
        data = args.log.read_bytes()
        encoding = "utf-16" if data.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-8-sig"
        decoded = data.decode(encoding)
        if args.capture and not decoded.rstrip().endswith("\nPASS"):
            raise ValueError("The log is missing the final native PASS. Rebuild the edited executable and capture again.")
        results = read_rankings(decoded, [args.reference, args.candidate], args.queries)
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")
    baseline, candidate = results[args.reference], results[args.candidate]
    changed_images = [q for q in baseline if baseline[q][0] != candidate[q][0]]
    changed_labels = [q for q in baseline if baseline[q][1] != candidate[q][1]]
    print(f"Matched {args.queries} queries by zero-based query ID.")
    print(f"Changed winning image: {len(changed_images)}. Changed predicted label: {len(changed_labels)}.")
    if changed_labels:
        print("Queries with changed labels:", *sorted(changed_labels))
    print("Smallest reference gaps (image / label / gap):")
    for q in sorted(baseline, key=lambda index: (baseline[index][2], index))[:5]:
        a, b = baseline[q], candidate[q]
        print(f"  query {q}: {a[0]} / {a[1]} / {a[2]:.8g} -> {b[0]} / {b[1]} / {b[2]:.8g}")


if __name__ == "__main__":
    main()
