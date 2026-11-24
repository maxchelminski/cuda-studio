"""Driver-side storage and scheduling for the periodic staggered grid."""

import ctypes as ct
import math
from pathlib import Path
import re
import struct
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "render"))
from cuda_host import DEVICE_PTR, GPU, INT, VOID  # noqa: E402

MODES = ("baseline", "fused", "student")
NAMES = (
    "seed",
    "advect_velocity",
    "right_hand_side",
    *MODES,
    "project",
    "advect_dye",
    "diagnostics",
    "shade",
)
FLOAT = ct.c_float


def backend():
    return GPU(HERE, ("flow.cu", "student.cuh"), NAMES)


def student_span():
    text = (HERE / "student.cuh").read_text(encoding="utf-8")
    value = re.search(r"^\s*#define\s+STUDENT_SPAN\s+([12])\s*(?://.*)?$", text, re.MULTILINE)
    if not value:
        raise ValueError("student.cuh must declare #define STUDENT_SPAN 1 or 2")
    return int(value[1])


class Grid:
    def __init__(self, gpu, w, h):
        self.g, self.w, self.h = gpu, w, h
        self.gx, self.gy = (w + 15) // 16, (h + 15) // 16
        self.span = student_span()
        self.buffers = []
        try:
            self.u, self.v, self.us, self.vs, self.b, self.p, self.tmp = [
                self.alloc(w * h * 4) for _ in range(7)
            ]
            self.rose, self.aqua, self.r2, self.a2 = [self.alloc(w * h * 4) for _ in range(4)]
            self.rgb = self.alloc(w * h * 3)
            self.sums = self.alloc(self.gx * self.gy * 16)
            self.reset()
        except Exception:
            self.close()
            raise

    def alloc(self, size):
        ptr = DEVICE_PTR()
        self.g.call("cuMemAlloc_v2", ct.byref(ptr), size)
        self.buffers.append(ptr)
        return ptr

    def kernel(self, name, *args):
        params = (VOID * len(args))(*(ct.addressof(a) for a in args))
        self.g.call(
            "cuLaunchKernel", self.g.functions[name], self.gx, self.gy, 1, 16, 16, 1, 0, None, params, None
        )

    def reset(self):
        self.time = 0
        self.kernel("seed", self.u, self.v, self.rose, self.aqua, INT(self.w), INT(self.h))

    def pressure(self, mode, sweeps):
        self.kernel("right_hand_side", self.us, self.vs, self.b, self.p, INT(self.w), INT(self.h))
        self.g.call("cuEventRecord", self.g.start_event, None)
        span = 2 if mode == "fused" else (self.span if mode == "student" else 1)
        remaining = sweeps
        while remaining:
            take = min(span, remaining)
            self.kernel(
                mode if take == span else "baseline", self.p, self.b, self.tmp, INT(self.w), INT(self.h)
            )
            self.p, self.tmp = self.tmp, self.p
            remaining -= take
        self.g.call("cuEventRecord", self.g.end_event, None)
        self.kernel("project", self.us, self.vs, self.p, self.u, self.v, INT(self.w), INT(self.h))

    def step(self, mode, sweeps, brush=(-1, -1, 0, 0)):
        w, h = INT(self.w), INT(self.h)
        dt = FLOAT(0.72)
        mx, my, ix, iy = (FLOAT(v) for v in brush)
        self.kernel("advect_velocity", self.u, self.v, self.us, self.vs, w, h, dt, mx, my, ix, iy)
        self.pressure(mode, sweeps)
        self.kernel(
            "advect_dye",
            self.u,
            self.v,
            self.rose,
            self.aqua,
            self.r2,
            self.a2,
            w,
            h,
            dt,
            FLOAT(self.time),
            mx,
            my,
        )
        self.rose, self.r2 = self.r2, self.rose
        self.aqua, self.a2 = self.a2, self.aqua
        self.time += dt.value

    def pressure_ms(self):
        self.g.call("cuEventSynchronize", self.g.end_event)
        ms = FLOAT()
        self.g.call("cuEventElapsedTime", ct.byref(ms), self.g.start_event, self.g.end_event)
        return ms.value

    def read(self, ptr, size):
        buf = ct.create_string_buffer(size)
        self.g.call("cuMemcpyDtoH_v2", buf, ptr, size)
        return buf.raw

    def scalars(self, ptr):
        n = self.w * self.h
        return struct.unpack(f"<{n}f", self.read(ptr, 4 * n))

    def metrics(self):
        self.kernel("diagnostics", self.b, self.u, self.v, self.p, self.sums, INT(self.w), INT(self.h))
        tiles = list(struct.iter_unpack("<4f", self.read(self.sums, self.gx * self.gy * 16)))
        if not all(math.isfinite(value) for tile in tiles for value in tile):
            raise ValueError("Non-finite pressure, residual or velocity in the divergence check")
        rms = [math.sqrt(sum(q[i] for q in tiles) / (self.w * self.h)) for i in range(3)]
        return tuple(rms) + (max(q[3] for q in tiles),)

    def image(self, view):
        self.kernel(
            "shade",
            self.rose,
            self.aqua,
            self.b,
            self.u,
            self.v,
            self.rgb,
            INT(self.w),
            INT(self.h),
            INT(view),
        )
        return self.read(self.rgb, self.w * self.h * 3)

    def close(self):
        for ptr in self.buffers:
            self.g.fn["cuMemFree_v2"](ptr)
        self.buffers.clear()
