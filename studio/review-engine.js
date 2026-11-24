// Dynamic spaced-repetition question generator (local parametric templates + optional Gemini API).
window.ReviewEngine = (() => {
  "use strict";

  const GEMINI_STORAGE = "fieldwork.gemini.v1";

  function getSettings() {
    try {
      const raw = localStorage.getItem(GEMINI_STORAGE);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        apiKey: String(parsed.apiKey || "").trim(),
        model: String(parsed.model || "gemini-2.5-flash").trim() || "gemini-2.5-flash",
        autoGemini: Boolean(parsed.autoGemini)
      };
    } catch {
      return {apiKey: "", model: "gemini-2.5-flash", autoGemini: false};
    }
  }

  function saveSettings(settings) {
    try {
      const clean = {
        apiKey: String(settings.apiKey || "").trim(),
        model: String(settings.model || "gemini-2.5-flash").trim() || "gemini-2.5-flash",
        autoGemini: Boolean(settings.autoGemini)
      };
      localStorage.setItem(GEMINI_STORAGE, JSON.stringify(clean));
      return true;
    } catch {
      return false;
    }
  }

  // Deterministic PRNG (Mulberry32) seeded from session ID, calendar day, and roll number.
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeRng(seedStr) {
    let a = hashSeed(seedStr) || 1;
    const next = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: arr => arr[Math.floor(next() * arr.length)],
      shuffle: arr => {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      }
    };
  }

  const num = (prompt, answer, unit, explain, tolerance = 0) => ({
    type: "number", prompt, answer, unit, explain, tolerance, source: "local"
  });

  const choice = (prompt, options, correctIndex, explain) => ({
    type: "choice", prompt, options, answer: options[correctIndex], explain, source: "local"
  });

  const round2 = x => Math.round(x * 100) / 100;

  // Parametric generators keyed by session ID. Each returns an array of generator functions.
  const generators = {
    "0/0": [
      r => {
        const ms = r.pick([4, 5, 8, 10, 12.5, 16, 20, 25, 40, 50]);
        const fps = round2(1000 / ms);
        return num(
          `A renderer takes ${ms} ms to draw every frame. How many frames per second (FPS) is that?`,
          fps, "FPS",
          `There are 1,000 ms in one second, so 1,000 ÷ ${ms} = ${fps} FPS.`
        );
      },
      r => {
        const fps = r.pick([20, 25, 40, 50, 80, 100, 125, 200, 250]);
        const ms = round2(1000 / fps);
        return num(
          `Your target frame rate is ${fps} FPS. What is the maximum time budget per frame in milliseconds?`,
          ms, "ms",
          `Divide 1,000 ms by ${fps} frames: 1,000 ÷ ${fps} = ${ms} ms per frame.`
        );
      },
      r => {
        const pair = r.pick([[5, 15], [6, 14], [10, 30], [8, 32], [5, 45], [10, 40]]);
        const total = pair[0] + pair[1];
        const fps = round2((2 * 1000) / total);
        return num(
          `Frames alternate between ${pair[0]} ms and ${pair[1]} ms over and over. What average FPS do you actually get over a full second?`,
          fps, "FPS",
          `Every pair of 2 frames takes ${pair[0]} + ${pair[1]} = ${total} ms. In 1,000 ms you fit ${round2(1000 / total)} pairs = ${fps} frames per second.`
        );
      }
    ],
    "0/1": [
      r => {
        const budget = r.pick([12, 16, 18, 20]);
        const vals = Array.from({length: 6}, () => budget + r.pick([-5, -2, 0, 0, 2, 4, 7]));
        const strict = vals.filter(v => v > budget).length;
        return num(
          `Here is a list of frame times (in ms): [${vals.join(", ")}]. With a budget of ${budget} ms, how many frames are strictly over budget (> ${budget})?`,
          strict, "frames",
          `Count only values strictly greater than ${budget} (exact ties of ${budget} ms are on time). That gives ${strict} frame${strict === 1 ? "" : "s"}.`
        );
      },
      r => {
        const budget = r.pick([14, 16, 20]);
        const vals = Array.from({length: 5}, () => budget + r.pick([-4, 0, 2, 5, 8]));
        const lateness = vals.reduce((acc, v) => acc + Math.max(0, v - budget), 0);
        return num(
          `Frame times are [${vals.join(", ")}] ms and the budget is ${budget} ms. What is the total lateness (sum of milliseconds past ${budget} ms across all late frames)?`,
          lateness, "ms",
          `Each frame contributes max(0, time − ${budget}): [${vals.map(v => Math.max(0, v - budget)).join(", ")}], which sums to ${lateness} ms.`
        );
      }
    ],
    "0/2": [
      r => {
        const cols = r.int(3, 8);
        const rows = r.int(3, 6);
        const row = r.int(1, rows - 1);
        const col = r.int(0, cols - 1);
        const idx = row * cols + col;
        return num(
          `A ${rows} × ${cols} matrix (${rows} rows, ${cols} columns) is stored in one flat row-major array. What 0-based flat index holds row ${row}, column ${col}?`,
          idx, "index",
          `Each full row has ${cols} entries. Skip ${row} full rows (${row} × ${cols} = ${row * cols}), then add column ${col} to get ${idx}.`
        );
      },
      r => {
        const a = [r.int(-3, 5), r.int(-3, 5), r.int(-3, 5)];
        const b = [r.int(-2, 4), r.int(-2, 4), r.int(-2, 4)];
        const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        return num(
          `Compute the dot product of row A = [${a.join(", ")}] and column B = [${b.join(", ")}].`,
          dot, "",
          `Multiply matching positions and add: (${a[0]}×${b[0]}) + (${a[1]}×${b[1]}) + (${a[2]}×${b[2]}) = ${a[0]*b[0]} + ${a[1]*b[1]} + ${a[2]*b[2]} = ${dot}.`
        );
      }
    ],
    "0/3": [
      r => {
        const factor = r.pick([2, 3, -2, 0.5]);
        const inp = [r.pick([2, 4, -2, 6]), r.pick([-4, 2, 6, 8])];
        const offset = r.pick([1, 2]);
        const target = offset + 1;
        const ans = round2(inp[1] * factor);
        return num(
          `An output array starts as [90, 91, 92, 93, 94]. You scale [${inp.join(", ")}] by ${factor} and write the 2 results starting at output[${offset}]. What value ends up in output[${target}]?`,
          ans, "",
          `output[${offset}] receives ${inp[0]} × ${factor} = ${round2(inp[0] * factor)}, and output[${target}] receives ${inp[1]} × ${factor} = ${ans}.`
        );
      },
      r => {
        const n = r.int(2, 5);
        return num(
          `A function is supposed to write exactly n = ${n} values starting at output[0], with guard values in the remaining slots. If an off-by-one bug writes one extra element (i <= n instead of i < n), which 0-based index gets overwritten by mistake?`,
          n, "index",
          `Valid indices for ${n} elements are 0 through ${n - 1}. An off-by-one loop also writes to index ${n}, overwriting the first guard slot.`
        );
      }
    ],
    "0/4": [
      r => {
        const blockSize = r.pick([4, 6, 8, 16]);
        const n = r.int(blockSize + 1, blockSize * 4 - 1);
        const blocks = Math.ceil(n / blockSize);
        const skipped = blocks * blockSize - n;
        return num(
          `An array has ${n} elements, and each block has ${blockSize} workers. Launching just enough full blocks to cover all ${n} elements, how many extra workers fail the (index < ${n}) bounds check and skip writing?`,
          skipped, "workers",
          `You need ceil(${n} / ${blockSize}) = ${blocks} blocks, which launches ${blocks * blockSize} total workers. ${n} workers write and ${blocks * blockSize} − ${n} = ${skipped} skip.`
        );
      },
      r => {
        const blockSize = r.pick([4, 8, 16, 32]);
        const b = r.int(1, 5);
        const lane = r.int(0, blockSize - 1);
        const idx = b * blockSize + lane;
        return num(
          `With ${blockSize} threads per block, what is the 0-based global index for thread ${lane} inside block ${b}?`,
          idx, "index",
          `globalIndex = blockIdx × blockDim + threadIdx = ${b} × ${blockSize} + ${lane} = ${idx}.`
        );
      }
    ],
    "1/0": [
      r => {
        const w = r.int(9, 25), h = r.int(5, 13);
        const bx = 8, by = 4;
        const gx = Math.ceil(w / bx), gy = Math.ceil(h / by);
        const extra = gx * bx * gy * by - w * h;
        return num(
          `You launch 2D blocks of ${bx} × ${by} threads to cover a ${w} × ${h} image (${w} columns, ${h} rows). How many launched threads land outside the image bounds?`,
          extra, "threads",
          `Grid size is ceil(${w}/${bx}) × ceil(${h}/${by}) = ${gx} × ${gy} blocks = ${gx * gy} blocks = ${gx * gy * bx * by} threads. Subtract ${w} × ${h} = ${w * h} pixels to get ${extra} out-of-bounds threads.`
        );
      },
      r => {
        const w = r.int(10, 20), x = r.int(1, w - 1), y = r.int(1, 7);
        const idx = y * w + x;
        return num(
          `In a row-major image of width ${w}, which flat index does thread (x = ${x}, y = ${y}) write?`,
          idx, "index",
          `Row-major flat index is y × width + x = ${y} × ${w} + ${x} = ${idx}.`
        );
      }
    ],
    "1/1": [
      r => {
        const offsetFloats = r.pick([1, 2, 3, 5, 7]);
        const startByte = offsetFloats * 4;
        const endByte = startByte + 32 * 4 - 1;
        const sectors = Math.floor(endByte / 32) - Math.floor(startByte / 32) + 1;
        return num(
          `A 32-thread warp loads 32 consecutive 4-byte floats starting at byte address ${startByte} (misaligned by ${offsetFloats} float${offsetFloats === 1 ? "" : "s"}). How many 32-byte memory sectors does that warp touch?`,
          sectors, "sectors",
          `The request spans bytes ${startByte}..${endByte}, intersecting sectors ${Math.floor(startByte / 32)} through ${Math.floor(endByte / 32)} — a total of ${sectors} sectors (vs. 4 if 32-byte aligned).`
        );
      },
      r => {
        const stride = r.pick([2, 4, 8]);
        const eff = round2(100 / stride);
        return num(
          `A warp loads 4-byte floats with a stride of ${stride} floats between adjacent lanes (starting at address 0). Assuming each touched 32-byte sector is fetched once, what percentage of fetched bytes are actually used?`,
          eff, "%",
          `Only 1 out of every ${stride} floats in the fetched sectors is used, so bandwidth efficiency is 1/${stride} = ${eff}%.`
        );
      }
    ],
    "1/2": [
      r => {
        const prep = r.int(1, 4), kern = r.pick([6, 9, 12, 15]), copy = r.int(1, 4);
        const speedup = r.pick([2, 3]);
        const after = round2(prep + kern / speedup + copy);
        return num(
          `A serial frame spends ${prep} ms on CPU prep, ${kern} ms in a GPU kernel, and ${copy} ms copying pixels back. If you speed up ONLY the GPU kernel by ${speedup}×, what is the new total frame time in ms?`,
          after, "ms",
          `The GPU kernel drops from ${kern} ms to ${round2(kern / speedup)} ms, while prep (${prep} ms) and copy (${copy} ms) stay the same: ${prep} + ${round2(kern / speedup)} + ${copy} = ${after} ms.`
        );
      }
    ],
    "1/3": [
      r => {
        const exp = r.pick([3, 4, 5, 6, 7]);
        const n = 1 << exp;
        return num(
          `A balanced binary reduction tree sums ${n} numbers. How many total additions happen across all levels combined?`,
          n - 1, "additions",
          `Each addition turns 2 values into 1, reducing the count by 1. Going from ${n} values down to 1 always takes ${n} − 1 = ${n - 1} additions (in ${exp} parallel rounds).`
        );
      },
      r => {
        const exp = r.pick([4, 5, 6, 8, 10]);
        const n = 1 << exp;
        return num(
          `What is the span (number of sequential parallel rounds) of a balanced binary reduction tree over ${n} inputs?`,
          exp, "rounds",
          `Each round halves the remaining values, so log₂(${n}) = ${exp} dependent rounds.`
        );
      }
    ],
    "1/4": [
      r => {
        const rows = r.int(3, 7), cols = r.int(4, 9);
        const r0 = r.int(1, rows - 1), c0 = r.int(1, cols - 1);
        const dstIdx = c0 * rows + r0;
        return num(
          `You transpose a ${rows} × ${cols} row-major matrix (${rows} rows, ${cols} cols) into a ${cols} × ${rows} row-major output. What flat index in the OUTPUT holds the entry from input (row ${r0}, col ${c0})?`,
          dstIdx, "index",
          `In the transpose, input (${r0}, ${c0}) moves to output (row ${c0}, col ${r0}). Because the output has width ${rows}, its flat index is ${c0} × ${rows} + ${r0} = ${dstIdx}.`
        );
      }
    ],
    "2/0": [
      r => {
        const q = r.pick([100, 250, 360, 500]), g = r.pick([400, 1000, 1437]), f = 64;
        return num(
          `You score ${q} query images against ${g} gallery images, each with ${f} features, using one GEMM (A is ${q}×${f}, B is ${f}×${g}). How many individual query–gallery similarity scores are in the output matrix C?`,
          q * g, "scores",
          `The output matrix C has shape ${q} × ${g}, which holds ${q} × ${g} = ${q * g} scores.`
        );
      }
    ],
    "2/1": [
      r => {
        const d0 = r.pick([10, 20, 50]), d1 = r.pick([4, 5, 8]), d2 = r.pick([40, 80, 100]), d3 = r.pick([4, 5, 6]);
        const ab_c = d0 * d1 * d2 + d0 * d2 * d3;
        const a_bc = d1 * d2 * d3 + d0 * d1 * d3;
        const best = Math.min(ab_c, a_bc);
        return num(
          `Three matrices have shapes A (${d0}×${d1}), B (${d1}×${d2}), and C (${d2}×${d3}). What is the MINIMUM number of scalar multiplications needed to compute ABC using the cheaper parenthesization?`,
          best, "multiplications",
          `(AB)C costs ${d0}×${d1}×${d2} + ${d0}×${d2}×${d3} = ${ab_c}. A(BC) costs ${d1}×${d2}×${d3} + ${d0}×${d1}×${d3} = ${a_bc}. The cheaper order uses ${best}.`
        );
      }
    ],
    "2/2": [
      r => {
        const T = r.pick([8, 16, 32]);
        const bytes = 2 * T * T * 4;
        return num(
          `A tiled FP32 GEMM block loads one ${T} × ${T} tile of A and one ${T} × ${T} tile of B into shared memory (4 bytes per float). How many bytes of shared memory do those two tiles use per block?`,
          bytes, "bytes",
          `Each tile has ${T}×${T} = ${T * T} floats × 4 bytes = ${T * T * 4} bytes. Two tiles use 2 × ${T * T * 4} = ${bytes} bytes.`
        );
      },
      r => {
        const T = r.pick([8, 16, 32]);
        return num(
          `In a single full K-phase of tiled GEMM with ${T} × ${T} tiles, by what factor does cooperative shared-memory loading reduce global-memory input requests compared to each thread loading its own operands?`,
          T, "×",
          `Independent threads would request 2 × ${T}³ inputs; cooperative loading fetches 2 × ${T}² inputs once and reuses each ${T} times — a ${T}× reduction.`
        );
      }
    ],
    "2/3": [
      r => {
        const bw = r.pick([300, 400, 500, 600]); // GB/s
        const peak = r.pick([15, 20, 24, 30]); // TFLOP/s
        const ai = r.pick([8, 10, 20, 60, 80]); // FLOP/byte
        const memBound = round2((bw * ai) / 1000);
        const cap = Math.min(peak, memBound);
        return num(
          `A GPU has ${bw} GB/s memory bandwidth and ${peak} TFLOP/s peak compute. According to the Roofline model, what is the maximum achievable TFLOP/s for a kernel with arithmetic intensity ${ai} FLOPs/byte?`,
          cap, "TFLOP/s",
          `Memory ceiling = ${bw} GB/s × ${ai} FLOP/byte = ${memBound} TFLOP/s. Take min(${memBound}, ${peak}) = ${cap} TFLOP/s (${memBound < peak ? "memory-bound" : "compute-bound"}).`
        );
      }
    ],
    "2/4": [
      r => {
        const n = r.pick([100, 200, 500, 1000]);
        const ms = r.pick([0.5, 1, 2, 4]);
        const gflops = round2((2 * n * n * n) / (ms * 1e6));
        return num(
          `A ${n} × ${n} × ${n} matrix multiply (counted as 2N³ FLOPs) finishes in ${ms} ms. What is its throughput in GFLOP/s?`,
          gflops, "GFLOP/s",
          `Total FLOPs = 2 × ${n}³ = ${2 * n * n * n}. Dividing by ${ms} ms (${ms / 1000} s) gives ${gflops} GFLOP/s.`
        );
      }
    ],
    "3/0": [
      r => {
        const rowPtr = [0];
        const lens = [r.int(1, 4), r.int(0, 3), r.int(1, 5), r.int(1, 4)];
        for (const l of lens) rowPtr.push(rowPtr[rowPtr.length - 1] + l);
        const row = r.int(0, 3);
        return num(
          `A CSR matrix has row_offsets = [${rowPtr.join(", ")}]. How many nonzero entries are stored in row ${row}?`,
          lens[row], "nonzeros",
          `Row ${row} spans indices row_offsets[${row}] through row_offsets[${row + 1}] − 1, so it has ${rowPtr[row + 1]} − ${rowPtr[row]} = ${lens[row]} nonzero entries.`
        );
      }
    ],
    "3/1": [
      r => {
        const len = r.int(33, 95);
        const rounds = Math.ceil(len / 32);
        return num(
          `A warp-per-row SpMV kernel assigns all 32 lanes to a single sparse row with ${len} nonzeros. How many 32-lane loop iterations (rounds) does the warp take to process that row?`,
          rounds, "rounds",
          `Each round processes up to 32 entries, so ceil(${len} / 32) = ${rounds} rounds (the final round uses ${len - (rounds - 1) * 32} active lanes).`
        );
      }
    ],
    "3/2": [
      r => {
        const flags = Array.from({length: 6}, () => r.pick([0, 1]));
        if (flags.every(x => x === 0)) flags[2] = 1;
        const pos = r.int(2, 5);
        let excl = 0;
        for (let i = 0; i < pos; i++) excl += flags[i];
        return num(
          `During stream compaction, the keep flags are [${flags.join(", ")}]. What is the EXCLUSIVE prefix sum at index ${pos} (counting from 0)?`,
          excl, "",
          `The exclusive prefix sum at index ${pos} is the sum of flags strictly BEFORE index ${pos}: [${flags.slice(0, pos).join(" + ")}] = ${excl}.`
        );
      }
    ],
    "3/3": [
      r => {
        const blockSize = 256;
        const n = r.pick([257, 512, 513, 1000, 1025, 2050]);
        const blocks = Math.ceil(n / blockSize);
        return num(
          `A block-tree reduction launches 256-thread blocks over ${n} inputs, doing 1 global atomicAdd per block instead of 1 per input. How many global atomicAdds execute in total?`,
          blocks, "atomics",
          `ceil(${n} / 256) = ${blocks} blocks, and each block does 1 global atomicAdd, down from ${n} in the naive baseline.`
        );
      }
    ],
    "3/4": [
      r => {
        const setupA = r.pick([1, 2]), perA = r.pick([1.0, 0.8]);
        const setupB = setupA + r.pick([3, 6]), perB = round2(perA - r.pick([0.3, 0.4, 0.5]));
        const calls = Math.floor((setupB - setupA) / (perA - perB)) + 1;
        return num(
          `Method A costs ${setupA} ms setup + ${perA} ms per call. Method B costs ${setupB} ms setup + ${perB} ms per call. What is the smallest integer number of calls where Method B becomes strictly faster in total time?`,
          calls, "calls",
          `Solve ${setupB} + ${perB}k < ${setupA} + ${perA}k ⇒ ${round2(perA - perB)}k > ${setupB - setupA} ⇒ k > ${round2((setupB - setupA) / (perA - perB))}. The first integer call count is ${calls}.`
        );
      }
    ],
    "4/0": [
      r => {
        const other = r.pick([10, 12, 14, 15]), shade = r.pick([4, 6, 8, 10]), factor = r.pick([2, 4]);
        const ans = round2(other + shade / factor);
        return num(
          `A frame takes ${other + shade} ms total: ${shade} ms in the shading kernel and ${other} ms in non-shading work. If you make the shading kernel ${factor}× faster while everything else stays fixed, what is the new frame time in ms?`,
          ans, "ms",
          `Shading drops to ${shade} / ${factor} = ${round2(shade / factor)} ms, so total frame time becomes ${other} + ${round2(shade / factor)} = ${ans} ms.`
        );
      }
    ],
    "4/1": [
      r => {
        const px = r.int(1, 5), py = r.int(1, 5), rad = r.int(2, 4);
        const inside = px * px + py * py <= rad * rad;
        return choice(
          `The nearest point on a capsule segment is (0, 0), the pixel center is (${px}, ${py}), and the capsule radius is ${rad}. Does the pixel hit the capsule?`,
          ["Yes — squared distance is ≤ radius²", "No — squared distance is > radius²"],
          inside ? 0 : 1,
          `Squared distance is ${px}² + ${py}² = ${px * px + py * py}, and radius² is ${rad * rad}. Since ${px * px + py * py} ${inside ? "≤" : ">"} ${rad * rad}, it is a ${inside ? "hit" : "miss"}.`
        );
      }
    ],
    "4/2": [
      r => {
        const segs = r.pick([200, 400, 600, 800]);
        const keepPct = r.pick([5, 10, 15, 20]);
        const kept = Math.round(segs * keepPct / 100);
        return num(
          `A scene has ${segs} capsule segments. For one 16×16 pixel tile, broad-phase culling keeps ${keepPct}% of segments as candidates. How many exact segment tests does each pixel in that tile perform (instead of ${segs})?`,
          kept, "tests",
          `${keepPct}% of ${segs} = ${kept} surviving candidates per pixel in that tile.`
        );
      }
    ],
    "4/3": [
      r => choice(
        "In a frame where almost every worm overlaps the center tiles, why can tiled culling become SLOWER than brute-force rendering?",
        [
          "You pay the overhead of building per-tile candidate lists, yet almost no segments get rejected",
          "Tiled culling always produces wrong pixels in crowded regions",
          "Shared memory cannot be used when more than 10 segments overlap"
        ],
        0,
        "Culling only pays off when the rejected exact tests outweigh the cost of building and reading the candidate lists."
      )
    ],
    "4/4": [
      r => {
        const base = r.pick([2.4, 3.2, 4.0, 4.8]), opt = r.pick([0.4, 0.6, 0.8]);
        const ratio = round2(base / opt);
        return num(
          `On a frozen frame with 0 differing pixels, the baseline GPU kernel takes ${base} ms and your tiled kernel takes ${opt} ms. What is the kernel speedup ratio (baseline ÷ student)?`,
          ratio, "×",
          `Speedup = ${base} / ${opt} = ${ratio}× on the GPU kernel (always report host end-to-end time separately).`
        );
      }
    ],
    "4/lighting": [
      r => {
        const x1 = r.int(1, 4), x2 = r.int(7, 10);
        const y1 = r.int(2, 5), y2 = r.int(6, 9);
        const z1 = r.int(1, 3), z2 = r.int(7, 11);
        const tEnter = Math.max(x1, y1, z1), tExit = Math.min(x2, y2, z2);
        const closest = r.pick([tEnter - 1, tEnter + 1]);
        const reject = closest < tEnter;
        return choice(
          `A ray's slab intervals against a station bay box are [${x1},${x2}], [${y1},${y2}], and [${z1},${z2}]. The closest surface hit found so far is at distance ${closest}. Can the ray safely skip this bay?`,
          ["Yes — the box starts beyond the closest known hit", "No — the box overlaps the ray before the closest known hit"],
          reject ? 0 : 1,
          `The common box interval is [max(${x1},${y1},${z1}), min(${x2},${y2},${z2})] = [${tEnter}, ${tExit}]. Because closest = ${closest} is ${reject ? "less than" : "at or past"} entry ${tEnter}, you ${reject ? "can skip" : "must test"} the bay.`
        );
      }
    ],
    "4/creature": [
      r => {
        const refTests = r.pick([1000, 1200, 2000, 2500]);
        const savedPct = r.pick([40, 50, 60, 75]);
        const stuTests = Math.round(refTests * (1 - savedPct / 100));
        return num(
          `In Sluice 09, the ungrouped path ran ${refTests} primary ray–link tests and your 5-link grouped path ran ${stuTests} tests. What percentage of link tests did grouping eliminate?`,
          savedPct, "%",
          `(reference − student) / reference = (${refTests} − ${stuTests}) / ${refTests} = ${savedPct}%.`
        );
      }
    ],
    "5/0": [
      r => {
        const W = r.pick([5, 6, 8, 10]);
        const row = r.int(1, 3), col = r.int(1, W - 2);
        const idx = row * W + col;
        const dir = r.pick(["north", "south", "west", "east"]);
        const delta = {north: -W, south: W, west: -1, east: 1}[dir];
        return num(
          `In a 2D row-major grid of width ${W}, an interior cell is at flat index ${idx}. What is the flat index of its ${dir} neighbor?`,
          idx + delta, "index",
          `Moving ${dir} changes the flat index by ${delta > 0 ? "+" + delta : delta}, giving ${idx + delta}.`
        );
      },
      r => {
        const sumN = r.pick([2, 4, 6, 8, 10]), rhs = r.pick([2, 4, 6, 8]);
        const pNew = round2((sumN + rhs) / 4);
        return num(
          `In the 5-point Jacobi update (4·p_new − sum_neighbors = rhs), the four old neighbors sum to ${sumN} and rhs is ${rhs}. What is p_new?`,
          pNew, "",
          `Solve 4·p_new = ${sumN} + ${rhs} = ${sumN + rhs}, so p_new = ${sumN + rhs} / 4 = ${pNew}.`
        );
      }
    ],
    "5/1": [
      r => {
        const T = r.pick([4, 8, 16, 32]);
        const rect = (T + 2) * (T + 2);
        return num(
          `A ${T} × ${T} output tile needs a 1-cell halo on all four sides for a 5-point stencil. How many total slots are in the smallest rectangular shared-memory patch (including unused corners)?`,
          rect, "slots",
          `Add 1 halo cell on each side: (${T} + 2) × (${T} + 2) = ${T + 2} × ${T + 2} = ${rect} slots.`
        );
      }
    ],
    "5/2": [
      r => {
        const a = r.pick([2, 4, 5]), b = r.pick([6, 8, 10, 12]), guess = r.pick([1, 2]);
        const resid = Math.abs(b - a * guess);
        return num(
          `For the scalar equation ${a}·p = ${b}, you test the guess p = ${guess}. What is the magnitude of the residual |b − A·p|?`,
          resid, "",
          `Substitute p = ${guess}: |${b} − ${a}×${guess}| = |${b - a * guess}| = ${resid} (note this is different from the solution error |p* − p| = ${round2(Math.abs(b / a - guess))}).`
        );
      }
    ],
    "5/3": [
      r => {
        const outR = r.int(1, 5), inL = r.int(0, 4);
        const div = outR - inL;
        return num(
          `A 1D fluid cell has outflow ${outR} across its right face and inflow ${inL} across its left face. What is its net divergence (outflow − inflow)?`,
          div, "",
          `Divergence = outflow − inflow = ${outR} − ${inL} = ${div}. Pressure projection works to drive this toward 0.`
        );
      }
    ],
    "5/4": [
      r => choice(
        "Why can a fluid visualization look smooth and realistic even when the solver is numerically wrong?",
        [
          "Colored dye smears visually and can hide leftover velocity divergence or an erased small vortex",
          "Because pressure projection does not affect dye advection",
          "Because floating-point rounding cancels divergence automatically"
        ],
        0,
        "Visual plausibility isn't numerical verification — always check divergence/residual norms and grid refinement against a reference."
      )
    ],
    "6/0": [
      r => {
        const rest = r.pick([10, 20, 25, 40]);
        const extra = r.pick([2, 4, 5, 8]);
        const moveEach = round2(extra / 2);
        return num(
          `Two equal-mass, unpinned cloth vertices have rest length ${rest} cm and are stretched to ${rest + extra} cm. How many cm should EACH vertex move inward along the edge to restore the rest length in one constraint projection?`,
          moveEach, "cm",
          `Total stretch is ${extra} cm. With equal free masses, each endpoint takes half the correction: ${extra} / 2 = ${moveEach} cm.`
        );
      }
    ],
    "6/1": [
      r => choice(
        "Why does a gathered Jacobi cloth update avoid atomic writes when updating vertex positions in parallel?",
        [
          "Each thread owns one output vertex, reads only old neighbor positions from the previous buffer, and writes exclusively to its own slot in the new buffer",
          "Because edges are updated sequentially by thread 0",
          "Because Jacobi updates ignore neighbor vertices"
        ],
        0,
        "Flipping from scattering edge-by-edge to gathering per-vertex gives every thread a unique output slot with zero write conflicts."
      )
    ],
    "6/2": [
      r => choice(
        "If you tear a cloth edge between vertex A and vertex B, why should both endpoints check a shared active flag for that edge?",
        [
          "So both vertices agree the stitch is broken — otherwise one vertex would still pull toward the other while the other ignores it",
          "So GPU memory bandwidth doubles",
          "Because CUDA doesn't allow deleting arrays"
        ],
        0,
        "Each constraint is symmetric; storing one shared active flag per edge keeps vertex A and vertex B consistent after a cut."
      )
    ],
    "6/3": [
      r => {
        const rest = r.pick([10, 20, 50, 100]);
        const delta = r.pick([2, 4, 5, 10]);
        const strainPct = round2((delta / rest) * 100);
        return num(
          `An edge has rest length ${rest} mm and stretches to ${rest + delta} mm. What is its fractional strain as a percentage?`,
          strainPct, "%",
          `Strain = (current − rest) / rest = ${delta} / ${rest} = ${round2(delta / rest)} = ${strainPct}%.`
        );
      }
    ],
    "6/4": [
      r => {
        const verts = r.pick([400, 600, 952, 1024]);
        const deg = 8;
        return num(
          `In an 8-neighbor cloth gather (4 axial + 4 diagonal slots per vertex), how many neighbor-slot entries does a mesh of ${verts} vertices store in its fixed-width adjacency table?`,
          verts * deg, "slots",
          `${verts} vertices × ${deg} neighbor slots each = ${verts * deg} entries (unused border slots are marked invalid).`
        );
      }
    ],
    "6/textile": [
      r => choice(
        "In Selvedge, why does the renderer store a hand-made tear in fabric UV coordinates instead of screen pixel coordinates?",
        [
          "UV coordinates stay anchored to the exact stitches on the 3D sleeve when you rotate the camera",
          "Screen coordinates cannot store floating-point numbers",
          "UV coordinates disable shadow rays automatically"
        ],
        0,
        "A screen-pixel mask would stick to the glass of your monitor when you orbit; storing the split in surface (u, v) coordinates keeps it attached to the yarn."
      )
    ],
    "7/0": [
      r => {
        const peakT = r.pick([20, 30, 40, 60]), bwG = r.pick([400, 500, 600, 800]);
        const ridge = round2((peakT * 1000) / bwG);
        return num(
          `A GPU delivers ${peakT} TFLOP/s compute and ${bwG} GB/s memory bandwidth. What is its Roofline ridge point in FLOPs/byte?`,
          ridge, "FLOPs/byte",
          `Ridge point = peak compute ÷ bandwidth = (${peakT} × 1000 GFLOP/s) ÷ ${bwG} GB/s = ${ridge} FLOPs/byte.`
        );
      }
    ],
    "7/1": [
      r => {
        const queries = r.pick([200, 360, 400, 500]);
        const wrong = r.int(8, 25);
        const acc = round2(((queries - wrong) / queries) * 100);
        return num(
          `On ${queries} held-out digit queries, switching to TF32 yields ${queries - wrong} correct top-1 labels (${wrong} wrong). What is the retrieval accuracy percentage?`,
          acc, "%",
          `Accuracy = ${queries - wrong} / ${queries} × 100 = ${acc}%. Always pair accuracy with score-level numerical error.`
        );
      }
    ],
    "7/2": [
      r => {
        const vals = r.pick([512, 1024, 2048, 4096]);
        const group = 16;
        const totalBytes = vals / 2 + vals / group;
        return num(
          `You pack ${vals} 4-bit FP4 weights (2 values per byte) with one 1-byte scale factor per block of ${group} values. How many total bytes does that take before padding?`,
          totalBytes, "bytes",
          `Payload = ${vals} / 2 = ${vals / 2} bytes. Scale factors = ${vals} / ${group} = ${vals / group} bytes. Total = ${totalBytes} bytes.`
        );
      }
    ],
    "7/3": [
      r => {
        const chunks = r.pick([4, 6, 8]), perStage = r.pick([2, 3, 4]);
        const serial = chunks * 3 * perStage;
        const piped = (chunks + 2) * perStage;
        return num(
          `A pipeline processes ${chunks} chunks through 3 equal stages (H2D, Compute, D2H), each taking ${perStage} ms. Ideal 3-way overlap finishes in (${chunks} + 2) × ${perStage} ms vs. ${serial} ms serial. What is the ideal pipelined time in ms?`,
          piped, "ms",
          `After filling the 2 initial stages (${2 * perStage} ms), one chunk finishes every ${perStage} ms: (${chunks} + 2) × ${perStage} = ${piped} ms.`
        );
      }
    ],
    "7/4": [
      r => choice(
        "Before switching a production workload from FP32 to TF32 or FP4 on Blackwell, what two things must you pair in your decision?",
        [
          "Measured wall/GPU timing on the exact workload AND a task-relevant accuracy/ranking check against a higher-precision reference",
          "Only the theoretical TFLOP/s ratio from the datasheet",
          "A single visual screenshot without numerical tolerances"
        ],
        0,
        "Lower precision only wins if it both speeds up your actual workload AND stays within the accuracy contract you defined up front."
      )
    ],
    "8/soundstage": [
      r => {
        const near = r.int(2, 5), far = near + r.int(3, 6), hit = near + 1;
        return choice(
          `A ray enters child box A at distance ${near} and child box B at distance ${far}. You visit A first and hit a triangle at distance ${hit}. What happens to child box B on the stack?`,
          [
            `Skip box B — its entry (${far}) is already past the closest hit (${hit})`,
            `Must still test box B because ${far} > ${near}`,
            `Replace the hit at ${hit} with ${far}`
          ],
          0,
          `Near-first traversal shrinks closest_hit to ${hit}. When box B is popped with entry ${far} > ${hit}, every triangle inside B is guaranteed farther away, so you prune the whole subtree.`
        );
      }
    ],
    "8/0": [
      r => choice(
        "What makes an optimization's acceptance contract falsifiable?",
        [
          "Specifying the exact workload, fixed settings, reference oracle, numeric/pixel tolerance, and a held-out test case before optimizing",
          "Describing the algorithm as faster in prose",
          "Tuning the test input after seeing which sizes run fastest"
        ],
        0,
        "Fixing the workload, oracle, and tolerances up front prevents moving the goalposts after you start optimizing."
      )
    ],
    "8/1": [
      r => choice(
        "Why is a non-square shape (like 17 × 19 × 5) far better than 256 × 256 × 256 for catching CUDA indexing bugs?",
        [
          "It breaks row/column symmetry and forces partially filled edge blocks on every dimension",
          "It runs faster on Tensor Cores",
          "It disables floating-point rounding"
        ],
        0,
        "Square, power-of-two inputs hide swapped strides (row vs. col) and missing boundary checks."
      )
    ],
    "8/2": [
      r => choice(
        "If your optimization cuts primitive tests in half, why might full-frame GPU time drop by less than 50%?",
        [
          "Unchanged fixed costs (prep, shading, memory transfers, or new culling overhead) remain in the frame budget",
          "Because CUDA events always round to whole milliseconds",
          "Because halving tests never changes execution time"
        ],
        0,
        "Always check both the work counter (did the optimization do what you intended?) and the elapsed time (how much of the total frame did that stage represent?)."
      )
    ],
    "8/3": [
      r => choice(
        "Why include an adversarial stress case where your optimization barely helps or even loses?",
        [
          "It proves you understand the boundary conditions and overhead tradeoffs of your algorithm instead of cherry-picking",
          "Because every CUDA optimization must fail on half of all inputs",
          "To lower the average speedup reported in the summary"
        ],
        0,
        "Mapping where a method breaks down (e.g., dense overlap in culling, short rows in warp-SpMV) is essential engineering evidence."
      )
    ],
    "8/4": [
      r => choice(
        "What should an outside reader be able to do using your final capstone report?",
        [
          "Run one exact command to reproduce a verified small check and understand your claim, mechanism, measurements, and known limits",
          "Only read a high-level summary without running any code",
          "Guess which GPU and input dimensions were timed"
        ],
        0,
        "Reproducibility turns a personal experiment into credible engineering evidence."
      )
    ]
  };

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function generateLocal(day, stage = 0, roll = 0) {
    const seed = `${day.id}|${todayKey()}|s${stage}|r${roll}`;
    const rng = makeRng(seed);
    const list = generators[day.id] || [];

    // Mix parametric generators with conceptual lesson checks so every roll feels genuinely fresh.
    const pool = [...list];
    if (day.check) {
      pool.push(() => ({
        type: "choice",
        prompt: day.check.question,
        options: day.check.options,
        answer: day.check.options[day.check.answer],
        explain: day.check.explanation,
        source: "local"
      }));
    }
    const drills = window.LESSON_DRILLS?.[day.id] || [];
    for (const q of drills) {
      pool.push(() => q.options
        ? {type: "choice", prompt: q.prompt, options: q.options, answer: q.options[q.answer], explain: q.explanation, source: "local"}
        : {type: "number", prompt: q.prompt, answer: Number(q.answer), unit: q.unit, explain: q.explanation, source: "local"});
    }

    // Prefer parametric templates on initial display and fresh rolls; rotate cleanly across templates.
    let picker;
    if (list.length) {
      if (roll < list.length) {
        picker = list[(stage + roll) % list.length];
      } else {
        picker = pool[(stage + roll) % pool.length];
      }
    } else {
      picker = pool[(stage + roll) % pool.length];
    }

    const card = picker(rng);
    // Shuffle choice options so you can't memorize "option B is always right".
    if (card.type === "choice" && Array.isArray(card.options) && card.options.length > 2) {
      const shuffled = rng.shuffle(card.options);
      return {...card, options: shuffled};
    }
    return card;
  }

  async function generateGemini(day) {
    const {apiKey, model} = getSettings();
    if (!apiKey) throw new Error("Add a Gemini API key in Review settings first.");

    const promptText = [
      "You are a clear, practical CUDA & C++ instructor writing ONE fresh spaced-repetition review question for a student.",
      `Lesson title: ${day.title}`,
      `Track: ${day.track}`,
      `Learning goal: ${day.objective}`,
      `Reference topic summary: ${day.recall || ""}`,
      "",
      "Rules:",
      "- Write plain, natural, human-readable English (no stiff jargon or ambiguous phrasing).",
      "- Define every variable, array, or scenario concretely.",
      "- Make it genuinely thought-provoking (testing real understanding, debugging, or calculation — not trivial trivia).",
      "- Return ONLY valid JSON matching this exact schema:",
      '{"type":"choice","prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explain":"..."}',
      "  OR for a numeric calculation with one exact answer:",
      '{"type":"number","prompt":"...","answer":42,"unit":"ms","explain":"..."}'
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{parts: [{text: promptText}]}],
          generationConfig: {
            temperature: 0.85,
            responseMimeType: "application/json"
          }
        })
      });
      if (!res.ok) {
        const msg = res.status === 429 ? "Gemini free tier rate limit hit" : `Gemini HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.type === "choice" && Array.isArray(parsed.options) && parsed.options.length >= 2 && Number.isInteger(parsed.correctIndex) && parsed.options[parsed.correctIndex]) {
        return {
          type: "choice",
          prompt: String(parsed.prompt),
          options: parsed.options.map(String),
          answer: String(parsed.options[parsed.correctIndex]),
          explain: String(parsed.explain || ""),
          source: "gemini",
          model
        };
      }
      if (parsed.type === "number" && Number.isFinite(Number(parsed.answer))) {
        return {
          type: "number",
          prompt: String(parsed.prompt),
          answer: Number(parsed.answer),
          unit: String(parsed.unit || ""),
          explain: String(parsed.explain || ""),
          source: "gemini",
          model
        };
      }
      throw new Error("Gemini returned an unexpected format");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {generateLocal, generateGemini, getSettings, saveSettings};
})();
