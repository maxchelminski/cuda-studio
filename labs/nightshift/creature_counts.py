"""Measure primary-ray link tests and verify the winning hit on the full image."""
import argparse
from array import array
import ctypes as ct
import math
import sys

from engine import INT, VOID, Renderer, launch


def run(width, height, time, yaw, pitch, control):
    with Renderer("creature") as renderer:
        gpu = renderer.gpu
        probe = VOID()
        name = "creatureTraversalCounts"
        gpu.call("cuModuleGetFunction", ct.byref(probe), gpu.module, name.encode())
        gpu.functions[name] = probe
        launch(gpu, "prepareCreature", (1, 1, 1), (128, 1, 1),
               [ct.c_float(time), ct.c_float(control)])
        counter_bytes = width * height * 16
        gpu.reserve("image", counter_bytes)
        gpu.call("cuMemsetD8_v2", gpu.image, 255, counter_bytes)
        launch(gpu, name, ((width + 15) // 16, (height + 7) // 8, 1), (16, 8, 1),
               [gpu.image, INT(width), INT(height), ct.c_float(yaw), ct.c_float(pitch), ct.c_float(control)])
        rows = array("I", [0]) * (width * height * 4)
        if rows.itemsize != 4:
            raise RuntimeError("The counter reader requires a 32-bit unsigned int.")
        gpu.call("cuMemcpyDtoH_v2", rows.buffer_info()[0], gpu.image, counter_bytes)
        print(gpu.name)
        flags = rows[3::4]
        missed = sum(bool(value & 3) for value in flags)
        if missed:
            pixel = next(i for i, flag in enumerate(flags) if flag & 3)
            raise ValueError(f"{missed} primary hit mismatches; first at ({pixel % width}, {pixel // width}), "
                             f"flags={flags[pixel]} (bit 1 optimized, bit 2 student).")
        creature_pixels = sum(bool(value & 4) for value in flags)
        print(f"{width}x{height}, time={time:g}, gate control={control:g}, yaw={yaw:g}, pitch={pitch:g}")
        print(f"Exact material, link ID, distance, normal and arc at every pixel; {creature_pixels:,} hit the colony.")
        reference_tests = sum(rows[0::4])
        for i, mode in enumerate(("reference", "optimized", "student")):
            counts = rows[i::4]
            total = sum(counts)
            saved = 100 * (1 - total / reference_tests) if reference_tests else 0
            print(f"{mode:10} link tests {total:>13,}    mean/pixel {total / (width*height):7.2f}    "
                  f"max/pixel {max(counts):4}    saved {saved:5.1f}%")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    parser.add_argument("--time", type=float, default=2)
    parser.add_argument("--yaw", type=float, default=0)
    parser.add_argument("--pitch", type=float, default=0)
    parser.add_argument("--control", type=float, default=.5)
    args = parser.parse_args()
    if not (1 <= args.width <= 3840 and 1 <= args.height <= 2160 and 0 <= args.control <= 1
            and all(math.isfinite(value) for value in (args.yaw, args.pitch, args.time))):
        parser.error("Use finite inputs, dimensions 1..3840 by 1..2160 and a gate control in [0,1].")
    run(args.width, args.height, args.time, args.yaw, args.pitch, args.control)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        sys.exit(str(error))
