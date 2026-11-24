"""Rebuild the handwritten digit retrieval case study with Python 3.8+."""

import argparse
import csv
import hashlib
import math
from collections import Counter
from operator import mul
from pathlib import Path
from statistics import median
from typing import NamedTuple


HERE = Path(__file__).resolve().parent
GALLERY = 1437
# Hash each record as 65 unsigned bytes: the label followed by its 64 cells.
DATA_SHA256 = "d8121ca7764eccfaef1df6bc4589c6527c58fcbab0cb1b079e79f97f8cb8219a"


class Image(NamedTuple):
    label: int
    pixels: bytes
    energy: int


class Match(NamedTuple):
    query: int
    raw: int
    cosine: int


def read_images(path):
    images = []
    digest = hashlib.sha256()
    for number, line in enumerate(path.read_text(encoding="ascii").splitlines(), 1):
        if not line.strip():
            continue
        try:
            if "," in line:  # Original UCI optdigits.tes
                values = [int(field) for field in line.split(",")]
                label, pixels = values[-1], bytes(values[:-1])
            else:  # Course encoding
                label_text, encoded = line.split()
                label, pixels = int(label_text), bytes(int(ch, 17) for ch in encoded)
            if not (0 <= label < 10 and len(pixels) == 64 and 0 < max(pixels) <= 16):
                raise ValueError
        except ValueError as exc:
            raise ValueError(f"Invalid 8 by 8 digit on line {number}") from exc
        digest.update(bytes([label]) + pixels)
        images.append(Image(label, pixels, sum(p * p for p in pixels)))
    if len(images) != 1797 or digest.hexdigest() != DATA_SHA256:
        raise ValueError("Expected the 1,797 original UCI test rows in source order.")
    return images


def find_matches(images):
    gallery = images[:GALLERY]
    matches = []
    for query in range(GALLERY, len(images)):
        raw = cosine = 0
        best_dot = best_squared_dot = -1
        best_energy = 1
        for i, candidate in enumerate(gallery):
            dot = sum(map(mul, images[query].pixels, candidate.pixels))
            if dot > best_dot:
                raw, best_dot = i, dot
            # All scores are nonnegative. For a fixed query, rank dot² / ||g||².
            # Cross-multiplication is exact and strict > retains the first tied row.
            squared_dot = dot * dot
            if squared_dot * best_energy > best_squared_dot * candidate.energy:
                cosine, best_squared_dot, best_energy = i, squared_dot, candidate.energy
        matches.append(Match(query, raw, cosine))
    return matches


def write_rows(path, images, matches):
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(["query_row", "true_label", "dot_row", "dot_label", "cosine_row", "cosine_label"])
        for query, raw, cosine in matches:
            writer.writerow([query, images[query].label, raw, images[raw].label, cosine, images[cosine].label])


def picture(image, row):
    # Equal palette for every image. One original feature fills a square exactly.
    groups = {}
    for cell, ink in enumerate(image.pixels):
        if ink:
            groups.setdefault(ink, []).append(f"M{cell % 8},{cell // 8}h1v1h-1z")
    shapes = []
    for ink, paths in groups.items():
        rgb = tuple(round(a + (b - a) * ink / 16) for a, b in zip((16, 35, 41), (240, 217, 145)))
        shapes.append(f'<path fill="rgb{rgb}" d="{"".join(paths)}"/>')
    return (f'<svg role="img" aria-label="Handwritten {image.label}, dataset row {row}" '
            f'viewBox="0 0 8 8" shape-rendering="crispEdges">'
            f'<rect width="8" height="8" fill="#102329"/>{"".join(shapes)}</svg>')


def example(title, match, images):
    query = images[match.query]
    figures = []
    for name, row in zip(("Input", "Raw dot winner", "Cosine winner"), match):
        image = images[row]
        caption = f"True label {image.label}"
        scores = ""
        if name != "Input":
            dot = sum(map(mul, query.pixels, image.pixels))
            cosine = dot / math.sqrt(query.energy * image.energy)
            caption = f"Predicts {image.label}"
            scores = f'<br>dot {dot:,}<br>cos {cosine:.3f}'
        figures.append(f'<figure><h4>{name}</h4>{picture(image, row)}'
                       f'<figcaption><b>{caption}</b><br>row {row}{scores}</figcaption></figure>')
    return f'<article><h3>{title}</h3><div class="triplet">{"".join(figures)}</div></article>'


STYLE = """
:root{color-scheme:light;--ink:#18343b;--muted:#465c60;--line:#c6d1c8;--paper:#f7f6ef;--accent:#075b55}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 "Segoe UI",Arial,sans-serif}
main{max-width:980px;margin:auto;padding:2.5rem clamp(1rem,5vw,4.5rem)}header{border-top:5px solid var(--ink);padding-top:1rem}
.eyebrow{font:700 .76rem/1.3 Consolas,monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}
h1,h2{font-family:Georgia,serif;font-weight:400;line-height:1.06;letter-spacing:-.035em}
h1{font-size:clamp(2.6rem,7vw,5.1rem);margin:.65rem 0 1rem;max-width:14ch}
h2{font-size:clamp(1.85rem,4vw,2.65rem);margin:0 0 .9rem}p{max-width:74ch;margin:.7rem 0}
.lede{font-size:clamp(1.05rem,2vw,1.22rem);max-width:61ch}
section,footer{border-top:1px solid var(--line);margin-top:1.9rem;padding-top:1.35rem}h3{font-size:1.02rem;margin:0 0 .65rem}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
article{border:1px solid var(--line);background:#fffefa;padding:1rem}.triplet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.48rem}
figure{margin:0}h4{font:600 .74rem/1.3 "Segoe UI",sans-serif;margin:0 0 .4rem}
svg{display:block;width:100%;max-width:6rem;aspect-ratio:1}figcaption,.note,footer{font-size:.87rem;color:var(--muted)}
figcaption{line-height:1.5;margin-top:.35rem;font-variant-numeric:tabular-nums}figcaption b,th{color:var(--ink)}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{text-align:right;padding:.42rem .4rem;border-bottom:1px solid var(--line)}
thead th{color:var(--accent)}th:first-child{text-align:left}tbody th{font-weight:500}
.formula{font:1.07rem/1.5 Consolas,monospace;background:#e6ece2;border-left:4px solid var(--accent);padding:.55rem .85rem}
code{overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#e6ece2;padding:.7rem .9rem;font-size:.84rem}
a{color:var(--accent);text-underline-offset:.15em}a:focus-visible{outline:3px solid #c67400}
@media(max-width:640px){.pair{grid-template-columns:1fr}main{padding-top:1.4rem}th,td{font-size:.89rem;padding:.35rem .2rem}}
@media print{main{padding:0}article,table,figure{break-inside:avoid}}
"""


def make_report(images, matches):
    raw_use = Counter(m.raw for m in matches)
    cosine_use = Counter(m.cosine for m in matches)
    def truth(match):
        return images[match.query].label

    counts = Counter((images[m.raw].label == truth(m), images[m.cosine].label == truth(m)) for m in matches)
    raw_correct = counts[True, True] + counts[True, False]
    cos_correct = counts[True, True] + counts[False, True]
    size = len(matches)
    popular, frequency = raw_use.most_common(1)[0]
    wrong_popular = sum(m.raw == popular and truth(m) != images[popular].label for m in matches)
    changed_row = sum(m.raw != m.cosine for m in matches)
    changed_label = sum(images[m.raw].label != images[m.cosine].label for m in matches)
    recovered = next(m for m in matches if images[m.raw].label != truth(m) and images[m.cosine].label == truth(m))
    persistent = next(m for m in matches if len({images[m.raw].label, images[m.cosine].label, truth(m)}) == 3)
    metrics = [
        ("Correct labels", f"{raw_correct} / {size}", f"{cos_correct} / {size}"),
        ("Distinct gallery images selected", len(raw_use), len(cosine_use)),
        ("Most queries won by one image", frequency, max(cosine_use.values())),
        ("Median L2 norm of the selected image",
         f"{median(math.sqrt(images[m.raw].energy) for m in matches):.1f}",
         f"{median(math.sqrt(images[m.cosine].energy) for m in matches):.1f}"),
    ]
    rows = "".join(f'<tr><th scope="row">{label}</th><td>{raw}</td><td>{cos}</td></tr>' for label, raw, cos in metrics)
    return rf"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Why does the same {images[popular].label} keep winning? | CUDA Studio</title><style>{STYLE}</style></head>
<body><main><header><div class="eyebrow">CUDA Studio · Course-authored worked example</div>
<h1>Why does the same {images[popular].label} keep winning?</h1>
<p class="lede">One handwritten {images[popular].label} was the nearest match for {frequency} of {size} searches. It gave the wrong answer {wrong_popular} times. What makes a single gallery image so attractive to a dot product?</p></header>
<section><h2>Change the score. Keep the gallery.</h2>
<p>For each query, pick the highest-scoring gallery image and predict its digit. The first {GALLERY:,} rows form the gallery. The final {size} rows are the queries. Every comparison uses the same 64 ink counts.</p>
<p class="formula">dot(q, g) = ‖q‖ × ‖g‖ × cosine(q, g)</p>
<p>With the query fixed, a large gallery norm can compensate for poorer alignment. Dividing each gallery vector by its length removes that advantage. Dividing the query by its own length then converts scores to cosine similarities without changing their order.</p>
<table><thead><tr><th scope="col">Measured on the same {size} queries</th><th scope="col">Raw dot</th><th scope="col">Cosine</th></tr></thead><tbody>{rows}</tbody></table>
<p>Changing the rule selected a different gallery image for <b>{changed_row}</b> queries and a different digit for <b>{changed_label}</b>. Cosine fixed {counts[False, True]} mistakes, introduced {counts[True, False]}, and left {counts[False, False]} queries wrong under both rules.</p></section>
<section><h2>Two searches under the microscope</h2>
<p>Read each strip from left to right. The numbers under each gallery image give its score by both rules against the query. The brighter squares contain more ink.</p>
<div class="pair">{example("A recovered digit", recovered, images)}{example("A miss under both rules", persistent, images)}</div>
<p class="note">Rows are zero-based across the dataset. The strips use the first recovered query and the first query where both predictions are wrong and differ from each other.</p></section>
<section><h2>Where CUDA enters</h2>
<p>The native course lab stacks the queries into a 360 × 64 matrix and the gallery into a 64 × 1,437 matrix. Multiplying these normalized arrays gives all {size*GALLERY:,} cosine scores. In the RTX 5070 course check, cuBLAS FP32 and TF32-allowed each produced 343 correct labels. Matching aggregate counts still leaves open which individual predictions agree.</p>
<p><b>A follow-on experiment.</b> Before changing precision, predict which queries will be most sensitive. Save the top two FP32 scores and their gallery IDs for each query. Group queries by the gap between the two scores, rerun with TF32 allowed, and measure where the winning row or digit changes. A group with zero changes is an informative result.</p></section>
<section><h2>Reproduce the evidence</h2>
<p>The Python reference compares integer dot products and squared cosine ratios exactly. Equal scores select the earliest gallery row. The comparison uses a fixed split within the UCI test file and measures accuracy on these queries. Writer-independent generalization needs a separate evaluation.</p>
<p>From the course root, run the first command to regenerate this report. Add <code>--rows winners.csv</code> to export every query and both winning gallery IDs and labels. The second command repeats the separate GPU accuracy check in the course PowerShell.</p>
<pre>python labs/publication-example/reproduce.py
.\build\compute\Release\compute_lab.exe digits 1797</pre>
<p>Outside the course, save the script and extract <code>optdigits.tes</code> from the UCI download. Run the following in that directory with Python 3.8 or newer. <a href="reproduce.py" download>Analysis script</a> · <a href="https://doi.org/10.24432/C50P49">UCI download and description</a></p>
<pre>python reproduce.py --data optdigits.tes --output index.html --rows winners.csv</pre></section>
<footer><b>Data and images.</b> E. Alpaydin and C. Kaynak, <i>Optical Recognition of Handwritten Digits</i> (1998), UCI Machine Learning Repository. The course re-encodes the original test rows in their original order. The strips above recolor and enlarge their 8 × 8 ink counts. <a href="https://doi.org/10.24432/C50P49">Original dataset</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></footer></main></body></html>
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=HERE.parent / "compute/data/digits.txt")
    parser.add_argument("--output", type=Path, default=HERE / "index.html")
    parser.add_argument("--rows", type=Path, help="Optional CSV of every query and its winners")
    args = parser.parse_args()
    paths = [args.data, args.output, Path(__file__)] + ([args.rows] if args.rows else [])
    if len({path.resolve() for path in paths}) != len(paths):
        parser.error("Use distinct paths for the dataset, script, report and CSV.")
    try:
        images = read_images(args.data)
        matches = find_matches(images)
        args.output.write_bytes(make_report(images, matches).encode("utf-8"))
        if args.rows:
            write_rows(args.rows, images, matches)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"{exc}\n")
    print(f"Wrote {args.output} using {len(matches) * GALLERY:,} comparisons.")


if __name__ == "__main__":
    main()
