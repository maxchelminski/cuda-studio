"""Stream real digit queries through reusable pinned host and device buffers."""
import argparse
from array import array
from contextlib import ExitStack
import ctypes as ct
import math
import operator
from pathlib import Path
from statistics import median
import sys
from time import perf_counter_ns

from schedule import student_slot

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "render"))
from cuda_host import DEVICE_PTR, GPU, INT, PTR, SIZE, UINT, VOID, bind

PIXELS = 64
GALLERY_COUNT = 1437
QUERY_COUNT = 360
ROW_BYTES = GALLERY_COUNT * 4
MODES = ("serial", "two-stream", "student")


def read_digits():
    alphabet = "0123456789abcdefg"
    rows = []
    data = HERE.parent / "compute" / "data" / "digits.txt"
    for line in data.read_text(encoding="ascii").splitlines():
        label, pixels = line.split()
        if len(pixels) != PIXELS or not 0 <= int(label) <= 9:
            raise ValueError(f"Invalid digit at row {len(rows)}.")
        rows.append(bytes(alphabet.index(pixel) for pixel in pixels))
    if len(rows) != GALLERY_COUNT + QUERY_COUNT:
        raise ValueError(f"Expected 1797 digits, received {len(rows)}.")
    return rows[:GALLERY_COUNT], rows[GALLERY_COUNT:]


def expected_scores(gallery, queries):
    # Row-major host data supplies an independent oracle for the transposed GPU input.
    scores = array("I", (sum(map(operator.mul, q, image))
                         for q in queries for image in gallery))
    if scores.itemsize != 4:
        raise RuntimeError("This lab needs 4-byte unsigned integers.")
    return scores.tobytes()


def bind_pipeline_calls(gpu):
    signatures = {
        "cuCtxSynchronize": (),
        "cuStreamCreate": (PTR(VOID), UINT), "cuStreamDestroy_v2": (VOID,),
        "cuMemHostAlloc": (PTR(VOID), SIZE, UINT), "cuMemFreeHost": (VOID,),
        "cuMemcpyHtoDAsync_v2": (DEVICE_PTR, VOID, SIZE, VOID),
        "cuMemcpyDtoHAsync_v2": (VOID, DEVICE_PTR, SIZE, VOID),
        "cuMemsetD8Async": (DEVICE_PTR, ct.c_ubyte, SIZE, VOID),
    }
    for name, args in signatures.items():
        gpu.fn[name] = bind(gpu.lib, name, *args)


def acquire(gpu, cleanup, handle_type, create, destroy, *args):
    handle = handle_type()
    gpu.call(create, ct.byref(handle), *args)
    cleanup.callback(gpu.fn[destroy], handle)
    return handle


class Slot:
    def __init__(self, gpu, cleanup, chunk):
        self.gpu = gpu
        self.pending = None
        self.stream = acquire(gpu, cleanup, VOID, "cuStreamCreate", "cuStreamDestroy_v2", 1)
        self.done = acquire(gpu, cleanup, VOID, "cuEventCreate", "cuEventDestroy_v2", 2)
        self.h_queries = acquire(gpu, cleanup, VOID, "cuMemHostAlloc", "cuMemFreeHost", chunk * PIXELS, 0)
        self.h_scores = acquire(gpu, cleanup, VOID, "cuMemHostAlloc", "cuMemFreeHost", chunk * ROW_BYTES, 0)
        self.d_queries = acquire(gpu, cleanup, DEVICE_PTR, "cuMemAlloc_v2", "cuMemFree_v2", chunk * PIXELS)
        self.d_scores = acquire(gpu, cleanup, DEVICE_PTR, "cuMemAlloc_v2", "cuMemFree_v2", chunk * ROW_BYTES)

    def submit(self, gallery, source, first, count, check_writes):
        gpu, stream = self.gpu, self.stream
        ct.memmove(self.h_queries, ct.addressof(source) + first * PIXELS, count * PIXELS)
        gpu.call("cuMemcpyHtoDAsync_v2", self.d_queries, self.h_queries, count * PIXELS, stream)
        if check_writes:
            # A missed kernel store cannot accidentally inherit a correct score from a previous run.
            gpu.call("cuMemsetD8Async", self.d_scores, 255, count * ROW_BYTES, stream)
        args = [gallery, self.d_queries, self.d_scores, INT(GALLERY_COUNT), INT(count)]
        params = (VOID * len(args))(*(ct.addressof(a) for a in args))
        blocks = (count * GALLERY_COUNT + 255) // 256
        gpu.call("cuLaunchKernel", gpu.functions["score_digits"], blocks, 1, 1,
                 256, 1, 1, 0, stream, params, None)
        gpu.call("cuMemcpyDtoHAsync_v2", self.h_scores, self.d_scores, count * ROW_BYTES, stream)
        gpu.call("cuEventRecord", self.done, stream)
        self.pending = (first, count)

    def retire(self, destination):
        if self.pending is None:
            return
        self.gpu.call("cuEventSynchronize", self.done)
        first, count = self.pending
        ct.memmove(ct.addressof(destination) + first * ROW_BYTES, self.h_scores, count * ROW_BYTES)
        self.pending = None


def run(mode, buffers, gallery, source, destination, queries, chunk, check_writes):
    slots = buffers[:1] if mode == "serial" else buffers
    preview = []
    ct.memset(destination, 255, ct.sizeof(destination))
    start = perf_counter_ns()
    for chunk_index, first in enumerate(range(0, queries, chunk)):
        slot_index = (student_slot(chunk_index, len(slots)) if mode == "student"
                      else chunk_index % len(slots))
        if not isinstance(slot_index, int) or not 0 <= slot_index < len(slots):
            raise ValueError(f"{mode}: chunk {chunk_index} selected invalid slot {slot_index!r}.")
        slot = slots[slot_index]
        if check_writes and chunk_index < 8:
            preview.append(str(slot_index))
        slot.retire(destination)
        slot.submit(gallery, source, first, min(chunk, queries - first), check_writes)
    for slot in slots:
        slot.retire(destination)
    elapsed = (perf_counter_ns() - start) / 1e6
    if check_writes:
        print(f"{mode:10}  first {len(preview)} slot selections: " + " ".join(preview))
    return elapsed


def verify(mode, destination, oracle):
    actual = destination.raw
    if actual == oracle:
        return
    words, expected = memoryview(actual).cast("I"), memoryview(oracle).cast("I")
    for i, (got, wanted) in enumerate(zip(words, expected)):
        if got != wanted:
            raise RuntimeError(f"{mode}: query {i // GALLERY_COUNT}, gallery {i % GALLERY_COUNT}: "
                               f"GPU {got}, CPU {wanted}")
    raise RuntimeError(f"{mode}: output has the wrong length.")


def exercise(gpu, gallery, source, n, chunk, oracle, modes, trials):
    print(f"\nQueries: {n} | gallery: {GALLERY_COUNT} | scores: {n * GALLERY_COUNT:,} | "
          f"chunk capacity: {chunk} | chunks: {math.ceil(n / chunk)} | last chunk: {(n - 1) % chunk + 1}")
    print(f"Per reserved slot: {chunk * (PIXELS + ROW_BYTES):,} pinned host bytes "
          "and the same device bytes.")
    with ExitStack() as cleanup:
        slot_count = 1 if modes == ("serial",) else 2
        buffers = [Slot(gpu, cleanup, chunk) for _ in range(slot_count)]
        destination = ct.create_string_buffer(n * ROW_BYTES)
        # Drain outstanding work before freeing storage even if an exercise edit fails.
        cleanup.callback(gpu.fn["cuCtxSynchronize"])
        for mode in modes:
            run(mode, buffers, gallery, source, destination, n, chunk, True)
            verify(mode, destination, oracle)
        print("Exact CPU match for " + ", ".join(modes) + " (all scores; poisoned GPU output).")
        if trials == 0:
            return
        timings = {mode: [] for mode in modes}
        for trial in range(trials):
            offset = trial % len(modes)
            for mode in modes[offset:] + modes[:offset]:
                ms = run(mode, buffers, gallery, source, destination, n, chunk, False)
                verify(mode, destination, oracle)
                timings[mode].append(ms)
        print("mode        wall p50 ms  wall p95 ms    queries/s (p50)   trials")
        for mode, times in timings.items():
            p50 = median(times)
            p95 = sorted(times)[math.ceil(0.95 * len(times)) - 1]
            print(f"{mode:10}  {p50:11.3f}  {p95:11.3f}  {n * 1000 / p50:17,.0f}  {len(times):7}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queries", type=int, default=360, help="number of held-out queries (1-360)")
    parser.add_argument("--chunk", type=int, default=64, help="maximum queries per chunk (1-360)")
    parser.add_argument("--trials", type=int, default=9, help="timed trials per selected mode")
    parser.add_argument("--check", action="store_true", help="run fixed correctness cases without timing")
    parser.add_argument("--mode", choices=("all",) + MODES, default="all")
    opts = parser.parse_args()
    if not 1 <= opts.queries <= QUERY_COUNT or not 1 <= opts.chunk <= QUERY_COUNT or opts.trials < 1:
        parser.error("--queries and --chunk must be 1-360, --trials must be positive.")
    cases = [(1, 64), (17, 16), (7, 3), (360, 64)] if opts.check else [(opts.queries, opts.chunk)]
    modes = MODES if opts.mode == "all" else (opts.mode,)
    gallery_rows, query_rows = read_digits()
    max_queries = max(n for n, _ in cases)
    oracle = expected_scores(gallery_rows, query_rows[:max_queries])
    source = ct.create_string_buffer(b"".join(query_rows[:max_queries]))
    transposed = b"".join(bytes(column) for column in zip(*gallery_rows))

    gpu = GPU(HERE, ("score.cu",), ("score_digits",))
    try:
        bind_pipeline_calls(gpu)
        print(gpu.name)
        with ExitStack() as cleanup:
            gallery = acquire(gpu, cleanup, DEVICE_PTR, "cuMemAlloc_v2", "cuMemFree_v2", len(transposed))
            gpu.call("cuMemcpyHtoD_v2", gallery, transposed, len(transposed))
            gpu.call("cuCtxSynchronize")
            for n, chunk in cases:
                exercise(gpu, gallery, source, n, chunk, oracle[:n * ROW_BYTES], modes,
                         0 if opts.check else opts.trials)
    finally:
        gpu.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError) as error:
        raise SystemExit(str(error))
