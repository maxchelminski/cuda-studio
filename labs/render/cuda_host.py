"""Small NVRTC and CUDA Driver API bridge for the three render kernels."""
import ctypes as ct
import ctypes.util
import os
from pathlib import Path
import sys


HERE = Path(__file__).resolve().parent
VOID = ct.c_void_p
PTR = ct.POINTER
INT = ct.c_int
UINT = ct.c_uint
SIZE = ct.c_size_t
DEVICE_PTR = ct.c_uint64
MODES = ("baseline", "tiled", "student")


def bind(lib, name, *args, result=INT):
    fn = getattr(lib, name)
    fn.argtypes = args
    fn.restype = result
    return fn


def load_nvrtc():
    override = os.environ.get("CUDA_LAB_NVRTC")
    if override:
        candidates = [Path(override)]
    else:
        dirs = []
        if os.environ.get("CUDA_PATH"):
            root = Path(os.environ["CUDA_PATH"])
            dirs.extend([root / "bin" / "x64", root / "bin", root / "lib64"])
        dirs.extend(Path(p.strip('"')) for p in os.get_exec_path() if p)
        for base in sys.path:
            if base:
                dirs.extend(Path(base) / p for p in ("nvidia/cuda_nvrtc/bin", "nvidia/cuda_nvrtc/lib", "torch/lib"))
        pattern = "nvrtc64*.dll" if os.name == "nt" else "libnvrtc.so*"
        candidates = [p for d in dirs for p in sorted(d.glob(pattern), reverse=True)]
        if os.name != "nt":
            detected = ct.util.find_library("nvrtc")
            if detected:
                candidates.append(Path(detected))
    errors = []
    for p in dict.fromkeys(candidates):
        try:
            return ct.CDLL(str(p)), p
        except OSError as exc:
            errors.append(f"{p}: {exc}")
    detail = "; ".join(errors)
    raise RuntimeError("NVRTC unavailable. Set CUDA_LAB_NVRTC to the compiler library's full path. " + detail)


class Compiler:
    def __init__(self, device_arch, source_dir, sources):
        self.source_dir, self.sources = source_dir, sources
        self.lib, self.path = load_nvrtc()
        self.dll_directory = None
        if os.name == "nt" and self.path.is_absolute():
            self.dll_directory = os.add_dll_directory(str(self.path.parent))
            # NVRTC's internal loader searches for this sibling by basename.
            # Preload the matching build explicitly for Python 3.8+ DLL search rules.
            major, minor = INT(), INT()
            if bind(self.lib, "nvrtcVersion", PTR(INT), PTR(INT))(ct.byref(major), ct.byref(minor)) == 0:
                builtins = self.path.with_name(f"nvrtc-builtins64_{major.value}{minor.value}.dll")
                if builtins.exists():
                    self.builtins = ct.CDLL(str(builtins))
        self.error = bind(self.lib, "nvrtcGetErrorString", INT, result=ct.c_char_p)
        self.create = bind(self.lib, "nvrtcCreateProgram", PTR(VOID), ct.c_char_p, ct.c_char_p, INT,
                           PTR(ct.c_char_p), PTR(ct.c_char_p))
        self.compile = bind(self.lib, "nvrtcCompileProgram", VOID, INT, PTR(ct.c_char_p))
        self.destroy = bind(self.lib, "nvrtcDestroyProgram", PTR(VOID))
        self.ptx_size = bind(self.lib, "nvrtcGetPTXSize", VOID, PTR(SIZE))
        self.ptx = bind(self.lib, "nvrtcGetPTX", VOID, VOID)
        self.log_size = bind(self.lib, "nvrtcGetProgramLogSize", VOID, PTR(SIZE))
        self.log = bind(self.lib, "nvrtcGetProgramLog", VOID, VOID)
        # NVRTC 11.2+ reports supported virtual architectures. Older PTX can
        # target newer hardware through the driver's forward-compatible JIT.
        num_arch = INT()
        self.check(bind(self.lib, "nvrtcGetNumSupportedArchs", PTR(INT))(ct.byref(num_arch)))
        arches = (INT * num_arch.value)()
        self.check(bind(self.lib, "nvrtcGetSupportedArchs", PTR(INT))(arches))
        choices = [a for a in arches if a <= device_arch]
        if not choices:
            raise RuntimeError(f"This NVRTC has no compatible PTX target for compute_{device_arch}.")
        self.arch = max(choices)

    def check(self, code):
        if code:
            raise RuntimeError(self.error(code).decode())

    def build(self):
        code = b"".join(f'\n#line 1 "{name}"\n'.encode() + (self.source_dir / name).read_bytes()
                        for name in self.sources)
        program = VOID()
        self.check(self.create(ct.byref(program), code, self.sources[0].encode(), 0, None, None))
        try:
            options = (ct.c_char_p * 3)(f"--gpu-architecture=compute_{self.arch}".encode(),
                                         b"--std=c++14", b"--generate-line-info")
            rc = self.compile(program, len(options), options)
            if rc:
                n = SIZE()
                self.check(self.log_size(program, ct.byref(n)))
                log = ct.create_string_buffer(n.value)
                self.check(self.log(program, log))
                raise RuntimeError(log.value.decode(errors="replace"))
            n = SIZE()
            self.check(self.ptx_size(program, ct.byref(n)))
            code_buffer = ct.create_string_buffer(n.value)
            self.check(self.ptx(program, code_buffer))
            return code_buffer
        finally:
            self.destroy(ct.byref(program))


class GPU:
    def __init__(self, source_dir=HERE, sources=("kernels.cu", "student.cuh"), modes=MODES):
        self.modes = modes
        if ct.sizeof(VOID) != 8:
            raise RuntimeError("Use a 64-bit Python interpreter for CUDA.")
        os.environ.setdefault("CUDA_CACHE_DISABLE", "1")
        self.lib = ct.WinDLL("nvcuda.dll") if os.name == "nt" else ct.CDLL("libcuda.so.1")
        self.functions = {}
        self.module = VOID()
        self.context = VOID()
        self.device = INT()
        self.geometry, self.image = DEVICE_PTR(), DEVICE_PTR()
        self.geometry_size = self.image_size = 0
        self.start_event, self.end_event = VOID(), VOID()
        self.fn = {}
        signatures = {
            "cuInit": (UINT,), "cuDeviceGet": (PTR(INT), INT), "cuDeviceGetName": (VOID, INT, INT),
            "cuDeviceGetAttribute": (PTR(INT), INT, INT), "cuDevicePrimaryCtxRetain": (PTR(VOID), INT),
            "cuDevicePrimaryCtxRelease": (INT,), "cuCtxSetCurrent": (VOID,),
            "cuCtxSynchronize": (),
            "cuModuleLoadData": (PTR(VOID), VOID), "cuModuleUnload": (VOID,),
            "cuModuleGetFunction": (PTR(VOID), VOID, ct.c_char_p),
            "cuMemAlloc_v2": (PTR(DEVICE_PTR), SIZE), "cuMemFree_v2": (DEVICE_PTR,),
            "cuMemcpyHtoD_v2": (DEVICE_PTR, VOID, SIZE), "cuMemcpyDtoH_v2": (VOID, DEVICE_PTR, SIZE),
            "cuMemsetD8_v2": (DEVICE_PTR, ct.c_ubyte, SIZE),
            "cuEventCreate": (PTR(VOID), UINT), "cuEventDestroy_v2": (VOID,),
            "cuEventRecord": (VOID, VOID), "cuEventSynchronize": (VOID,),
            "cuEventElapsedTime": (PTR(ct.c_float), VOID, VOID),
            "cuLaunchKernel": (VOID, UINT, UINT, UINT, UINT, UINT, UINT, UINT, VOID, PTR(VOID), PTR(VOID)),
            "cuGetErrorString": (INT, PTR(ct.c_char_p)),
        }
        for name, args in signatures.items():
            self.fn[name] = bind(self.lib, name, *args)
        try:
            self.call("cuInit", 0)
            self.call("cuDeviceGet", ct.byref(self.device), 0)
            self.call("cuDevicePrimaryCtxRetain", ct.byref(self.context), self.device)
            self.call("cuCtxSetCurrent", self.context)
            name = ct.create_string_buffer(256)
            self.call("cuDeviceGetName", name, len(name), self.device)
            major, minor = INT(), INT()
            self.call("cuDeviceGetAttribute", ct.byref(major), 75, self.device)
            self.call("cuDeviceGetAttribute", ct.byref(minor), 76, self.device)
            self.compiler = Compiler(10 * major.value + minor.value, source_dir, sources)
            self.name = f"{name.value.decode()} | SM {major.value}.{minor.value} | PTX compute_{self.compiler.arch}"
            self.reload()
            self.call("cuEventCreate", ct.byref(self.start_event), 0)
            self.call("cuEventCreate", ct.byref(self.end_event), 0)
        except Exception:
            self.close()
            raise

    def call(self, name, *args):
        code = self.fn[name](*args)
        if code:
            message = ct.c_char_p()
            self.fn["cuGetErrorString"](code, ct.byref(message))
            raise RuntimeError(f"{name}: {(message.value or str(code).encode()).decode()}")

    def reload(self, initialize=None):
        """Compile on the owning CUDA thread. Retain the old module until setup succeeds.

        The optional callback uploads module-local state to the candidate using this GPU's
        ordinary module/function handles. External allocations belong to the caller.
        """
        ptx = self.compiler.build()
        module = VOID()
        self.call("cuModuleLoadData", ct.byref(module), ptx)
        functions = {}
        old_module, old_functions = self.module, self.functions
        try:
            for name in self.modes:
                handle = VOID()
                self.call("cuModuleGetFunction", ct.byref(handle), module, name.encode())
                functions[name] = handle
            self.module, self.functions = module, functions
            if initialize is not None:
                initialize()
                # An initializer can enqueue a kernel that sets scene-global pointers.
                self.call("cuCtxSynchronize")
            if old_module.value:
                self.call("cuModuleUnload", old_module)
        except BaseException:
            self.module, self.functions = old_module, old_functions
            # Keep the original failure (for example, the exact missing symbol) visible.
            self.fn["cuModuleUnload"](module)
            raise

    def reserve(self, field, size):
        capacity = field + "_size"
        if size <= getattr(self, capacity):
            return
        buf = DEVICE_PTR()
        self.call("cuMemAlloc_v2", ct.byref(buf), size)
        old = getattr(self, field)
        if old.value:
            self.call("cuMemFree_v2", old)
        setattr(self, field, buf)
        setattr(self, capacity, size)

    def render(self, packed, count, width, height, mode, view):
        self.reserve("geometry", max(1, len(packed)))
        self.reserve("image", 3 * width * height)
        if packed:
            self.call("cuMemcpyHtoD_v2", self.geometry, packed, len(packed))
        args = [self.geometry, INT(count), self.image, INT(width), INT(height), INT(view)]
        params = (VOID * len(args))(*(ct.addressof(v) for v in args))
        self.call("cuEventRecord", self.start_event, None)
        self.call("cuLaunchKernel", self.functions[mode], (width + 15) // 16, (height + 15) // 16, 1,
                  16, 16, 1, 0, None, params, None)
        self.call("cuEventRecord", self.end_event, None)
        self.call("cuEventSynchronize", self.end_event)
        elapsed = ct.c_float()
        self.call("cuEventElapsedTime", ct.byref(elapsed), self.start_event, self.end_event)
        image = ct.create_string_buffer(width * height * 3)
        self.call("cuMemcpyDtoH_v2", image, self.image, len(image))
        return image.raw, float(elapsed.value)

    def close(self):
        for handle in (self.start_event, self.end_event):
            if handle.value:
                self.fn["cuEventDestroy_v2"](handle)
                handle.value = None
        for buf in (self.geometry, self.image):
            if buf.value:
                self.fn["cuMemFree_v2"](buf)
                buf.value = 0
        if self.module.value:
            self.fn["cuModuleUnload"](self.module)
            self.module = VOID()
            self.functions.clear()
        if self.context.value:
            self.fn["cuDevicePrimaryCtxRelease"](self.device)
            self.context = VOID()
        compiler = getattr(self, "compiler", None)
        if compiler and compiler.dll_directory:
            compiler.dll_directory.close()
            compiler.dll_directory = None
