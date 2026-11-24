"""Check radio BVH traversal against double-precision brute force on a fixed packet of rays."""
import ctypes as ct
import numpy as np
from engine import MODES, Renderer, launch
from cuda_host import DEVICE_PTR, INT, VOID
from soundstage_asset import read_model


def brute(origins, directions, verts, ids):
    p = verts[ids, :3].astype(np.float64)
    edge1,edge2=p[:,1]-p[:,0],p[:,2]-p[:,0]
    result=[]
    for origin,ray in zip(origins,directions):
        h=np.cross(ray,edge2);det=np.einsum("ij,ij->i",edge1,h)
        valid=np.abs(det)>1e-9
        inv=np.divide(1,det,out=np.zeros_like(det),where=valid)
        offset=origin-p[:,0]
        u=inv*np.einsum("ij,ij->i",offset,h)
        q=np.cross(offset,edge1);v=inv*(q@ray)
        t=inv*np.einsum("ij,ij->i",edge2,q)
        hit=np.where(valid&(u>=0)&(v>=0)&(u+v<=1)&(t>.00015)&(t<100),t,np.inf)
        winner=int(np.argmin(hit))
        result.append((winner,float(hit[winner])) if np.isfinite(hit[winner]) else (-1,100))
    return np.array(result)


def main():
    rng=np.random.default_rng(5070)
    count=257
    angle=rng.uniform(-np.pi,np.pi,count)
    origins=np.column_stack((4*np.sin(angle),rng.uniform(.3,3.5,count),4*np.cos(angle)))
    aims=rng.uniform((-1.55,-.35,-1.55),(1.55,2.55,1.55),(count,3))
    directions=aims-origins
    directions/=np.linalg.norm(directions,axis=1,keepdims=True)
    rays=np.ascontiguousarray(np.column_stack((origins,directions)),dtype=np.float32)
    vertices,ids,*_=read_model()
    expected=brute(rays[:,:3].astype(np.float64),rays[:,3:].astype(np.float64),vertices,ids)
    with Renderer("soundstage") as renderer:
        gpu=renderer.gpu
        print(gpu.name)
        handle=VOID()
        gpu.call("cuModuleGetFunction",ct.byref(handle),gpu.module,b"inspectRadio")
        gpu.functions["inspectRadio"]=handle
        gpu.reserve("geometry",rays.nbytes)
        gpu.call("cuMemcpyHtoD_v2",gpu.geometry,rays.ctypes.data,rays.nbytes)
        out=np.empty((count,3),dtype=np.float32)
        gpu.reserve("image",out.nbytes)
        if np.sum(expected[:,0]>=0)<30 or np.sum(expected[:,0]<0)<30:
            raise ValueError("The fixed test packet must contain both hits and misses")
        for n,mode in enumerate(MODES):
            gpu.call("cuMemsetD8_v2",gpu.image,255,out.nbytes)
            args=[gpu.geometry,INT(count),INT(n),gpu.image]
            launch(gpu,"inspectRadio",((count+63)//64,1,1),(64,1,1),args)
            gpu.call("cuMemcpyDtoH_v2",out.ctypes.data,gpu.image,out.nbytes)
            if not np.array_equal(out[:,0],expected[:,0]) or not np.allclose(out[:,1],expected[:,1],rtol=1e-5,atol=1e-5):
                raise ValueError(f"{mode} failed FP64 brute-force nearest-hit comparison")
            if not np.isfinite(out[:,2]).all() or np.any(out[:,2]<0):
                raise ValueError("Invalid triangle-test counter")
            print(f"PASS {mode:9s} | {int(sum(out[:,2])):,} triangle tests | "
                  f"{int(sum(expected[:,0]>=0))} hits, {int(sum(expected[:,0]<0))} misses")
    print(f"Brute force examined {len(ids):,} triangles for each of {count} rays.")


if __name__=="__main__":
    main()
