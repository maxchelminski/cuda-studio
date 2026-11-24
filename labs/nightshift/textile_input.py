"""Pick the CUDA material coordinate under the cursor and retain local breaks in one viewer session."""
import ctypes as ct
import math

from cuda_host import DEVICE_PTR, INT, SIZE, VOID, bind


class TextileInteraction:
    """Pulling distorts a patch of stitches. A sufficiently long pull opens a permanent local split."""

    capacity = 32
    threshold = 0.049

    def __init__(self, gpu):
        self.gpu = gpu
        self.marks = []
        self.anchor = None
        self.press_position = None
        self.active_mark = None
        self.displacement = (0.0, 0.0)
        self.gpu.fn["cuModuleGetGlobal_v2"] = bind(
            self.gpu.lib, "cuModuleGetGlobal_v2", ct.POINTER(DEVICE_PTR), ct.POINTER(SIZE), VOID, ct.c_char_p
        )
        self.pick_buffer = DEVICE_PTR()
        self.gpu.call("cuMemAlloc_v2", ct.byref(self.pick_buffer), 2 * ct.sizeof(ct.c_float))
        try:
            self.upload()
        except Exception:
            self.close()
            raise

    def _write_constant(self, name, values):
        address, size = DEVICE_PTR(), SIZE()
        self.gpu.call("cuModuleGetGlobal_v2", ct.byref(address), ct.byref(size), self.gpu.module, name.encode("ascii"))
        packed = (ct.c_float * len(values))(*values)
        if ct.sizeof(packed) != size.value:
            raise RuntimeError(f"Unexpected constant size for {name}: {size.value} bytes")
        self.gpu.call("cuMemcpyHtoD_v2", address, packed, size.value)

    def upload(self):
        """Look up both symbols again after hot reload, as they now belong to the new module."""
        values = [value for tear in self.marks for value in tear]
        values.extend([0.0] * (self.capacity * 4 - len(values)))
        self._write_constant("textileMarks", values)
        self._write_grab()

    def _write_grab(self):
        self._write_constant("textileGrab", (*self.anchor, *self.displacement) if self.anchor else (0, 0, 0, 0))

    def pick(self, x, y, aspect, time, yaw, pitch, control):
        args = [ct.c_float(v) for v in (x, y, aspect, time, yaw, pitch, control)] + [self.pick_buffer]
        params = (VOID * len(args))(*(ct.addressof(arg) for arg in args))
        self.gpu.call("cuLaunchKernel", self.gpu.functions["textilePick"], 1, 1, 1, 1, 1, 1, 0, None, params, None)
        result = (ct.c_float * 2)()
        self.gpu.call("cuMemcpyDtoH_v2", result, self.pick_buffer, ct.sizeof(result))
        return tuple(result) if result[0] >= 0.0 else None

    def grab(self, x, y, aspect, time, yaw, pitch, control):
        self.release()
        point = self.pick(x, y, aspect, time, yaw, pitch, control)
        if point is None:
            return "Grab the knit between the brass collars."
        self.anchor, self.press_position = point, (x, y)
        self._write_grab()
        return "Fabric held. Drag a little to stretch, farther to split."

    def drag(self, x, y, aspect, time, yaw, pitch, control):
        if self.anchor is None:
            return ""
        point = self.pick(x, y, aspect, time, yaw, pitch, control)
        if point is not None:
            du = (point[0] - self.anchor[0] + 0.5) % 1.0 - 0.5
            dv = point[1] - self.anchor[1]
        else:
            # Continue the pull after the pointer crosses the silhouette.
            sx, sy = (x - self.press_position[0]) * aspect, y - self.press_position[1]
            du, dv = (-0.29 * sx + 0.96 * sy) * 0.32, (0.96 * sx + 0.29 * sy) * 0.32
        distance = math.hypot(du, dv)
        # Allow visible reversible strain before failure; limit UV displacement near the silhouette.
        factor = min(1.0, 0.10 / max(distance, 1e-6))
        self.displacement = (du * factor, dv * factor)
        if distance > self.threshold and (self.active_mark is not None or len(self.marks) < self.capacity):
            size = min(1.7, 0.22 + (distance - self.threshold) * 5.7)
            if self.active_mark is None:
                self.active_mark = len(self.marks)
                self.marks.append((*self.anchor, size, math.atan2(dv, du)))
            elif size > self.marks[self.active_mark][2]:
                self.marks[self.active_mark] = (*self.anchor, size, self.marks[self.active_mark][3])
            self.upload()
            return f"Split {self.active_mark+1} / {self.capacity} · release to inspect."
        self._write_grab()
        return "Stretching the knit." if len(self.marks) < self.capacity else "All 32 splits retained. Clear damage for a new swatch."

    def release(self):
        self.anchor = self.press_position = self.active_mark = None
        self.displacement = (0.0, 0.0)
        self._write_grab()

    def clear(self):
        self.marks.clear()
        self.anchor = self.press_position = self.active_mark = None
        self.displacement = (0.0, 0.0)
        self.upload()
        return "Hand-made splits cleared. Set tension below 0.28 for an intact specimen."

    def close(self):
        if self.pick_buffer.value:
            self.gpu.call("cuMemFree_v2", self.pick_buffer)
            self.pick_buffer = DEVICE_PTR()

def verify_interaction(renderer):
    """Exercise the same pick, stretch, release and reload entry points as the live viewer."""
    from dataclasses import replace
    from engine import Shot, compare

    shot = Shot(width=181, height=113, time=2.0, control=0.12)
    params = (shot.width / shot.height, shot.time, shot.yaw, shot.pitch, shot.control)
    held = TextileInteraction(renderer.gpu)
    try:
        plain = renderer.render(shot, poison=True)
        if held.pick(0.0, 0.0, *params) is None or held.pick(-0.84, 0.93, *params) is not None:
            raise ValueError("Textile pick did not separate the visible cloth from the backdrop.")
        held.grab(0.0, 0.0, *params)
        held.drag(0.045, 0.01, *params)
        stretched = renderer.render(shot, poison=True)
        if held.marks or compare(plain, stretched)[0] < 8:
            raise ValueError("A small grip should visibly displace fibers and leave zero lasting tears.")
        held.release()
        if compare(plain, renderer.render(shot, poison=True))[0]:
            raise ValueError("The small pull failed to relax to the original image.")
        held.grab(0.0, 0.0, *params)
        held.drag(0.34, 0.13, *params)
        held.release()
        torn = renderer.render(shot, poison=True)
        changed = compare(plain, torn)[0]
        if len(held.marks) != 1 or changed < 12:
            raise ValueError("A long pull must leave a visible split after release.")
        renderer.reload(held)
        if compare(torn, renderer.render(shot, poison=True))[0]:
            raise ValueError("Shader reload lost or shifted the stored tear.")
        turn = replace(shot, yaw=0.27)
        side = renderer.render(turn, poison=True)
        for mode in ("reference", "student"):
            if compare(side, renderer.render(replace(turn, mode=mode), poison=True))[0]:
                raise ValueError(f"{mode} changed the torn material after orbiting.")
        held.clear()
        if compare(side, renderer.render(turn, poison=True))[0] < 8:
            raise ValueError("The stored tear was invisible from the second camera.")
        if compare(plain, renderer.render(shot, poison=True))[0]:
            raise ValueError("Clearing hand-made tears failed to restore the clean material.")
        print(f"PASS textile pick, reversible stretch, {changed}-pixel persistent tear, orbit, hot reload and reset")
    finally:
        held.close()
