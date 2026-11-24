"""Compile one scene and render an RGBA frame using the course CUDA driver bridge."""
import ctypes as ct
from dataclasses import dataclass
import math
from pathlib import Path
import sys
import time

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "render"))
from cuda_host import GPU, INT, VOID

MODES = ("reference", "optimized", "student")
VIEWS = ("beauty", "normals", "work")
TITLES = {"lighting": "After the last train", "creature": "Sluice 09", "textile": "Selvedge",
          "soundstage": "Signal / Soundstage"}


@dataclass(frozen=True)
class Shot:
    width: int = 768
    height: int = 432
    time: float = 2.0
    yaw: float = 0.0
    pitch: float = 0.0
    control: float = 0.5
    features: int = 7
    mode: str = "optimized"
    view: str = "beauty"
    samples: int = 1
    exposure: float = 1.0


@dataclass
class Frame:
    rgba: bytes
    gpu_ms: float
    host_ms: float

    def rgb(self):
        # Extended slices run in C and preserve RGB row order for Tk and PPM.
        out = bytearray(3 * (len(self.rgba) // 4))
        for k in range(3):
            out[k::3] = self.rgba[k::4]
        return bytes(out)

    def validate(self, label):
        alpha = self.rgba[3::4]
        if alpha.count(255) != len(alpha):
            i = next(i for i, value in enumerate(alpha) if value != 255)
            raise ValueError(f"{label}: pixel {i} was unwritten or produced non-finite radiance")


def compare(reference, candidate):
    """Return differing pixels, maximum display-channel delta, and normalized RGB RMSE."""
    reference.validate("reference")
    candidate.validate("candidate")
    if len(reference.rgba) != len(candidate.rgba):
        raise ValueError("Mismatched frame dimensions")
    if reference.rgba == candidate.rgba:
        return 0, 0, 0.0
    a, b = reference.rgba, candidate.rgba
    count = largest = total = 0
    for i in range(0, len(a), 4):
        if a[i:i+3] == b[i:i+3]:
            continue
        count += 1
        for c in range(3):
            d = abs(a[i+c] - b[i+c])
            largest = max(largest, d)
            total += d * d
    return count, largest, math.sqrt(total / (len(a) // 4 * 3)) / 255


def launch(gpu, name, grid, block, args):
    params = (VOID * len(args))(*(ct.addressof(a) for a in args))
    gpu.call("cuLaunchKernel", gpu.functions[name], *grid, *block, 0, None, params, None)


class Renderer:
    def __init__(self, scene):
        self.scene = scene
        names = ["renderFrame"]
        if scene == "creature":
            names.append("prepareCreature")
        if scene == "textile":
            names.append("textilePick")
        if scene == "soundstage":
            names.append("setSoundstage")
        sources = ["common.cuh"]
        if scene == "textile":
            sources.append("textile_probe.cuh")
        sources.extend((scene + ".cuh", "frame.cu"))
        self.gpu = GPU(HERE, sources, names)
        self.assets = None
        try:
            if scene == "soundstage":
                from soundstage_asset import SoundstageAssets
                self.assets = SoundstageAssets(self.gpu)
            elif scene == "creature":
                from creature_material import bind_creature_material
                bind_creature_material(self.gpu)
        except Exception:
            self.gpu.close()
            raise

    def render(self, shot, poison=False):
        gpu = self.gpu
        start = time.perf_counter()
        w, h = shot.width, shot.height
        gpu.reserve("image", 4*w*h)
        if poison:
            gpu.call("cuMemsetD8_v2", gpu.image, 165, 4*w*h)
        gpu.call("cuEventRecord", gpu.start_event, None)
        if self.scene == "creature":
            launch(gpu, "prepareCreature", (1,1,1), (128,1,1),
                   [ct.c_float(shot.time), ct.c_float(shot.control)])
        params = [gpu.image, INT(w), INT(h), ct.c_float(shot.time), ct.c_float(shot.yaw),
                  ct.c_float(shot.pitch), ct.c_float(shot.control), INT(shot.features),
                  INT(MODES.index(shot.mode)), INT(VIEWS.index(shot.view)),
                  INT(math.isqrt(shot.samples)), ct.c_float(shot.exposure)]
        launch(gpu, "renderFrame", ((w+15)//16,(h+7)//8,1), (16,8,1), params)
        gpu.call("cuEventRecord", gpu.end_event, None)
        gpu.call("cuEventSynchronize", gpu.end_event)
        elapsed = ct.c_float()
        gpu.call("cuEventElapsedTime", ct.byref(elapsed), gpu.start_event, gpu.end_event)
        storage = ct.create_string_buffer(4*w*h)
        gpu.call("cuMemcpyDtoH_v2", storage, gpu.image, len(storage))
        rgba = storage.raw
        return Frame(rgba, elapsed.value, 1000*(time.perf_counter()-start))

    def reload(self, interaction=None):
        def restore():
            if self.assets:
                self.assets.upload()
            elif self.scene == "creature":
                from creature_material import bind_creature_material
                bind_creature_material(self.gpu)
            if interaction is not None:
                interaction.upload()
        self.gpu.reload(restore)

    def close(self):
        try:
            if self.assets:
                self.assets.close()
                self.assets = None
        finally:
            self.gpu.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def save_image(path, frame, shot):
    frame.validate(str(path))
    path = Path(path)
    if path.suffix.lower() == ".ppm":
        path.write_bytes(f"P6\n{shot.width} {shot.height}\n255\n".encode() + frame.rgb())
    else:
        from PIL import Image
        image = Image.frombytes("RGBA", (shot.width, shot.height), frame.rgba).convert("RGB")
        options = {"quality": 95, "subsampling": 0} if path.suffix.lower() in (".jpg",".jpeg") else {}
        image.save(path, **options)
