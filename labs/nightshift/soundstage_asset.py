"""Load the specific bundled Khronos BoomBox GLB and build a median-split triangle BVH."""
import ctypes as ct
import io
import json
import struct
import numpy as np
from PIL import Image
from engine import HERE, launch
from cuda_host import DEVICE_PTR


def read_model():
    raw = (HERE/"assets"/"BoomBox.glb").read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    doc = json.loads(raw[20:20+size])
    binary = memoryview(raw)[28+size:]

    def view(index):
        v = doc["bufferViews"][index]
        start = v.get("byteOffset",0)
        return binary[start:start+v["byteLength"]]

    def accessor(index):
        a = doc["accessors"][index]
        dtype = {5126:"<f4",5123:"<u2",5125:"<u4"}[a["componentType"]]
        width = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}[a["type"]]
        return np.frombuffer(view(a["bufferView"]), dtype, count=a["count"]*width,
                             offset=a.get("byteOffset",0)).reshape(-1,width)

    primitive = doc["meshes"][0]["primitives"][0]
    attr = primitive["attributes"]
    pos = accessor(attr["POSITION"]).copy()
    normal = accessor(attr["NORMAL"]).copy()
    tangent = accessor(attr["TANGENT"]).copy()
    # The bundled model has a 180-degree rotation about its Y axis.
    for values in (pos,normal,tangent):
        values[:,(0,2)] *= -1
    pos *= 1.1 / max(np.abs(pos).max(axis=0))
    pos[:,1] -= pos[:,1].min()
    vertices = np.ascontiguousarray(np.column_stack((pos,normal,accessor(attr["TEXCOORD_0"]),tangent)),dtype="<f4")
    triangles = accessor(primitive["indices"]).astype("<i4").reshape(-1,3)
    points = pos[triangles]
    centers = points.mean(axis=1)
    nodes, ordered = [], []

    def partition(ids):
        index = len(nodes)
        pts = points[ids]
        lo = pts.min(axis=(0,1)) - .00002
        hi = pts.max(axis=(0,1)) + .00002
        nodes.append(None)
        if len(ids) <= 6:
            left,right = -len(ordered)-1,len(ids)
            ordered.extend(ids)
        else:
            axis = np.argmax(np.ptp(centers[ids],axis=0))
            sorted_ids = ids[np.argsort(centers[ids,axis],kind="stable")]
            mid = len(ids)//2
            left,right = partition(sorted_ids[:mid]),partition(sorted_ids[mid:])
        nodes[index] = (*lo, left, *hi, right)
        return index

    partition(np.arange(len(triangles)))
    material = doc["materials"][0]
    pbr = material["pbrMetallicRoughness"]
    images = []
    for slot in (pbr["baseColorTexture"],pbr["metallicRoughnessTexture"],material["normalTexture"],material["emissiveTexture"]):
        source = doc["textures"][slot["index"]]["source"]
        with Image.open(io.BytesIO(view(doc["images"][source]["bufferView"]))) as im:
            images.append(np.asarray(im.convert("RGB").resize((1024,1024),Image.Resampling.LANCZOS)))
    return vertices, triangles[np.array(ordered)], np.array(nodes,dtype="<f4"), np.stack(images)


def read_environment():
    # Radiance RGBE RLE. This asset stores rows from top to bottom, left to right.
    with (HERE/"assets"/"studio_small_09_1k.hdr").open("rb") as f:
        while (line := f.readline()).strip():
            if not line:
                raise ValueError("Truncated Radiance header")
        orient_y,h,orient_x,w = f.readline().split()
        h,w = int(h),int(w)
        if (orient_y,orient_x,h,w) != (b"-Y",b"+X",512,1024):
            raise ValueError("Unexpected orientation or dimensions in bundled HDR")
        rgbe = np.empty((h,w,4),np.uint8)
        for y in range(h):
            if f.read(4) != bytes((2,2,w>>8,w&255)):
                raise ValueError("Invalid HDR scanline")
            for channel in range(4):
                decoded = bytearray()
                while len(decoded)<w:
                    control = f.read(1)
                    if not control or control[0]==0:
                        raise ValueError("Invalid HDR run")
                    n = control[0]
                    decoded.extend(f.read(1)*(n-128) if n>128 else f.read(n))
                rgbe[y,:,channel] = np.frombuffer(decoded,dtype=np.uint8)
    rgb = rgbe[:,:,:3].astype(np.float32)*np.exp2(rgbe[:,:,3:].astype(np.float32)-136)
    levels = [rgb]
    while rgb.shape[0]>1:
        h,w = rgb.shape[:2]
        rgb = rgb.reshape(h//2,2,w//2,2,3).mean(axis=(1,3))
        levels.append(rgb)
    return np.ascontiguousarray(np.concatenate([level.reshape(-1,3) for level in levels]),dtype="<f4")


class SoundstageAssets:
    def __init__(self, gpu):
        self.gpu = gpu
        self.pointers = []
        try:
            for array in (*read_model(), read_environment()):
                data = np.ascontiguousarray(array)
                buf = DEVICE_PTR()
                gpu.call("cuMemAlloc_v2", ct.byref(buf), data.nbytes)
                self.pointers.append(buf)
                gpu.call("cuMemcpyHtoD_v2", buf, data.ctypes.data, data.nbytes)
            self.upload()
        except Exception:
            self.close()
            raise

    def upload(self):
        launch(self.gpu, "setSoundstage", (1,1,1), (1,1,1), self.pointers)

    def close(self):
        for pointer in self.pointers:
            self.gpu.call("cuMemFree_v2", pointer)
        self.pointers.clear()
