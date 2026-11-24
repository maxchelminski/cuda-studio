"""Upload the bundled CC0 painted-concrete scan to the active sluice module."""
import ctypes as ct
from pathlib import Path
import zlib

from cuda_host import DEVICE_PTR, SIZE, VOID, bind


def bind_creature_material(gpu):
    path = Path(__file__).resolve().parent / "assets" / "painted-concrete-512.rgba.zlib"
    pixel_data = zlib.decompress(path.read_bytes())
    lookup = bind(gpu.lib, "cuModuleGetGlobal_v2", ct.POINTER(DEVICE_PTR),
                  ct.POINTER(SIZE), VOID, ct.c_char_p)
    pointer, size = DEVICE_PTR(), SIZE()
    rc = lookup(ct.byref(pointer), ct.byref(size), gpu.module, b"sluiceConcrete")
    if rc:
        raise RuntimeError(f"Could not locate the painted concrete map in the CUDA module (driver code {rc})")
    if size.value != len(pixel_data) or len(pixel_data) != 512 * 512 * 4:
        raise ValueError("The installed concrete map and the GPU's texture dimensions differ.")
    gpu.call("cuMemcpyHtoD_v2", pointer, pixel_data, len(pixel_data))
