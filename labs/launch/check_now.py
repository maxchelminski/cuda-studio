"""Build the two device functions in first_kernel.cu with the local NVRTC compiler."""
import ctypes as ct
from pathlib import Path
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "render"))
from cuda_host import DEVICE_PTR, GPU, INT, VOID


def check_shape(gpu, n):
    values = ct.c_float * n
    a = values(*(i % 13 - 6 for i in range(n)))
    b = values(*(i % 7 for i in range(n)))
    out = values()
    size = ct.sizeof(out)
    buffers = []
    try:
        for _ in range(3):
            buf = DEVICE_PTR()
            gpu.call("cuMemAlloc_v2", ct.byref(buf), size)
            buffers.append(buf)
        da, db, dest = buffers
        gpu.call("cuMemcpyHtoD_v2", da, a, size)
        gpu.call("cuMemcpyHtoD_v2", db, b, size)
        args = [da, db, dest, INT(n)]
        params = (VOID * len(args))(*(ct.addressof(arg) for arg in args))
        student_blocks = (n + 255) // 256
        for name, blocks, threads in (("add_serial", 1, 1), ("add_student", student_blocks, 256)):
            gpu.call("cuMemsetD8_v2", dest, 255, size)
            gpu.call("cuLaunchKernel", gpu.functions[name], blocks, 1, 1,
                     threads, 1, 1, 0, None, params, None)
            gpu.call("cuMemcpyDtoH_v2", out, dest, size)
            for i, value in enumerate(out):
                if value != a[i] + b[i]:
                    raise ValueError(f"{name} at n={n}, index={i}: got {value}, expected {a[i]+b[i]}")
        print(f"PASS n={n}: serial and student match every element")
    finally:
        for buf in buffers:
            gpu.call("cuMemFree_v2", buf)


def main():
    gpu = GPU(HERE, ("first_kernel.cu",), ("add_serial", "add_student"))
    try:
        print(gpu.name)
        print(f"NVRTC: {gpu.compiler.path}")
        for n in (1, 255, 256, 257, 4099):
            check_shape(gpu, n)
    finally:
        gpu.close()


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError) as error:
        sys.exit(str(error))
