"""Run kernels from the course .cuh files with an existing CUDA build of PyTorch.

Windows shortcut for practicing before installing nvcc. The CMake executable
also benchmarks cuBLAS, accepts custom problem sizes and verifies its results.
"""
import argparse
import ctypes as ct
import os
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent
PTR = ct.c_void_p
INT = ct.c_int
UINT = ct.c_uint
STR = ct.c_char_p


def bind(dll, name, args):
    function = getattr(dll, name)
    function.argtypes = args
    function.restype = INT
    return function


def check(status, name):
    if status != 0:
        raise RuntimeError(f"{name} failed with status {status}")


class Module:
    def __init__(self, torch, expressions):
        if os.name != "nt":
            raise RuntimeError("Use the CMake build on this platform. This shortcut locates Windows CUDA DLLs.")
        installed = ROOT.parents[1] / "tools/cuda-12.8.1/bin/nvrtc64_120_0.dll"
        override = os.environ.get("CUDA_LAB_NVRTC")
        if override or installed.is_file():
            library = Path(override) if override else installed
        else:
            torch_dir = Path(torch.__file__).resolve().parent / "lib"
            candidates = sorted(p for p in torch_dir.glob("nvrtc64_*.dll") if ".alt." not in p.name)
            if not candidates:
                raise RuntimeError(f"No NVRTC compiler in {torch_dir}. Use the course PowerShell or the native CMake build.")
            library = candidates[-1]
        libdir = library.resolve().parent
        self.dll_path = os.add_dll_directory(str(libdir))
        rtc = ct.WinDLL(str(library))
        major, minor = INT(), INT()
        version = bind(rtc, "nvrtcVersion", [ct.POINTER(INT), ct.POINTER(INT)])
        check(version(ct.byref(major), ct.byref(minor)), "nvrtcVersion")
        builtins = libdir / f"nvrtc-builtins64_{major.value}{minor.value}.dll"
        if builtins.is_file():
            self.builtins = ct.WinDLL(str(builtins))
        print(f"Kernel compiler: {library}", flush=True)
        driver = ct.WinDLL("nvcuda.dll")
        create = bind(rtc, "nvrtcCreateProgram", [ct.POINTER(PTR), STR, STR, INT, PTR, PTR])
        add = bind(rtc, "nvrtcAddNameExpression", [PTR, STR])
        compile_program = bind(rtc, "nvrtcCompileProgram", [PTR, INT, ct.POINTER(STR)])
        lowered = bind(rtc, "nvrtcGetLoweredName", [PTR, STR, ct.POINTER(STR)])
        destroy = bind(rtc, "nvrtcDestroyProgram", [ct.POINTER(PTR)])
        load = bind(driver, "cuModuleLoadData", [ct.POINTER(PTR), PTR])
        get_kernel = bind(driver, "cuModuleGetFunction", [ct.POINTER(PTR), PTR, STR])
        self.launch = bind(driver, "cuLaunchKernel", [PTR] + [UINT] * 7 + [PTR, ct.POINTER(PTR), PTR])
        self.unload = bind(driver, "cuModuleUnload", [PTR])
        source = "\n".join((ROOT / path).read_text(encoding="utf-8-sig").replace("#pragma once", "")
                           for path in ("learner.cuh", "solutions.cuh")).encode()
        program = PTR()
        check(create(ct.byref(program), source, b"workbench.cu", 0, None, None), "nvrtcCreateProgram")
        try:
            for name in expressions:
                check(add(program, name.encode()), name)
            major, minor = torch.cuda.get_device_capability()
            arch = f"--gpu-architecture=compute_{major}{minor}".encode()
            options = (STR * 2)(arch, b"--std=c++17")
            status = compile_program(program, 2, options)
            if status:
                log = self.blob(rtc, program, "ProgramLog")
                raise RuntimeError(f"NVRTC could not compile for {arch.decode()}.\n{log.value.decode()}")
            ptx = self.blob(rtc, program, "PTX")
            self.handle = PTR()
            check(load(ct.byref(self.handle), ct.cast(ptx, PTR)), "cuModuleLoadData")
            self.functions = {}
            for name in expressions:
                mangled, func = STR(), PTR()
                check(lowered(program, name.encode(), ct.byref(mangled)), name)
                check(get_kernel(ct.byref(func), self.handle, mangled), name)
                self.functions[name] = func
        finally:
            check(destroy(ct.byref(program)), "nvrtcDestroyProgram")
        self.stream = PTR(torch.cuda.current_stream().cuda_stream)

    @staticmethod
    def blob(rtc, program, kind):
        size = ct.c_size_t()
        get_size = bind(rtc, f"nvrtcGet{kind}Size", [PTR, ct.POINTER(ct.c_size_t)])
        get_blob = bind(rtc, f"nvrtcGet{kind}", [PTR, PTR])
        check(get_size(program, ct.byref(size)), kind + " size")
        blob = ct.create_string_buffer(size.value)
        check(get_blob(program, blob), kind)
        return blob

    def run(self, name, grid, block, args):
        values = [INT(arg) if isinstance(arg, int) else PTR(arg.data_ptr()) for arg in args]
        pointers = (PTR * len(values))(*(ct.cast(ct.byref(value), PTR) for value in values))
        check(self.launch(self.functions[name], *grid, *block, 0, self.stream, pointers, None), name)

    def close(self):
        check(self.unload(self.handle), "cuModuleUnload")
        self.dll_path.close()


KERNELS = {
    "gemm": ["baseline::gemm", "student_gemm", "solution::gemm<16>"],
    "reduce": ["baseline::reduce", "student_reduce", "solution::reduce_tree<256>"],
    "spmv": ["baseline::spmv", "student_spmv", "solution::spmv_warp"],
    "poisson": ["baseline::poisson", "student_poisson", "solution::poisson_shared<16>"],
}


def run_case(torch, name, launch, prepare, verify):
    prepare()
    launch()
    torch.cuda.synchronize()
    intervals = []
    begin, end = torch.cuda.Event(enable_timing=True), torch.cuda.Event(enable_timing=True)
    for _ in range(9):
        prepare()
        begin.record()
        launch()
        end.record()
        end.synchronize()
        intervals.append(begin.elapsed_time(end))
    try:
        verify()
    except (AssertionError, RuntimeError) as error:
        raise RuntimeError(f"{name} failed its output check. {error}") from error
    print(f"  {name:30s} {median(intervals):9.4f} ms "
          f"(min {min(intervals):.4f}, max {max(intervals):.4f})   PASS")
    print("    samples_ms in run order:", " ".join(f"{ms:.8g}" for ms in intervals))


def shape2d(w, h):
    return ((w + 15) // 16, (h + 15) // 16, 1), (16, 16, 1)


def gemm(torch, mod):
    torch.manual_seed(5070)
    for m, n, k in [(19, 33, 7), (257, 193, 129)]:
        print(f"GEMM {m} x {n} x {k}")
        a = torch.randn(m, k).cuda()
        b = torch.randn(k, n).cuda()
        c = torch.empty(m, n, device="cuda")
        expected = (a.cpu().double() @ b.cpu().double()).float()
        grid, block = shape2d(n, m)
        for name in KERNELS["gemm"]:
            run_case(torch, name, lambda: mod.run(name, grid, block, [a, b, c, m, n, k]),
                     lambda: c.fill_(float("nan")),
                     lambda: torch.testing.assert_close(c.cpu(), expected, rtol=2e-5, atol=4e-5))


def digit_records():
    alphabet = "0123456789abcdefg"
    rows = [line.split() for line in (ROOT / "data/digits.txt").read_text().splitlines()]
    return [int(label) for label, _ in rows], [[alphabet.index(p) for p in pixels] for _, pixels in rows]


def digits(torch, mod):
    labels, cells = digit_records()
    raw = torch.tensor(cells, dtype=torch.float64)
    normalized = raw / torch.linalg.vector_norm(raw, dim=1, keepdim=True)
    n, k = len(cells) * 4 // 5, 64
    m = len(cells) - n
    a, b = normalized[n:].float().cuda(), normalized[:n].T.contiguous().float().cuda()
    c = torch.empty(m, n, device="cuda")
    expected = (a.cpu().double() @ b.cpu().double()).float()
    labels = torch.tensor(labels)
    grid, block = shape2d(n, m)
    print(f"Digit retrieval {m} queries x {n} gallery images, {k} features")
    for name in KERNELS["gemm"]:
        run_case(torch, name, lambda: mod.run(name, grid, block, [a, b, c, m, n, k]),
                 lambda: c.fill_(float("nan")), lambda: torch.testing.assert_close(c.cpu(), expected))
        agreement = (labels[c.cpu().argmax(1)] == labels[n:]).sum().item()
        print(f"    nearest-image label agreement {agreement}/{m}")


def chain(torch, _module):
    import numpy as np

    _, cells = digit_records()
    images = torch.tensor(cells, dtype=torch.float32) / 16
    pixels = images.shape[1]
    print("Matrix chain | PyTorch CUDA torch.mm (cuBLAS), FP32, TF32 disabled")
    previous_tf32 = torch.backends.cuda.matmul.allow_tf32
    torch.backends.cuda.matmul.allow_tf32 = False
    try:
        for count, hidden, outputs in ((1797, 512, 10), (8, 16, 512)):
            # Match the native std::mt19937 seed and use its upper 24 bits per value.
            rng = np.random.RandomState(5070)
            def make_map(rows, cols):
                bits = rng.randint(0, 2**32, size=(rows, cols), dtype=np.uint32)
                values = (bits >> 8).astype(np.float32) * (2.0 / 16777216.0) - 1.0
                return torch.from_numpy(values)

            a_cpu, b_cpu, c_cpu = images[:count], make_map(pixels, hidden), make_map(hidden, outputs)
            reference = a_cpu.double() @ (b_cpu.double() @ c_cpu.double())
            reference_norm = torch.linalg.vector_norm(reference)
            a, b, c = a_cpu.cuda(), b_cpu.cuda(), c_cpu.cuda()
            result = a.new_empty((count, outputs))
            def verify():
                error = result.cpu().double() - reference
                relative = (torch.linalg.vector_norm(error) / reference_norm).item()
                maximum = error.abs().max().item()
                if not relative <= 2e-5:
                    raise RuntimeError(f"Matrix chain exceeded CPU FP64 tolerance: relative L2={relative}")
                print(f"    FP64 check {result.numel():,} entries | relative L2 {relative:.3g} | max abs {maximum:.3g}")

            print(f"{count} UCI digit rows x {pixels} pixels x {hidden} hidden x {outputs} outputs")
            for order in ("(AB)C", "A(BC)"):
                if order == "(AB)C":
                    scratch = a.new_empty((count, hidden))
                    work = 2 * count * hidden * (pixels + outputs)
                    def multiply():
                        torch.mm(a, b, out=scratch)
                        torch.mm(scratch, c, out=result)
                else:
                    scratch = a.new_empty((pixels, outputs))
                    work = 2 * pixels * outputs * (hidden + count)
                    def multiply():
                        torch.mm(b, c, out=scratch)
                        torch.mm(a, scratch, out=result)
                print(f"  {order} | nominal FLOPs {work:,} | temporary {scratch.numel()*scratch.element_size():,} bytes")
                run_case(torch, order, multiply, lambda: result.fill_(float("nan")), verify)
    finally:
        torch.backends.cuda.matmul.allow_tf32 = previous_tf32


def reduce(torch, mod):
    _, images = digit_records()
    pixels = [p for image in images for p in image]
    for count in (261, len(pixels)):
        print(f"Reduce {count} digit cells | expected sum {sum(pixels[:count])}")
        values = torch.tensor(pixels[:count], dtype=torch.int32, device="cuda")
        total = torch.empty(1, dtype=torch.int64, device="cuda")
        expected = torch.tensor([sum(pixels[:count])])
        for name in KERNELS["reduce"]:
            run_case(torch, name,
                     lambda: mod.run(name, ((count + 255) // 256, 1, 1), (256, 1, 1), [values, count, total]),
                     total.zero_, lambda: torch.testing.assert_close(total.cpu(), expected))


def spmv(torch, mod):
    records = [line for line in (ROOT / "data/karate.mtx").read_text().splitlines() if not line.startswith("%")]
    edges = [tuple(int(v) - 1 for v in line.split()) for line in records[1:]]
    rows = [[] for _ in range(34)]
    for a, b in edges:
        rows[a].append(b)
        rows[b].append(a)
    for neighbors, width in ((rows, 34), ([list(range(65)), [], [0]], 65)):
        offsets = [0]
        columns = []
        for row in neighbors:
            columns.extend(sorted(row))
            offsets.append(len(columns))
        count, copies = len(neighbors), 3
        print(f"SpMV {count} x {width}, {len(columns)} entries, {copies} RHS")
        offs = torch.tensor(offsets, dtype=torch.int32, device="cuda")
        cols = torch.tensor(columns, dtype=torch.int32, device="cuda")
        vals = torch.ones(len(columns), device="cuda")
        inputs = torch.arange(copies * width, dtype=torch.float32).reshape(copies, width)
        x, y = inputs.cuda(), torch.empty(copies, count, device="cuda")
        expected = torch.stack([inputs[:, row].sum(1) for row in neighbors], dim=1)
        for name in KERNELS["spmv"]:
            work = count * copies * (32 if name == "solution::spmv_warp" else 1)
            run_case(torch, name, lambda: mod.run(name, ((work + 127) // 128, 1, 1), (128, 1, 1),
                                                 [offs, cols, vals, x, y, count, width, copies]),
                     lambda: y.fill_(float("nan")), lambda: torch.testing.assert_close(y.cpu(), expected))


def roof(torch, mod):
    lines = (ROOT / "data/bcsstk14.mtx").read_text().splitlines()
    records = (line.split() for line in lines if line and not line.startswith("%"))
    rows, cols, _ = map(int, next(records))
    matrix = [[] for _ in range(rows)]
    for r, c, v in records:
        r, c, v = int(r) - 1, int(c) - 1, float(v)
        matrix[r].append((c, v))
        if r != c:
            matrix[c].append((r, v))
    starts, columns, values = [0], [], []
    for row in matrix:
        for col, value in sorted(row):
            columns.append(col)
            values.append(value)
        starts.append(len(values))
    copies = 3
    inputs = torch.arange(copies * cols, dtype=torch.int32).reshape(copies, cols)
    inputs = ((inputs * 31 + inputs // cols) % 127 - 63).float() / 63
    inputs[0].fill_(1)
    x, y = inputs.cuda(), torch.empty(copies, rows, device="cuda")
    values = torch.tensor(values, dtype=torch.float32)
    ci = torch.tensor(columns, dtype=torch.int32)
    # Sum products in CPU FP64, including the strongly cancelling all-ones case.
    row_ids = torch.repeat_interleave(torch.arange(rows), torch.diff(torch.tensor(starts)))
    expected = torch.zeros(copies, rows, dtype=torch.float64)
    products = inputs[:, ci].double() * values.double()
    expected.index_add_(1, row_ids, products)
    magnitude = torch.zeros_like(expected).index_add_(1, row_ids, products.abs())
    lengths = torch.diff(torch.tensor(starts, dtype=torch.float64))
    fp32 = torch.finfo(torch.float32)
    allowance = (lengths + 5) * fp32.eps * magnitude + (lengths + 1) * fp32.tiny
    starts = torch.tensor(starts, dtype=torch.int32, device="cuda")
    ci, values = ci.cuda(), values.cuda()
    def verify():
        difference = y.cpu().double() - expected
        relative = (torch.linalg.vector_norm(difference) / torch.linalg.vector_norm(expected)).item()
        ratios = difference.abs() / allowance
        batch, row = divmod(ratios.argmax().item(), rows)
        worst = ratios[batch, row].item()
        print(f"    relative L2 {relative:.3g}; worst error / local allowance {worst:.3g}"
              f" at RHS {batch}, row {row} (zero-based)")
        if not (relative <= 3e-5 and worst <= 1):
            raise RuntimeError("Roof SpMV exceeded its FP64 tolerance")
    print(f"Coliseum roof {rows} x {cols}, {values.numel()} nonzeros, {copies} RHS")
    for name in KERNELS["spmv"]:
        work = rows * copies * (32 if name == "solution::spmv_warp" else 1)
        run_case(torch, name, lambda: mod.run(name, ((work + 127) // 128, 1, 1), (128, 1, 1),
                                             [starts, ci, values, x, y, rows, cols, copies]),
                 lambda: y.fill_(float("nan")), verify)


def poisson(torch, mod):
    w, h = 37, 21
    source = torch.zeros(h, w)
    source[h // 2, w // 3] = 1
    source[h // 2, 2 * w // 3] = -1
    rhs = source.cuda()
    grid, block = shape2d(w, h)
    first, second = torch.empty_like(rhs), torch.empty_like(rhs)
    for steps in (5, 12):
        print(f"Poisson {w} x {h}, {steps} sweeps")
        current, next_ = torch.zeros_like(source).double(), torch.zeros_like(source).double()
        for _ in range(steps):
            next_[1:-1, 1:-1] = .25 * (current[1:-1, :-2] + current[1:-1, 2:] + current[:-2, 1:-1]
                                        + current[2:, 1:-1] + source[1:-1, 1:-1])
            current, next_ = next_, current
        for name in KERNELS["poisson"]:
            def launch():
                src, dst = first, second
                for _ in range(steps):
                    mod.run(name, grid, block, [src, rhs, dst, w, h])
                    src, dst = dst, src
            def prepare():
                first.zero_()
                second.fill_(float("nan"))
            result = second if steps % 2 else first
            run_case(torch, name, launch, prepare, lambda: torch.testing.assert_close(result.cpu(), current.float()))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lab", choices=["all", *KERNELS, "digits", "roof", "chain"], default="all", nargs="?")
    args = parser.parse_args()
    import torch
    if not torch.cuda.is_available():
        raise SystemExit("A CUDA-enabled PyTorch runtime and a compatible device are required for this shortcut.")
    torch.empty(1, device="cuda")  # Establish the CUDA primary context before driver API calls.
    print(f"{torch.cuda.get_device_name()} | PyTorch {torch.__version__} | median of 9 CUDA event intervals")
    print("Python submits each launch; short kernels and multi-launch sweeps may include host dispatch gaps.")
    runners = {"gemm": gemm, "digits": digits, "reduce": reduce, "spmv": spmv, "roof": roof, "poisson": poisson,
               "chain": chain}
    labs = list(runners) if args.lab == "all" else [args.lab]
    kernels = dict(KERNELS, digits=KERNELS["gemm"], roof=KERNELS["spmv"], chain=[])
    expressions = list(dict.fromkeys(name for lab in labs for name in kernels[lab]))
    module = Module(torch, expressions) if expressions else None
    try:
        for lab in labs:
            runners[lab](torch, module)
    finally:
        if module is not None:
            module.close()


if __name__ == "__main__":
    main()
