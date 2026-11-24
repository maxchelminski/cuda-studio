"""Cloth topology, scalar reference, and a persistent CUDA simulation state."""
import ctypes as ct
from math import cos, dist, isfinite, sin, sqrt
from pathlib import Path
import struct
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "render"))
from cuda_host import DEVICE_PTR, GPU, INT, VOID

POINT, EDGE, INTEGER = struct.Struct("<3f"), struct.Struct("<iif"), struct.Struct("<i")
MODES = ("baseline", "gathered", "student")


def backend():
    return GPU(HERE, ("cloth.cu", "student.cuh"), ("predict", "tear_stretched", *MODES))


class Mesh:
    def __init__(self, cols, rows):
        self.cols, self.rows = cols, rows
        self.points, self.edges, self.visible = [], [], []
        self.pinned = bytearray(cols * rows)
        self.incident = [[] for _ in self.pinned]
        sx, sy = 0.76 / (cols - 1), 0.78 / (rows - 1)
        anchors = {round(t * (cols - 1) / 4) for t in range(5)}
        for y in range(rows):
            for x in range(cols):
                i = y * cols + x
                u, v = x / (cols - 1), y / (rows - 1)
                self.points.append((0.12 + sx * x, 0.07 + sy * y,
                                    0.032 * cos(4 * u * 3.14159) * sin(5 * v + 0.33)))
                self.pinned[i] = (y == 0 and x in anchors)
                for dx, dy in ((1, 0), (0, 1), (1, 1), (-1, 1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < cols and ny < rows:
                        j = ny * cols + nx
                        k = len(self.edges)
                        self.edges.append((i, j, sqrt((dx * sx) ** 2 + (dy * sy) ** 2)))
                        self.visible.append(dx == 0 or dy == 0)
                        self.incident[i].append(k)
                        self.incident[j].append(k)
        self.active = bytearray([1]) * len(self.edges)

    def cut(self, projected, x, y, radius):
        before = sum(self.active)
        for k, (a, b, _) in enumerate(self.edges):
            if not self.active[k]:
                continue
            ax, ay = projected[a]
            bx, by = projected[b]
            dx, dy = bx - ax, by - ay
            t = min(1, max(0, ((x - ax) * dx + (y - ay) * dy) / max(dx * dx + dy * dy, 1e-12)))
            if (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= radius ** 2:
                self.active[k] = 0
        return before - sum(self.active)

    def strain(self, pts):
        values = [abs(dist(pts[a], pts[b]) / rest - 1) for k, (a, b, rest) in enumerate(self.edges)
                  if self.active[k]]
        if not all(isfinite(s) for s in values):
            raise ValueError("Non-finite cloth state")
        return (sqrt(sum(v * v for v in values) / len(values)), max(values)) if values else (0.0, 0.0)


def reference_sweep(mesh, pts):
    answer = []
    for i, p in enumerate(pts):
        if mesh.pinned[i]:
            answer.append(p)
            continue
        correction = [0.0, 0.0, 0.0]
        degree = 0
        for k in mesh.incident[i]:
            if not mesh.active[k]:
                continue
            a, b, rest = mesh.edges[k]
            other = a if b == i else b
            length = dist(p, pts[other])
            if length < 1e-8:
                continue
            f = (1 if mesh.pinned[other] else 0.5) * (rest - length) / length
            for axis in range(3):
                correction[axis] += f * (p[axis] - pts[other][axis])
            degree += 1
        q = [v + 0.96 * c / max(1, degree) for v, c in zip(p, correction)]
        answer.append((q[0], min(0.98, q[1]), q[2]))
    return answer


class Solver:
    def __init__(self, gpu, mesh, dt):
        self.gpu, self.mesh, self.dt = gpu, mesh, dt
        self.time = 0.0
        self.n = len(mesh.points)
        self.buffers = []
        points = b"".join(POINT.pack(*p) for p in mesh.points)
        try:
            self.now, self.prev, self.work, self.spare = [self.allocate(points) for _ in range(4)]
            self.edges = self.allocate(b"".join(EDGE.pack(*e) for e in mesh.edges))
            slots = (i for row in mesh.incident for i in row + [-1] * (8 - len(row)))
            self.incident = self.allocate(b"".join(INTEGER.pack(i) for i in slots))
            self.active = self.allocate(bytes(mesh.active))
            self.pinned = self.allocate(bytes(mesh.pinned))
        except Exception:
            self.close()
            raise

    def allocate(self, data):
        ptr = DEVICE_PTR()
        self.gpu.call("cuMemAlloc_v2", ct.byref(ptr), len(data))
        self.buffers.append(ptr)
        self.gpu.call("cuMemcpyHtoD_v2", ptr, data, len(data))
        return ptr

    def upload_cuts(self):
        mask = bytes(self.mesh.active)
        self.gpu.call("cuMemcpyHtoD_v2", self.active, mask, len(mask))

    def download_cuts(self):
        mask = (ct.c_ubyte * len(self.mesh.active)).from_buffer(self.mesh.active)
        self.gpu.call("cuMemcpyDtoH_v2", mask, self.active, len(mask))

    def set_pin(self, index, fixed):
        self.mesh.pinned[index] = fixed
        self.gpu.call("cuMemcpyHtoD_v2", self.pinned.value + index, bytes([fixed]), 1)

    def place_vertex(self, index, point):
        # Keep the two Verlet positions together so releasing a grab adds no impulse.
        data = POINT.pack(*point)
        for buffer in (self.now, self.prev):
            self.gpu.call("cuMemcpyHtoD_v2", buffer.value + index * POINT.size, data, len(data))

    def positions(self, ptr=None):
        packed = ct.create_string_buffer(POINT.size * self.n)
        self.gpu.call("cuMemcpyDtoH_v2", packed, ptr or self.now, len(packed))
        return list(POINT.iter_unpack(packed.raw))

    def launch(self, name, *args, items=None):
        params = (VOID * len(args))(*(ct.addressof(x) for x in args))
        count = self.n if items is None else items
        self.gpu.call("cuLaunchKernel", self.gpu.functions[name], (count + 127) // 128, 1, 1,
                      128, 1, 1, 0, None, params, None)

    def sweep(self, mode, source, target):
        self.launch(mode, source, target, self.edges, self.incident, self.active, self.pinned,
                    INT(self.n), INT(len(self.mesh.edges)))

    def fracture(self, positions, limit):
        edges = len(self.mesh.edges)
        self.launch("tear_stretched", positions, self.edges, self.active, INT(edges),
                    ct.c_float(limit), items=edges)

    def step(self, mode, iterations, tear_strain=None):
        g = self.gpu
        g.call("cuEventRecord", g.start_event, None)
        self.launch("predict", self.now, self.prev, self.work, self.pinned, INT(self.n),
                    ct.c_float(self.dt), ct.c_float(self.time))
        if tear_strain is not None:
            self.fracture(self.work, tear_strain)
        source, target = self.work, self.spare
        for _ in range(iterations):
            self.sweep(mode, source, target)
            source, target = target, source
        g.call("cuEventRecord", g.end_event, None)
        g.call("cuEventSynchronize", g.end_event)
        elapsed = ct.c_float()
        g.call("cuEventElapsedTime", ct.byref(elapsed), g.start_event, g.end_event)
        self.prev, self.now, self.work, self.spare = self.now, source, self.prev, target
        self.time += self.dt
        return elapsed.value

    def close(self):
        for ptr in self.buffers:
            self.gpu.fn["cuMemFree_v2"](ptr)
        self.buffers.clear()
